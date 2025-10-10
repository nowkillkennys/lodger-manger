/**
 * Route Aggregator
 * Combines all route modules into a single router
 * Mount this at /api in server.js
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const setupRoutes = require('./setup');
const adminRoutes = require('./admin');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const propertyRoutes = require('./properties');
const paymentRoutes = require('./payments');
const notificationRoutes = require('./notifications');
const dashboardRoutes = require('./dashboard');
const { router: uploadRouter } = require('./upload');
const healthRoutes = require('./health');
const tenancyRoutes = require('./tenancies');
const noticeRoutes = require('./notices');
const deductionRoutes = require('./deductions');
const announcementRoutes = require('./announcements');
const monitoringRoutes = require('./monitoring');

// Mount routes at their base paths
router.use('/setup', setupRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/properties', propertyRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/upload', uploadRouter);
router.use('/health', healthRoutes);
router.use('/tenancies', tenancyRoutes);
router.use('/tenancies', noticeRoutes);
router.use('/tenancies', deductionRoutes);
router.use('/announcements', announcementRoutes);
router.use('/monitoring', monitoringRoutes);

module.exports = router;
