// Order confirmation email template
const orderConfirmationEmail = (order, customerName) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5e6d3; padding: 20px; text-align: center; }
          .item { border-bottom: 1px solid #ddd; padding: 10px 0; }
          .total { font-size: 18px; font-weight: bold; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Honey & Oak Boutique</h1>
            <p>Order Confirmation</p>
          </div>
          <p>Hi ${customerName},</p>
          <p>Thank you for your order! Here are the details:</p>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          
          <h3>Items:</h3>
          ${order.items
            .map(
              (item) => `
            <div class="item">
              <p>${item.name} (${item.color}) - Size: ${item.size}</p>
              <p>Quantity: ${item.quantity} x $${item.price.toFixed(2)}</p>
            </div>
          `,
            )
            .join("")}
          
          <div class="total">
            <p>Subtotal: $${order.subtotal.toFixed(2)}</p>
            ${order.tax ? `<p>Tax: $${order.tax.toFixed(2)}</p>` : ""}
            ${order.shipping ? `<p>Shipping: $${order.shipping.toFixed(2)}</p>` : ""}
            ${order.discountAmount ? `<p>Discount: -$${order.discountAmount.toFixed(2)}</p>` : ""}
            <p>Total: $${order.total.toFixed(2)}</p>
          </div>

          <h3>Shipping To:</h3>
          <p>
            ${order.shippingAddress.name}<br>
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}
          </p>

          <p>We'll send you a tracking number as soon as your order ships!</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </body>
    </html>
  `
}

// Abandoned cart email template
const abandonedCartEmail = (items, cartLink, customerName) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5e6d3; padding: 20px; text-align: center; }
          .item { border-bottom: 1px solid #ddd; padding: 10px 0; }
          .cta-button { background-color: #d4a574; color: white; padding: 12px 24px; text-align: center; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Honey & Oak Boutique</h1>
            <p>You Left Something Behind</p>
          </div>
          <p>Hi ${customerName},</p>
          <p>We noticed you left some beautiful items in your cart. Don't miss out!</p>
          
          <h3>Items in Your Cart:</h3>
          ${items
            .map(
              (item) => `
            <div class="item">
              <p>${item.name} (${item.color}) - Size: ${item.size}</p>
              <p>$${item.price.toFixed(2)}</p>
            </div>
          `,
            )
            .join("")}

          <a href="${cartLink}" class="cta-button">Complete Your Purchase</a>
          
          <p>This offer expires in 24 hours.</p>
        </div>
      </body>
    </html>
  `
}

// Gift card email template
const giftCardEmail = (giftCard, recipientName) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5e6d3; padding: 20px; text-align: center; }
          .card { border: 2px solid #d4a574; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .code { font-size: 24px; font-weight: bold; color: #d4a574; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Honey & Oak Boutique</h1>
            <p>Gift Card</p>
          </div>
          <p>Hi ${recipientName},</p>
          <p>${giftCard.sender.name} sent you a gift card from Honey & Oak Boutique!</p>
          
          ${giftCard.message ? `<p><em>${giftCard.message}</em></p>` : ""}
          
          <div class="card">
            <p>Gift Card Value: $${giftCard.amount.toFixed(2)}</p>
            <p>Your Code:</p>
            <div class="code">${giftCard.code}</div>
          </div>

          <p>Use this code at checkout to apply your gift card balance.</p>
          <p>Happy shopping!</p>
        </div>
      </body>
    </html>
  `
}

// Sale notification email template
const saleNotificationEmail = (products, saleDetails) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5e6d3; padding: 20px; text-align: center; }
          .product { border-bottom: 1px solid #ddd; padding: 10px 0; }
          .cta-button { background-color: #d4a574; color: white; padding: 12px 24px; text-align: center; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Honey & Oak Boutique</h1>
            <p>${saleDetails.title || "Sale Alert!"}</p>
          </div>
          <p>Great news! We have new items on sale just for you.</p>
          
          <h3>Featured Items:</h3>
          ${products
            .slice(0, 5)
            .map(
              (product) => `
            <div class="product">
              <p><strong>${product.name}</strong></p>
              <p>Now: $${(product.salePrice || product.price).toFixed(2)}</p>
            </div>
          `,
            )
            .join("")}

          <a href="${saleDetails.link}" class="cta-button">Shop Sale</a>
          
          <p>Sale ends ${new Date(saleDetails.endDate).toLocaleDateString()}</p>
        </div>
      </body>
    </html>
  `
}

module.exports = {
  orderConfirmationEmail,
  abandonedCartEmail,
  giftCardEmail,
  saleNotificationEmail,
}
