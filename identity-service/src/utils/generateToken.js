const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const generateTokens = async (user) => {
  // Access Token → Quick, short-lived, used for actual API calls.

  //t is used to create a JWT (JSON Web Token).
  const accessToken = jwt.sign(
    {
      userId: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "60m" }
  );

  //Refresh Token → Longer-lived, used only to get new access tokens.
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // refresh token expires in 7 days

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

module.exports = generateTokens;

/*
⚙️ How They Work Together(accessToken and refreshToken)
Login → User logs in with username & password.
Server issues Access Token (short life) + Refresh Token (long life).

Accessing APIs → Client sends the Access Token in headers.
Server verifies it and allows access.

Expiration → When Access Token expires, client sends the Refresh Token to the server.
Server verifies the refresh token.
If valid, server issues a new Access Token (and sometimes a new Refresh Token).

Logout / Invalidate → If the user logs out or refresh token is revoked, the client can’t get new access tokens.
*/
