const express = require("express")
const router = express.Router()
const Order = require("../models/Order")
const Product = require("../models/Product")

// Get sales report data
router.get("/sales", async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query

    const query = {}
    const dateRange = new Date()

    // Set date range based on period
    if (period === "last-7") {
      dateRange.setDate(dateRange.getDate() - 7)
    } else if (period === "last-30") {
      dateRange.setDate(dateRange.getDate() - 30)
    } else if (period === "last-90") {
      dateRange.setDate(dateRange.getDate() - 90)
    } else if (period === "year") {
      dateRange.setFullYear(dateRange.getFullYear() - 1)
    }

    query.createdAt = { $gte: dateRange }

    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)

    const orders = await Order.find(query).populate("items.productId")

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const refundedOrders = orders.filter((o) => o.status === "refunded").length
    const refundRate = totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0

    // Sales by category
    const salesByCategory = {}
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.productId?.category || "Unknown"
        salesByCategory[category] = (salesByCategory[category] || 0) + item.quantity
      })
    })

    // Format data for export
    const salesData = orders.map((order) => ({
      orderId: order._id,
      date: order.createdAt,
      total: order.total,
      status: order.status,
      itemCount: order.items.length,
    }))

    res.json({
      salesData,
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        refundRate,
      },
      salesByCategory,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get inventory report
router.get("/inventory", async (req, res) => {
  try {
    const products = await Product.find()

    const inventoryData = products.map((product) => ({
      productId: product._id,
      name: product.name,
      category: product.category,
      price: product.price,
      totalStock: product.sizes ? product.sizes.reduce((sum, s) => sum + (s.stock || 0), 0) : 0,
    }))

    const lowStockItems = inventoryData.filter((item) => item.totalStock < 10)

    res.json({
      inventoryData,
      lowStockItems,
      totalProducts: products.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
