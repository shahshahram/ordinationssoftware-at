const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

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
    const htmlContent = this.processTemplate(template, placeholders);
    return await this.generatePDF(htmlContent, options);
  }

  processTemplate(template, placeholders) {
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


