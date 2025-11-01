const pdfGenerator = require('../utils/pdfGenerator');
const Invoice = require('../models/Invoice');

class InvoicePDFService {
  constructor() {
    this.pdfGenerator = pdfGenerator;
  }

  /**
   * Generiert eine PDF-Rechnung
   * @param {String} invoiceId - Rechnungs-ID
   * @param {Object} options - PDF-Optionen
   * @returns {Promise<Buffer>} PDF-Buffer
   */
  async generateInvoicePDF(invoiceId, options = {}) {
    try {
      // Rechnung aus Datenbank laden
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Rechnung nicht gefunden');
      }

      // HTML-Template für Rechnung generieren
      const htmlContent = this.generateInvoiceHTML(invoice);
      
      // PDF generieren
      const pdfBuffer = await this.pdfGenerator.generatePDF(htmlContent, {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        ...options
      });

      return pdfBuffer;
    } catch (error) {
      console.error('PDF-Generierung fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Generiert HTML-Template für Rechnung
   * @param {Object} invoice - Rechnungsobjekt
   * @returns {String} HTML-Content
   */
  generateInvoiceHTML(invoice) {
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
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                line-height: 1.4; 
                color: #2c3e50; 
                font-size: 11px;
                background-color: #ffffff;
            }
            .invoice-container { 
                max-width: 210mm; 
                margin: 0 auto; 
                padding: 15mm;
                background-color: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            
            /* Header Styles */
            .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                margin-bottom: 25px;
                border-bottom: 3px solid #2c5aa0;
                padding-bottom: 15px;
            }
            .doctor-info { 
                flex: 1;
                padding-right: 20px;
            }
            .doctor-info h1 { 
                color: #2c5aa0; 
                font-size: 22px; 
                margin-bottom: 8px;
                font-weight: bold;
            }
            .doctor-info .title { 
                color: #34495e; 
                font-size: 14px; 
                font-weight: 600;
                margin-bottom: 5px;
            }
            .doctor-info .specialization { 
                color: #7f8c8d; 
                font-size: 12px; 
                margin-bottom: 10px;
                font-style: italic;
            }
            .doctor-info .address { 
                font-size: 11px; 
                line-height: 1.3;
                color: #34495e;
            }
            .doctor-info .contact-info { 
                margin-top: 10px; 
                font-size: 10px; 
                color: #7f8c8d;
            }
            
            .invoice-info { 
                text-align: right; 
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 15px; 
                border-radius: 8px;
                border: 1px solid #dee2e6;
                min-width: 200px;
            }
            .invoice-info h2 { 
                color: #2c5aa0; 
                font-size: 20px; 
                margin-bottom: 12px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .invoice-info .invoice-details {
                font-size: 10px;
                line-height: 1.4;
            }
            .invoice-info .invoice-details strong {
                color: #2c3e50;
            }
            
            /* Patient Section */
            .patient-section { 
                margin-bottom: 25px; 
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 15px; 
                border-radius: 8px;
                border-left: 4px solid #2c5aa0;
            }
            .patient-section h3 { 
                color: #2c5aa0; 
                margin-bottom: 10px; 
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .patient-info {
                font-size: 11px;
                line-height: 1.4;
            }
            
            /* Services Table */
            .services-section {
                margin-bottom: 20px;
            }
            .services-section h3 {
                color: #2c5aa0;
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .services-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 15px;
                font-size: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .services-table th, .services-table td { 
                border: 1px solid #bdc3c7; 
                padding: 8px 6px; 
                text-align: left;
                vertical-align: top;
            }
            .services-table th { 
                background: linear-gradient(135deg, #2c5aa0 0%, #34495e 100%);
                color: white; 
                font-weight: bold;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .services-table tr:nth-child(even) { 
                background-color: #f8f9fa;
            }
            .services-table tr:hover {
                background-color: #e3f2fd;
            }
            
            /* Totals Section */
            .totals-section { 
                margin-top: 20px; 
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 15px; 
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }
            .totals-section h3 {
                color: #2c5aa0;
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .totals-table { 
                width: 100%; 
                max-width: 350px; 
                margin-left: auto;
                font-size: 11px;
            }
            .totals-table td { 
                padding: 6px 10px; 
                border-bottom: 1px solid #bdc3c7;
            }
            .totals-table .label {
                font-weight: 600;
                color: #2c3e50;
            }
            .totals-table .amount {
                text-align: right;
                font-weight: 500;
            }
            .total-row { 
                font-weight: bold; 
                font-size: 13px; 
                background: linear-gradient(135deg, #2c5aa0 0%, #34495e 100%);
                color: white;
                border-radius: 4px;
            }
            .total-row .label {
                color: white;
            }
            .total-row .amount {
                color: white;
            }
            
            /* Tax Information */
            .tax-info {
                margin-top: 10px;
                padding: 8px;
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                font-size: 9px;
                color: #856404;
            }
            
            /* Payment Information */
            .payment-info { 
                margin-top: 25px; 
                padding: 15px; 
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border-radius: 8px; 
                border-left: 4px solid #f39c12;
            }
            .payment-info h3 { 
                color: #d68910; 
                margin-bottom: 10px;
                font-size: 13px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .payment-info ul {
                margin: 0;
                padding-left: 15px;
                font-size: 10px;
                line-height: 1.4;
            }
            .payment-info li {
                margin-bottom: 3px;
                color: #856404;
            }
            
            /* Footer */
            .footer { 
                margin-top: 30px; 
                padding-top: 15px; 
                border-top: 2px solid #bdc3c7; 
                text-align: center; 
                font-size: 9px; 
                color: #7f8c8d;
                line-height: 1.3;
            }
            .footer .thank-you {
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 5px;
            }
            
            /* Billing Type Badge */
            .billing-type-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 5px;
            }
            .billing-type-kassenarzt { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .billing-type-wahlarzt { background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            .billing-type-privat { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            
            /* Legal Information */
            .legal-info {
                margin-top: 20px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 4px;
                font-size: 8px;
                color: #6c757d;
                line-height: 1.3;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="doctor-info">
                    <h1>${invoice.doctor.name}</h1>
                    ${invoice.doctor.title ? `<div class="title">${invoice.doctor.title}</div>` : ''}
                    ${invoice.doctor.specialization ? `<div class="specialization">${invoice.doctor.specialization}</div>` : ''}
                    <div class="address">
                        <div>${invoice.doctor.address.street}</div>
                        <div>${invoice.doctor.address.postalCode} ${invoice.doctor.address.city}</div>
                        <div>${invoice.doctor.address.country}</div>
                    </div>
                    <div class="contact-info">
                        ${invoice.doctor.phone ? `<div>Tel: ${invoice.doctor.phone}</div>` : ''}
                        ${invoice.doctor.email ? `<div>E-Mail: ${invoice.doctor.email}</div>` : ''}
                        ${invoice.doctor.taxNumber ? `<div>UID: ${invoice.doctor.taxNumber}</div>` : ''}
                        ${invoice.doctor.chamberNumber ? `<div>Ärztekammer: ${invoice.doctor.chamberNumber}</div>` : ''}
                    </div>
                </div>
                <div class="invoice-info">
                    <h2>RECHNUNG</h2>
                    <div class="invoice-details">
                        <div><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</div>
                        <div><strong>Rechnungsdatum:</strong> ${formatDate(invoice.invoiceDate)}</div>
                        <div><strong>Fälligkeitsdatum:</strong> ${formatDate(invoice.dueDate)}</div>
                        <div><strong>Status:</strong> ${invoice.status}</div>
                        <div class="billing-type-badge billing-type-${invoice.billingType}">
                            ${invoice.billingType === 'kassenarzt' ? 'Kassenarzt' : 
                              invoice.billingType === 'wahlarzt' ? 'Wahlarzt' : 'Privat'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Patient Information -->
            <div class="patient-section">
                <h3>Rechnungsempfänger</h3>
                <div class="patient-info">
                    <div><strong>Name:</strong> ${invoice.patient.name}</div>
                    <div><strong>Adresse:</strong> ${invoice.patient.address.street}, ${invoice.patient.address.postalCode} ${invoice.patient.address.city}</div>
                    ${invoice.patient.socialSecurityNumber ? `<div><strong>SV-Nummer:</strong> ${invoice.patient.socialSecurityNumber}</div>` : ''}
                    ${invoice.patient.insuranceProvider ? `<div><strong>Versicherung:</strong> ${invoice.patient.insuranceProvider}</div>` : ''}
                </div>
            </div>

            <!-- Services Section -->
            <div class="services-section">
                <h3>Erbrachte Leistungen</h3>
                <table class="services-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">Nr.</th>
                            <th style="width: 35%;">Leistungsbeschreibung</th>
                            <th style="width: 12%;">Code</th>
                            <th style="width: 10%;">Datum</th>
                            <th style="width: 8%;">Menge</th>
                            <th style="width: 15%;">Einzelpreis</th>
                            <th style="width: 15%;">Gesamtpreis</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.services.map((service, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${service.description}</td>
                                <td>${service.serviceCode}</td>
                                <td>${formatDate(service.date)}</td>
                                <td style="text-align: center;">${service.quantity}</td>
                                <td style="text-align: right;">${formatCurrency(service.unitPrice)} €</td>
                                <td style="text-align: right; font-weight: 600;">${formatCurrency(service.totalPrice)} €</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Totals -->
            <div class="totals-section">
                <h3>Zusammenfassung</h3>
                <table class="totals-table">
                    <tr>
                        <td class="label">Netto-Betrag:</td>
                        <td class="amount">${formatCurrency(invoice.subtotal)} €</td>
                    </tr>
                    <tr>
                        <td class="label">USt (${invoice.taxRate}%):</td>
                        <td class="amount">${formatCurrency(invoice.taxAmount)} €</td>
                    </tr>
                    ${invoice.services.some(s => s.copay > 0) ? `
                        <tr>
                            <td class="label">Selbstbehalt:</td>
                            <td class="amount">${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0))} €</td>
                        </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td class="label"><strong>GESAMTBETRAG:</strong></td>
                        <td class="amount"><strong>${formatCurrency(invoice.totalAmount)} €</strong></td>
                    </tr>
                </table>
                
                <div class="tax-info">
                    <strong>Steuerliche Behandlung:</strong> 
                    ${invoice.billingType === 'kassenarzt' ? 
                        'Kassenärztliche Leistungen sind gemäß § 4 Abs. 4 UStG von der Umsatzsteuer befreit.' :
                        'Wahlarztleistungen unterliegen der Umsatzsteuer gemäß § 1 UStG.'
                    }
                </div>
            </div>

            <!-- Payment Information -->
            <div class="payment-info">
                <h3>Zahlungsinformationen</h3>
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

            <!-- Legal Information -->
            <div class="legal-info">
                <strong>Rechtliche Hinweise:</strong> Diese Rechnung wurde gemäß den Bestimmungen des österreichischen Gesundheitswesens erstellt. 
                Bei Fragen zur Abrechnung wenden Sie sich bitte an unsere Ordination. 
                Die Leistungen wurden nach den aktuellen Tarifen der Österreichischen Ärztekammer abgerechnet.
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="thank-you">Vielen Dank für Ihr Vertrauen!</div>
                <div>Bei Fragen wenden Sie sich bitte an unsere Ordination.</div>
                <div>Rechnung erstellt am ${formatDate(new Date())} um ${new Date().toLocaleTimeString('de-DE')}</div>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new InvoicePDFService();
