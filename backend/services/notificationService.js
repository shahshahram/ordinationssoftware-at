// Benachrichtigungs-Service für E-Mails und interne Nachrichten

const nodemailer = require('nodemailer');
const InternalMessage = require('../models/InternalMessage');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const crypto = require('crypto');

class NotificationService {
  constructor() {
    // E-Mail-Transporter konfigurieren
    this.transporter = null;
    this.initializeTransporter();
  }

  // Verschlüsselungs-Hilfsfunktionen
  getEncryptionKey() {
    let key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      return null; // Kein Schlüssel = keine Verschlüsselung
    }
    
    // Konvertiere Hex-String zu Buffer (32 Bytes)
    if (key.length === 64) {
      // Perfekt: 64 Hex-Zeichen = 32 Bytes
      return Buffer.from(key, 'hex');
    } else if (key.length > 64) {
      // Zu lang: nimm die ersten 64 Zeichen
      return Buffer.from(key.slice(0, 64), 'hex');
    } else {
      // Zu kurz: hashe den Schlüssel zu 32 Bytes
      return crypto.createHash('sha256').update(key).digest();
    }
  }

  decryptPassword(encryptedText) {
    if (!encryptedText) return null;
    try {
      const key = this.getEncryptionKey();
      if (!key) return null;
      
      const ALGORITHM = 'aes-256-cbc';
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

  /**
   * Initialisiert E-Mail-Transporter
   */
  async initializeTransporter() {
    try {
      // Versuche zuerst Settings aus Datenbank zu laden
      let smtpConfig = null;
      try {
        const emailSettings = await SystemSettings.getCategorySettings('notifications');
        if (emailSettings['email.smtp.host']) {
          const decryptedPassword = emailSettings['email.smtp.password'] 
            ? this.decryptPassword(emailSettings['email.smtp.password'])
            : null;
          
          smtpConfig = {
            host: emailSettings['email.smtp.host'],
            port: emailSettings['email.smtp.port'] || 587,
            secure: emailSettings['email.smtp.secure'] !== undefined 
              ? emailSettings['email.smtp.secure'] 
              : false,
            auth: {
              user: emailSettings['email.smtp.user'],
              pass: decryptedPassword || process.env.SMTP_PASSWORD
            }
          };
        }
      } catch (error) {
        console.warn('Fehler beim Laden der E-Mail-Settings aus DB:', error.message);
      }

      // Fallback zu Umgebungsvariablen
      if (!smtpConfig) {
        smtpConfig = {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        };
      }

      this.transporter = nodemailer.createTransport(smtpConfig);
    } catch (error) {
      console.warn('E-Mail-Transporter konnte nicht initialisiert werden:', error.message);
      this.transporter = null;
    }
  }

  /**
   * Sendet E-Mail-Benachrichtigung
   */
  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      console.warn('E-Mail-Transporter nicht verfügbar, E-Mail wird nicht gesendet');
      return { success: false, error: 'E-Mail-Transporter nicht verfügbar' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Konvertiert HTML zu Text
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Sendet interne Nachricht
   */
  async sendInternalMessage(recipientId, subject, message, senderId = null, relatedTo = null) {
    try {
      const internalMessage = new InternalMessage({
        senderId: senderId || null, // null = System
        recipientId,
        subject,
        message,
        relatedTo,
        isRead: false
      });

      await internalMessage.save();
      return { success: true, messageId: internalMessage._id };
    } catch (error) {
      console.error('Fehler beim Senden der internen Nachricht:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Benachrichtigt über Erstattungsstatus-Änderung
   */
  async notifyReimbursementStatusChange(reimbursement, oldStatus, newStatus) {
    try {
      // Hole Patient und Rechnung
      const patient = await reimbursement.populate('patientId');
      const invoice = await reimbursement.populate('invoiceId');
      
      // Hole Benutzer für E-Mail
      const user = await User.findById(patient.patientId?._id || reimbursement.patientId);
      if (!user || !user.email) {
        console.warn('Keine E-Mail-Adresse für Benutzer gefunden');
        return { success: false, error: 'Keine E-Mail-Adresse' };
      }

      // Erstelle Nachricht
      const statusLabels = {
        pending: 'Ausstehend',
        submitted: 'Eingereicht',
        approved: 'Genehmigt',
        partially_approved: 'Teilweise genehmigt',
        rejected: 'Abgelehnt',
        paid: 'Bezahlt',
        cancelled: 'Storniert'
      };

      const subject = `Erstattungsstatus geändert: ${statusLabels[newStatus] || newStatus}`;
      
      const message = `
        <h2>Erstattungsstatus-Änderung</h2>
        <p>Ihre Erstattung wurde aktualisiert:</p>
        <ul>
          <li><strong>Rechnungsnummer:</strong> ${invoice.invoiceId?.invoiceNumber || 'N/A'}</li>
          <li><strong>Alter Status:</strong> ${statusLabels[oldStatus] || oldStatus}</li>
          <li><strong>Neuer Status:</strong> ${statusLabels[newStatus] || newStatus}</li>
          <li><strong>Betrag:</strong> ${(reimbursement.totalAmount / 100).toFixed(2)} €</li>
          <li><strong>Erstattung:</strong> ${(reimbursement.approvedReimbursement / 100).toFixed(2)} €</li>
        </ul>
        ${reimbursement.rejectionReason ? `<p><strong>Ablehnungsgrund:</strong> ${reimbursement.rejectionReason}</p>` : ''}
        <p>Bitte loggen Sie sich in das System ein, um weitere Details zu sehen.</p>
      `;

      // Sende E-Mail
      const emailResult = await this.sendEmail(user.email, subject, message);
      
      // Sende interne Nachricht
      const internalMessageResult = await this.sendInternalMessage(
        user._id,
        subject,
        message,
        null, // System
        reimbursement._id.toString()
      );

      return {
        success: emailResult.success || internalMessageResult.success,
        email: emailResult,
        internalMessage: internalMessageResult
      };
    } catch (error) {
      console.error('Fehler bei Erstattungsbenachrichtigung:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Benachrichtigt über ÖGK-Übermittlungsstatus
   */
  async notifyOGKSubmissionStatus(invoice, status, message = null) {
    try {
      // Hole Arzt/Benutzer
      const user = await User.findById(invoice.createdBy);
      if (!user || !user.email) {
        return { success: false, error: 'Keine E-Mail-Adresse' };
      }

      const statusLabels = {
        submitted: 'Eingereicht',
        approved: 'Genehmigt',
        rejected: 'Abgelehnt',
        paid: 'Bezahlt'
      };

      const subject = `ÖGK-Abrechnung: ${statusLabels[status] || status}`;
      
      const html = `
        <h2>ÖGK-Abrechnungsstatus</h2>
        <p>Ihre ÖGK-Abrechnung wurde aktualisiert:</p>
        <ul>
          <li><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</li>
          <li><strong>Status:</strong> ${statusLabels[status] || status}</li>
          <li><strong>Betrag:</strong> ${(invoice.totalAmount / 100).toFixed(2)} €</li>
          ${message ? `<li><strong>Nachricht:</strong> ${message}</li>` : ''}
        </ul>
      `;

      const emailResult = await this.sendEmail(user.email, subject, html);
      const internalMessageResult = await this.sendInternalMessage(
        user._id,
        subject,
        html,
        null
      );

      return {
        success: emailResult.success || internalMessageResult.success,
        email: emailResult,
        internalMessage: internalMessageResult
      };
    } catch (error) {
      console.error('Fehler bei ÖGK-Benachrichtigung:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Benachrichtigt über e-card-Validierung
   */
  async notifyECardValidation(patientId, validationStatus, ecardNumber) {
    try {
      const patient = await PatientExtended.findById(patientId);
      if (!patient || !patient.email) {
        return { success: false, error: 'Keine E-Mail-Adresse' };
      }

      const statusLabels = {
        valid: 'Gültig',
        invalid: 'Ungültig',
        expired: 'Abgelaufen',
        not_found: 'Nicht gefunden'
      };

      const subject = `e-card Validierung: ${statusLabels[validationStatus] || validationStatus}`;
      
      const html = `
        <h2>e-card Validierung</h2>
        <p>Ihre e-card wurde validiert:</p>
        <ul>
          <li><strong>e-card Nummer:</strong> ${ecardNumber}</li>
          <li><strong>Status:</strong> ${statusLabels[validationStatus] || validationStatus}</li>
        </ul>
      `;

      return await this.sendEmail(patient.email, subject, html);
    } catch (error) {
      console.error('Fehler bei e-card-Benachrichtigung:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parst einen String mit E-Mail-Adressen (komma-, zeilen- oder semikolongetrennt) zu einem Array.
   * @param {string} value - Roher String aus SystemSettings oder Env
   * @returns {string[]} - Bereinigte Adressen
   */
  parsePracticeNotificationEmails(value) {
    if (!value || typeof value !== 'string') return [];
    return value
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes('@'));
  }

  /**
   * Sendet eine Info-Mail an die Ordination bei neuer Online-Buchung.
   * Empfänger: zuerst aus SystemSettings (practiceNotificationEmail), dann Fallback Env.
   * Mehrere Adressen werden unterstützt (komma-/zeilengetrennt).
   */
  async notifyPracticeOfNewBooking(appointment, patient, doctorName) {
    let targetEmails = [];

    try {
      const notificationsSettings = await SystemSettings.getCategorySettings('notifications');
      const raw = notificationsSettings.practiceNotificationEmail;
      targetEmails = this.parsePracticeNotificationEmails(raw);
    } catch (err) {
      console.warn('Fehler beim Laden der Praxis-E-Mail aus SystemSettings:', err.message);
    }

    if (targetEmails.length === 0) {
      const envEmail = process.env.PRACTICE_NOTIFICATION_EMAIL
        || process.env.SYSTEM_EMAIL_FROM
        || process.env.SMTP_FROM
        || process.env.SMTP_USER;
      if (envEmail) {
        targetEmails = this.parsePracticeNotificationEmails(envEmail);
      }
    }

    if (targetEmails.length === 0) {
      console.log('ℹ️ Keine Praxis-Benachrichtigungs-E-Mail konfiguriert. Überspringe Praxis-Mail.');
      return { success: false, skipped: true };
    }

    const startDate = new Date(appointment.startTime || appointment.start);
    const dateStr = startDate.toLocaleDateString('de-AT');
    const timeStr = startDate.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
    const svnr = patient.socialSecurityNumber || patient.svnr || '-';

    const subject = `Neue Online-Buchung: ${patient.firstName} ${patient.lastName}`;
    const html = `
      <h3>Neue Terminbuchung empfangen</h3>
      <p>Ein neuer Patient hat soeben online gebucht:</p>
      <ul>
        <li><strong>Patient:</strong> ${patient.firstName} ${patient.lastName} (SVNR: ${svnr})</li>
        <li><strong>Termin:</strong> ${dateStr} um ${timeStr}</li>
        <li><strong>Arzt:</strong> ${doctorName || 'Nicht zugewiesen'}</li>
        <li><strong>Grund:</strong> ${appointment.notes || 'Keine Angabe'}</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL || ''}/dashboard">Zur Buchung im System</a></p>
    `;
    const text = `Neue Buchung von ${patient.lastName} – ${dateStr} ${timeStr}`;

    return this.sendEmail(targetEmails.join(', '), subject, html, text);
  }
}

module.exports = new NotificationService();


















