const express = require("express")
const router = express.Router()
const stripe = require("../services/stripe")
const Customer = require("../models/Customer")
const Cart = require("../models/Cart")

/**
 * POST /api/checkout
 * Creates Stripe Checkout Session
 */
router.post("/", async (req, res) => {
  try {
    const { cartId, customerId } = req.body

    const cart = await Cart.findById(cartId)
    if (!cart) return res.status(404).json({ error: "Cart not found" })

    const customer = await Customer.findById(customerId)
    if (!customer) return res.status(404).json({ error: "Customer not found" })

    const amount = Math.round(
      cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ) * 100
    )

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: customer.email,
      metadata: {
        cartId: cart._id.toString(),
        customerId: customer._id.toString(),
      },
    })

    // 🔑 THIS is what the frontend needs
    res.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Unable to create payment intent" })
  }
})


module.exports = router
