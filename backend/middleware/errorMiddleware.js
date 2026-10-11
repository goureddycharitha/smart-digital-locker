const multer = require('multer');

/**
 * 404 Not Found handler for undefined routes
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    error: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

/**
 * Centralized error handling middleware.
 * Formats errors consistently, maps status codes, and ensures
 * no sensitive internals or stack traces leak to clients.
 */
function errorHandler(err, req, res, next) {
  // If response headers were already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large. Maximum allowed file size is 10 MB.'
      });
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`
    });
  }

  // Handle malformed JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON payload provided in request body.'
    });
  }

  // Determine HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Mask internal server errors in responses for security
  let errorMessage;
  if (statusCode === 500) {
    errorMessage = 'An internal server error occurred. Please try again later.';
    // Log unexpected errors on server console for debugging
    if (process.env.NODE_ENV !== 'test') {
      console.error('Unhandled Server Error:', err);
    }
  } else {
    errorMessage = err.message || 'An error occurred while processing your request.';
  }

  const responseBody = {
    error: errorMessage
  };

  if (err.details && Array.isArray(err.details)) {
    responseBody.details = err.details;
  }

  return res.status(statusCode).json(responseBody);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
