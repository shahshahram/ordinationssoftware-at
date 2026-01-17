const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Markdown zu HTML Konverter (verbesserte Version)
function markdownToHTML(markdown) {
  let html = markdown;
  
  // Code-Blöcke zuerst (um Konflikte zu vermeiden)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });
  
  // Überschriften
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  
  // Horizontale Linien
  html = html.replace(/^---$/gim, '<hr>');
  
  // Fett (nur wenn nicht in Code)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Kursiv
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Inline-Code (nur wenn nicht in Code-Blöcken)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
  
  // Listen (einfache Version)
  const lines = html.split('\n');
  let inList = false;
  let result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.trim().substring(2)}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(line);
    }
  }
  if (inList) {
    result.push('</ul>');
  }
  html = result.join('\n');
  
  // Absätze (doppelte Zeilenumbrüche)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Einzelne Zeilenumbrüche
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

async function generatePDF() {
  const markdownPath = path.join(__dirname, '..', '..', 'docs', 'BENUTZERHANDBUCH.md');
  const outputPath = path.join(__dirname, '..', '..', 'docs', 'BENUTZERHANDBUCH.pdf');
  
  console.log('Lese Markdown-Datei...');
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  
  console.log('Konvertiere Markdown zu HTML...');
  const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordinationssoftware AT - Benutzerhandbuch</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-size: 11pt;
    }
    
    h1 {
      color: #1976d2;
      border-bottom: 3px solid #1976d2;
      padding-bottom: 10px;
      page-break-after: avoid;
      font-size: 24pt;
      margin-top: 0;
    }
    
    h2 {
      color: #1976d2;
      margin-top: 30px;
      page-break-after: avoid;
      font-size: 18pt;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 5px;
    }
    
    h3 {
      color: #424242;
      margin-top: 20px;
      page-break-after: avoid;
      font-size: 14pt;
    }
    
    h4 {
      color: #616161;
      margin-top: 15px;
      page-break-after: avoid;
      font-size: 12pt;
    }
    
    p {
      margin: 10px 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 5px 0;
    }
    
    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      page-break-inside: avoid;
      border-left: 4px solid #1976d2;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
    }
    
    a {
      color: #1976d2;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    strong {
      font-weight: bold;
    }
    
    em {
      font-style: italic;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e0e0e0;
      margin: 20px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #1976d2;
      color: white;
    }
    
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${markdownToHTML(markdown)}
</body>
</html>
  `;
  
  console.log('Starte Browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Lade HTML...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  console.log('Generiere PDF...');
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
    headerTemplate: '<div style="font-size: 9px; text-align: center; width: 100%; color: #666; padding: 5px;">Ordinationssoftware AT - Benutzerhandbuch</div>',
    footerTemplate: '<div style="font-size: 9px; text-align: center; width: 100%; color: #666; padding: 5px;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span></div>'
  });
  
  await browser.close();
  
  console.log(`\n✅ PDF erfolgreich erstellt: ${outputPath}`);
  console.log(`📄 Dateigröße: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

// Ausführen
generatePDF().catch(console.error);
