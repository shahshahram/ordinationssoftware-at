const pdfGenerator = require('../utils/pdfGenerator');
const Invoice = require('../models/Invoice');
const Location = require('../models/Location');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

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

      // Location laden (über createdBy -> User -> locationId oder direkt über invoice.locationId)
      let location = null;
      if (invoice.locationId) {
        location = await Location.findById(invoice.locationId);
      } else if (invoice.createdBy) {
        const user = await User.findById(invoice.createdBy).select('locationId');
        if (user && user.locationId) {
          location = await Location.findById(user.locationId);
        }
      }
      
      // Fallback: Erste aktive Location laden, falls keine gefunden wurde
      if (!location) {
        location = await Location.findOne({ is_active: true });
      }

      // Design-Typ bestimmen: aus options, dann location, dann Standard
      const designType = options.design || (location && location.invoiceDesign) || 'standard';
      
      // HTML-Template für Rechnung generieren
      const htmlContent = await this.generateInvoiceHTML(invoice, location, designType);
      
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
      
      if (!pdfBuffer) {
        throw new Error('PDF-Buffer ist null oder undefined');
      }
      
      if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error('PDF-Buffer ist kein Buffer');
      }
      
      if (pdfBuffer.length === 0) {
        throw new Error('PDF-Buffer ist leer');
      }

      return pdfBuffer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generiert HTML-Template für Rechnung
   * @param {Object} invoice - Rechnungsobjekt
   * @param {Object} location - Location-Objekt mit owner und logo
   * @returns {String} HTML-Content
   */
  async generateInvoiceHTML(invoice, location = null, designType = 'standard') {
    // ALLE PREISE SIND BEREITS IN EURO - KEINE DIVISION DURCH 100 MEHR!
    const formatCurrency = (amount) => {
      if (!amount && amount !== 0) return '0,00';
      // Betrag ist bereits in Euro - nur formatieren, nicht durch 100 teilen!
      return Number(amount).toFixed(2).replace('.', ',');
    };
    const formatDate = (date) => new Date(date).toLocaleDateString('de-DE');
    
    // Hilfsfunktion für Zahlungsart-Labels
    const getPaymentMethodLabel = (method) => {
      const labels = {
        'cash': 'Bar',
        'transfer': 'Überweisung',
        'card': 'Karte',
        'bankomat': 'Bankomat',
        'creditcard': 'Kreditkarte',
        'mobile': 'Mobiles Bezahlen',
        'insurance': 'Versicherung'
      };
      return labels[method] || method;
    };
    
    // Hilfsfunktion für Status-Übersetzung
    const getStatusLabel = (status) => {
      const labels = {
        'paid': 'Bezahlt',
        'sent': 'Gesendet',
        'draft': 'Entwurf',
        'pending': 'Wartend',
        'overdue': 'Überfällig',
        'cancelled': 'Storniert'
      };
      return labels[status] || status;
    };
    
    // Hilfsfunktion für Payment-Info-Styles basierend auf Design
    const getPaymentInfoStyles = (status, designType) => {
      if (designType === 'minimal') {
        // Minimal-Design: Schwarz-Weiß
        if (status === 'paid') {
          return {
            container: 'background-color: #ffffff; padding: 12px; margin-bottom: 12px; border: 1px solid #000000;',
            text: 'color: #000000;',
            title: 'color: #000000; font-size: 1.1em; font-weight: bold; margin-bottom: 8px;'
          };
        } else if (status === 'overdue') {
          return {
            container: 'background-color: #ffffff; padding: 12px; margin-bottom: 12px; border: 1px solid #000000;',
            text: 'color: #000000;',
            title: 'color: #000000; font-size: 1.1em;'
          };
        } else if (status === 'cancelled') {
          return {
            container: 'background-color: #ffffff; padding: 12px; margin-bottom: 12px; border: 1px solid #000000;',
            text: 'color: #000000;',
            title: 'color: #000000; font-size: 1.1em;'
          };
        }
      } else {
        // Standard-Design: Mit Farben
        if (status === 'paid') {
          return {
            container: 'background-color: #e8f5e9; padding: 12px; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #4caf50;',
            text: 'color: #2e7d32;',
            title: 'color: #2e7d32; font-size: 1.1em; font-weight: bold; margin-bottom: 8px;'
          };
        } else if (status === 'overdue') {
          return {
            container: 'background-color: #ffebee; padding: 12px; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #f44336;',
            text: 'color: #c62828;',
            title: 'color: #c62828; font-size: 1.1em;'
          };
        } else if (status === 'cancelled') {
          return {
            container: 'background-color: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #9e9e9e;',
            text: 'color: #616161;',
            title: 'color: #616161; font-size: 1.1em;'
          };
        }
      }
      return {
        container: '',
        text: '',
        title: ''
      };
    };
    
    // RKSVO QR-Code generieren (falls vorhanden) - muss vor dem return sein
    let rksvoQRCodeBase64 = null;
    if (invoice.rksvoData && invoice.rksvoData.qrCode) {
      try {
        // qrCode ist bereits ein Base64-String der QR-Code-Daten
        // Wir müssen daraus ein QR-Code-Bild generieren
        rksvoQRCodeBase64 = await QRCode.toDataURL(invoice.rksvoData.qrCode, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 200,
          margin: 1
        });
      } catch (error) {
        // QR-Code-Generierung fehlgeschlagen - wird nicht angezeigt
      }
    }
    
    // Owner-Daten aus Location extrahieren (falls vorhanden)
    let ownerName = invoice.doctor.name;
    let ownerTitle = invoice.doctor.title;
    let ownerSpecialization = invoice.doctor.specialization;
    let ownerAddress = invoice.doctor.address;
    let ownerPhone = invoice.doctor.phone;
    let ownerEmail = invoice.doctor.email;
    let ownerTaxNumber = invoice.doctor.taxNumber;
    let ownerChamberNumber = invoice.doctor.chamberNumber;
    
    if (location && location.owner) {
      const owner = location.owner;
      // Name nur aus firstName und lastName zusammenstellen (ohne Titel)
      const ownerNameParts = [];
      if (owner.firstName) ownerNameParts.push(owner.firstName);
      if (owner.lastName) ownerNameParts.push(owner.lastName);
      if (ownerNameParts.length > 0) {
        ownerName = ownerNameParts.join(' ');
      }
      // Titel separat setzen (title oder academicTitle)
      if (owner.title) {
        ownerTitle = owner.title;
      } else if (owner.academicTitle) {
        ownerTitle = owner.academicTitle;
      }
      if (owner.specialty) ownerSpecialization = owner.specialty;
      if (location.address_line1) {
        ownerAddress = {
          street: location.address_line1 + (location.address_line2 ? ', ' + location.address_line2 : ''),
          city: location.city,
          postalCode: location.postal_code,
          country: location.state || 'Österreich'
        };
      }
      if (owner.phone) ownerPhone = owner.phone;
      if (owner.email) ownerEmail = owner.email;
      // Steuernummer und UID-Nummer aus Location-Owner verwenden (falls vorhanden)
      if (owner.taxNumber) ownerTaxNumber = owner.taxNumber;
      if (owner.uidNumber) ownerTaxNumber = owner.uidNumber; // UID-Nummer hat Priorität
    }
    
    // Bankverbindungen aus Location-Owner extrahieren
    let defaultBankAccount = null;
    if (location && location.owner && location.owner.bankAccounts && location.owner.bankAccounts.length > 0) {
      // Suche nach Standard-Bankverbindung
      defaultBankAccount = location.owner.bankAccounts.find(acc => acc.isDefault) || location.owner.bankAccounts[0];
    }
    
    // Logo-URL erstellen
    let logoUrl = null;
    if (location && location.logo) {
      const apiUrl = process.env.API_URL || 'http://localhost:5001';
      if (location.logo.filename) {
        logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
      } else if (location.logo.path) {
        if (location.logo.path.startsWith('http')) {
          logoUrl = location.logo.path;
        } else if (location.logo.path.startsWith('/')) {
          logoUrl = `${apiUrl}${location.logo.path}`;
        } else {
          const cleanPath = location.logo.path.replace(/^\.\//, '').replace(/^uploads\//, '');
          logoUrl = `${apiUrl}/uploads/${cleanPath}`;
        }
      }
    }
    
    // CSS basierend auf Design-Typ generieren
    const getCSS = (designType) => {
      if (designType === 'minimal') {
        // Minimal-Design: Schwarz-Weiß, keine Rahmen, keine Boxen
        return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                line-height: 1.4; 
                color: #000000; 
                font-size: 11px;
                background-color: #ffffff;
            }
            .invoice-container { 
                max-width: 210mm; 
                margin: 0 auto; 
                padding: 15mm;
                background-color: white;
            }
            
            /* Logo Styles */
            .logo-container {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #000000;
            }
            .logo-container img {
                max-height: 80px;
                max-width: 300px;
                object-fit: contain;
            }
            
            /* Header Styles */
            .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 1px solid #000000;
            }
            .owner-info { 
                flex: 1;
                padding-right: 20px;
            }
            .owner-info h1 { 
                color: #000000; 
                font-size: 22px; 
                margin-bottom: 8px;
                font-weight: bold;
            }
            .owner-info .title { 
                color: #000000; 
                font-size: 14px; 
                font-weight: 600;
                margin-bottom: 5px;
            }
            .owner-info .specialization { 
                color: #000000; 
                font-size: 12px; 
                margin-bottom: 10px;
            }
            .owner-info .address { 
                font-size: 11px; 
                line-height: 1.3;
                color: #000000;
            }
            .owner-info .contact-info { 
                margin-top: 10px; 
                font-size: 10px; 
                color: #000000;
            }
            
            .invoice-info { 
                text-align: right; 
                padding: 15px; 
                min-width: 200px;
            }
            .invoice-info h2 { 
                color: #000000; 
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
                color: #000000;
            }
            
            /* Patient Section */
            .patient-section { 
                margin-bottom: 25px; 
                padding: 15px; 
                border-bottom: 1px solid #000000;
            }
            .patient-section h3 { 
                color: #000000; 
                margin-bottom: 10px; 
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
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
                color: #000000;
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .services-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 15px;
                font-size: 10px;
            }
            .services-table th, .services-table td { 
                border: 1px solid #000000; 
                padding: 8px 6px; 
                text-align: left;
                vertical-align: top;
            }
            .services-table th { 
                background-color: #000000;
                color: #ffffff; 
                font-weight: bold;
                font-size: 10px;
                text-transform: uppercase;
            }
            .services-table tr:nth-child(even) { 
                background-color: #ffffff;
            }
            
            /* Totals Section */
            .totals-section { 
                margin-top: 20px; 
                padding: 15px; 
                border-top: 1px solid #000000;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .totals-section h3 {
                color: #000000;
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .totals-table { 
                width: 100%; 
                max-width: 350px; 
                margin-left: auto;
                font-size: 11px;
            }
            .totals-table td { 
                padding: 6px 10px; 
                border-bottom: 1px solid #000000;
            }
            .totals-table .label {
                font-weight: 600;
                color: #000000;
            }
            .totals-table .amount {
                text-align: right;
                font-weight: 500;
            }
            .total-row { 
                font-weight: bold; 
                font-size: 13px; 
                background-color: #000000;
                color: #ffffff;
            }
            .total-row .label {
                color: #ffffff;
            }
            .total-row .amount {
                color: #ffffff;
            }
            
            /* Tax Information */
            .tax-info {
                margin-top: 10px;
                padding: 8px;
                font-size: 9px;
                color: #000000;
            }
            
            /* Payment Information */
            .payment-info { 
                margin-top: 25px; 
                padding: 15px; 
                border-top: 1px solid #000000;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .payment-info h3 { 
                color: #000000; 
                margin-bottom: 10px;
                font-size: 13px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .payment-info ul {
                margin: 0;
                padding-left: 15px;
                font-size: 10px;
                line-height: 1.4;
            }
            .payment-info li {
                margin-bottom: 3px;
                color: #000000;
                white-space: nowrap;
            }
            .payment-info p {
                margin: 0;
                white-space: nowrap;
            }
            
            /* Footer */
            .footer { 
                margin-top: 30px; 
                padding-top: 15px; 
                border-top: 1px solid #000000; 
                text-align: center; 
                font-size: 9px; 
                color: #000000;
                line-height: 1.3;
                position: relative;
            }
            .footer .thank-you {
                font-weight: bold;
                color: #000000;
                margin-bottom: 5px;
            }
            
            /* RKSVO QR-Code */
            .rksvo-qr-code {
                position: absolute;
                left: 0;
                bottom: 0;
                width: 60px;
                height: 60px;
                padding: 5px;
                background-color: white;
                border: 1px solid #000000;
            }
            .rksvo-qr-code img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            
            /* Billing Type Badge */
            .billing-type-badge {
                display: inline-block;
                padding: 4px 8px;
                font-size: 9px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 5px;
                border: 1px solid #000000;
                background-color: #ffffff;
                color: #000000;
            }
            
            /* Legal Information */
            .legal-info {
                margin-top: 20px;
                padding: 10px;
                font-size: 8px;
                color: #000000;
                line-height: 1.3;
            }
        `;
      } else {
        // Standard-Design: Mit Farben, Rahmen, Boxen (aktuelles Design)
        return `
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
            
            /* Logo Styles */
            .logo-container {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 3px solid #2c5aa0;
            }
            .logo-container img {
                max-height: 80px;
                max-width: 300px;
                object-fit: contain;
            }
            
            /* Header Styles */
            .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                margin-bottom: 25px;
                padding-bottom: 15px;
            }
            .owner-info { 
                flex: 1;
                padding-right: 20px;
            }
            .owner-info h1 { 
                color: #2c5aa0; 
                font-size: 22px; 
                margin-bottom: 8px;
                font-weight: bold;
            }
            .owner-info .title { 
                color: #34495e; 
                font-size: 14px; 
                font-weight: 600;
                margin-bottom: 5px;
            }
            .owner-info .specialization { 
                color: #7f8c8d; 
                font-size: 12px; 
                margin-bottom: 10px;
                font-style: italic;
            }
            .owner-info .address { 
                font-size: 11px; 
                line-height: 1.3;
                color: #34495e;
            }
            .owner-info .contact-info { 
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
                page-break-inside: avoid;
                break-inside: avoid;
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
                page-break-inside: avoid;
                break-inside: avoid;
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
                white-space: nowrap;
            }
            .payment-info p {
                margin: 0;
                white-space: nowrap;
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
                position: relative;
            }
            .footer .thank-you {
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 5px;
            }
            
            /* RKSVO QR-Code */
            .rksvo-qr-code {
                position: absolute;
                left: 0;
                bottom: 0;
                width: 60px;
                height: 60px;
                padding: 5px;
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }
            .rksvo-qr-code img {
                width: 100%;
                height: 100%;
                object-fit: contain;
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
        `;
      }
    };
    
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${invoice.invoiceNumber}</title>
        <style>
            ${getCSS(designType)}
            ${getCSS(designType)}
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Logo oben in der Mitte -->
            ${logoUrl ? `
            <div class="logo-container">
                <img src="${logoUrl}" alt="Ordinationslogo" />
            </div>
            ` : ''}
            
            <!-- Header -->
            <div class="header">
                <div class="owner-info">
                    <h1>${ownerName}</h1>
                    ${ownerTitle ? `<div class="title">${ownerTitle}</div>` : ''}
                    ${ownerSpecialization ? `<div class="specialization">${ownerSpecialization}</div>` : ''}
                    <div class="address">
                        <div>${ownerAddress.street}</div>
                        <div>${ownerAddress.postalCode} ${ownerAddress.city}</div>
                        <div>${ownerAddress.country}</div>
                    </div>
                    <div class="contact-info">
                        ${ownerPhone ? `<div>Tel: ${ownerPhone}</div>` : ''}
                        ${ownerEmail ? `<div>E-Mail: ${ownerEmail}</div>` : ''}
                        ${ownerTaxNumber ? `<div>UID: ${ownerTaxNumber}</div>` : ''}
                        ${ownerChamberNumber ? `<div>Ärztekammer: ${ownerChamberNumber}</div>` : ''}
                    </div>
                </div>
                <div class="invoice-info">
                    <h2>RECHNUNG</h2>
                    <div class="invoice-details">
                        <div><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</div>
                        <div><strong>Rechnungsdatum:</strong> ${formatDate(invoice.invoiceDate)}</div>
                        ${invoice.status !== 'paid' ? `<div><strong>Fälligkeitsdatum:</strong> ${formatDate(invoice.dueDate)}</div>` : ''}
                        <div><strong>Status:</strong> ${getStatusLabel(invoice.status)}</div>
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
                    ${invoice.taxRate > 0 ? `
                        <tr>
                            <td class="label">USt (${invoice.taxRate}%):</td>
                            <td class="amount">${formatCurrency(invoice.taxAmount)} €</td>
                        </tr>
                    ` : ''}
                    ${invoice.services.some(s => s.copay > 0) ? `
                        <tr>
                            <td class="label">Selbstbehalt:</td>
                            <td class="amount">${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0))} €</td>
                        </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td class="label"><strong>GESAMTBETRAG (Brutto):</strong></td>
                        <td class="amount"><strong>${formatCurrency(invoice.totalAmount)} €</strong></td>
                    </tr>
                    ${invoice.taxRate > 0 ? `
                        <tr style="border-top: 1px solid #e0e0e0; padding-top: 8px;">
                            <td class="label" style="font-size: 0.9em; color: #666;">Zusammenfassung:</td>
                            <td class="amount" style="font-size: 0.9em; color: #666;"></td>
                        </tr>
                        <tr>
                            <td class="label" style="font-size: 0.9em;">Netto:</td>
                            <td class="amount" style="font-size: 0.9em;">${formatCurrency(invoice.subtotal)} €</td>
                        </tr>
                        <tr>
                            <td class="label" style="font-size: 0.9em;">Brutto (inkl. ${invoice.taxRate}% USt):</td>
                            <td class="amount" style="font-size: 0.9em;">${formatCurrency(invoice.totalAmount)} €</td>
                        </tr>
                    ` : ''}
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
                ${(() => {
                  const paidStyles = getPaymentInfoStyles('paid', designType);
                  const overdueStyles = getPaymentInfoStyles('overdue', designType);
                  const cancelledStyles = getPaymentInfoStyles('cancelled', designType);
                  
                  if (invoice.status === 'paid') {
                    return `
                    <div style="${paidStyles.container}">
                        <div style="${paidStyles.title}">✓ Rechnung beglichen</div>
                        ${invoice.paymentDate ? `
                            <div style="${paidStyles.text} margin-bottom: 4px;">Zahlung erhalten am: ${formatDate(invoice.paymentDate)}</div>
                        ` : ''}
                        ${invoice.paymentMethod ? `
                            <div style="${paidStyles.text}">Zahlungsart: ${getPaymentMethodLabel(invoice.paymentMethod)}</div>
                        ` : ''}
                    </div>
                `;
                  } else if (invoice.status === 'overdue') {
                    return `
                    <div style="${overdueStyles.container}">
                        <strong style="${overdueStyles.title}">⚠ Rechnung überfällig</strong>
                        <p style="margin: 8px 0 0 0; ${overdueStyles.text}">Bitte begleichen Sie diese Rechnung umgehend.</p>
                    </div>
                `;
                  } else if (invoice.status === 'cancelled') {
                    return `
                    <div style="${cancelledStyles.container}">
                        <strong style="${cancelledStyles.title}">Rechnung storniert</strong>
                    </div>
                `;
                  }
                  return '';
                })()}
                ${invoice.status !== 'paid' && invoice.status !== 'cancelled' ? `
                    ${invoice.billingType === 'kassenarzt' ? `
                        <ul>
                            <li>Diese Rechnung wird direkt mit der Österreichischen Gesundheitskasse (ÖGK) abgerechnet</li>
                            ${invoice.services.some(s => s.copay > 0) ? `
                                <li>Selbstbehalt: ${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0))} €</li>
                                <li>Bitte begleichen Sie den Selbstbehalt bis zum ${formatDate(invoice.dueDate)}</li>
                            ` : '<li>Sie erhalten keine separate Rechnung für diese Leistungen</li>'}
                        </ul>
                    ` : invoice.billingType === 'wahlarzt' ? `
                        <ul>
                            <li>Sie zahlen den Gesamtbetrag (Brutto): ${formatCurrency(invoice.totalAmount)} €</li>
                            ${invoice.taxRate > 0 ? `
                                <li>Davon Netto: ${formatCurrency(invoice.subtotal)} €</li>
                                <li>Davon USt (${invoice.taxRate}%): ${formatCurrency(invoice.taxAmount)} €</li>
                            ` : ''}
                            ${invoice.services.some(s => s.reimbursement > 0) ? `
                                <li>Erstattung durch Versicherung: ${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.reimbursement || 0), 0))} €</li>
                                <li>Reichen Sie diese Rechnung bei Ihrer Krankenversicherung zur Erstattung ein</li>
                            ` : ''}
                            ${invoice.services.some(s => s.copay > 0) ? `
                                <li>Selbstbehalt: ${formatCurrency(invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0))} €</li>
                            ` : ''}
                            <li>Zahlung bitte bis zum ${formatDate(invoice.dueDate)} auf unser Konto</li>
                            ${invoice.paymentMethod === 'transfer' && defaultBankAccount ? `
                                <li style="margin-top: 12px; font-weight: bold;">Bitte überweisen Sie den Betrag an:</li>
                                <li style="margin-left: 20px; margin-top: 4px;">
                                    ${defaultBankAccount.accountHolder ? `<div><strong>Kontoinhaber:</strong> ${defaultBankAccount.accountHolder}</div>` : ''}
                                    ${defaultBankAccount.iban ? `<div><strong>IBAN:</strong> ${defaultBankAccount.iban}</div>` : ''}
                                    ${defaultBankAccount.bic ? `<div><strong>BIC:</strong> ${defaultBankAccount.bic}</div>` : ''}
                                    ${defaultBankAccount.bankName ? `<div><strong>Bank:</strong> ${defaultBankAccount.bankName}</div>` : ''}
                                </li>
                            ` : ''}
                        </ul>
                    ` : `
                        <ul>
                            <li>Privatabrechnung - Zahlung direkt an die Ordination</li>
                            <li>Gesamtbetrag (Brutto): ${formatCurrency(invoice.totalAmount)} €</li>
                            ${invoice.taxRate > 0 ? `
                                <li>Davon Netto: ${formatCurrency(invoice.subtotal)} €</li>
                                <li>Davon USt (${invoice.taxRate}%): ${formatCurrency(invoice.taxAmount)} €</li>
                            ` : ''}
                            <li>Zahlung bitte bis zum ${formatDate(invoice.dueDate)} auf unser Konto</li>
                            ${invoice.paymentMethod === 'transfer' && defaultBankAccount ? `
                                <li style="margin-top: 12px; font-weight: bold;">Bitte überweisen Sie den Betrag an:</li>
                                <li style="margin-left: 20px; margin-top: 4px;">
                                    ${defaultBankAccount.accountHolder ? `<div><strong>Kontoinhaber:</strong> ${defaultBankAccount.accountHolder}</div>` : ''}
                                    ${defaultBankAccount.iban ? `<div><strong>IBAN:</strong> ${defaultBankAccount.iban}</div>` : ''}
                                    ${defaultBankAccount.bic ? `<div><strong>BIC:</strong> ${defaultBankAccount.bic}</div>` : ''}
                                    ${defaultBankAccount.bankName ? `<div><strong>Bank:</strong> ${defaultBankAccount.bankName}</div>` : ''}
                                </li>
                            ` : ''}
                            <li>Bei Fragen wenden Sie sich bitte an unsere Ordination</li>
                        </ul>
                    `}
                ` : ''}
            </div>

            <!-- Legal Information -->
            <div class="legal-info">
                <strong>Rechtliche Hinweise:</strong> Diese Rechnung wurde gemäß den Bestimmungen des österreichischen Gesundheitswesens erstellt. 
                Bei Fragen zur Abrechnung wenden Sie sich bitte an unsere Ordination. 
                Die Leistungen wurden nach den aktuellen Tarifen der Österreichischen Ärztekammer abgerechnet.
            </div>

            <!-- Footer -->
            <div class="footer">
                ${rksvoQRCodeBase64 ? `
                <div class="rksvo-qr-code">
                    <img src="${rksvoQRCodeBase64}" alt="RKSVO-Beleg QR-Code" />
                </div>
                ` : ''}
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
