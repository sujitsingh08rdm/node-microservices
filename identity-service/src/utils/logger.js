const winston = require("winston");

const logger = winston.createLogger({
  //checking the level of logger
  level: process.env.NODE_ENV === "production" ? "info" : "debug",

  //format the log, first timestamp, including the stack trace, then format the log, the splat will enable support for message templating, then at last formating all the log in json format.
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),

  //giving the meta data
  defaultMeta: { service: "identity-service" },

  //specifi the transport/output destination for out logs.
  transports: [
    new winston.transports.Console({
      //what ever logs we are having, we want to get it in console , then formating it to colorize and simple/
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    //two file for error and combine
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

module.exports = logger;
