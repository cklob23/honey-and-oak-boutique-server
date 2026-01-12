const Customer = require("../models/Customer.js")
const { verifyJwt } = require("../utils/jwt.js")

const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from cookie or header
    const token =
      req.cookies.session_token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Try to decode as JWT first
    const payload = verifyJwt(token);
    let user = null;

    if (payload) {
      // JWT path
      user = await Customer.findOne({ id: payload.userId });
    } else {
      // Database session token path
      user = await Customer.findOne({ sessionToken: token });
      if (user && user.sessionExpiry && user.sessionExpiry < new Date()) {
        user = null; // Expired
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(500).json({ message: "Authentication error" });
  }
}

module.exports = authMiddleware