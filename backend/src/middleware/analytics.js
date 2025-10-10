const { pool } = require('../config/database');

/**
 * Middleware to track API analytics
 * Logs endpoint, method, status code, response time, user, and IP
 */
const trackApiAnalytics = async (req, res, next) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override res.end to capture response details
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Extract user info if available
    const user = req.user || null;
    const userId = user ? user.id : null;
    const userRole = user ? user.user_type : null;

    // Get client IP
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Get user agent
    const userAgent = req.get('User-Agent');

    // Prepare analytics data
    const analyticsData = {
      endpoint: req.originalUrl,
      method: req.method,
      status_code: res.statusCode,
      response_time_ms: responseTime,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent
    };

    // Insert analytics record (don't await to avoid blocking response)
    pool.query(
      `INSERT INTO api_analytics (endpoint, method, status_code, response_time_ms, user_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        analyticsData.endpoint,
        analyticsData.method,
        analyticsData.status_code,
        analyticsData.response_time_ms,
        analyticsData.user_id,
        analyticsData.ip_address,
        analyticsData.user_agent
      ]
    ).catch(err => {
      console.error('Failed to insert analytics record:', err);
    });

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = { trackApiAnalytics };
