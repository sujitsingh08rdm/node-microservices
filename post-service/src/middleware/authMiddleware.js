const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn(`access attempted without user ID`);
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue",
    });
  }

  //storing in req
  req.user = { userId };
  next();
};

module.exports = { authenticateRequest };
