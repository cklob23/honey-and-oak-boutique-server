const mongoose = require("mongoose")

const cartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  sessionId: String,
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      name: String,
      price: Number,
      quantity: {
        type: Number,
        min: 1,
        default: 1,
      },
      size: String,
      color: String,
      image: String,
    },
  ],
  subtotal: {
    type: Number,
    default: 0,
  },
  discountCode: String,
  discountAmount: {
    type: Number,
    default: 0,
  },
  giftCardCode: String,
  giftCardAmount: {
    type: Number,
    default: 0,
  },
  abandonedAt: Date,
  notificationSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Cart", cartSchema)
