const express = require("express")
const router = express.Router()
const stripe = require("../services/stripe")
const Cart = require("../models/Cart")

/**
 * POST /api/checkout
 * Creates a Stripe PaymentIntent based on cart + shipping + tax
 */
router.post("/", async (req, res) => {
  try {
    const { cartId, shipping = 0, email } = req.body

    if (!cartId) {
      return res.status(400).json({ error: "Missing cartId" })
    }

    const cart = await Cart.findById(cartId)
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" })
    }

    // Calculate totals server-side (authoritative)
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    const taxRate = 0.0775
    const tax = subtotal * taxRate
    const total = subtotal + tax + shipping

    // Stripe requires integer cents
    let amount = Math.round(total * 100)

    // Stripe minimum (50¢ USD)
    amount = Math.max(amount, 50)

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata: {
        cartId: cart._id.toString(),
        shipping: shipping.toString(),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
      },
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error("Checkout error:", err)
    res.status(500).json({ error: "Unable to create payment intent" })
  }
})

/**
 * POST /api/checkout/preview
 * Creates a Stripe PaymentIntent preview for side cart based on cart + shipping + tax
 */
router.post("/preview", async (req, res) => {
  try {
    const { cartId, totalCents } = req.body

    if (!cartId) {
      return res.status(400).json({ error: "Missing cartId" })
    }

    const cart = await Cart.findById(cartId)
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" })
    }

    // Calculate totals server-side (authoritative)
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    const taxRate = 0.07
    const tax = subtotal * taxRate
    const shipping = subtotal > 100 ? 0 : 10
    const total = subtotal + tax + shipping

    // Stripe requires integer cents
    let amount = Math.round(total * 100)

    // Stripe minimum (50¢ USD)
    amount = Math.max(amount, 50)

    console.log(amount)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        cartId: cart._id.toString(),
      },
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error("Checkout error:", err)
    res.status(500).json({ error: "Unable to create payment intent" })
  }
})

module.exports = router
