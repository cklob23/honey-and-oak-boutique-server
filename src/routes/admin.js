const express = require("express")
const router = express.Router()
const Order = require("../models/Order")
const Product = require("../models/Product")
const Customer = require("../models/Customer")
const Inventory = require("../models/Inventory")

// Get all orders
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().populate("customerId").sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get order by ID
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId")
    if (!order) return res.status(404).json({ error: "Order not found" })
    res.json(order)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update order status
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!order) return res.status(404).json({ error: "Order not found" })
    // TODO: Send status update email to customer
    res.json(order)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get inventory
router.get("/inventory", async (req, res) => {
  try {
    const inventory = await Inventory.find().populate("productId")
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update inventory
router.put("/inventory/:id", async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!inventory) return res.status(404).json({ error: "Inventory not found" })
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get sales report
router.get("/reports/sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const query = {}

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    const orders = await Order.find(query)
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const totalOrders = orders.length
    const averageOrderValue = totalRevenue / totalOrders

    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      orders,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get inventory report
router.get("/reports/inventory", async (req, res) => {
  try {
    const inventory = await Inventory.find()
    const lowStockItems = inventory.filter((item) => item.quantity < item.restockThreshold)
    res.json({ lowStockItems, totalItems: inventory.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
