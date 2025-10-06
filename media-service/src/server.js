require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectRabbitMQ } = require("../../post-service/src/utils/rabbitMQ");
const { consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/mediaEventHandlers");

const app = express();
const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to MONGODB"))
  .catch((e) => logger.error("error connecting to DB", e));

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request from ${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();

    //consume all the event
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`media services running on PORT ${PORT}`);
    });
  } catch (error) {
    logger.error("failed to connect to server", error);
    process.exit(1);
  }
}

startServer();

app.listen(PORT, () => {
  logger.info(`Identity services running on PORT ${PORT}`);
});

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandled Rejection at", promise, "reason:", reason);
});
