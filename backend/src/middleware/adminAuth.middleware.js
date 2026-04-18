const jwt = require('jsonwebtoken');
const { ADMIN_JWT_SECRET } = require('../config/env');
const logger = require('../utils/logger');

// In-memory admin users (in production, this would be in a database)
const ADMIN_USERS = {
  'admin@transitpulse.com': {
    id: 'admin-001',
    email: 'admin@transitpulse.com',
    password: 'admin123', // In production, this would be hashed
    role: 'admin',
    name: 'System Administrator'
  },
  'supervisor@transitpulse.com': {
    id: 'admin-002', 
    email: 'supervisor@transitpulse.com',
    password: 'supervisor123',
    role: 'supervisor',
    name: 'Transport Supervisor'
  }
};

// In-memory session storage (in production, use Redis or database)
const activeSessions = new Map();

/**
 * Authenticate admin user
 */
function authenticateAdmin(email, password) {
  const user = ADMIN_USERS[email];
  if (!user || user.password !== password) {
    return null;
  }
  
  // Create JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name
    },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );
  
  // Store session
  activeSessions.set(token, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    loginTime: new Date(),
    lastActivity: new Date()
  });
  
  logger.info('Admin user authenticated', { email, role: user.role });
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    }
  };
}

/**
 * Verify admin token middleware
 */
function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = req.cookies?.adminToken || (authHeader && authHeader.split(' ')[1]);
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No authentication token provided',
        requiresAuth: true
      });
    }
    
    // Verify JWT
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    
    // Check if session exists
    const session = activeSessions.get(token);
    if (!session) {
      return res.status(401).json({
        error: 'Session expired',
        message: 'Please log in again',
        requiresAuth: true
      });
    }
    
    // Update last activity
    session.lastActivity = new Date();
    
    // Add user info to request
    req.admin = decoded;
    req.adminToken = token;
    
    next();
  } catch (error) {
    logger.warn('Admin token verification failed', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again',
        requiresAuth: true
      });
    }
    
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed',
      requiresAuth: true
    });
  }
}

/**
 * Logout admin user
 */
function logoutAdmin(token) {
  if (activeSessions.has(token)) {
    const session = activeSessions.get(token);
    activeSessions.delete(token);
    logger.info('Admin user logged out', { email: session.user.email });
    return true;
  }
  return false;
}

/**
 * Get active sessions (for admin monitoring)
 */
function getActiveSessions() {
  const sessions = [];
  for (const [token, session] of activeSessions.entries()) {
    sessions.push({
      user: session.user,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      tokenPreview: token.substring(0, 10) + '...'
    });
  }
  return sessions;
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = new Date();
  const expiredTokens = [];
  
  for (const [token, session] of activeSessions.entries()) {
    // Remove sessions inactive for more than 8 hours
    const inactiveHours = (now - session.lastActivity) / (1000 * 60 * 60);
    if (inactiveHours > 8) {
      expiredTokens.push(token);
    }
  }
  
  expiredTokens.forEach(token => {
    const session = activeSessions.get(token);
    activeSessions.delete(token);
    logger.info('Expired admin session cleaned up', { email: session.user.email });
  });
  
  return expiredTokens.length;
}

// Clean up expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
  authenticateAdmin,
  verifyAdminToken,
  logoutAdmin,
  getActiveSessions,
  cleanupExpiredSessions
};