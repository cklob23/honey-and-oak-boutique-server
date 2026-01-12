const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

router.get("/suggestions", async (req, res) => {
  const query = (req.query.q || "").toLowerCase().trim();

  // Default suggestions if user hasn't typed yet
  if (!query) {
    return res.json({
      suggestions: ["shirts", "linen pants", "brown dress", "summer tops"],
      categories: ["shirts", "pants", "sets", "accessories"],
      products: []
    });
  }

  // "AI" suggestions (you can upgrade to GPT later)
  const aiSuggestions = [
    `${query} outfit ideas`,
    `${query} styles`,
    `best ${query} for women`
  ];

  // Find matching category names
  const categories = await Product.distinct("category", {
    category: { $regex: query, $options: "i" }
  });

  // Find product matches
  const products = await Product.find({
    name: { $regex: query, $options: "i" }
  })
    .limit(5)
    .select("name price images");

  res.json({
    suggestions: aiSuggestions,
    categories,
    products
  });
});

router.get("/products", async (req, res) => {
  const query = req.query.q?.trim().toLowerCase() || "";
  const category = req.query.category?.trim().toLowerCase() || "";

  let mongoQuery = {};

  // If category search mode
  if (category) {
    mongoQuery.category = { $regex: category, $options: "i" };
  }

  // If keyword search mode
  if (query) {
    mongoQuery.name = { $regex: query, $options: "i" };
  }

  const products = await Product.find(mongoQuery);

  res.json(products);
});

module.exports = router;
