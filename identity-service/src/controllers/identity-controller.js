const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");

//user registration
const registerUser = async (req, res) => {
  logger.info("Registration enpoint hit...");
  try {
    //validate the schema, cehck for error
    const { error } = validateRegistration(req.body);

    //if error using logger log it
    if (error) {
      logger.warn(`Validation error: ${error.details[0].message}`);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    //get the data from body
    const { email, password, username } = req.body;

    //find if it existing with email or username
    let user = await User.findOne({ $or: [{ email }, { username }] });
    //if user exists how we can register it. then simly log it
    if (user) {
      logger.warn("user already exists");

      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    //not matched then create a new document collection with user, then save it to DB
    user = new User({ username, email, password });
    await user.save();
    logger.info(`User saved successfully: ${user._id}`);

    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "user registered succesfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error(error); // ✅ pass the whole error object
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//user login
const loginUser = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn(`Validation error: ${error.details[0].message}`);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn(`Invalid user`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    //valid password checking
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid Password");
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(200).json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("login endpoint error occured", error); // ✅ pass the whole error object
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
//refresh token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  try {
    // Extract the refresh token from the request body
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    // Check if the provided refresh token exists in the database
    // Also verify if it has not expired
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");

      return res.status(401).json({
        success: false,
        message: `Invalid or expired refresh token`,
      });
    }

    // If token is valid, fetch the associated user details
    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("user not found");
      return res.status(404).json({
        success: false,
        message: `User not found`,
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    // delete old refreshtoken
    await RefreshToken.deleteOne({ _id: storedToken._id });

    //sending new token
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error("Refresh token error occured", error); // ✅ pass the whole error object
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//logout
const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const result = await RefreshToken.deleteOne({ token: refreshToken });

    //Second logout call (same token again): delete count if 0 so below code executed
    if (result.deletedCount === 0) {
      logger.warn("Refresh token not found in DB");
      return res.status(404).json({
        success: false,
        message: "Refresh token already invalid or not found",
      });
    }
    logger.info("Refresh token deleted for logout");

    return res.json({ success: true, message: "Logged  out successfully" });
  } catch (error) {
    logger.error("error while logging out ", error); // ✅ pass the whole error object
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
