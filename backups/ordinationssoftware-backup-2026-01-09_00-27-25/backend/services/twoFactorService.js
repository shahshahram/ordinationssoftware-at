const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TwoFactorService {
  /**
   * Generate a new 2FA secret for a user
   */
  static generateSecret(userEmail, serviceName = 'Ordinationssoftware') {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: serviceName,
      length: 32
    });
    
    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url
    };
  }

  /**
   * Generate QR code data URL for the secret
   */
  static async generateQRCode(secret) {
    try {
      const qrCodeUrl = await QRCode.toDataURL(secret);
      return qrCodeUrl;
    } catch (error) {
      throw new Error('Fehler beim Generieren des QR-Codes: ' + error.message);
    }
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(secret, token, window = 2) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: window
    });
  }

  /**
   * Generate backup codes for 2FA
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  static verifyBackupCode(backupCodes, code) {
    const index = backupCodes.indexOf(code.toUpperCase());
    if (index !== -1) {
      // Remove used backup code
      backupCodes.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if 2FA is properly configured
   */
  static isConfigured(user) {
    return user.twoFactorAuth && 
           user.twoFactorAuth.enabled && 
           user.twoFactorAuth.secret && 
           user.twoFactorAuth.backupCodes && 
           user.twoFactorAuth.backupCodes.length > 0;
  }

  /**
   * Get remaining backup codes count
   */
  static getRemainingBackupCodes(user) {
    if (!user.twoFactorAuth || !user.twoFactorAuth.backupCodes) {
      return 0;
    }
    return user.twoFactorAuth.backupCodes.length;
  }
}

module.exports = TwoFactorService;
