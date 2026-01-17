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
  
  // Listen
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
  
  // Absätze
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

async function generatePDF(markdownPath, outputPath, title) {
  console.log(`\n📄 Generiere PDF: ${title}`);
  console.log(`   Eingabe: ${markdownPath}`);
  console.log(`   Ausgabe: ${outputPath}`);
  
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
    
    .logo-header img {
      max-width: 200px;
      height: auto;
      margin-bottom: 10px;
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
}

async function generateAllPDFs() {
  const docsDir = path.join(__dirname, '..', '..', 'docs');
  
  const documents = [
    {
      input: path.join(docsDir, 'BENUTZERHANDBUCH.md'),
      output: path.join(docsDir, 'BENUTZERHANDBUCH.pdf'),
      title: 'MyMediCloud MMC - Benutzerhandbuch'
    },
    {
      input: path.join(docsDir, 'TECHNISCHE_DOKUMENTATION.md'),
      output: path.join(docsDir, 'TECHNISCHE_DOKUMENTATION.pdf'),
      title: 'MyMediCloud MMC - Technische Dokumentation'
    }
  ];
  
  console.log('🚀 Starte PDF-Generierung...\n');
  
  for (const doc of documents) {
    if (fs.existsSync(doc.input)) {
      await generatePDF(doc.input, doc.output, doc.title);
    } else {
      console.log(`⚠️  Datei nicht gefunden: ${doc.input}`);
    }
  }
  
  console.log('\n✨ Alle PDFs erfolgreich generiert!');
}

generateAllPDFs().catch(console.error);
