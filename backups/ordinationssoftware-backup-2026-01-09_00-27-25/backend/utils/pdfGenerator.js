const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class PDFGenerator {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async generatePDF(htmlContent, options = {}) {
    await this.init();
    
    const page = await this.browser.newPage();
    
    try {
      // Set content
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        ...options
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  async generateDocumentPDF(template, placeholders, options = {}) {
    const htmlContent = this.processTemplate(template, placeholders, options.location);
    return await this.generatePDF(htmlContent, options);
  }

  generateLetterhead(location) {
    if (!location) return '';

    const owner = location.owner || {};
    const logo = location.logo || {};
    
    // Logo-Pfad für Base64-Konvertierung
    let logoBase64 = '';
    if (logo.path) {
      try {
        const logoPath = path.join(__dirname, '..', logo.path);
        if (fsSync.existsSync(logoPath)) {
          const logoBuffer = fsSync.readFileSync(logoPath);
          logoBase64 = `data:${logo.mimeType || 'image/png'};base64,${logoBuffer.toString('base64')}`;
        }
      } catch (error) {
        console.error('Fehler beim Laden des Logos:', error);
      }
    }

    // Name der Leitung der Ordination zusammenstellen
    const ownerNameParts = [];
    if (owner.title) ownerNameParts.push(owner.title);
    if (owner.academicTitle) ownerNameParts.push(owner.academicTitle);
    if (owner.firstName) ownerNameParts.push(owner.firstName);
    if (owner.lastName) ownerNameParts.push(owner.lastName);
    const ownerName = ownerNameParts.join(' ');

    // Standort-Adresse
    const addressParts = [];
    if (location.address_line1) addressParts.push(location.address_line1);
    if (location.address_line2) addressParts.push(location.address_line2);
    const addressLine = addressParts.join(', ');
    const cityLine = [location.postal_code, location.city].filter(Boolean).join(' ');

    return `
      <div class="letterhead">
        <table style="width: 100%; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <tr>
            ${logoBase64 ? `
            <td style="width: 200px; vertical-align: top;">
              <img src="${logoBase64}" alt="Logo" style="max-width: 200px; max-height: 100px; object-fit: contain;" />
            </td>
            ` : '<td style="width: 200px;"></td>'}
            <td style="vertical-align: top; text-align: ${logoBase64 ? 'left' : 'center'};">
              ${ownerName ? `<div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${this.escapeHtml(ownerName)}</div>` : ''}
              ${owner.specialty ? `<div style="font-size: 14px; color: #666; margin-bottom: 5px;">${this.escapeHtml(owner.specialty)}</div>` : ''}
              ${location.name ? `<div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${this.escapeHtml(location.name)}</div>` : ''}
              ${addressLine ? `<div style="font-size: 12px;">${this.escapeHtml(addressLine)}</div>` : ''}
              ${cityLine ? `<div style="font-size: 12px;">${this.escapeHtml(cityLine)}</div>` : ''}
              ${location.state ? `<div style="font-size: 12px;">${this.escapeHtml(location.state)}</div>` : ''}
              <div style="margin-top: 8px; font-size: 11px; color: #666;">
                ${location.phone ? `<span>Tel: ${this.escapeHtml(location.phone)}</span>` : ''}
                ${location.phone && location.email ? ' | ' : ''}
                ${location.email ? `<span>E-Mail: ${this.escapeHtml(location.email)}</span>` : ''}
                ${owner.phone && (location.phone || location.email) ? ' | ' : ''}
                ${owner.phone ? `<span>Tel: ${this.escapeHtml(owner.phone)}</span>` : ''}
                ${owner.email && (location.phone || location.email || owner.phone) ? ' | ' : ''}
                ${owner.email ? `<span>E-Mail: ${this.escapeHtml(owner.email)}</span>` : ''}
              </div>
              ${owner.website ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">Web: ${this.escapeHtml(owner.website)}</div>` : ''}
              ${owner.licenseNumber ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">Ärztekammer-Nr: ${this.escapeHtml(owner.licenseNumber)}</div>` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  processTemplate(template, placeholders, location = null) {
    let processedContent = template;
    
    // Replace placeholders with actual values
    Object.keys(placeholders).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = placeholders[key] || '';
      processedContent = processedContent.replace(
        new RegExp(placeholder, 'g'), 
        value
      );
    });

    // Briefkopf generieren, falls Location vorhanden
    const letterhead = location ? this.generateLetterhead(location) : '';

    // Wrap in HTML structure
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .letterhead {
              margin-bottom: 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .signature-line {
              margin-top: 50px;
              border-top: 1px solid #333;
              width: 200px;
              margin-left: auto;
            }
            .date {
              text-align: right;
              margin-bottom: 20px;
            }
            .patient-info {
              background-color: #f5f5f5;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            .template-placeholder {
              background-color: #ffffcc;
              padding: 2px 4px;
              border-radius: 3px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${letterhead}
          <div class="content">
            ${processedContent}
          </div>
          <div class="footer">
            <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
          </div>
        </body>
      </html>
    `;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
const pdfGenerator = new PDFGenerator();

module.exports = pdfGenerator;


