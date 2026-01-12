// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || "Internal server error"

  console.error(`[Error] ${statusCode}: ${message}`)

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
    },
  })
}

// Async handler wrapper for try-catch
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
}
