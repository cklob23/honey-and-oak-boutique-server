const express = require("express")
const router = express.Router()
const Cart = require("../models/Cart")
const Product = require("../models/Product")

// Get all carts
router.get("/", async (req, res) => {
  try {
    const carts = await Cart.find()
    res.json(carts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// Get cart
router.get("/:cartId", async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cartId)

    if (!cart) return res.status(404).json({ message: "Cart not found" })

    // Populate product info for each item
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId).lean()

        if (!product) return item // continue even if product missing

        return {
          ...item.toObject(),
          name: product.name,
          image: product.images?.[0]?.url || null,
          price: product.price,

          // NEW:
          availableSizes: product.sizes || [],
          availableColors: product.colors || [],
        }
      })
    )

    return res.json({
      ...cart.toObject(),
      items: enrichedItems,
    })

  } catch (error) {
    console.error("Cart GET error:", error)
    res.status(500).json({ message: "Failed to fetch cart" })
  }
})


// Create cart
router.post("/", async (req, res) => {
  try {
    const cart = new Cart({
      sessionId: req.body.sessionId,
      items: req.body.productId || [],
    })
    await cart.save()
    res.status(201).json(cart)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Add to cart
router.post("/:cartId/items", async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ error: "Product not found" })

    const cart = await Cart.findById(req.params.cartId)
    if (!cart) return res.status(404).json({ error: "Cart not found" })

    // Check if item already in cart
    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId && item.size === size && item.color === color,
    )

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cart.items.push({
        productId,
        name: product.name,
        price: product.salePrice || product.price,
        quantity,
        size,
        color,
        image: product.images[0]?.url,
      })
    }

    // Recalculate subtotal
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    await cart.save()
    res.json(cart)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Remove from cart
router.delete("/:cartId/items/:index", async (req, res) => {
  const { cartId, index } = req.params

  try {
    const cart = await Cart.findById(cartId)
    if (!cart) return res.status(404).json({ message: "Cart not found" })

    cart.items.splice(index, 1)
    await cart.save()

    res.json({ message: "Item removed", cart })

  } catch (error) {
    console.error("Remove item error:", error)
    res.status(500).json({ message: "Unable to remove item" })
  }
})


// Update cart item quantity
router.put("/:cartId/items/:index", async (req, res) => {
  const { cartId, index } = req.params
  const { size, color, quantity } = req.body

  try {
    const cart = await Cart.findById(cartId)
    if (!cart) return res.status(404).json({ message: "Cart not found" })

    const item = cart.items[index]
    if (!item) return res.status(404).json({ message: "Item not found" })

    const product = await Product.findById(item.productId)
    if (!product) return res.status(404).json({ message: "Product not found" })

    // Validate & update size
    if (size) {
      const isValidSize = product.sizes.some(s => s.size === size)

      if (!isValidSize) {
        return res.status(400).json({
          message: `Invalid size '${size}' for this product.`
        })
      }

      item.size = size
    }

    // Validate & update color
    if (color) {
      if (!product.colors.includes(color)) {
        return res.status(400).json({ message: `Invalid color '${color}' for this product.` })
      }
      item.color = color
    }

    // Update quantity
    if (quantity !== undefined) {
      item.quantity = Math.max(1, Number(quantity))
    }

    await cart.save()

    return res.json({ message: "Item updated", cart })

  } catch (error) {
    console.error("Cart item update error:", error)
    res.status(500).json({ message: "Failed to update item" })
  }
});


// Apply discount code
router.post("/:cartId/discount", async (req, res) => {
  try {
    const { code } = req.body
    const cart = await Cart.findById(req.params.cartId)
    if (!cart) return res.status(404).json({ error: "Cart not found" })

    // Simple discount logic (customize as needed)
    const discountPercentage = {
      WELCOME10: 0.1,
      SALE20: 0.2,
    }[code]

    if (!discountPercentage) return res.status(400).json({ error: "Invalid discount code" })

    cart.discountCode = code
    cart.discountAmount = cart.subtotal * discountPercentage
    await cart.save()
    res.json(cart)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
