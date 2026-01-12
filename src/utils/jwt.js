const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = "7d";

/**
 * Create a signed JWT for a user.
 * @param {string} userId - The user's unique ID.
 * @param {string} email - The user's email address.
 * @returns {string} - Signed JWT token.
 */
const createJwt = (userId, email) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Verify a JWT and return its payload if valid.
 * @param {string} token - The JWT string to verify.
 * @returns {object|null} - The decoded payload or null if invalid.
 */
const verifyJwt = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
    createJwt,
    verifyJwt
}