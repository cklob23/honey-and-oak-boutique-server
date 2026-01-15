const express = require("express")
const router = express.Router()
const Order = require("../models/Order")
const Product = require("../models/Product")

// Get sales report data
router.get("/sales", async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query

    const now = new Date()

    const getPeriodRange = (period) => {
      const end = new Date(now)
      const start = new Date(now)

      switch (period) {
        case "last-7":
          start.setDate(end.getDate() - 7)
          break
        case "last-30":
          start.setDate(end.getDate() - 30)
          break
        case "last-90":
          start.setDate(end.getDate() - 90)
          break
        case "year":
          start.setFullYear(end.getFullYear() - 1)
          break
        default:
          start.setDate(end.getDate() - 30)
      }

      return { start, end }
    }

    // ---------- CURRENT PERIOD ----------
    let currentRange = getPeriodRange(period)

    if (startDate && endDate) {
      currentRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }

    const currentOrders = await Order.find({
      createdAt: {
        $gte: currentRange.start,
        $lte: currentRange.end,
      },
    }).populate("items.productId")

    // ---------- PREVIOUS PERIOD ----------
    const periodLengthMs = currentRange.end - currentRange.start

    const previousRange = {
      start: new Date(currentRange.start.getTime() - periodLengthMs),
      end: new Date(currentRange.start.getTime()),
    }

    const previousOrders = await Order.find({
      createdAt: {
        $gte: previousRange.start,
        $lte: previousRange.end,
      },
    })

    // ---------- METRICS ----------
    const calcMetrics = (orders) => {
      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
      const totalOrders = orders.length
      const averageOrderValue =
        totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
      const refunded = orders.filter((o) => o.status === "refunded").length
      const refundRate =
        totalOrders > 0 ? (refunded / totalOrders) * 100 : 0

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        refundRate,
      }
    }

    const currentMetrics = calcMetrics(currentOrders)
    const previousMetrics = calcMetrics(previousOrders)

    // ---------- DAILY SALES DATA ----------
    const salesByDay = {}

    currentOrders.forEach((order) => {
      const day = order.createdAt.toISOString().split("T")[0]
      salesByDay[day] = (salesByDay[day] || 0) + order.total
    })

    const salesData = Object.entries(salesByDay).map(([date, total]) => ({
      date,
      total,
    }))

    // ---------- SALES BY CATEGORY (REVENUE) ----------
    const salesByCategory = {}

    currentOrders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.productId?.category || "unknown"
        const itemRevenue = item.price * item.quantity

        salesByCategory[category] =
          (salesByCategory[category] || 0) + itemRevenue
      })
    })

    // ---------- RESPONSE ----------
    res.json({
      metrics: {
        ...currentMetrics,
        previousPeriod: previousMetrics,
      },
      salesData,
      salesByCategory,
    })
  } catch (error) {
    console.error("Sales report error:", error)
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
