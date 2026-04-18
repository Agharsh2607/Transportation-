const { authenticateAdmin, logoutAdmin, getActiveSessions } = require('../../middleware/adminAuth.middleware');
const logger = require('../../utils/logger');

class AdminController {
  /**
   * Admin login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      // Authenticate admin
      const authResult = authenticateAdmin(email, password);
      
      if (!authResult) {
        logger.warn('Failed admin login attempt', { email });
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Set HTTP-only cookie for security
      res.cookie('adminToken', authResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });

      res.json({
        success: true,
        message: 'Login successful',
        user: authResult.user,
        token: authResult.token // Also return token for client-side storage if needed
      });
    } catch (error) {
      logger.error('Admin login error', { error: error.message });
      res.status(500).json({
        error: 'Login failed',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Admin logout
   */
  async logout(req, res) {
    try {
      const token = req.adminToken || req.cookies?.adminToken;
      
      if (token) {
        logoutAdmin(token);
      }

      // Clear cookie
      res.clearCookie('adminToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Admin logout error', { error: error.message });
      res.status(500).json({
        error: 'Logout failed',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get current admin user info
   */
  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        user: req.admin
      });
    } catch (error) {
      logger.error('Get admin profile error', { error: error.message });
      res.status(500).json({
        error: 'Failed to get profile',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get active admin sessions (admin only)
   */
  async getSessions(req, res) {
    try {
      if (req.admin.role !== 'admin') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Admin role required'
        });
      }

      const sessions = getActiveSessions();
      
      res.json({
        success: true,
        sessions,
        count: sessions.length
      });
    } catch (error) {
      logger.error('Get admin sessions error', { error: error.message });
      res.status(500).json({
        error: 'Failed to get sessions',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth(req, res) {
    try {
      // If we reach here, the verifyAdminToken middleware has already validated the token
      res.json({
        success: true,
        authenticated: true,
        user: req.admin
      });
    } catch (error) {
      logger.error('Check admin auth error', { error: error.message });
      res.status(500).json({
        error: 'Auth check failed',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AdminController();