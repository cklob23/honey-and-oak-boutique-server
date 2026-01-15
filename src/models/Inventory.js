const mongoose = require("mongoose")

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  size: {
    type: String,
  },
  color: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  reserved: {
    type: Number,
    default: 0,
  },
  restockThreshold: {
    type: Number,
    default: 10,
  },
  lastRestocked: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Inventory", inventorySchema)
