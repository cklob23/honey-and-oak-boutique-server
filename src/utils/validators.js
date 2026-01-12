// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^[\d\s\-+$$$$]{10,}$/
  return phoneRegex.test(phone)
}

// Validate product data
const validateProduct = (product) => {
  if (!product.name || !product.description || product.price < 0) {
    return { valid: false, error: "Invalid product data" }
  }
  return { valid: true }
}

// Validate order data
const validateOrder = (order) => {
  if (!order.items || order.items.length === 0) {
    return { valid: false, error: "Order must contain items" }
  }
  if (!order.total || order.total <= 0) {
    return { valid: false, error: "Invalid order total" }
  }
  return { valid: true }
}

module.exports = {
  isValidEmail,
  isValidPhone,
  validateProduct,
  validateOrder,
}
