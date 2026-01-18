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
    
    // Session Management: Validiere Session (optional - nur Warnung, keine Abmeldung)
    // Wenn Session-Validierung fehlschlägt, aber JWT gültig ist, erlaube Zugriff
    try {
      const Session = require('../models/Session');
      const session = await Session.validateSession(token);
      if (!session) {
        // Session nicht gefunden, aber JWT ist gültig
        // Erlaube Zugriff, aber logge nur bei Debug-Level (nicht als Warnung)
        // Erstelle neue Session für bessere Nachverfolgbarkeit
        try {
          const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
          const userAgent = req.get('User-Agent') || 'unknown';
          await Session.createSession(
            decoded.userId || decoded.user?.id,
            token,
            null,
            ipAddress,
            userAgent
          );
          // Nur bei Debug-Level loggen (nicht als Warnung)
          if (process.env.LOG_LEVEL === 'debug') {
            console.debug(`Session neu erstellt für User: ${decoded.userId || decoded.user?.id}`);
          }
        } catch (createError) {
          // Session-Erstellung fehlgeschlagen - nicht kritisch
          if (process.env.LOG_LEVEL === 'debug') {
            console.debug('Session-Erstellung fehlgeschlagen:', createError.message);
          }
        }
      }
    } catch (sessionError) {
      // Session-Validierung ist optional, falls Session-Model nicht verfügbar
      // Wenn JWT gültig ist, erlaube Zugriff trotzdem
      console.debug('Session validation skipped:', sessionError.message);
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
    
    // Prüfe ob Benutzer aktiv ist
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Benutzerkonto ist deaktiviert'
      });
    }
    
    req.user = user;
    next();
  } catch (err) {
    // JWT-Verifizierung fehlgeschlagen
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token abgelaufen. Bitte melden Sie sich erneut an.'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Ungültiger Token'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Token ist ungültig'
    });
  }
};
