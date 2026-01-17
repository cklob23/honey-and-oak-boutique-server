const express = require("express")
const router = express.Router()
const Order = require("../models/Order")
const Product = require("../models/Product")
const Customer = require("../models/Customer")
const Inventory = require("../models/Inventory")
//const { sendOrderConfirmation, sendEmail } = require("../utils/email") // You'll need to create this

// ==================== ORDERS ====================

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

// // Update order status
// router.put("/orders/:id/status", async (req, res) => {
//   try {
//     const { status } = req.body
//     const order = await Order.findByIdAndUpdate(
//       req.params.id,
//       { status, updatedAt: new Date() },
//       { new: true },
//     ).populate("customerId")

//     if (!order) return res.status(404).json({ error: "Order not found" })

//     // Send status update email to customer
//     if (order.customerId?.email) {
//       try {
//         await sendEmail({
//           to: order.customerId.email,
//           subject: `Order ${order.orderNumber} - Status Update`,
//           html: `<p>Your order status has been updated to: <strong>${status}</strong></p>`,
//         })
//       } catch (emailError) {
//         console.error("Failed to send status email:", emailError)
//       }
//     }

//     res.json(order)
//   } catch (error) {
//     res.status(500).json({ error: error.message })
//   }
// })

// Update full order (tracking, notes, etc.)
router.put("/orders/:id", async (req, res) => {
  try {
    const { trackingNumber, status, notes, shippingAddress } = req.body
    const updateData = { updatedAt: new Date() }

    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate("customerId")

    if (!order) return res.status(404).json({ error: "Order not found" })
    res.json(order)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete/Cancel order
router.delete("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: "Order not found" })

    // Restore inventory for cancelled orders
    for (const item of order.items) {
      await Inventory.findOneAndUpdate(
        { productId: item.productId, size: item.size, color: item.color },
        { $inc: { quantity: item.quantity } },
      )
    }

    await Order.findByIdAndDelete(req.params.id)
    res.json({ message: "Order deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// // Send order email
// router.post("/orders/:id/email", async (req, res) => {
//   try {
//     const { type, customSubject, customMessage } = req.body
//     const order = await Order.findById(req.params.id).populate("customerId")

//     if (!order) return res.status(404).json({ error: "Order not found" })
//     if (!order.customerId?.email) return res.status(400).json({ error: "Customer has no email" })

//     let subject, html

//     switch (type) {
//       case "confirmation":
//         subject = `Order Confirmation - ${order.orderNumber}`
//         html = `
//           <h1>Thank you for your order!</h1>
//           <p>Order Number: ${order.orderNumber}</p>
//           <p>Total: $${order.total.toFixed(2)}</p>
//           <p>We'll notify you when your order ships.</p>
//         `
//         break
//       case "shipped":
//         subject = `Your Order Has Shipped - ${order.orderNumber}`
//         html = `
//           <h1>Your order is on its way!</h1>
//           <p>Order Number: ${order.orderNumber}</p>
//           ${order.trackingNumber ? `<p>Tracking Number: ${order.trackingNumber}</p>` : ""}
//         `
//         break
//       case "custom":
//         subject = customSubject || `Update on Order ${order.orderNumber}`
//         html = `<p>${customMessage}</p>`
//         break
//       default:
//         return res.status(400).json({ error: "Invalid email type" })
//     }

//     await sendEmail({
//       to: order.customerId.email,
//       subject,
//       html,
//     })

//     res.json({ message: "Email sent successfully" })
//   } catch (error) {
//     res.status(500).json({ error: error.message })
//   }
// })

// ==================== PAYMENTS ====================

// Get all payments (from orders)
router.get("/payments", async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus: { $exists: true },
    })
      .populate("customerId")
      .sort({ createdAt: -1 })

    // Transform orders to payment records
    const payments = orders.map((order) => ({
      _id: order._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      amount: order.total,
      method: order.paymentMethod || "card",
      status: order.paymentStatus || "completed",
      transactionId: order.transactionId || `TXN-${order._id.toString().slice(-8).toUpperCase()}`,
      createdAt: order.createdAt,
      refundedAmount: order.refundedAmount || 0,
    }))

    res.json(payments)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Process refund
router.post("/payments/:id/refund", async (req, res) => {
  try {
    const { amount, reason } = req.body
    const order = await Order.findById(req.params.id)

    if (!order) return res.status(404).json({ error: "Order not found" })

    const refundAmount = amount || order.total
    const currentRefunded = order.refundedAmount || 0

    if (currentRefunded + refundAmount > order.total) {
      return res.status(400).json({ error: "Refund amount exceeds order total" })
    }

    const newRefundedAmount = currentRefunded + refundAmount
    const newPaymentStatus = newRefundedAmount >= order.total ? "refunded" : "partially_refunded"

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        refundedAmount: newRefundedAmount,
        paymentStatus: newPaymentStatus,
        refundReason: reason,
        refundedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true },
    ).populate("customerId")

    // Return payment-formatted response
    res.json({
      _id: updatedOrder._id,
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      amount: updatedOrder.total,
      status: newPaymentStatus,
      refundedAmount: newRefundedAmount,
      refundReason: reason,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== INVENTORY ====================

// Get inventory
router.get("/inventory", async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate("productId")

    res.json(inventory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create inventory item
router.post("/inventory", async (req, res) => {
  try {
    const { productId, sku, size, color, quantity, restockThreshold } = req.body

    // Check if inventory entry already exists
    const existing = await Inventory.findOne({ productId, sku, size, color })
    if (existing) {
      return res.status(400).json({ error: "Inventory entry already exists for this product/size/color/sku" })
    }

    const inventory = new Inventory({
      productId,
      sku,
      size,
      color,
      quantity: quantity || 0,
      restockThreshold: restockThreshold || 1
    })

    await inventory.save()
    const populated = await Inventory.findById(inventory._id).populate("productId")
    res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update inventory
router.put("/inventory/:id", async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true },
    ).populate("productId")

    if (!inventory) return res.status(404).json({ error: "Inventory not found" })
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put("/inventory/:id/restock", async (req, res) => {
  const { quantity } = req.body

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Quantity must be a positive integer" })
  }

  try {
    // Find inventory item
    const inventory = await Inventory.findById(req.params.id)

    if (!inventory) {
      return res.status(404).json({ error: "Inventory item not found" })
    }

    // Update inventory quantity
    inventory.quantity += quantity
    await inventory.save()

    // Update product size stock
    const product = await Product.findById(inventory.productId)

    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    const sizeEntry = product.sizes.find(
      (s) => s.size === inventory.size
    )

    if (!sizeEntry) {
      return res.status(400).json({
        error: `Size ${inventory.size} not found on product`,
      })
    }

    sizeEntry.stock += quantity
    await product.save()

    res.json({
      message: "Inventory restocked successfully",
      inventory: {
        id: inventory._id,
        quantity: inventory.quantity,
      },
      product: {
        id: product._id,
        size: sizeEntry.size,
        stock: sizeEntry.stock,
      },
    })
  } catch (error) {
    console.error("Restock error:", error)
    res.status(500).json({ error: "Failed to restock inventory" })
  }
})


// Delete inventory item
router.delete("/inventory/:id", async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id)
    if (!inventory) return res.status(404).json({ error: "Inventory not found" })
    res.json({ message: "Inventory item deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== PRODUCTS ====================

// Get all products
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get product by ID
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create product
router.post("/products", async (req, res) => {
  try {
    const product = new Product(req.body)
    await product.save()

    if (product.sizes?.length && product.colors?.length) {
      const inventoryDocs = []

      for (const sizeObj of product.sizes) {
        for (const color of product.colors) {
          inventoryDocs.push({
            productId: product._id,
            size: sizeObj.size,
            sku: sizeObj.sku,
            color,
            quantity: sizeObj.stock ?? 0,
            restockThreshold: 1,
          })
        }
      }

      // Insert all at once (much faster + atomic-ish)
      await Inventory.insertMany(inventoryDocs, { ordered: false })
    }

    res.status(201).json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})


// Update product
router.put("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true },
    )
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete product
router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ error: "Product not found" })

    // Also delete associated inventory
    await Inventory.deleteMany({ productId: req.params.id })

    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== CUSTOMERS ====================

// Get all customers
router.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 })
    res.json(customers)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get customer by ID
router.get("/customers/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ error: "Customer not found" })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== REPORTS ====================

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

    const orders = await Order.find(query).populate("customerId")
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group by date for chart data
    const salesByDate = {}
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0]
      if (!salesByDate[date]) {
        salesByDate[date] = { date, revenue: 0, orders: 0 }
      }
      salesByDate[date].revenue += order.total || 0
      salesByDate[date].orders += 1
    })

    // Group by category
    const salesByCategory = {}
    orders.forEach((order) => {
      ; (order.items || []).forEach((item) => {
        const category = item.category || "Uncategorized"
        if (!salesByCategory[category]) {
          salesByCategory[category] = { category, revenue: 0, quantity: 0 }
        }
        salesByCategory[category].revenue += (item.price || 0) * (item.quantity || 1)
        salesByCategory[category].quantity += item.quantity || 1
      })
    })

    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      orders,
      salesByDate: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
      salesByCategory: Object.values(salesByCategory),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get inventory report
router.get("/reports/inventory", async (req, res) => {
  try {
    const inventory = await Inventory.find().populate("productId")
    const lowStockItems = inventory.filter((item) => item.quantity < (item.restockThreshold || 10))
    const outOfStockItems = inventory.filter((item) => item.quantity === 0)
    const totalValue = inventory.reduce((sum, item) => {
      const price = item.productId?.price || 0
      return sum + price * item.quantity
    }, 0)

    res.json({
      inventory,
      lowStockItems,
      outOfStockItems,
      totalItems: inventory.length,
      totalValue,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
