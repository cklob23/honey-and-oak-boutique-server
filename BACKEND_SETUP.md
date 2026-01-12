# Honey & Oak Boutique - Backend Setup Guide

## Installation

1. Install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`

2. Create a `.env` file with your configuration:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Update `.env` with your actual values:
- MongoDB connection string (local or Atlas)
- Square API credentials from [Square Dashboard](https://developer.squareup.com)
- Email service credentials
- Other environment variables

## Running the Backend

### Development Mode (with auto-reload)
\`\`\`bash
npm run dev
\`\`\`

### Production Mode
\`\`\`bash
npm start
\`\`\`

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Products
- `GET /api/products` - Get all products with filtering
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/new-arrivals` - Get new arrivals
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Cart
- `GET /api/cart/:cartId` - Get cart
- `POST /api/cart` - Create cart
- `POST /api/cart/:cartId/items` - Add item to cart
- `DELETE /api/cart/:cartId/items/:itemIndex` - Remove item from cart
- `PUT /api/cart/:cartId/items/:itemIndex` - Update item quantity
- `POST /api/cart/:cartId/discount` - Apply discount code

### Checkout
- `POST /api/checkout` - Create order and process payment

### Gift Cards
- `POST /api/gift-cards` - Create gift card
- `GET /api/gift-cards/:code` - Get gift card by code
- `POST /api/gift-cards/:code/redeem` - Redeem gift card

### Customers
- `GET /api/customers` - Get all customers (admin)
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `POST /api/customers/:id/subscribe-newsletter` - Subscribe to newsletter
- `POST /api/customers/:id/subscribe-sales` - Subscribe to sales

### Admin
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/:id` - Get order by ID
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/inventory` - Get all inventory
- `PUT /api/admin/inventory/:id` - Update inventory
- `GET /api/admin/reports/sales` - Get sales report
- `GET /api/admin/reports/inventory` - Get inventory report

### Emails
- `POST /api/emails/order-confirmation` - Send order confirmation
- `POST /api/emails/abandoned-cart` - Send abandoned cart reminder

## Database Models

### Product
- name, description, price, salePrice
- category, images, sizes, colors
- material, rating, reviews
- sizeChart, isNewArrival
- createdAt, updatedAt

### Customer
- squareCustomerId, email, firstName, lastName
- phone, address
- subscribedToNewsletter, subscribedToSales
- giftCardBalance, orders
- createdAt, updatedAt

### Order
- squareOrderId, customerId, items
- subtotal, tax, shipping, total
- discountCode, discountAmount, giftCardUsed
- paymentMethod, status
- shippingAddress, trackingNumber, notes
- createdAt, updatedAt

### Cart
- customerId, sessionId, items
- subtotal, discountCode, discountAmount
- giftCardCode, giftCardAmount
- abandonedAt, notificationSent
- createdAt, updatedAt

### Gift Card
- squareGiftCardId, amount, balance, code
- type, recipient, sender, message
- status, expiresAt, redeemedAt
- createdAt

### Inventory
- productId, size, color, quantity
- reserved, restockThreshold
- lastRestocked
- createdAt, updatedAt

## Square Integration

### Setting up Square

1. Create a Square account at [Square.com](https://squareup.com)
2. Go to Developer Dashboard
3. Create an application
4. Get your Access Token and Location ID
5. Add to `.env`:
   - SQUARE_ACCESS_TOKEN
   - SQUARE_LOCATION_ID
   - SQUARE_ENVIRONMENT (sandbox or production)

### Payment Methods Supported
- Credit/Debit Cards
- Apple Pay
- Google Pay
- Cash App
- Affirm
- Shop Pay
- Gift Cards

## Email Configuration

### Gmail Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in `.env` as EMAIL_PASSWORD

### Other Email Services
Update the `transporter` configuration in `src/routes/emails.js` for your provider.

## Error Handling

All errors are handled globally and return consistent JSON responses with status codes.

## TODO Items

These features should be implemented:

- [ ] Email sending for order confirmations
- [ ] Abandoned cart detection and email notifications
- [ ] Gift card email delivery
- [ ] Admin authentication middleware
- [ ] Customer authentication (JWT)
- [ ] Payment webhook handling
- [ ] Inventory stock management
- [ ] Discount code validation
- [ ] Rate limiting
- [ ] Request logging

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running locally or provide Atlas connection string
- Check MONGODB_URI in `.env`

### Square API Error
- Verify SQUARE_ACCESS_TOKEN is correct
- Check SQUARE_LOCATION_ID exists in your Square account
- Ensure SQUARE_ENVIRONMENT matches your token type (sandbox vs production)

### Email Not Sending
- Verify EMAIL_USER and EMAIL_PASSWORD
- Check firewall/network settings
- Enable "Less secure apps" if using Gmail

## Deployment

### Heroku Deployment
\`\`\`bash
heroku login
heroku create your-app-name
heroku config:set $(cat .env | tr '\n' ' ')
git push heroku main
\`\`\`

### Railway Deployment
Connect your GitHub repo to Railway and set environment variables in the dashboard.

### Docker
\`\`\`bash
docker build -t honey-oak-backend .
docker run -p 5000:5000 honey-oak-backend
