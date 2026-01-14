const { Console } = require("console")
const { SquareClient, SquareEnvironment } = require("square")
const { v4: uuidv4 } = require('uuid');

const client = new SquareClient({
  environment: process.env.SQUARE_ENVIRONMENT == "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  token: process.env.SQUARE_ENVIRONMENT == "production" ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_ACCESS_TOKEN_S,
})

const squareService = {

  /*
    CUSTOMERS
  */
  // Create customer
  async createCustomer({emailAddress, firstName, lastName, phoneNumber}) {
    const uid = uuidv4();

    //console.log("Square create:", emailAddress, firstName, lastName, phoneNumber);

    try {
      const body = {
        idempotencyKey: uid,
        emailAddress: emailAddress || undefined,
        givenName: firstName || undefined,
        familyName: lastName || undefined,
        phoneNumber: phoneNumber || undefined
      }

      Object.keys(body).forEach(
        (key) => body[key] === undefined && delete body[key]
      )

      const response = await client.customers.create(body);
      const customer = response.customer
      return bigIntToString(customer)
    } catch (error) {
      console.error("Error creating Square customer:", error);
      throw error;
    }
  },

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

  /*
    GIFT CARDS
  */
  // List gift cards
  async listGiftCards() {
    try {
      const response = await client.giftCards.list({});
      return bigIntToString(response.response)
    } catch (error) {
      console.error("Error listing gift cards:", error)
      throw error
    }
  },

  // Create gift card
  async createGiftCard(amount, locationId) {
    try {
      const response = await client.giftCards.create({
        idempotencyKey: uuidv4(),
        locationId: locationId,
        giftCard: {
          type: "DIGITAL",
          ganSource: "SQUARE",
          gan: amount,
        },
      });
      return response.giftCard
    } catch (error) {
      console.error("Error creating gift card:", error)
      throw error
    }
  },

  // Link gift card to customer
  async linkGiftCard(giftCardId, customerId) {
    try {
      const response = await client.giftCards.linkCustomer({
        giftCardId: giftCardId,
        customerId: customerId,
      });
      return response.giftCard
    } catch (error) {
      console.error("Error linking gift card to customer:", error)
      throw error
    }
  },

  /*
    PAYMENTS
  */
  // Process payment
  async processPayment(sourceId, amount, customerId) {
    try {
      const response = await client.payments.create({
        idempotencyKey: uuidv4(),
        sourceId: sourceId,
        amountMoney: {
          amount: BigInt(amount),
          currency: "USD",
        },
        customerId: customerId,
        autocomplete: true,
      });
      return response.payment
    } catch (error) {
      console.error("Error processing payment:", error)
      throw error
    }
  },

  // Create order
  async createOrder(customerId, lineItems, locationId) {
    try {
      const response = await client.orders.create({
        idempotencyKey: uuidv4(),
        order: {
          locationId: locationId,
          customerId: customerId,
        },
        lineItems: lineItems
      });
      return response.order
    } catch (error) {
      console.error("Error creating order:", error)
      throw error
    }
  },

  // Get payment
  async getPayment(paymentId) {
    try {
      const response = await client.payments.get({ paymentId: paymentId })
      return response.payment
    } catch (error) {
      console.error("Error getting payment:", error)
      throw error
    }
  },

  // Get Items
  async getItems() {
    try {
      const response = await client.catalog.searchItems({
        sortOrder: "ASC",
        categoryIds: [
          "NTTSJGUBR3TRDQSM5GSY5TGC",
        ],
      })
      return bigIntToString(response.items)
    } catch (error) {
      console.error("Error getting inventory:", error)
      throw error
    }
  },
}

function bigIntToString(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

module.exports = squareService
