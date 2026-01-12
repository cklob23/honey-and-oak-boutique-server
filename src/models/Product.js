const mongoose = require("mongoose")

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    min: 0,
  },
  category: {
    type: String,
    enum: ["tops", "bottoms", "dresses", "sets", "accessories", "self-care"],
    required: true,
  },
  images: [
    {
      url: String,
      alt: String,
    },
  ],
  sizes: [
    {
      size: String,
      stock: Number,
    },
  ],
  colors: [String],
  material: String,
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviews: Number,
  sizeChart: {
    measurements: mongoose.Schema.Types.Mixed,
    image: String,
  },
  care: {
    type: String,
  },
  isNewArrival: {
    type: Boolean,
    default: true,
  },
  isSale: {
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

module.exports = mongoose.model("Product", productSchema)
