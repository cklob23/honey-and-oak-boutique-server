const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  squareCustomerId: {
    type: String,
    required: true,
    unique: true,
  },

  email: {
    type: String,
    lowercase: true,
    required: true,
  },

  role: { type: String, enum: ["customer", "admin"], default: "customer" },

  firstName: String,
  lastName: String,
  phoneNumber: String,

  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },

  // Honey & Oak–specific fields (Square does not store these)
  preferences: {
    sizes: {
      tops: [String],
      bottoms: [String],
      sets: [String],
      dresses: [String],
    },
    colors: [String],
  },

  subscribedToNewsletter: { type: Boolean, default: false },
  subscribedToSales: { type: Boolean, default: false },

  giftCardBalance: { type: Number, default: 0 },

  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  // Session & security
  passwordHash: String,
  sessionToken: String,
  sessionExpiry: Date,
  lastPasswordReset: { type: Date, default: Date.now },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Customer", customerSchema);