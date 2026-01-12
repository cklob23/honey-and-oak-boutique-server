const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()
const cookieParser = require("cookie-parser");

const productRoutes = require("./src/routes/products")
const cartRoutes = require("./src/routes/cart")
const checkoutRoutes = require("./src/routes/checkout")
const giftCardRoutes = require("./src/routes/giftCards")
const adminRoutes = require("./src/routes/admin")
const customerRoutes = require("./src/routes/customers")
const emailRoutes = require("./src/routes/emails")
const authRoutes = require("./src/routes/auth")
const oauthRoutes = require("./src/routes/oauth")
const reportsRoutes = require("./src/routes/reports")
const squareRoutes = require("./src/routes/square")
const searchRoutes = require("./src/routes/search")
const stripeWebhook = require("./src/routes/stripeWebhook")
const { monitorAbandonedCarts, monitorOrderUpdates } = require("./src/middleware/notificationHandler")

const app = express()

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true, 
}));
app.use(express.json())
app.use(cookieParser())

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/checkout", checkoutRoutes)
app.use("/api/gift-cards", giftCardRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/customers", customerRoutes)
app.use("/api/emails", emailRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/oauth", oauthRoutes)
app.use("/api/reports", reportsRoutes)
app.use("/api/square", squareRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/stripeWebhook", stripeWebhook)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error", message: err.message })
})

// Run notification monitors every 30 minutes
setInterval(
  () => {
    monitorAbandonedCarts()
    monitorOrderUpdates()
  },
  30 * 60 * 1000,
)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
