const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Konfiguration aus Umgebungsvariablen
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true für 465, false für andere Ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Teste Verbindung
      await this.transporter.verify();
      console.log('✅ E-Mail-Service erfolgreich initialisiert');
    } catch (error) {
      console.error('❌ E-Mail-Service Initialisierung fehlgeschlagen:', error.message);
      // Fallback für Entwicklung
      this.transporter = null;
    }
  }

  /**
   * Sendet eine Rechnung per E-Mail an den Patienten
   * @param {Object} invoice - Rechnungsobjekt
   * @param {Buffer} pdfBuffer - PDF-Datei als Buffer
   * @param {Object} options - Zusätzliche Optionen
   * @returns {Promise<Object>} Versand-Ergebnis
   */
  async sendInvoiceEmail(invoice, pdfBuffer, options = {}) {
    if (!this.transporter) {
      throw new Error('E-Mail-Service nicht verfügbar');
    }

    try {
      const patientEmail = invoice.patient.email;
      if (!patientEmail) {
        throw new Error('Patient hat keine E-Mail-Adresse');
      }

      const mailOptions = {
        from: {
          name: invoice.doctor.name,
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: patientEmail,
        subject: `Rechnung ${invoice.invoiceNumber} - ${invoice.doctor.name}`,
        html: this.generateInvoiceEmailHTML(invoice),
        text: this.generateInvoiceEmailText(invoice),
        attachments: [
          {
            filename: `Rechnung_${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Rechnung ${invoice.invoiceNumber} erfolgreich an ${patientEmail} gesendet`);
      
      return {
        success: true,
        messageId: result.messageId,
        recipient: patientEmail,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ E-Mail-Versand fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Generiert HTML-E-Mail-Inhalt für Rechnung
   * @param {Object} invoice - Rechnungsobjekt
   * @returns {String} HTML-Content
   */
  generateInvoiceEmailHTML(invoice) {
    const formatCurrency = (amount) => (amount / 100).toFixed(2).replace('.', ',');
    const formatDate = (date) => new Date(date).toLocaleDateString('de-DE');
    
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${invoice.invoiceNumber}</title>
        <style>
            body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                line-height: 1.6; 
                color: #2c3e50; 
                margin: 0; 
                padding: 0; 
                background-color: #f8f9fa;
            }
            .email-container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header { 
                background: linear-gradient(135deg, #2c5aa0 0%, #34495e 100%);
                color: white; 
                padding: 25px; 
                text-align: center;
            }
            .header h1 { 
                margin: 0; 
                font-size: 24px; 
                font-weight: bold;
            }
            .header .subtitle { 
                margin: 5px 0 0 0; 
                font-size: 14px; 
                opacity: 0.9;
            }
            .content { 
                padding: 25px; 
            }
            .greeting { 
                font-size: 16px; 
                margin-bottom: 20px; 
                color: #2c3e50;
            }
            .invoice-summary { 
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border: 1px solid #dee2e6;
                border-radius: 8px; 
                padding: 20px; 
                margin-bottom: 25px;
            }
            .invoice-summary h2 { 
                color: #2c5aa0; 
                margin: 0 0 15px 0; 
                font-size: 18px;
                border-bottom: 2px solid #2c5aa0;
                padding-bottom: 8px;
            }
            .summary-row { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 8px; 
                font-size: 14px;
            }
            .summary-label { 
                font-weight: 600; 
                color: #34495e;
            }
            .summary-value { 
                color: #2c3e50;
            }
            .services-section { 
                margin-bottom: 25px;
            }
            .services-section h3 { 
                color: #2c5aa0; 
                margin-bottom: 15px; 
                font-size: 16px;
                border-bottom: 1px solid #bdc3c7;
                padding-bottom: 5px;
            }
            .service-item { 
                border-bottom: 1px solid #ecf0f1; 
                padding: 12px 0; 
                font-size: 13px;
            }
            .service-item:last-child { 
                border-bottom: none;
            }
            .service-name { 
                font-weight: 600; 
                color: #2c3e50; 
                margin-bottom: 5px;
            }
            .service-details { 
                color: #7f8c8d; 
                font-size: 12px;
            }
            .total-section { 
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border: 1px solid #f39c12;
                border-radius: 8px; 
                padding: 20px; 
                margin-bottom: 25px;
                text-align: center;
            }
            .total-section h3 { 
                color: #d68910; 
                margin: 0 0 10px 0; 
                font-size: 18px;
            }
            .total-amount { 
                font-size: 24px; 
                font-weight: bold; 
                color: #d68910; 
                margin-bottom: 10px;
            }
            .due-date { 
                font-size: 14px; 
                color: #856404;
            }
            .payment-info { 
                background-color: #f8f9fa; 
                border-left: 4px solid #2c5aa0; 
                padding: 15px; 
                margin-bottom: 25px;
                border-radius: 0 8px 8px 0;
            }
            .payment-info h4 { 
                color: #2c5aa0; 
                margin: 0 0 10px 0; 
                font-size: 14px;
            }
            .payment-info ul { 
                margin: 0; 
                padding-left: 20px; 
                font-size: 13px; 
                color: #34495e;
            }
            .payment-info li { 
                margin-bottom: 5px;
            }
            .attachment-notice { 
                background-color: #e3f2fd; 
                border: 1px solid #2196f3; 
                border-radius: 8px; 
                padding: 15px; 
                margin-bottom: 25px;
                text-align: center;
            }
            .attachment-notice h4 { 
                color: #1976d2; 
                margin: 0 0 8px 0; 
                font-size: 14px;
            }
            .attachment-notice p { 
                margin: 0; 
                font-size: 13px; 
                color: #1565c0;
            }
            .footer { 
                background-color: #34495e; 
                color: white; 
                padding: 20px; 
                text-align: center; 
                font-size: 12px;
            }
            .footer h4 { 
                margin: 0 0 10px 0; 
                color: #ecf0f1;
            }
            .footer p { 
                margin: 5px 0; 
                color: #bdc3c7;
            }
            .contact-info { 
                margin-top: 15px; 
                padding-top: 15px; 
                border-top: 1px solid #7f8c8d;
            }
            .billing-type-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-left: 10px;
            }
            .billing-type-kassenarzt { background-color: #d4edda; color: #155724; }
            .billing-type-wahlarzt { background-color: #fff3cd; color: #856404; }
            .billing-type-privat { background-color: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🏥 Rechnung ${invoice.invoiceNumber}</h1>
                <div class="subtitle">${invoice.doctor.name}</div>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Sehr geehrte/r <strong>${invoice.patient.name}</strong>,
                </div>
                
                <div class="invoice-summary">
                    <h2>Rechnungsübersicht</h2>
                    <div class="summary-row">
                        <span class="summary-label">Rechnungsnummer:</span>
                        <span class="summary-value">${invoice.invoiceNumber}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Rechnungsdatum:</span>
                        <span class="summary-value">${formatDate(invoice.invoiceDate)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Fälligkeitsdatum:</span>
                        <span class="summary-value">${formatDate(invoice.dueDate)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Abrechnungstyp:</span>
                        <span class="summary-value">
                            ${invoice.billingType === 'kassenarzt' ? 'Kassenarzt' : 
                              invoice.billingType === 'wahlarzt' ? 'Wahlarzt' : 'Privat'}
                            <span class="billing-type-badge billing-type-${invoice.billingType}">
                                ${invoice.billingType === 'kassenarzt' ? 'Kassenarzt' : 
                                  invoice.billingType === 'wahlarzt' ? 'Wahlarzt' : 'Privat'}
                            </span>
                        </span>
                    </div>
                </div>

                <div class="services-section">
                    <h3>Erbrachte Leistungen</h3>
                    ${invoice.services.map((service, index) => `
                        <div class="service-item">
                            <div class="service-name">${index + 1}. ${service.description}</div>
                            <div class="service-details">
                                Datum: ${formatDate(service.date)} | 
                                Code: ${service.serviceCode} | 
                                Menge: ${service.quantity} | 
                                Preis: ${formatCurrency(service.totalPrice)} €
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="total-section">
                    <h3>Gesamtbetrag</h3>
                    <div class="total-amount">${formatCurrency(invoice.totalAmount)} €</div>
                    <div class="due-date">Fälligkeitsdatum: ${formatDate(invoice.dueDate)}</div>
                </div>

                <div class="payment-info">
                    <h4>Zahlungsinformationen</h4>
                    ${invoice.billingType === 'kassenarzt' ? `
                        <ul>
                            <li>Diese Rechnung wird direkt mit der Österreichischen Gesundheitskasse (ÖGK) abgerechnet</li>
                            <li>Selbstbehalt: ${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0))} €</li>
                            <li>Sie erhalten keine separate Rechnung für diese Leistungen</li>
                        </ul>
                    ` : invoice.billingType === 'wahlarzt' ? `
                        <ul>
                            <li>Sie zahlen den Gesamtbetrag: ${formatCurrency(invoice.totalAmount)} €</li>
                            <li>Erstattung durch Versicherung: ${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.reimbursement || 0), 0))} €</li>
                            <li>Reichen Sie diese Rechnung bei Ihrer Krankenversicherung zur Erstattung ein</li>
                            <li>Zahlung bitte bis zum ${formatDate(invoice.dueDate)} auf unser Konto</li>
                        </ul>
                    ` : `
                        <ul>
                            <li>Privatabrechnung - Zahlung direkt an die Ordination</li>
                            <li>Gesamtbetrag: ${formatCurrency(invoice.totalAmount)} €</li>
                            <li>Zahlung bitte bis zum ${formatDate(invoice.dueDate)} auf unser Konto</li>
                            <li>Bei Fragen wenden Sie sich bitte an unsere Ordination</li>
                        </ul>
                    `}
                </div>

                <div class="attachment-notice">
                    <h4>📎 PDF-Rechnung im Anhang</h4>
                    <p>Die detaillierte Rechnung mit allen Informationen finden Sie als PDF-Datei im Anhang dieser E-Mail.</p>
                </div>
            </div>
            
            <div class="footer">
                <h4>${invoice.doctor.name}</h4>
                <p>${invoice.doctor.address.street}</p>
                <p>${invoice.doctor.address.postalCode} ${invoice.doctor.address.city}</p>
                ${invoice.doctor.phone ? `<p>Tel: ${invoice.doctor.phone}</p>` : ''}
                ${invoice.doctor.email ? `<p>E-Mail: ${invoice.doctor.email}</p>` : ''}
                
                <div class="contact-info">
                    <p><strong>Vielen Dank für Ihr Vertrauen!</strong></p>
                    <p>Bei Fragen zur Rechnung wenden Sie sich bitte an unsere Ordination.</p>
                    <p>Diese E-Mail wurde automatisch generiert am ${formatDate(new Date())} um ${new Date().toLocaleTimeString('de-DE')}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generiert Text-E-Mail-Inhalt für Rechnung
   * @param {Object} invoice - Rechnungsobjekt
   * @returns {String} Text-Content
   */
  generateInvoiceEmailText(invoice) {
    return `
Rechnung ${invoice.invoiceNumber}

Ordination: ${invoice.doctor.name}
Datum: ${new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}

Patient: ${invoice.patient.name}
Adresse: ${invoice.patient.address.street}, ${invoice.patient.address.postalCode} ${invoice.patient.address.city}

Leistungen:
${invoice.services.map((service, index) => `
${index + 1}. ${service.description}
   Datum: ${new Date(service.date).toLocaleDateString('de-DE')}
   Code: ${service.serviceCode}
   Menge: ${service.quantity}
   Preis: ${(service.totalPrice / 100).toFixed(2).replace('.', ',')} €
`).join('')}

Gesamtbetrag: ${(invoice.totalAmount / 100).toFixed(2).replace('.', ',')} €
Fälligkeitsdatum: ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}

Die detaillierte Rechnung finden Sie als PDF-Anhang.

Bei Fragen wenden Sie sich bitte an unsere Ordination.

${invoice.doctor.name}
${invoice.doctor.address.street}
${invoice.doctor.address.postalCode} ${invoice.doctor.address.city}
    `;
  }

  /**
   * Sendet eine Test-E-Mail
   * @param {String} to - Empfänger-E-Mail
   * @returns {Promise<Object>} Versand-Ergebnis
   */
  async sendTestEmail(to) {
    if (!this.transporter) {
      throw new Error('E-Mail-Service nicht verfügbar');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: 'Test-E-Mail von Ordinationssoftware',
      html: '<h1>Test-E-Mail</h1><p>Der E-Mail-Service funktioniert korrekt!</p>',
      text: 'Test-E-Mail - Der E-Mail-Service funktioniert korrekt!'
    };

    const result = await this.transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId,
      recipient: to
    };
  }
}

module.exports = new EmailService();
