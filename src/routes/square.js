const express = require("express")
const router = express.Router()
const squareService = require("../services/squareService")
const Customer = require("../models/Customer")

// Get all Square customers
router.get("/customers", async (req, res) => {
  try {
    const {
      search = "",
      sort = "A-Z"
    } = req.query;

    const squareResponse = await squareService.listCustomers();
    //console.log(squareResponse)
    const squareCustomers = squareResponse || [];

    // Apply search filtering
    const filtered = squareCustomers.filter((c) => {
      const t = search.toLowerCase();
      return (
        c.givenName?.toLowerCase().includes(t) ||
        c.familyName?.toLowerCase().includes(t) ||
        c.emailAddress?.toLowerCase().includes(t)
      );
    });

    // Sorting
    const sorters = {
      "A-Z": (a, b) => a.givenName.localeCompare(b.givenName),
      "Z-A": (a, b) => b.givenName.localeCompare(a.givenName),
      "NEWEST": (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      "OLDEST": (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    };

    filtered.sort(sorters[sort] || sorters["A-Z"]);

    res.json({
      customers: filtered,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to list customers" });
  }
})

// Get customer by ID
router.get("/customers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const squareRes = await squareService.retrieveCustomer(id);
    const sqCustomer = squareRes;

    // const hoCustomer = await Customer.findOne({
    //   squareCustomerId: id,
    // });
    console.log(sqCustomer)
    res.json({
      ...sqCustomer,
      //honeyOak: hoCustomer || {},
    });
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: "Customer not found" });
  }
})

// Get customer by email
router.get("/customers/search/:id", async (req, res) => {
  try {
    const customer = await squareService.searchCustomer(req.params.id)
    if (!customer) return res.status(404).json({ message: "Customer not found" })
    res.json(customer)
  } catch (error) {
    res.status(404).json({ message: "Customer not found" })
  }
})

// Create customer
router.post("/customers", async (req, res) => {
  const { firstName, lastName, emailAddress, phoneNumber } = req.body;
  //console.log(firstName, lastName, email, phoneNumber)
  try {
    // 1. Create in Square
    const squareRes = await squareService.createCustomer({
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
    });

    const sq = squareRes;
    //console.log(sq)
    // 2. Create in Mongo (Honey & Oak)
    const ho = await Customer.create({
      squareCustomerId: sq.id,
      email: emailAddress,
      firstName,
      lastName,
      phoneNumber,
      role: "customer",
    });

    res.json({
      square: sq,
      honeyOak: ho,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to create customer" });
  }
})

router.put("/customers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { firstName, lastName, email, phoneNumber, preferences } = req.body;

    // 1. Update in Square
    await squareService.updateCustomer(id, {
      givenName: firstName,
      familyName: lastName,
      emailAddress: email,
      phoneNumber,
    });

    // 2. Update in Mongo
    const updated = await Customer.findOneAndUpdate(
      { squareCustomerId: id },
      {
        firstName,
        lastName,
        email,
        phoneNumber,
        preferences,
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update customer" });
  }
})

router.delete("/customers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await squareService.deleteCustomer(id);
    await Customer.findOneAndDelete({ squareCustomerId: id });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete customer" });
  }
})

module.exports = router
