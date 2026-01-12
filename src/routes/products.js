const express = require("express")
const router = express.Router()
const Product = require("../models/Product")

// Get all products
router.get("/", async (req, res) => {
  try {
    const { category, search, sort } = req.query
    const query = {}

    if (category) query.category = category
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    const sortObj = {}
    if (sort === "price-low") sortObj.price = 1
    if (sort === "price-high") sortObj.price = -1
    if (sort === "newest") sortObj.createdAt = -1

    const products = await Product.find(query).sort(sortObj).limit(100)
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get new arrivals
router.get("/new-arrivals", async (req, res) => {
  try {
    const products = await Product.find({ isNewArrival: true }).limit(8).sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get sale items
router.get("/sale-items", async (req, res) => {
  try {
    const products = await Product.find({ isSale: true }).limit(8).sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create product (admin)
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body)
    await product.save()
    res.status(201).json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update product (admin)
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Add product image (admin)
router.put("/:id/images", async (req, res) => {
  try {
    const { url, alt } = req.body;

    if (!url) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create image object
    const newImage = {
      url,
      alt
    };

    product.images.push(newImage);
    await product.save();

    res.json({
      message: "Image added successfully",
      image: newImage,
      product
    });
  } catch (error) {
    console.error("Error adding image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Remove product image (admin)
router.delete("/:id/images/:imageId", async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = product.images.find(img => img.id === imageId);
    if (!existing) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Remove image by ID
    product.images = product.images.filter(img => img.id !== imageId);
    await product.save();

    res.json({
      message: "Image removed successfully",
      removed: existing,
      product
    });
  } catch (error) {
    console.error("Error removing image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Delete product (admin)
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.json({ message: "Product deleted" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete ALL products (admin)
router.delete("/", async (req, res) => {
  try {
    const result = await Product.deleteMany({})

    res.status(200).json({
      message: "All products deleted successfully",
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Error deleting all products:", error)
    res.status(500).json({ message: "Failed to delete products" })
  }
})

module.exports = router
