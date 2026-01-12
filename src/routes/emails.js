const express = require("express")
const router = express.Router()
const nodemailer = require("nodemailer")
const Order = require("../models/Order")

// Configure email service
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Send order confirmation
router.post("/order-confirmation", async (req, res) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId).populate("customerId")

    if (!order) return res.status(404).json({ error: "Order not found" })

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.customerId.email,
      subject: `Order Confirmation - ${order._id}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>Order ID: ${order._id}</p>
        <p>Total: $${(order.total / 100).toFixed(2)}</p>
        <p>Status: ${order.status}</p>
      `,
    }

    await transporter.sendMail(mailOptions)
    res.json({ message: "Email sent" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Send abandoned cart email
router.post("/abandoned-cart", async (req, res) => {
  try {
    const { customerEmail, cartItems, cartLink } = req.body

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: "You left items in your cart!",
      html: `
        <h1>Don't forget your items!</h1>
        <p>You have items waiting in your cart.</p>
        <a href="${cartLink}">Continue shopping</a>
      `,
    }

    await transporter.sendMail(mailOptions)
    res.json({ message: "Abandoned cart email sent" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
