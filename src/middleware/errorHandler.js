// src/middleware/errorHandler.js

// 1. Custom Error Class to standardize throwing errors
class AppError extends Error {
    constructor(message, statusCode, details = []) {
      super(message);
      this.statusCode = statusCode;
      this.details = details; // Array of specific validation errors
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // 2. Global Error Handling Middleware
  const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.details || [];
  
    // Log error for debugging (only in dev)
    console.error(`[Error] ${message}`, errors);
  
    res.status(statusCode).json({
      success: false,
      message: message,
      errors: errors.length > 0 ? errors : undefined // Only show if exists
    });
  };
  
  module.exports = { AppError, errorHandler };