const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class LoginSecurityService {
  // Configuration
  static MAX_FAILED_ATTEMPTS = 5;
  static LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  static SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

  /**
   * Check if account is locked
   */
  static isAccountLocked(user) {
    if (!user.loginSecurity || !user.loginSecurity.lockedUntil) {
      return false;
    }
    return user.loginSecurity.lockedUntil > Date.now();
  }

  /**
   * Get remaining lockout time in minutes
   */
  static getRemainingLockoutTime(user) {
    if (!this.isAccountLocked(user)) {
      return 0;
    }
    return Math.ceil((user.loginSecurity.lockedUntil - Date.now()) / (1000 * 60));
  }

  /**
   * Increment failed login attempts
   */
  static async incrementFailedAttempts(user, ipAddress) {
    const now = Date.now();
    const updateData = {
      'loginSecurity.failedAttempts': user.loginSecurity ? user.loginSecurity.failedAttempts + 1 : 1,
      'loginSecurity.lastLoginIP': ipAddress
    };

    // Lock account if max attempts reached
    if ((user.loginSecurity ? user.loginSecurity.failedAttempts : 0) + 1 >= this.MAX_FAILED_ATTEMPTS) {
      updateData['loginSecurity.lockedUntil'] = new Date(now + this.LOCKOUT_DURATION);
      
      // Log account lockout
      await AuditLog.createLog({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'ACCOUNT_LOCKED',
        ipAddress,
        description: `Account nach ${this.MAX_FAILED_ATTEMPTS} fehlgeschlagenen Login-Versuchen gesperrt`,
        severity: 'HIGH',
        success: false
      });
      
      logger.warn(`Account ${user.email} nach ${this.MAX_FAILED_ATTEMPTS} fehlgeschlagenen Versuchen gesperrt`);
    }

    await User.findByIdAndUpdate(user._id, updateData);
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedAttempts(user) {
    await User.findByIdAndUpdate(user._id, {
      'loginSecurity.failedAttempts': 0,
      'loginSecurity.lockedUntil': null
    });
  }

  /**
   * Check IP whitelist (if configured)
   */
  static isIPAllowed(user, ipAddress) {
    if (!user.loginSecurity || !user.loginSecurity.allowedIPs || user.loginSecurity.allowedIPs.length === 0) {
      return true; // No IP restrictions
    }
    return user.loginSecurity.allowedIPs.includes(ipAddress);
  }

  /**
   * Check if password needs to be changed
   */
  static isPasswordChangeRequired(user) {
    if (!user.loginSecurity || !user.loginSecurity.requirePasswordChange) {
      return false;
    }
    
    // Check if password is older than 90 days
    if (user.loginSecurity.passwordChangedAt) {
      const passwordAge = Date.now() - user.loginSecurity.passwordChangedAt.getTime();
      const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
      return passwordAge > maxAge;
    }
    
    return true;
  }

  /**
   * Check session timeout
   */
  static isSessionExpired(user, tokenIssuedAt) {
    if (!user.loginSecurity || !tokenIssuedAt) {
      return false;
    }
    
    const sessionAge = Date.now() - tokenIssuedAt;
    const timeout = user.loginSecurity.sessionTimeout || this.SESSION_TIMEOUT;
    
    return sessionAge > timeout;
  }

  /**
   * Validate login attempt
   */
  static async validateLogin(email, password, ipAddress, userAgent) {
    try {
      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        await this.logFailedLogin(email, ipAddress, userAgent, 'Benutzer nicht gefunden');
        return { success: false, message: 'Ungültige Anmeldedaten' };
      }

      // Check if account is locked
      if (this.isAccountLocked(user)) {
        const remainingTime = this.getRemainingLockoutTime(user);
        await this.logFailedLogin(email, ipAddress, userAgent, `Account gesperrt (${remainingTime} Min. verbleibend)`);
        return { 
          success: false, 
          message: `Account gesperrt. Versuchen Sie es in ${remainingTime} Minuten erneut.`,
          locked: true,
          remainingTime
        };
      }

      // Check IP whitelist
      if (!this.isIPAllowed(user, ipAddress)) {
        await this.logFailedLogin(email, ipAddress, userAgent, 'IP-Adresse nicht erlaubt');
        return { success: false, message: 'Zugriff von dieser IP-Adresse nicht erlaubt' };
      }

      // Check if user is active
      if (!user.isActive) {
        await this.logFailedLogin(email, ipAddress, userAgent, 'Account deaktiviert');
        return { success: false, message: 'Account ist deaktiviert' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        await this.incrementFailedAttempts(user, ipAddress);
        await this.logFailedLogin(email, ipAddress, userAgent, 'Falsches Passwort');
        return { success: false, message: 'Ungültige Anmeldedaten' };
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user);

      // Update login information
      await User.findByIdAndUpdate(user._id, {
        'loginSecurity.lastLogin': new Date(),
        'loginSecurity.lastLoginIP': ipAddress
      });

      // Log successful login
      await AuditLog.createLog({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN',
        ipAddress,
        userAgent,
        description: 'Erfolgreiche Anmeldung',
        severity: 'LOW',
        success: true
      });

      return { 
        success: true, 
        user: user.getPublicProfile(),
        passwordChangeRequired: this.isPasswordChangeRequired(user)
      };

    } catch (error) {
      logger.error('Fehler bei Login-Validierung:', error);
      await this.logFailedLogin(email, ipAddress, userAgent, 'Server-Fehler');
      return { success: false, message: 'Interner Server-Fehler' };
    }
  }

  /**
   * Log failed login attempt
   */
  static async logFailedLogin(email, ipAddress, userAgent, reason) {
    try {
      await AuditLog.createLog({
        userId: null, // No user ID for failed logins
        userEmail: email,
        userRole: 'UNKNOWN',
        action: 'LOGIN_FAILED',
        ipAddress,
        userAgent,
        description: `Fehlgeschlagener Login-Versuch: ${reason}`,
        severity: 'MEDIUM',
        success: false
      });
    } catch (error) {
      logger.error('Fehler beim Loggen des fehlgeschlagenen Logins:', error);
    }
  }

  /**
   * Generate secure JWT token
   */
  static generateToken(user, ipAddress) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      ip: ipAddress
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '8h'
    });
  }

  /**
   * Verify JWT token and check session validity
   */
  static async verifyToken(token, ipAddress) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return { valid: false, message: 'Benutzer nicht gefunden oder inaktiv' };
      }

      // Check session timeout
      if (this.isSessionExpired(user, decoded.iat * 1000)) {
        return { valid: false, message: 'Session abgelaufen' };
      }

      // Check IP change (optional security feature)
      if (decoded.ip !== ipAddress) {
        logger.warn(`IP-Adresse geändert für Benutzer ${user.email}: ${decoded.ip} -> ${ipAddress}`);
        // Optionally invalidate token on IP change
        // return { valid: false, message: 'IP-Adresse geändert' };
      }

      return { valid: true, user: user.getPublicProfile() };
    } catch (error) {
      return { valid: false, message: 'Ungültiger Token' };
    }
  }
}

module.exports = LoginSecurityService;
