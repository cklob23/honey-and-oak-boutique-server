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

    /**
     *  Exchange code → tokens
     */
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

    /**
     *  Fetch Google profile
     */
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    const {
      email,
      given_name: firstName,
      family_name: lastName,
    } = profileRes.data

    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login`)
    }

    /**
     *  Find or create Square customer
     */
    let squareCustomer = await squareService.searchCustomer(email)
    let squareId = squareCustomer?.id || null
    //let phoneNumber = "555-555-5555"

    if (!squareCustomer) {
    console.log( uuidv4(),
        email,
        firstName,
        lastName,
        null)
      const newSquareCustomer = await squareService.createCustomer(
        uuidv4(),
        email,
        firstName,
        lastName,
        phoneNumber
      )
      squareId = newSquareCustomer.id
    }

    /**
     *  Find or create Customer
     */
    let customer = await Customer.findOne({ email })

    if (!customer) {
      // SIGN UP
      customer = new Customer({
        squareCustomerId: squareId,
        email,
        passwordHash: null, // Google users have no password
        firstName,
        lastName,
        phoneNumber: null,
        role: "customer",
        subscribedToNewsletter: false,
        subscribedToSales: false,
      })

      await customer.save()
    }

    /**
     *  Issue JWT + cookie (same as /login)
     */
    const token = createJwt(customer._id, customer.email)

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await Customer.updateOne(
      { email },
      {
        $set: {
          sessionToken: token,
          sessionExpiry: expiry,
        },
      }
    )

    res.redirect(`${process.env.FRONTEND_URL}/oauth/success`)

  } catch (err) {
    console.error("Google OAuth error:", err.response?.data || err.message)
    res.status(500).json({ message: "Server error" });
  }
})

module.exports = router
