const express = require("express")
const axios = require("axios")
const { v4: uuidv4 } = require("uuid")
const Customer = require("../models/Customer")
const squareService = require("../services/squareService")
const { createJwt } = require("../utils/jwt")
const router = express.Router()

/**
 * GET /api/auth/google
 * Redirect user to Google OAuth
 */
router.get("/google", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  })

  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
})

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth and performs signup or login
 */
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).send("Missing auth code")

    /* ===========================
       1. Exchange code → token
    ============================ */
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      },
      { headers: { "Content-Type": "application/json" } }
    )

    const { access_token } = tokenRes.data

    /* ===========================
       2. Fetch Google profile
    ============================ */
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    )

    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
    } = profileRes.data

    if (!email || !googleId) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login`)
    }

    /* ===========================
       3. Find or create Square customer
    ============================ */
    const existingSquareCustomer = await squareService.searchCustomer(email)
    let squareCustomerId = existingSquareCustomer?.id || null
    let phoneNumber = null

    if (!existingSquareCustomer) {
      const squareCustomer = await squareService.createCustomer(
        email,
        firstName,
        lastName,
        phoneNumber)
      squareCustomerId = squareCustomer.id
    }


    /* ===========================
    4. Find or create Customer
 =========================== */
    let customer = await Customer.findOne({ email })

    if (!customer) {
      // Brand new user (Google signup)
      customer = new Customer({
        squareCustomerId,
        googleId,
        email,
        authProvider: "google",
        passwordHash: null,
        firstName,
        lastName,
        phoneNumber,
        role: "customer",
        subscribedToNewsletter: false,
        subscribedToSales: false,
      })

      await customer.save()
    } else {
      // Existing user (email signup → link Google)
      if (!customer.googleId) {
        customer.googleId = googleId
      }

      // Keep original provider if local signup
      if (!customer.authProvider || customer.authProvider === "local") {
        customer.authProvider = "local+google"
      }

      // Fill missing profile fields if empty
      if (!customer.firstName && firstName) customer.firstName = firstName
      if (!customer.lastName && lastName) customer.lastName = lastName
      if (!customer.squareCustomerId && squareCustomerId) {
        customer.squareCustomerId = squareCustomerId
      }

      await customer.save()

    }

    /* ===========================
       5. Issue JWT
    ============================ */
    const token = createJwt(customer._id, customer.email)

    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await Customer.updateOne(
      { _id: customer._id },
      {
        $set: {
          sessionToken: token,
          sessionExpiry: expiry,
        },
      }
    )

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    /* ===========================
       6. Redirect to success
    ============================ */
    res.redirect(`${process.env.FRONTEND_URL}/oauth/success`)
  } catch (err) {
    console.error("Google OAuth error:", err.response?.data || err.message)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
