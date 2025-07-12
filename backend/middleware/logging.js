const { logAPIUsage } = require("../utils/helpers");

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log incoming request
  console.log(
    `📥 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`
  );

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    // Log API usage
    logAPIUsage(req, res, duration);

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
}

/**
 * Error logging middleware
 */
function errorLogger(err, req, res, next) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500,
    },
    body: req.body,
    params: req.params,
    query: req.query,
  };

  console.error("❌ Error:", JSON.stringify(errorLog, null, 2));
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
};
