const mongoose = require("mongoose")

const giftCardSchema = new mongoose.Schema({
  squareGiftCardId: String,
  amount: {
    type: Number,
    required: true,
    min: 10,
  },
  balance: {
    type: Number,
    required: true,
  },
  code: {
    type: String,
    unique: true,
    required: true,
  },
  type: {
    type: String,
    enum: ["digital", "physical"],
    default: "digital",
  },
  recipient: {
    email: String,
    name: String,
  },
  sender: {
    name: String,
    email: String,
  },
  message: String,
  status: {
    type: String,
    enum: ["active", "redeemed", "expired"],
    default: "active",
  },
  expiresAt: Date,
  redeemedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("GiftCard", giftCardSchema)
