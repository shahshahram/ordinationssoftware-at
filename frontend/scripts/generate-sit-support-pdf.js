#!/usr/bin/env node
/**
 * Generiert PDF aus SIT ELDA Support-Anfrage Markdown
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Markdown zu HTML Konverter (vereinfacht)
function markdownToHTML(markdown) {
  let html = markdown;
  
  // Überschriften
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Fett
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Code-Blöcke
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Listen
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Zeilenumbrüche
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Absätze
  html = '<p>' + html + '</p>';
  
  // Tabellen (einfache Unterstützung)
  html = html.replace(/\|(.*)\|/g, (match, content) => {
    const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
    return '<tr>' + cells.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
  });
  
  return html;
}

async function generateSupportPDF() {
  const markdownPath = path.join(__dirname, '..', '..', 'docs', 'SIT_ELDA_SUPPORT_ANFRAGE.md');
  const outputPath = path.join(__dirname, '..', '..', 'docs', 'SIT_ELDA_SUPPORT_ANFRAGE.pdf');
  const title = 'MyMediCloud MMC - ELDA SIT Support-Anfrage';

  console.log(`\n📄 Generiere ELDA Support-Anfrage PDF...`);
  console.log(`   Eingabe: ${markdownPath}`);
  console.log(`   Ausgabe: ${outputPath}`);

  if (!fs.existsSync(markdownPath)) {
    console.error(`❌ Datei nicht gefunden: ${markdownPath}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(markdownPath, 'utf8');

  const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    
    body {
      font-family: 'Inter', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #334155;
      margin: 0;
      padding: 0;
    }
    
    .logo-header {
      text-align: center;
      margin-bottom: 2cm;
      padding-bottom: 1cm;
      border-bottom: 2px solid #0284C7;
    }
    
    .logo-header img {
      max-width: 200px;
      height: auto;
    }
    
    h1 {
      color: #0284C7;
      font-size: 24pt;
      margin-top: 1.5cm;
      margin-bottom: 0.5cm;
      page-break-after: avoid;
    }
    
    h2 {
      color: #0EA5E9;
      font-size: 18pt;
      margin-top: 1cm;
      margin-bottom: 0.5cm;
      page-break-after: avoid;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 0.3cm;
    }
    
    h3 {
      color: #334155;
      font-size: 14pt;
      margin-top: 0.8cm;
      margin-bottom: 0.3cm;
      page-break-after: avoid;
    }
    
    p {
      margin: 0.5cm 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 0.5cm 0;
      padding-left: 1.5cm;
    }
    
    li {
      margin: 0.3cm 0;
    }
    
    code {
      background-color: #F1F5F9;
      padding: 0.1cm 0.3cm;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: #DC2626;
    }
    
    pre {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 5px;
      padding: 0.8cm;
      margin: 0.8cm 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
      color: #1E293B;
      font-size: 9pt;
      line-height: 1.4;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.8cm 0;
      page-break-inside: avoid;
    }
    
    table th,
    table td {
      border: 1px solid #E2E8F0;
      padding: 0.5cm;
      text-align: left;
    }
    
    table th {
      background-color: #F1F5F9;
      font-weight: 600;
      color: #1E293B;
    }
    
    table tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    
    .highlight {
      background-color: #FEF3C7;
      padding: 0.1cm 0.3cm;
      border-radius: 3px;
    }
    
    .warning {
      background-color: #FEE2E2;
      border-left: 4px solid #DC2626;
      padding: 0.5cm;
      margin: 0.8cm 0;
      page-break-inside: avoid;
    }
    
    .info {
      background-color: #DBEAFE;
      border-left: 4px solid #0284C7;
      padding: 0.5cm;
      margin: 0.8cm 0;
      page-break-inside: avoid;
    }
    
    .success {
      background-color: #D1FAE5;
      border-left: 4px solid #10B981;
      padding: 0.5cm;
      margin: 0.8cm 0;
      page-break-inside: avoid;
    }
    
    hr {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 1cm 0;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
      
      pre, table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImNsb3VkR3JhZCIgeDE9IjEwMCIgeTE9IjEwMCIgeDI9IjQwMCIgeTI9IjQwMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMkRENEJGIi8+IDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAyODRDNyIvPiA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KCiAgPHBhdGggZD0iTTE1MCAzMjBDMTUwIDI0MCAyMTAgMjAwIDI1MCAyMDBDMjYwIDE0MCAzMzAgMTIwIDM4MCAxNjBDNDMwIDEyMCA1MDAgMTcwIDUwMCAyNDBDNTAwIDMyMCA0NTAgMzcwIDM4MCAzNzBIMjAwQzE1MCAzNzAgMTUwIDMyMCAxNTAgMzIwWiIgZmlsbD0idXJsKCNjbG91ZEdyYWQpIi8+CiAgCiAgPHBhdGggZD0iTTIxMCAzNzBDMTgwIDM0MCAxODAgMjYwIDIxMCAyMzBDMjQwIDIwMCAzMjAgMjAwIDM1MCAyMzAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPgoKICA8cmVjdCB4PSIyOTAiIHk9IjI0MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjYwIiByeD0iNCIgZmlsbD0id2hpdGUiLz4KICA8cmVjdCB4PSIyNzAiIHk9IjI2MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0id2hpdGUiLz4KCiAgPHRleHQgeD0iMjUwIiB5PSI0NDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJJbnRlciwgQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI4MDAiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IiMzMzQxNTUiPgogICAgTXlNZWRpPHRzcGFuIGZpbGw9IiMwRUE1RTkiPkNsb3VkPC90c3Bhbj4KICA8L3RleHQ+CgogIDx0ZXh0IHg9IjI1MCIgeT0iNDc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iSW50ZXIsIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNDAwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjQ3NDhiIj4KICAgIFNtYXJ0LiBTZWN1cmUuIEZvciDDlnN0ZXJyZWljaC4KICA8L3RleHQ+Cjwvc3ZnPgo=" alt="MyMediCloud MMC Logo" />
  </div>
  ${markdownToHTML(markdown)}
</body>
</html>
  `;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 9px; text-align: center; width: 100%; color: #0284C7; padding: 5px; font-weight: 600;">${title}</div>`,
      footerTemplate: '<div style="font-size: 9px; text-align: center; width: 100%; color: #64748b; padding: 5px;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span> | MyMediCloud MMC</div>'
    });

    await browser.close();

    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
    console.log(`   ✅ Erfolgreich erstellt (${fileSize} KB)`);
    console.log(`   📄 PDF-Datei: ${outputPath}`);
  } catch (error) {
    console.error('❌ Fehler beim Generieren der PDF:', error.message);
    process.exit(1);
  }
}

generateSupportPDF().catch(console.error);
