const express = require("express")
const router = express.Router()
const Customer = require("../models/Customer")

// Get all customers
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find()
    res.json(customers)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate("orders")
    if (!customer) return res.status(404).json({ error: "Customer not found" })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create customer
router.post("/", async (req, res) => {
  try {
    const customer = new Customer(req.body)
    await customer.save()
    res.status(201).json(customer)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update customer
router.put("/:id", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!customer) return res.status(404).json({ error: "Customer not found" })
    res.json(customer)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id)
    if (!customer) return res.status(404).json({ error: "Customer not found" })
    res.json({ message: "Customer deleted" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Subscribe to newsletter
router.post("/:id/subscribe-newsletter", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { subscribedToNewsletter: true }, { new: true })
    // TODO: Send welcome email
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Subscribe to sales notifications
router.post("/:id/subscribe-sales", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { subscribedToSales: true }, { new: true })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post("/:id/favorites", async (req, res) => {
  const { productId } = req.body
  const customerId = req.params.id

  try {
    const customer = await Customer.findByIdAndUpdate(customerId, {
      $addToSet: { favorites: productId }
    })
    res.json({ message: "Product favorited successfully." })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete("/:id/favorites/:productId", async (req, res) => {
  const { productId } = req.params
  const customerId = req.params.id

  try {
    await Customer.findByIdAndUpdate(customerId, {
      $pull: { favorites: productId }
    })
    res.json({ message: "Product unfavorited successfully." })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete("/:id/favorites", async (req, res) => {
  try {
    const customerId = req.params.id;

    await Customer.findByIdAndUpdate(customerId, {
      $set: { favorites: [] }
    });

    res.json({ message: "Favorites cleared." });
  } catch (error) {
    console.error("Failed to clear favorites:", error);
    res.status(500).json({ message: "Server error" });
  }
})

router.get("/:id/favorites/products", async (req, res) => {
  const customerId = req.params.id

  // Get the user and populate product data
  const customer = await Customer.findById(customerId).populate("favorites")

  res.json(customer.favorites)
})

router.get("/:id/favorites", async (req, res) => {
  const customerId = req.params.id

  const customer = await Customer.findById(customerId)

  res.json(customer.favorites)
})

router.put("/:id/preferences", async (req, res) => {
  try {
    const { sizes, colors } = req.body

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "preferences.sizes": sizes || [],
          "preferences.colors": colors || []
        }
      },
      { new: true }
    )

    res.json(customer)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to update preferences" })
  }
})


module.exports = router
