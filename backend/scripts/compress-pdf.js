const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Komprimiert eine PDF-Datei von ~8MB auf ~4MB
 * @param {string} inputPath - Pfad zur Eingabe-PDF
 * @param {string} outputPath - Pfad zur Ausgabe-PDF (optional)
 */
const compressPDF = (inputPath, outputPath = null) => {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fehler: Datei nicht gefunden: ${inputPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(inputPath);
  const originalSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Originale Dateigröße: ${originalSizeMB} MB`);

  // Wenn kein Ausgabepfad angegeben, erstelle einen mit "_compressed" Suffix
  if (!outputPath) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    outputPath = path.join(dir, `${basename}_compressed${ext}`);
  }

  // Versuche zuerst Ghostscript (gs)
  try {
    execSync('which gs', { stdio: 'ignore' });
    console.log('✓ Ghostscript gefunden - starte Komprimierung...\n');
    
    const targetSize = 4 * 1024 * 1024; // 4 MB in Bytes
    const qualities = ['/screen', '/ebook', '/printer'];
    let bestOutput = null;
    let bestSize = Infinity;
    
    // Versuche verschiedene Qualitätsstufen
    for (const quality of qualities) {
      const tempOutput = outputPath.replace('.pdf', `_temp${quality.replace('/', '')}.pdf`);
      
      try {
        console.log(`Versuche Qualität: ${quality}...`);
        execSync(
          `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${quality} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${inputPath}"`,
          { stdio: ['ignore', 'pipe', 'pipe'] }
        );

        if (!fs.existsSync(tempOutput)) {
          console.log(`  → Fehler: Datei wurde nicht erstellt`);
          continue;
        }

        const tempStats = fs.statSync(tempOutput);
        const tempSizeMB = (tempStats.size / (1024 * 1024)).toFixed(2);
        console.log(`  → Größe: ${tempSizeMB} MB`);
        
        // Wenn unter 4MB und besser als vorherige Versuche
        if (tempStats.size <= targetSize && tempStats.size < bestSize) {
          if (bestOutput && fs.existsSync(bestOutput)) {
            fs.unlinkSync(bestOutput);
          }
          bestOutput = tempOutput;
          bestSize = tempStats.size;
          console.log(`  → ✓ Unter 4MB Ziel erreicht!`);
        } else if (tempStats.size < bestSize) {
          // Auch wenn über 4MB, behalte die kleinste
          if (bestOutput && fs.existsSync(bestOutput)) {
            fs.unlinkSync(bestOutput);
          }
          bestOutput = tempOutput;
          bestSize = tempStats.size;
          console.log(`  → ✓ Bisher beste Komprimierung`);
        } else {
          // Lösche temporäre Datei, wenn nicht die beste
          fs.unlinkSync(tempOutput);
          console.log(`  → Nicht die beste, lösche temporäre Datei`);
        }
      } catch (error) {
        console.log(`  → Fehler bei Qualität ${quality}: ${error.message}`);
        if (fs.existsSync(tempOutput)) {
          fs.unlinkSync(tempOutput);
        }
      }
    }
    
    if (bestOutput && fs.existsSync(bestOutput)) {
      // Benenne die beste Datei um
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      fs.renameSync(bestOutput, outputPath);
      
      const finalStats = fs.statSync(outputPath);
      const finalSizeMB = (finalStats.size / (1024 * 1024)).toFixed(2);
      const compressionRatio = ((1 - finalStats.size / stats.size) * 100).toFixed(1);
      
      console.log(`\n✓ Komprimierung erfolgreich!`);
      console.log(`  Original: ${originalSizeMB} MB`);
      console.log(`  Komprimiert: ${finalSizeMB} MB`);
      console.log(`  Komprimierung: ${compressionRatio}%`);
      console.log(`  Ausgabedatei: ${outputPath}`);
      
      return outputPath;
    }
  } catch (error) {
    // Ghostscript nicht verfügbar
    console.error('\n❌ Ghostscript nicht gefunden!\n');
    console.error('Bitte installieren Sie Ghostscript:');
    console.error('  brew install ghostscript\n');
    console.error('Nach der Installation können Sie das Script erneut ausführen.');
    console.error('\nAlternativ können Sie die PDF manuell komprimieren mit:');
    console.error(`  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`);
    process.exit(1);
  }
};

// Kommandozeilen-Argumente verarbeiten
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Verwendung: node compress-pdf.js <input-pdf> [output-pdf]');
  console.error('\nBeispiel:');
  console.error('  node compress-pdf.js report.pdf report_compressed.pdf');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || null;

compressPDF(inputFile, outputFile);

