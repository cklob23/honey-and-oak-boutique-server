const express = require("express")
const stripe = require("../services/stripe")
const bodyParser = require("body-parser")
const Order = require("../models/Order")
const Cart = require("../models/Cart")
const Customer = require("../models/Customer")

const router = express.Router()

router.post(
  "/webhooks/stripe",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"]

    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      return res.status(400).send("Webhook Error")
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object

      const { cartId, customerId } = session.metadata

      const cart = await Cart.findById(cartId)
      const customer = await Customer.findById(customerId)

      if (!cart || !customer) return res.json({ received: true })

      const order = new Order({
        stripeSessionId: session.id,
        customerId: customer._id,
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax || 0,
        shipping: cart.shipping || 0,
        total:
          cart.subtotal +
          (cart.tax || 0) +
          (cart.shipping || 0) -
          cart.discountAmount -
          cart.giftCardAmount,
        discountCode: cart.discountCode,
        discountAmount: cart.discountAmount,
        giftCardUsed: cart.giftCardAmount,
        paymentMethod: "stripe",
        paymentProvider: "stripe",
        status: "processing",
        shippingAddress: session.shipping_details?.address,
      })

      await order.save()

      customer.orders.push(order._id)
      await customer.save()

      await Cart.findByIdAndDelete(cartId)
    }

    res.json({ received: true })
  }
)

module.exports = router
