const Cart = require("../models/Cart")
const Order = require("../models/Order")
const nodemailer = require("nodemailer")

// Configure email service
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Monitor abandoned carts
const monitorAbandonedCarts = async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

    const abandonedCarts = await Cart.find({
      abandonedAt: { $lt: twoHoursAgo },
      notificationSent: false,
    }).populate("customerId")

    for (const cart of abandonedCarts) {
      if (cart.customerId && cart.customerId.email) {
        // Send abandoned cart email
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: cart.customerId.email,
          subject: "You left items in your Honey & Oak cart",
          html: `
            <h1>Don't forget your items!</h1>
            <p>You have ${cart.items.length} items waiting in your cart.</p>
            <a href="${process.env.FRONTEND_URL}/cart">Complete Your Purchase</a>
          `,
        }

        await transporter.sendMail(mailOptions)

        // Mark notification as sent
        cart.notificationSent = true
        await cart.save()
      }
    }

    console.log(`Sent ${abandonedCarts.length} abandoned cart notifications`)
  } catch (error) {
    console.error("Error monitoring abandoned carts:", error)
  }
}

// Monitor order status updates
const monitorOrderUpdates = async () => {
  try {
    const recentOrders = await Order.find({
      updatedAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) },
    }).populate("customerId")

    for (const order of recentOrders) {
      if (order.customerId && order.customerId.email) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: order.customerId.email,
          subject: `Order ${order._id} Status Update`,
          html: `
            <h1>Order Status Updated</h1>
            <p>Your order ${order._id} is now ${order.status}</p>
            ${order.trackingNumber ? `<p>Tracking: ${order.trackingNumber}</p>` : ""}
          `,
        }

        await transporter.sendMail(mailOptions)
      }
    }
  } catch (error) {
    console.error("Error monitoring order updates:", error)
  }
}

module.exports = {
  monitorAbandonedCarts,
  monitorOrderUpdates,
}
