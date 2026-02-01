const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ADMIN_ROLES } = require('../config/roles');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const SystemSettings = require('../models/SystemSettings');

router.use(auth);
router.use(requireRole(ADMIN_ROLES));
const crypto = require('crypto');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const smsService = require('../services/smsService');

// @route   GET /api/settings
// @desc    Get all settings
// @access  Private (Admin only)
router.get('/', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.read',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    // Lade Settings aus Datenbank
    const onlineBookingSettings = await SystemSettings.getCategorySettings('onlineBooking');
    const billingSettings = await SystemSettings.getCategorySettings('billing');
    
    // Return basic settings structure mit Datenbank-Settings
    const settings = {
      general: {
        systemName: 'Ordinationssoftware',
        version: '1.0.0',
        language: 'de',
        timezone: 'Europe/Vienna'
      },
      features: {
        onlineBooking: true,
        twoFactorAuth: true,
        auditLogging: true,
        rbac: true
      },
      permissions: {
        canRead: true,
        canWrite: true,
        canConfigure: true
      },
      onlineBooking: {
        // Stornierungsfristen (Standardwerte falls nicht gesetzt)
        cancellationDeadlineHours: onlineBookingSettings.cancellationDeadlineHours || 24,
        allowOnlineCancellation: onlineBookingSettings.allowOnlineCancellation !== undefined 
          ? onlineBookingSettings.allowOnlineCancellation 
          : true,
        cancellationPhoneNumber: onlineBookingSettings.cancellationPhoneNumber || null,
        cancellationFeeEnabled: onlineBookingSettings.cancellationFeeEnabled || false,
        cancellationFeeAmount: onlineBookingSettings.cancellationFeeAmount || 0,
        cancellationFeeDeadlineHours: onlineBookingSettings.cancellationFeeDeadlineHours || 24
      },
      billing: {
        personnelCostsPercentage: billingSettings.personnelCostsPercentage || 25,
        targetHourlyRate: billingSettings.targetHourlyRate || 150,
        customerAcquisitionCost: billingSettings.customerAcquisitionCost || 50,
        workingHoursPerDay: billingSettings.workingHoursPerDay || 8
      }
    };

    res.status(200).json({ 
      success: true, 
      data: settings,
      message: 'Settings erfolgreich geladen'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der Einstellungen', 
      error: error.message 
    });
  }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private (requires 'settings.write' permission)
router.put('/', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.write',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    // Speichere Settings in Datenbank
    const { onlineBooking, billing } = req.body;
    
    // Speichere Billing-Einstellungen
    if (billing) {
      if (billing.personnelCostsPercentage !== undefined) {
        await SystemSettings.setSetting(
          'billing',
          'personnelCostsPercentage',
          billing.personnelCostsPercentage,
          'number',
          req.user.id
        );
      }
      if (billing.targetHourlyRate !== undefined) {
        await SystemSettings.setSetting(
          'billing',
          'targetHourlyRate',
          billing.targetHourlyRate,
          'number',
          req.user.id
        );
      }
      if (billing.customerAcquisitionCost !== undefined) {
        await SystemSettings.setSetting(
          'billing',
          'customerAcquisitionCost',
          billing.customerAcquisitionCost,
          'number',
          req.user.id
        );
      }
      if (billing.workingHoursPerDay !== undefined) {
        await SystemSettings.setSetting(
          'billing',
          'workingHoursPerDay',
          billing.workingHoursPerDay,
          'number',
          req.user.id
        );
      }
    }
    
    if (onlineBooking) {
      // Speichere Online-Buchung Einstellungen
      if (onlineBooking.cancellationDeadlineHours !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationDeadlineHours',
          onlineBooking.cancellationDeadlineHours,
          'number',
          req.user.id
        );
      }
      
      if (onlineBooking.allowOnlineCancellation !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'allowOnlineCancellation',
          onlineBooking.allowOnlineCancellation,
          'boolean',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationPhoneNumber !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationPhoneNumber',
          onlineBooking.cancellationPhoneNumber,
          'string',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationFeeEnabled !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationFeeEnabled',
          onlineBooking.cancellationFeeEnabled,
          'boolean',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationFeeAmount !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationFeeAmount',
          onlineBooking.cancellationFeeAmount,
          'number',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationFeeDeadlineHours !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationFeeDeadlineHours',
          onlineBooking.cancellationFeeDeadlineHours,
          'number',
          req.user.id
        );
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Einstellungen erfolgreich aktualisiert',
      data: req.body
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Aktualisieren der Einstellungen', 
      error: error.message 
    });
  }
});

// Verschlüsselungs-Hilfsfunktionen für E-Mail-Passwörter
// Für AES-256-CBC benötigen wir einen 32-Byte (256-Bit) Schlüssel

// Cache für generierten Schlüssel (falls ENCRYPTION_KEY nicht gesetzt ist)
let cachedEncryptionKey = null;

function getEncryptionKey() {
  let key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // Wenn kein Schlüssel gesetzt ist, verwende gecachten oder generiere einen
    if (!cachedEncryptionKey) {
      console.warn('⚠️ ENCRYPTION_KEY nicht gesetzt - generiere temporären Schlüssel (nicht für Produktion!)');
      console.warn('⚠️ Bitte setzen Sie ENCRYPTION_KEY in Ihrer .env-Datei für persistente Verschlüsselung!');
      // Generiere einen 32-Byte Schlüssel und konvertiere zu Hex (64 Zeichen)
      cachedEncryptionKey = crypto.randomBytes(32).toString('hex');
      // Speichere auch in process.env für diese Session
      process.env.ENCRYPTION_KEY = cachedEncryptionKey;
      console.warn(`⚠️ Temporärer Schlüssel generiert. Für Produktion bitte in .env setzen: ENCRYPTION_KEY=${cachedEncryptionKey}`);
    }
    key = cachedEncryptionKey;
  }
  
  // Konvertiere Hex-String zu Buffer (32 Bytes)
  // Wenn key bereits ein Hex-String ist (64 Zeichen), nimm die ersten 64 Zeichen
  // Wenn key kürzer ist, padde oder hashe es
  try {
    if (key.length === 64) {
      // Perfekt: 64 Hex-Zeichen = 32 Bytes
      const buffer = Buffer.from(key, 'hex');
      if (buffer.length !== 32) {
        throw new Error('Ungültige Schlüssellänge nach Hex-Konvertierung');
      }
      return buffer;
    } else if (key.length > 64) {
      // Zu lang: nimm die ersten 64 Zeichen
      const buffer = Buffer.from(key.slice(0, 64), 'hex');
      if (buffer.length !== 32) {
        throw new Error('Ungültige Schlüssellänge nach Hex-Konvertierung');
      }
      return buffer;
    } else {
      // Zu kurz: hashe den Schlüssel zu 32 Bytes
      return crypto.createHash('sha256').update(key).digest();
    }
  } catch (parseError) {
    console.error('❌ Fehler beim Parsen des Verschlüsselungsschlüssels:', parseError);
    // Fallback: hashe den Schlüssel zu 32 Bytes
    return crypto.createHash('sha256').update(key).digest();
  }
}

const ALGORITHM = 'aes-256-cbc';

function encryptPassword(text) {
  if (!text) return null;
  try {
    const key = getEncryptionKey();
    if (!key) {
      console.error('❌ Verschlüsselungsschlüssel nicht verfügbar');
      throw new Error('Verschlüsselungsschlüssel nicht verfügbar');
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Fehler beim Verschlüsseln des Passworts:', error);
    throw error; // Fehler weiterwerfen, damit er oben behandelt werden kann
  }
}

function decryptPassword(encryptedText) {
  if (!encryptedText) return null;
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Ungültiges Verschlüsselungsformat');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Fehler beim Entschlüsseln des Passworts:', error);
    return null;
  }
}

// @route   GET /api/settings/email
// @desc    Get email configuration
// @access  Private (requires 'settings.read' permission)
router.get('/email', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.read'
      });
    }

    // Lade E-Mail-Settings aus Datenbank
    const emailSettings = await SystemSettings.getCategorySettings('notifications');
    
    // Standardwerte aus Umgebungsvariablen (Fallback)
    const config = {
      provider: emailSettings['email.provider'] || 'custom',
      smtp: {
        host: emailSettings['email.smtp.host'] || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: emailSettings['email.smtp.port'] || parseInt(process.env.SMTP_PORT || '587'),
        secure: emailSettings['email.smtp.secure'] !== undefined 
          ? emailSettings['email.smtp.secure'] 
          : (process.env.SMTP_SECURE === 'true'),
        user: emailSettings['email.smtp.user'] || process.env.SMTP_USER || '',
        password: emailSettings['email.smtp.password'] 
          ? '***ENCRYPTED***' // Passwort nicht im Klartext zurückgeben
          : (process.env.SMTP_PASS || process.env.SMTP_PASSWORD ? '***ENCRYPTED***' : ''),
        from: emailSettings['email.smtp.from'] || process.env.SMTP_FROM || process.env.SMTP_USER || ''
      },
      practiceNotificationEmail: emailSettings.practiceNotificationEmail || '',
      isConfigured: !!(emailSettings['email.smtp.host'] || process.env.SMTP_HOST)
    };

    res.status(200).json({
      success: true,
      data: config,
      message: 'E-Mail-Konfiguration erfolgreich geladen'
    });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Konfiguration',
      error: error.message
    });
  }
});

// @route   PUT /api/settings/email
// @desc    Update email configuration
// @access  Private (requires 'settings.write' permission)
router.put('/email', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.write'
      });
    }

    const { provider, smtp, practiceNotificationEmail } = req.body;

    if (!smtp || !smtp.host || !smtp.user) {
      return res.status(400).json({
        success: false,
        message: 'SMTP Host und Benutzername sind erforderlich'
      });
    }

    // Speichere E-Mail-Konfiguration in Datenbank
    if (provider) {
      await SystemSettings.setSetting(
        'notifications',
        'email.provider',
        provider,
        'string',
        req.user.id
      );
    }

    if (smtp.host) {
      await SystemSettings.setSetting(
        'notifications',
        'email.smtp.host',
        smtp.host,
        'string',
        req.user.id
      );
    }

    if (smtp.port !== undefined) {
      await SystemSettings.setSetting(
        'notifications',
        'email.smtp.port',
        smtp.port,
        'number',
        req.user.id
      );
    }

    if (smtp.secure !== undefined) {
      await SystemSettings.setSetting(
        'notifications',
        'email.smtp.secure',
        smtp.secure,
        'boolean',
        req.user.id
      );
    }

    if (smtp.user) {
      await SystemSettings.setSetting(
        'notifications',
        'email.smtp.user',
        smtp.user,
        'string',
        req.user.id
      );
    }

    // Passwort nur speichern, wenn es geändert wurde (nicht "***ENCRYPTED***")
    if (smtp.password && smtp.password !== '***ENCRYPTED***' && smtp.password.trim() !== '') {
      try {
        const encryptedPassword = encryptPassword(smtp.password);
        if (!encryptedPassword) {
          console.error('❌ Verschlüsselung des Passworts fehlgeschlagen - Passwort wird nicht gespeichert');
          return res.status(500).json({
            success: false,
            message: 'Fehler beim Verschlüsseln des Passworts. Bitte versuchen Sie es erneut.',
            error: 'Verschlüsselung fehlgeschlagen'
          });
        }
        await SystemSettings.setSetting(
          'notifications',
          'email.smtp.password',
          encryptedPassword,
          'string',
          req.user.id
        );
      } catch (encryptError) {
        console.error('❌ Fehler beim Verschlüsseln des Passworts:', encryptError);
        return res.status(500).json({
          success: false,
          message: `Fehler beim Verschlüsseln des Passworts: ${encryptError.message}`,
          error: encryptError.message
        });
      }
    }

    // From-Adresse speichern (kann auch leer sein, dann wird user verwendet)
    if (smtp.from !== undefined) {
      await SystemSettings.setSetting(
        'notifications',
        'email.smtp.from',
        smtp.from || smtp.user || '', // Fallback zu user, wenn from leer
        'string',
        req.user.id
      );
    }

    // Praxis-Benachrichtigungs-E-Mail(s) speichern (mehrere Adressen komma-/zeilengetrennt)
    if (practiceNotificationEmail !== undefined) {
      await SystemSettings.setSetting(
        'notifications',
        'practiceNotificationEmail',
        typeof practiceNotificationEmail === 'string' ? practiceNotificationEmail.trim() : '',
        'string',
        req.user.id
      );
    }

    // Lade neue Konfiguration und initialisiere Transporter neu
    try {
      // Aktualisiere EmailService und NotificationService
      // EmailService aktualisieren
      if (emailService && typeof emailService.initializeTransporter === 'function') {
        try {
          await emailService.initializeTransporter();
          console.log('✅ EmailService Transporter erfolgreich aktualisiert');
        } catch (emailServiceError) {
          console.error('⚠️ Fehler beim Aktualisieren des EmailService Transporters:', emailServiceError.message);
          // Weiterhin speichern, auch wenn Transporter-Test fehlschlägt
        }
      }
      
      // NotificationService aktualisieren
      if (notificationService && typeof notificationService.initializeTransporter === 'function') {
        try {
          await notificationService.initializeTransporter();
          console.log('✅ NotificationService Transporter erfolgreich aktualisiert');
        } catch (notificationServiceError) {
          console.error('⚠️ Fehler beim Aktualisieren des NotificationService Transporters:', notificationServiceError.message);
          // Weiterhin speichern, auch wenn Transporter-Test fehlschlägt
        }
      }
    } catch (transporterError) {
      console.error('⚠️ Fehler beim Aktualisieren der E-Mail-Transporter:', transporterError.message);
      console.error('⚠️ Stack:', transporterError.stack);
      // Weiterhin speichern, auch wenn Transporter-Test fehlschlägt
    }

    res.status(200).json({
      success: true,
      message: 'E-Mail-Konfiguration erfolgreich aktualisiert',
      data: {
        provider,
        smtp: {
          ...smtp,
          password: '***ENCRYPTED***' // Passwort nicht zurückgeben
        },
        practiceNotificationEmail: practiceNotificationEmail !== undefined
          ? (typeof practiceNotificationEmail === 'string' ? practiceNotificationEmail.trim() : '')
          : undefined
      }
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der E-Mail-Konfiguration',
      error: error.message
    });
  }
});

// @route   POST /api/settings/email/test
// @desc    Send test email
// @access  Private (requires 'settings.write' permission)
router.post('/email/test', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.write'
      });
    }

    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Gültige E-Mail-Adresse erforderlich'
      });
    }

    // Verwende aktuellen Transporter oder erstelle temporären
    let transporter = emailService?.transporter;
    let emailSettings = null;
    
    if (!transporter) {
      // Lade Settings und erstelle temporären Transporter
      emailSettings = await SystemSettings.getCategorySettings('notifications');
      let decryptedPassword = null;
      
      if (emailSettings['email.smtp.password']) {
        try {
          decryptedPassword = decryptPassword(emailSettings['email.smtp.password']);
        } catch (decryptError) {
          console.warn('Fehler beim Entschlüsseln des Passworts:', decryptError.message);
          decryptedPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
        }
      } else {
        decryptedPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
      }

      if (!decryptedPassword) {
        return res.status(400).json({
          success: false,
          message: 'E-Mail-Konfiguration nicht vollständig. Bitte speichern Sie zuerst die E-Mail-Einstellungen.'
        });
      }

      const nodemailer = require('nodemailer');
      transporter = nodemailer.createTransport({
        host: emailSettings['email.smtp.host'] || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: emailSettings['email.smtp.port'] || parseInt(process.env.SMTP_PORT || '587'),
        secure: emailSettings['email.smtp.secure'] !== undefined 
          ? emailSettings['email.smtp.secure'] 
          : (process.env.SMTP_SECURE === 'true'),
        auth: {
          user: emailSettings['email.smtp.user'] || process.env.SMTP_USER,
          pass: decryptedPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      // Lade Settings für Fehlerbehandlung
      try {
        emailSettings = await SystemSettings.getCategorySettings('notifications');
      } catch (settingsError) {
        console.warn('Fehler beim Laden der E-Mail-Settings:', settingsError.message);
      }
    }

    // Teste Verbindung
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('E-Mail-Verbindungstest fehlgeschlagen:', verifyError.message);
      
      // Prüfe auf Gmail-spezifische Authentifizierungsfehler
      const errorMessage = verifyError.message || '';
      const smtpHost = emailSettings?.['email.smtp.host'] || process.env.SMTP_HOST || '';
      const isGmailError = 
        errorMessage.includes('BadCredentials') ||
        errorMessage.includes('Username and Password not accepted') ||
        errorMessage.includes('Invalid login') ||
        (smtpHost.includes('gmail.com') && 
         (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('authentication')));
      
      let userFriendlyMessage = `E-Mail-Verbindungstest fehlgeschlagen: ${errorMessage}`;
      
      if (isGmailError) {
        userFriendlyMessage = `Gmail-Authentifizierung fehlgeschlagen. Für Gmail benötigen Sie ein App-Passwort (nicht Ihr normales Passwort). ` +
          `Erstellen Sie ein App-Passwort unter https://myaccount.google.com/apppasswords und verwenden Sie es in der E-Mail-Konfiguration.`;
      }
      
      return res.status(500).json({
        success: false,
        message: userFriendlyMessage,
        error: errorMessage,
        isGmailError: isGmailError
      });
    }

    // Hole From-Adresse aus Settings (wenn verfügbar)
    let fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@praxis.at';
    try {
      const emailSettings = await SystemSettings.getCategorySettings('notifications');
      fromAddress = emailSettings['email.smtp.from'] 
        || emailSettings['email.smtp.user'] 
        || fromAddress;
    } catch (settingsError) {
      console.warn('Fehler beim Laden der From-Adresse aus Settings:', settingsError.message);
    }

    // Sende Test-E-Mail
    const mailOptions = {
      from: {
        name: 'Ordinationssoftware',
        address: fromAddress
      },
      to: to,
      subject: 'Test-E-Mail von Ordinationssoftware',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">✅ Test-E-Mail erfolgreich</h2>
          <p>Diese E-Mail wurde erfolgreich von der Ordinationssoftware gesendet.</p>
          <p>Ihre E-Mail-Konfiguration funktioniert korrekt!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Gesendet am: ${new Date().toLocaleString('de-AT')}<br>
            Von: ${fromAddress}
          </p>
        </div>
      `,
      text: `Test-E-Mail erfolgreich\n\nDiese E-Mail wurde erfolgreich von der Ordinationssoftware gesendet.\n\nIhre E-Mail-Konfiguration funktioniert korrekt!\n\nGesendet am: ${new Date().toLocaleString('de-AT')}`
    };

    const result = await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Test-E-Mail erfolgreich gesendet',
      data: {
        messageId: result.messageId,
        recipient: to,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Test-E-Mail',
      error: error.message
    });
  }
});

// ==================== SMS-Konfiguration ====================

// @route   GET /api/settings/sms
// @desc    Get SMS configuration
// @access  Private (requires 'settings.read' permission)
router.get('/sms', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.read'
      });
    }

    const smsSettings = await SystemSettings.getCategorySettings('notifications');

    const config = {
      provider: smsSettings['sms.provider'] || process.env.SMS_PROVIDER || 'seven',
      seven: {
        apiKey: smsSettings['sms.seven.apiKey'] || process.env.SEVEN_API_KEY || '',
        from: smsSettings['sms.seven.from'] || process.env.SEVEN_FROM || 'Ordination'
      },
      twilio: {
        accountSid: smsSettings['sms.twilio.accountSid'] || process.env.TWILIO_ACCOUNT_SID || '',
        authToken: smsSettings['sms.twilio.authToken'] ? '***ENCRYPTED***' : (process.env.TWILIO_AUTH_TOKEN ? '***ENCRYPTED***' : ''),
        fromNumber: smsSettings['sms.twilio.fromNumber'] || process.env.TWILIO_FROM_NUMBER || ''
      },
      websms: {
        username: smsSettings['sms.websms.username'] || process.env.WEBSMS_USERNAME || '',
        password: smsSettings['sms.websms.password'] ? '***ENCRYPTED***' : (process.env.WEBSMS_PASSWORD ? '***ENCRYPTED***' : '')
      },
      isConfigured: !!(smsSettings['sms.provider'] || process.env.SMS_PROVIDER)
    };

    res.status(200).json({
      success: true,
      data: config,
      message: 'SMS-Konfiguration erfolgreich geladen'
    });
  } catch (error) {
    console.error('Error fetching SMS settings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der SMS-Konfiguration',
      error: error.message
    });
  }
});

// @route   PUT /api/settings/sms
// @desc    Update SMS configuration
// @access  Private (requires 'settings.write' permission)
router.put('/sms', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.write'
      });
    }

    const { provider, seven, twilio, websms } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'SMS-Provider ist erforderlich'
      });
    }

    // Speichere Provider
    await SystemSettings.setSetting(
      'notifications',
      'sms.provider',
      provider,
      'string',
      req.user.id
    );

    // Seven.io Konfiguration
    if (seven) {
      if (seven.apiKey) {
        await SystemSettings.setSetting(
          'notifications',
          'sms.seven.apiKey',
          seven.apiKey,
          'string',
          req.user.id
        );
      }
      if (seven.from !== undefined) {
        await SystemSettings.setSetting(
          'notifications',
          'sms.seven.from',
          seven.from || 'Ordination',
          'string',
          req.user.id
        );
      }
    }

    // Twilio Konfiguration
    if (twilio) {
      if (twilio.accountSid) {
        await SystemSettings.setSetting(
          'notifications',
          'sms.twilio.accountSid',
          twilio.accountSid,
          'string',
          req.user.id
        );
      }
      if (twilio.authToken && twilio.authToken !== '***ENCRYPTED***') {
        const encryptedToken = encryptPassword(twilio.authToken);
        await SystemSettings.setSetting(
          'notifications',
          'sms.twilio.authToken',
          encryptedToken,
          'string',
          req.user.id
        );
      }
      if (twilio.fromNumber) {
        await SystemSettings.setSetting(
          'notifications',
          'sms.twilio.fromNumber',
          twilio.fromNumber,
          'string',
          req.user.id
        );
      }
    }

    // websms.at Konfiguration
    if (websms) {
      if (websms.username) {
        await SystemSettings.setSetting(
          'notifications',
          'sms.websms.username',
          websms.username,
          'string',
          req.user.id
        );
      }
      if (websms.password && websms.password !== '***ENCRYPTED***') {
        const encryptedPassword = encryptPassword(websms.password);
        await SystemSettings.setSetting(
          'notifications',
          'sms.websms.password',
          encryptedPassword,
          'string',
          req.user.id
        );
      }
    }

    // Initialisiere SMS-Service neu
    try {
      await smsService.initializeConfig();
      console.log('✅ SMS-Service erfolgreich aktualisiert');
    } catch (smsError) {
      console.error('⚠️ Fehler beim Aktualisieren des SMS-Services:', smsError.message);
    }

    res.status(200).json({
      success: true,
      message: 'SMS-Konfiguration erfolgreich aktualisiert',
      data: {
        provider,
        seven: seven ? { ...seven, apiKey: seven.apiKey ? '***ENCRYPTED***' : '' } : {},
        twilio: twilio ? { ...twilio, authToken: '***ENCRYPTED***' } : {},
        websms: websms ? { ...websms, password: '***ENCRYPTED***' } : {}
      }
    });
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    res.status(500).json({
      success: false,
      message: `Fehler beim Aktualisieren der SMS-Konfiguration: ${error.message}`,
      error: error.message
    });
  }
});

// @route   POST /api/settings/sms/test
// @desc    Send test SMS
// @access  Private (requires 'settings.write' permission)
router.post('/sms/test', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.write'
      });
    }

    const { to } = req.body;
    if (!to || !to.includes('+')) {
      return res.status(400).json({
        success: false,
        message: 'Gültige Telefonnummer im internationalen Format erforderlich (z.B. +436641234567)'
      });
    }

    // Initialisiere SMS-Service mit aktuellen Settings
    await smsService.initializeConfig();

    // Sende Test-SMS
    const result = await smsService.sendSMS(to, 'Test-SMS von Ordinationssoftware - Ihre SMS-Konfiguration funktioniert korrekt!');

    res.status(200).json({
      success: true,
      message: `Test-SMS erfolgreich an ${to} gesendet!`,
      data: {
        messageId: result.messageId,
        recipient: to,
        provider: result.provider,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    
    let userFriendlyMessage = `Fehler beim Senden der Test-SMS: ${error.message}`;
    
    // Provider-spezifische Fehlermeldungen
    if (error.message.includes('nicht konfiguriert') || error.message.includes('not configured')) {
      userFriendlyMessage = `SMS-Provider nicht vollständig konfiguriert. Bitte überprüfen Sie Ihre API-Schlüssel und Credentials.`;
    }

    res.status(500).json({
      success: false,
      message: userFriendlyMessage,
      error: error.message
    });
  }
});

module.exports = router;







