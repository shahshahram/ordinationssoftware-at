const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Konvertiert eine JSON-PDF-Datei in eine echte PDF und komprimiert sie
 */
const convertAndCompress = (inputPath, outputPath = null) => {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fehler: Datei nicht gefunden: ${inputPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(inputPath);
  const originalSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Originale Dateigröße: ${originalSizeMB} MB`);

  // Lese JSON-Datei
  console.log('Lese JSON-Datei...');
  const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  // Konvertiere JSON in PDF-Bytes
  console.log('Konvertiere JSON zu PDF...');
  const pdfBytes = Buffer.from(Object.values(jsonData));
  
  // Erstelle temporäre PDF-Datei
  const tempPdfPath = inputPath.replace('.pdf', '_temp_converted.pdf');
  fs.writeFileSync(tempPdfPath, pdfBytes);
  
  const tempStats = fs.statSync(tempPdfPath);
  const tempSizeMB = (tempStats.size / (1024 * 1024)).toFixed(2);
  console.log(`Konvertierte PDF-Größe: ${tempSizeMB} MB`);

  // Wenn kein Ausgabepfad angegeben, erstelle einen
  if (!outputPath) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    outputPath = path.join(dir, `${basename}_compressed${ext}`);
  }

  // Komprimiere die PDF mit Ghostscript
  console.log('\nKomprimiere PDF...');
  const targetSize = 4 * 1024 * 1024; // 4 MB
  const qualities = ['/screen', '/ebook', '/printer'];
  let bestOutput = null;
  let bestSize = Infinity;

  for (const quality of qualities) {
    const tempOutput = outputPath.replace('.pdf', `_temp${quality.replace('/', '')}.pdf`);
    
    try {
      console.log(`Versuche Qualität: ${quality}...`);
      execSync(
        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${quality} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempPdfPath}"`,
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      if (!fs.existsSync(tempOutput)) {
        console.log(`  → Fehler: Datei wurde nicht erstellt`);
        continue;
      }

      const tempOutputStats = fs.statSync(tempOutput);
      const tempOutputSizeMB = (tempOutputStats.size / (1024 * 1024)).toFixed(2);
      console.log(`  → Größe: ${tempOutputSizeMB} MB`);
      
      if (tempOutputStats.size <= targetSize && tempOutputStats.size < bestSize) {
        if (bestOutput && fs.existsSync(bestOutput)) {
          fs.unlinkSync(bestOutput);
        }
        bestOutput = tempOutput;
        bestSize = tempOutputStats.size;
        console.log(`  → ✓ Unter 4MB Ziel erreicht!`);
      } else if (tempOutputStats.size < bestSize) {
        if (bestOutput && fs.existsSync(bestOutput)) {
          fs.unlinkSync(bestOutput);
        }
        bestOutput = tempOutput;
        bestSize = tempOutputStats.size;
        console.log(`  → ✓ Bisher beste Komprimierung`);
      } else {
        fs.unlinkSync(tempOutput);
        console.log(`  → Nicht die beste, lösche temporäre Datei`);
      }
    } catch (error) {
      console.log(`  → Fehler bei Qualität ${quality}`);
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput);
      }
    }
  }

  // Lösche temporäre konvertierte PDF
  if (fs.existsSync(tempPdfPath)) {
    fs.unlinkSync(tempPdfPath);
  }

  if (bestOutput && fs.existsSync(bestOutput)) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    fs.renameSync(bestOutput, outputPath);
    
    const finalStats = fs.statSync(outputPath);
    const finalSizeMB = (finalStats.size / (1024 * 1024)).toFixed(2);
    const compressionRatio = ((1 - finalStats.size / stats.size) * 100).toFixed(1);
    
    console.log(`\n✓ Komprimierung erfolgreich!`);
    console.log(`  Original (JSON): ${originalSizeMB} MB`);
    console.log(`  Komprimiert (PDF): ${finalSizeMB} MB`);
    console.log(`  Komprimierung: ${compressionRatio}%`);
    console.log(`  Ausgabedatei: ${outputPath}`);
    
    return outputPath;
  } else {
    console.error('\n❌ Komprimierung fehlgeschlagen!');
    process.exit(1);
  }
};

// Kommandozeilen-Argumente
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Verwendung: node convert-and-compress-pdf.js <input-json-pdf> [output-pdf]');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || null;

convertAndCompress(inputFile, outputFile);




