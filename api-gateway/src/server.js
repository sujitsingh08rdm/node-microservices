require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

//rate limiting
const rateLimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`senstitive endpoint rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimitOptions);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// setting up an HTTP proxy middleware (using express-http-proxy) so that your service can forward requests to another backend service (your identity service).

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    //This function decides how to transform the path of the incoming request before sending it to the target service.
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  //Catches any errors that occur while proxying the request.
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy Error : ${err.message}`);
    const errorMessage = err.message || err.code || "Unknown proxy error";
    res.status(500).json({
      message: `Internal server error,`,
      error: errorMessage,
    });
  },
};

//setting up our proxy for identity service
app.use(
  //any requests starting with "v1/auth" will  get proxied to our Identity service
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    //it customize the outgoing request before it’s sent. Here, we are explicitly forcing the Content-Type header to application/json
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["content-type"] = "application/json";
      return proxyReqOpts;
    },
    //Runs after the response is received from the identity service, but before it’s sent to the client.
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response recieved from identity service : ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);

//setting up our proxy for post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; // from authMiddleware of proxy service
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response recieved from Post services : ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);

//setting up our proxy for media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; // from authMiddleware of proxy service
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response recieved from Media services : ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
    parseReqBody: false,
  })
);

//Setiing up our proxy for Search service

app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; // from authMiddleware of proxy service
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response recieved from Search services : ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API GATE-WAY IS RUNNNING ON PORT ${PORT}`);
  logger.info(
    `IDENTITY SERVICE IS RUNNNING ON PORT ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `POST SERVICE IS RUNNING ON PORT ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `MEDIA SERVICE IS RUNNING ON PORT ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(
    `SEARCH SERVICE IS RUNNING ON PORT ${process.env.SEARCH_SERVICE_URL}`
  );
  logger.info(`REDIS URL RUNNNING ON PORT ${process.env.REDIS_URL}`);
});
