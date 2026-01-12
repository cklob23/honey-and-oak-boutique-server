const express = require("express")
const router = express.Router()
const GiftCard = require("../models/GiftCard")
const Customer = require("../models/Customer")
const squareService = require("../services/squareService")
const locationId = process.env.SQUARE_LOCATION_ID

// List gift cards
router.get("/", async (req, res) => {
  try {
    const giftCards = await squareService.listGiftCards()
    res.status(200).json(giftCards)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create gift card
router.post("/", async (req, res) => {
  try {
    const { amount, recipientEmail, recipientName, senderName, senderEmail, message } = req.body

    const code = `HO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const giftCard = new GiftCard({
      amount,
      balance: amount,
      code,
      recipient: { email: recipientEmail, name: recipientName },
      sender: { name: senderName, email: senderEmail },
      message,
      type: "digital",
    })

    await giftCard.save()

    // TODO: Send email to recipient with gift card code

    res.status(201).json(giftCard)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get gift card by code
router.get("/:code", async (req, res) => {
  try {
    const giftCard = await GiftCard.findOne({ code: req.params.code })
    if (!giftCard) return res.status(404).json({ error: "Gift card not found" })
    res.json(giftCard)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Redeem gift card
router.post("/:code/redeem", async (req, res) => {
  try {
    const { customerId, amount } = req.body
    const giftCard = await GiftCard.findOne({ code: req.params.code })

    if (!giftCard) return res.status(404).json({ error: "Gift card not found" })
    if (giftCard.status !== "active") return res.status(400).json({ error: "Gift card is not active" })
    if (giftCard.balance < amount) return res.status(400).json({ error: "Insufficient balance" })

    giftCard.balance -= amount
    if (giftCard.balance === 0) {
      giftCard.status = "redeemed"
      giftCard.redeemedAt = new Date()
    }
    await giftCard.save()

    // Update customer gift card balance
    const customer = await Customer.findById(customerId)
    if (customer) {
      customer.giftCardBalance += amount
      await customer.save()
    }

    res.json(giftCard)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
