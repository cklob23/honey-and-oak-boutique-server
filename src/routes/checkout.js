/**
 * Square Checkout Router - Express.js backend route
 * Replace your existing checkout router with this for Square integration
 *
 * Required environment variables:
 * - SQUARE_ACCESS_TOKEN (production) or SQUARE_ACCESS_TOKEN_S (sandbox)
 * - SQUARE_ENVIRONMENT ('production' or 'sandbox')
 * - SQUARE_LOCATION_ID
 */

const express = require("express")
const router = express.Router()
const squareService = require("../services/squareService")
const Cart = require("../models/Cart")

// Helper to handle BigInt serialization
BigInt.prototype.toJSON = function () {
  return this.toString()
}

/**
 * POST /api/checkout/square
 * Process payment using Square Web Payments SDK token
 */
router.post("/square", async (req, res) => {
  try {
    const { cartId, sourceId, email, shipping = 0, deliveryMethod, verificationToken } = req.body

    if (!cartId) {
      return res.status(400).json({ error: "Missing cartId" })
    }

    if (!sourceId) {
      return res.status(400).json({ error: "Missing payment token" })
    }

    const cart = await Cart.findById(cartId)
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" })
    }

    // Calculate totals server-side (authoritative)
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const taxRate = 0.0775
    const tax = subtotal * taxRate
    const total = subtotal + tax + shipping

    // Square requires integer cents
    const amountCents = Math.round(total * 100)

    // Square minimum is typically $1.00 (100 cents)
    const finalAmount = Math.max(amountCents, 100)

    // Process payment with Square
    const payment = await squareService.processPayment(sourceId, finalAmount, email)

    if (payment) {
      // Payment successful
      res.json({
        success: true,
        paymentId: payment.id,
        status: payment.status,
        receiptUrl: payment.receiptUrl,
        metadata: {
          cartId: cart._id.toString(),
          shipping: shipping.toString(),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          deliveryMethod,
        },
      })
    } else {
      res.status(400).json({
        success: false,
        error: "Payment processing failed",
      })
    }
  } catch (err) {
    console.error("Square checkout error:", err)
    res.status(500).json({
      error: err.message || "Unable to process payment",
    })
  }
})

/**
 * POST /api/checkout/square/preview
 * Creates a payment preview for side cart
 */
router.post("/square/preview", async (req, res) => {
  try {
    const { cartId } = req.body

    if (!cartId) {
      return res.status(400).json({ error: "Missing cartId" })
    }

    const cart = await Cart.findById(cartId)
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" })
    }

    // Calculate totals server-side (authoritative)
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const taxRate = 0.07
    const tax = subtotal * taxRate
    const shipping = subtotal > 100 ? 0 : 10
    const total = subtotal + tax + shipping

    res.json({
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      totalCents: Math.round(total * 100),
    })
  } catch (err) {
    console.error("Checkout preview error:", err)
    res.status(500).json({ error: "Unable to calculate totals" })
  }
})

/**
 * POST /api/checkout/square/direct
 * Process direct product purchase (Apple Pay from product page)
 */
router.post("/square/direct", async (req, res) => {
  try {
    const {
      sourceId,
      productId,
      quantity,
      size,
      color,
      customerId,
      email,
      amountCents,
      currency,
      paymentMethod,
      shippingAddress,
    } = req.body

    if (!sourceId) {
      return res.status(400).json({ error: "Missing payment token" })
    }

    if (!productId) {
      return res.status(400).json({ error: "Missing productId" })
    }

    // Fetch the product to verify pricing
    const Product = require("../models/Product")
    const product = await Product.findById(productId)

    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    // Recalculate server-side for security
    const itemTotal = product.price * quantity
    const taxRate = 0.07
    const tax = itemTotal * taxRate
    const shipping = itemTotal > 100 ? 0 : 10
    const total = itemTotal + shipping + tax
    const serverAmountCents = Math.round(total * 100)

    // Verify amount matches (allow small rounding difference)
    if (Math.abs(serverAmountCents - amountCents) > 2) {
      return res.status(400).json({
        error: "Price mismatch - please refresh and try again",
      })
    }

    // Process payment with Square
    const payment = await squareService.processPayment(sourceId, serverAmountCents, email)

    if (payment) {
      // Create order record
      const Order = require("../models/Order")
      const order = new Order({
        customerId: customerId || null,
        email,
        items: [
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity,
            size,
            color,
            image: product.images?.[0]?.url,
          },
        ],
        subtotal: itemTotal,
        tax,
        shipping,
        total,
        paymentId: payment.id,
        paymentMethod,
        status: "paid",
        shippingAddress,
      })

      await order.save()

      res.json({
        success: true,
        paymentId: payment.id,
        orderId: order._id,
        status: payment.status,
        receiptUrl: payment.receiptUrl,
      })
    } else {
      res.status(400).json({
        success: false,
        error: "Payment processing failed",
      })
    }
  } catch (err) {
    console.error("Square direct checkout error:", err)
    res.status(500).json({
      error: err.message || "Unable to process payment",
    })
  }
})

/**
 * GET /api/checkout/square/payment/:paymentId
 * Retrieve payment details by ID
 */
router.get("/square/payment/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params
    const payment = await squareService.getPayment(paymentId)

    res.json({
      id: payment.id,
      status: payment.status,
      amountMoney: payment.amountMoney,
      receiptUrl: payment.receiptUrl,
      createdAt: payment.createdAt,
    })
  } catch (err) {
    console.error("Get payment error:", err)
    res.status(404).json({ error: "Payment not found" })
  }
})

module.exports = router
