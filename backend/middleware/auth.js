const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Kein Token, Zugriff verweigert'
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Session Management: Validiere Session
    try {
      const Session = require('../models/Session');
      const session = await Session.validateSession(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session abgelaufen oder ungültig'
        });
      }
    } catch (sessionError) {
      // Session-Validierung ist optional, falls Session-Model nicht verfügbar
      console.warn('Session validation skipped:', sessionError.message);
    }
    
    // Load user from database to get current permissions
    const userId = decoded.userId || decoded.user?.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Token ist ungültig'
    });
  }
};
