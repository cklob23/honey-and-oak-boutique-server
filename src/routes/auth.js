const express = require("express")
const router = express.Router()
const Customer = require("../models/Customer")
const { hashPassword, verifyPassword } = require("../utils/hash.js")
const { createJwt, verifyJwt } = require("../utils/jwt.js")
const squareService = require("../services/squareService")
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/auth/signup
 * Registers a new user
 */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber, role } = req.body

    // Check if customer already exists in Square
    const existingSquareCustomer = await squareService.searchCustomer(email)
    let squareId = existingSquareCustomer?.id || null

    if (!existingSquareCustomer) {
      const squareCustomer = await squareService.createCustomer(uuidv4(),
        email,
        firstName,
        lastName,
        phoneNumber)
      squareId = squareCustomer.id
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email })
    if (existingCustomer) {
      return res.status(400).json({ message: "Email already in use" })
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create customer
    const customer = new Customer({
      squareCustomerId: squareId,
      email,
      passwordHash,
      firstName,
      lastName,
      phoneNumber,
      role,
      subscribedToNewsletter: false,
      subscribedToSales: false,
    })

    await customer.save()

    res.status(201).json({
      customer: {
        customerId: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: customer.role,
        sessionToken: customer.sessionToken,
        sessionExpiry: customer.sessionExpiry,
      }
    })
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
})

/**
 * POST /api/auth/login
 * Authenticates a user and returns JWT + httpOnly cookie
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find Square customer
    const squareCustomer = await squareService.searchCustomer(email)
    if (!squareCustomer) {
      console.log("Square customer not found.")
    }

    // Find customer
    const customer = await Customer.findOne({ email })
    //console.log(customer, password, customer.passwordHash)
    if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createJwt(customer._id, customer.email);
    res.cookie("session_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Customer.updateOne(
      { email },
      {
        $set: {
          sessionToken: token,
          sessionExpiry: expiry,
        },
      }
    );

    res.json({
      message: "Login successful",
      customer: {
        customerId: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: customer.role,
        sessionToken: customer.sessionToken,
        sessionExpiry: customer.sessionExpiry,
      }
    })

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
})

/**
 * POST /reset-password
 * Resets a user password
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body

    // Find customer
    const customer = await Customer.findOne({ email })
    if (!customer || !(await verifyPassword(oldPassword, customer.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Hash password
    const passwordHash = await hashPassword(newPassword);

    const resetAt = new Date();

    // Update user
    await Customer.updateOne(
      { email },
      {
        $set: {
          passwordHash,
          lastPasswordReset: resetAt
        }
      }
    );

    res.json({
      message: "Password reset successful",
      lastPasswordReset: resetAt
    });

  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /admin-reset-password
 * Admin resets a user password
 */
router.post("/admin-reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body

    // Hash password
    const passwordHash = await hashPassword(newPassword);

    const resetAt = new Date();

    // Update user
    await Customer.updateOne(
      { email },
      {
        $set: {
          passwordHash,
          lastPasswordReset: resetAt
        }
      }
    );

    res.json({
      message: "Admin password reset successful"
    });

  } catch (err) {
    console.error("Admin password reset error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/auth/refresh
 * Refreshes JWT or session token expiry
 */
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies.session_token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    // Try JWT first
    let payload = null;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      payload = null;
    }

    if (payload) {
      // Renew JWT
      const newToken = createJwt(payload.userId, payload.email);
      res.cookie("session_token", newToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.json({ token: newToken });
    }

    // Check database session tokens
    const customer = await Customer.findOne({ sessionToken: token });
    if (!customer || customer.sessionExpiry < new Date()) {
      return res.status(401).json({ message: "Session expired" });
    }

    // Extend expiry 7 days
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Customer.updateOne(
      { sessionToken: token },
      { $set: { sessionExpiry: newExpiry } }
    );

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Session refreshed", sessionToken: token, sessionExpiry: newExpiry });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/auth/logout
 * Clears cookie and invalidates session
 */
router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.session_token;
    if (token) {
      await Customer.updateOne(
        { sessionToken: token },
        { $unset: { sessionToken: "", sessionExpiry: "" } }
      );
    }

    res.clearCookie("session_token", { path: "/" });
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user info
 */
router.get("/me", async (req, res) => {
  try {
    const token =
      req.cookies.session_token ||
      req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    let user = null

    // Try JWT path
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      user = await Customer.findOne({ _id: payload.userId })
    } catch {
      // ignore — fallback below
    }

    // Fallback to session token path
    if (!user) {
      user = await Customer.findOne({ sessionToken: token })
      if (!user || user.sessionExpiry < new Date()) {
        return res.status(401).json({ message: "Session expired" })
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      customer: {
        customerId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        sessionToken: user.sessionToken,
        sessionExpiry: user.sessionExpiry,
      },
    })
  } catch (err) {
    console.error("Fetch current user error:", err)
    res.status(500).json({ message: "Server error" })
  }
})


module.exports = router
