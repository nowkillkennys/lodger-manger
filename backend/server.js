const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { PORT } = require('./src/config/env');
const { connectWithRetry } = require('./src/config/database');
const routes = require('./src/routes');
const { initializeCronJobs } = require('./src/jobs/cronJobs');
const { trackApiAnalytics } = require('./src/middleware/analytics');

const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://ed827835ab76ff630f248d5e5a979b24@o4510150914736128.ingest.de.sentry.io/4510151085916240",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration()
  ],
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/]
});

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'sentry-trace',
    'sentry-sampled',
    'sentry-trace-id',
    'sentry-parent-span-id',
    'sentry-transaction',
    'baggage'
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Analytics Tracking
app.use('/api', trackApiAnalytics);

// API Routes
app.use('/api', routes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database connection
connectWithRetry();

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize cron jobs
  initializeCronJobs();
});
