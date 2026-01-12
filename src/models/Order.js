const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema({
  squareOrderId: String,
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      name: String,
      price: Number,
      quantity: Number,
      size: String,
      color: String,
    },
  ],
  subtotal: Number,
  tax: Number,
  shipping: Number,
  total: Number,
  discountCode: String,
  discountAmount: Number,
  giftCardUsed: Number,
  paymentMethod: {
    type: String,
    enum: ["card", "cash_app", "affirm", "apple_pay", "google_pay", "shop_pay", "gift_card"],
  },
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  trackingNumber: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Order", orderSchema)
