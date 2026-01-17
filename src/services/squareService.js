/**
 * Updated Square Service with additional payment methods
 * This extends your existing squareService with Apple Pay and Google Pay support
 *
 * Required environment variables:
 * - SQUARE_ACCESS_TOKEN (production) or SQUARE_ACCESS_TOKEN_S (sandbox)
 * - SQUARE_ENVIRONMENT ('production' or 'sandbox')
 * - SQUARE_LOCATION_ID
 */

const { SquareClient, SquareEnvironment } = require("square")
const { v4: uuidv4 } = require("uuid")

const client = new SquareClient({
  environment:
    process.env.SQUARE_ENVIRONMENT === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  token:
    process.env.SQUARE_ENVIRONMENT === "production"
      ? process.env.SQUARE_ACCESS_TOKEN
      : process.env.SQUARE_ACCESS_TOKEN_S,
})

const locationId = process.env.SQUARE_LOCATION_ID

// Helper function to convert BigInt to string for JSON serialization
function bigIntToString(obj) {
  return JSON.parse(JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? value.toString() : value)))
}

const squareService = {
  /**
   * Process payment with Square - supports Card, Apple Pay, Google Pay
   * @param sourceId - The payment token from Web Payments SDK (card, Apple Pay, or Google Pay)
   * @param amount - Amount in cents (integer)
   * @param email - Buyer's email address
   * @param options - Additional options for payment
   */
  async processPayment(sourceId, amount, email, options = {}) {
    try {
      const paymentRequest = {
        idempotencyKey: uuidv4(),
        sourceId: sourceId,
        amountMoney: {
          amount: BigInt(amount),
          currency: "USD",
        },
        locationId: locationId,
        autocomplete: true, // Automatically complete the payment
      }

      // Add buyer email if provided
      if (email) {
        paymentRequest.buyerEmailAddress = email
      }

      // Add verification token if provided (for Strong Customer Authentication)
      if (options.verificationToken) {
        paymentRequest.verificationToken = options.verificationToken
      }

      // Add note/description if provided
      if (options.note) {
        paymentRequest.note = options.note
      }

      // Add reference ID if provided (for linking to external order systems)
      if (options.referenceId) {
        paymentRequest.referenceId = options.referenceId
      }

      const response = await client.payments.create(paymentRequest)
      return bigIntToString(response.payment)
    } catch (error) {
      console.error("Error processing payment:", error)
      throw error
    }
  },

  /**
   * Process payment with verification (Strong Customer Authentication)
   * Use this for payments that require additional buyer verification
   */
  async processPaymentWithVerification(sourceId, amount, email, verificationToken) {
    return this.processPayment(sourceId, amount, email, { verificationToken })
  },

  /**
   * Get payment details by ID
   */
  async getPayment(paymentId) {
    try {
      const response = await client.payments.get({ paymentId: paymentId })
      return bigIntToString(response.payment)
    } catch (error) {
      console.error("Error getting payment:", error)
      throw error
    }
  },

  /**
   * Refund a payment
   * @param paymentId - The payment to refund
   * @param amount - Amount to refund in cents (optional, defaults to full refund)
   * @param reason - Reason for refund
   */
  async refundPayment(paymentId, amount = null, reason = "") {
    try {
      const refundRequest = {
        idempotencyKey: uuidv4(),
        paymentId: paymentId,
        reason: reason,
      }

      if (amount) {
        refundRequest.amountMoney = {
          amount: BigInt(amount),
          currency: "USD",
        }
      }

      const response = await client.refunds.refundPayment(refundRequest)
      return bigIntToString(response.refund)
    } catch (error) {
      console.error("Error refunding payment:", error)
      throw error
    }
  },

  /**
   * List recent payments
   * @param options - Filter options (beginTime, endTime, limit, cursor)
   */
  async listPayments(options = {}) {
    try {
      const response = await client.payments.list({
        locationId: locationId,
        ...options,
      })
      return bigIntToString(response.payments || [])
    } catch (error) {
      console.error("Error listing payments:", error)
      throw error
    }
  },

  /**
  * List customers
  */
  async listCustomers() {
    try {
      let allCustomers = [];
      let cursor = null;

      do {
        // Call Square API with the cursor if it exists
        const response = await client.customers.list({
          cursor: cursor || undefined,
        });

        const customers = response.response.customers || [];
        allCustomers = allCustomers.concat(customers);

        cursor = response.response.cursor || null; // If null, pagination ends
      } while (cursor);

      //console.log(`Total customers fetched: ${allCustomers.length}`);

      return bigIntToString(allCustomers);

    } catch (error) {
      console.error("Error listing customers:", error);
      throw error;
    }
  },

  /**
   * Create customer
   */
  async createCustomer(emailAddress, firstName, lastName, phoneNumber) {
    const uid = uuidv4()

    try {
      const body = {
        idempotencyKey: uid,
        emailAddress: emailAddress || undefined,
        givenName: firstName || undefined,
        familyName: lastName || undefined,
        phoneNumber: phoneNumber || undefined,
      }

      Object.keys(body).forEach((key) => body[key] === undefined && delete body[key])

      const response = await client.customers.create(body)
      return bigIntToString(response.customer)
    } catch (error) {
      console.error("Error creating Square customer:", error)
      throw error
    }
  },

  // Retrieve customer
  async retrieveCustomer(customerId) {
    try {
      const response = await client.customers.get({
        customerId
      });
      const customer = response.customer
      return bigIntToString(customer)
    } catch (error) {
      console.error("Error retrieving customer:", error.statusCode, error.errors)
      throw error
    }
  },

  // Search for customer
  async searchCustomer(email) {
    try {
      const response = await client.customers.search({
        query: {
          filter: {
            emailAddress: {
              exact: email,
            },
          },
        },
      });
      const customer = response.customers[0] || {}
      return bigIntToString(customer)
    } catch (error) {
      return null
    }
  },

  // Delete customer
  async deleteCustomer(customerId) {
    try {
      await client.customers.delete({
        customerId
      });
    } catch (error) {
      console.error("Error deleting customer:", error.statusCode, error.errors)
      throw error
    }
  },

  /**
   * Create order with line items
   */
  async createOrder(customerId, lineItems, fulfillments = null) {
    try {
      const orderRequest = {
        idempotencyKey: uuidv4(),
        order: {
          locationId: locationId,
          lineItems: lineItems.map((item) => ({
            name: item.name,
            quantity: item.quantity.toString(),
            basePriceMoney: {
              amount: BigInt(Math.round(item.price * 100)),
              currency: "USD",
            },
          })),
        },
      }

      if (customerId) {
        orderRequest.order.customerId = customerId
      }

      if (fulfillments) {
        orderRequest.order.fulfillments = fulfillments
      }

      const response = await client.orders.create(orderRequest)
      return bigIntToString(response.order)
    } catch (error) {
      console.error("Error creating order:", error)
      throw error
    }
  },

  /**
   * Get location details (useful for verifying Apple Pay/Google Pay domain)
   */
  async getLocation() {
    try {
      const response = await client.locations.get({
        locationId: locationId,
      })
      return bigIntToString(response.location)
    } catch (error) {
      console.error("Error getting location:", error)
      throw error
    }
  },
}

module.exports = squareService
