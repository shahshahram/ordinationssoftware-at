const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Markdown zu HTML Konverter
function markdownToHTML(markdown) {
  let html = markdown;
  
  // Code-Blöcke zuerst
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
  
  // Fett und Kursiv
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Inline-Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
  
  // Tabellen (einfache Version)
  html = html.replace(/\|(.+)\|/g, (match, content) => {
    const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
    return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
  });
  
  // Listen
  const lines = html.split('\n');
  let inList = false;
  let result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.trim().substring(2)}</li>`);
    } else if (line.trim().match(/^\d+\.\s/)) {
      if (!inList) {
        result.push('<ol>');
        inList = true;
      }
      result.push(`<li>${line.trim().replace(/^\d+\.\s/, '')}</li>`);
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
  
  // Absätze
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

async function generateSITPDF() {
  const docsDir = path.join(__dirname, '..', '..', 'docs');
  const markdownPath = path.join(docsDir, 'SIT_PLATTFORM_ANALYSE.md');
  const outputPath = path.join(docsDir, 'SIT_PLATTFORM_ANALYSE.pdf');
  
  console.log('📄 Generiere SIT-Plattform Analyse PDF...');
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
  <title>MyMediCloud MMC - SIT-Plattform Analyse</title>
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
    
    .logo-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    h1 {
      color: #0284C7;
      border-bottom: 3px solid #0284C7;
      padding-bottom: 10px;
      page-break-after: avoid;
      font-size: 24pt;
      margin-top: 0;
    }
    
    h2 {
      color: #0284C7;
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
      border-left: 4px solid #0284C7;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
    }
    
    a {
      color: #0284C7;
      text-decoration: none;
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
      background-color: #0284C7;
      color: white;
    }
    
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px;
      margin: 15px 0;
    }
    
    .info {
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 10px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <h1 style="margin: 0; color: #0284C7;">MyMediCloud MMC</h1>
    <p style="margin: 5px 0; color: #64748b;">SIT-Plattform Analyse</p>
  </div>
  ${markdownToHTML(markdown)}
</body>
</html>
  `;
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
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
      headerTemplate: '<div style="font-size: 9px; text-align: center; width: 100%; color: #0284C7; padding: 5px; font-weight: 600;">MyMediCloud MMC - SIT-Plattform Analyse</div>',
      footerTemplate: '<div style="font-size: 9px; text-align: center; width: 100%; color: #64748b; padding: 5px;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span> | MyMediCloud MMC</div>'
    });
    
    await browser.close();
    
    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
    console.log(`   ✅ Erfolgreich erstellt (${fileSize} KB)`);
    console.log(`\n✨ PDF erfolgreich generiert: ${outputPath}`);
  } catch (error) {
    console.error('❌ Fehler beim Generieren des PDFs:', error.message);
    process.exit(1);
  }
}

generateSITPDF().catch(console.error);
