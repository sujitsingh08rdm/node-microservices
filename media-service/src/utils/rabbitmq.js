const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_event";

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("connect to rabbit mq");

    return channel;
  } catch (error) {
    logger.error("Error connecting to RAbbit MQ ", error);
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectRabbitMQ();
  }

  channel.publishEvent(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published : ${routingKey}`);
}

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectRabbitMQ();
  }

  //creating a temporay(exclusive) queue, "" mean random queue name, this will bind the exchange
  const q = await channel.assertQueue("", { exclusive: true });

  //bind queue to the exchange
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  //will start consuming the message from this queue
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg); //ackt eh message so that the , message gets removed.
    }
  });

  logger.info(`Subscribed to event: ${routingKey} `);
}

module.exports = { connectRabbitMQ, publishEvent, consumeEvent };
