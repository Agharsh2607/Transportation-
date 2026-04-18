const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyAdminToken } = require('../../middleware/adminAuth.middleware');

const router = express.Router();

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', (req, res) => adminController.login(req, res));

/**
 * POST /api/admin/logout
 * Admin logout
 */
router.post('/logout', verifyAdminToken, (req, res) => adminController.logout(req, res));

/**
 * GET /api/admin/profile
 * Get current admin user profile
 */
router.get('/profile', verifyAdminToken, (req, res) => adminController.getProfile(req, res));

/**
 * GET /api/admin/check-auth
 * Check authentication status
 */
router.get('/check-auth', verifyAdminToken, (req, res) => adminController.checkAuth(req, res));

/**
 * GET /api/admin/sessions
 * Get active admin sessions (admin role only)
 */
router.get('/sessions', verifyAdminToken, (req, res) => adminController.getSessions(req, res));

module.exports = router;