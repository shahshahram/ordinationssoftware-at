// Benachrichtigungs-Service für E-Mails und interne Nachrichten

const nodemailer = require('nodemailer');
const InternalMessage = require('../models/InternalMessage');
const User = require('../models/User');

class NotificationService {
  constructor() {
    // E-Mail-Transporter konfigurieren
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialisiert E-Mail-Transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
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
}

module.exports = new NotificationService();





