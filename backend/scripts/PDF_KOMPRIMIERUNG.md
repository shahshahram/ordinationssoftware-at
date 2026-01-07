# PDF-Komprimierung

Dieses Script komprimiert PDF-Dateien, z.B. von 8MB auf 4MB.

## Installation von Ghostscript

Ghostscript ist erforderlich für die PDF-Komprimierung. Installieren Sie es mit:

```bash
brew install ghostscript
```

## Verwendung

```bash
node compress-pdf.js <input-pdf> [output-pdf]
```

### Beispiel

```bash
# Komprimiert report.pdf und erstellt report_compressed.pdf
node compress-pdf.js report.pdf

# Oder mit eigenem Ausgabedateinamen
node compress-pdf.js report.pdf report_klein.pdf
```

## Manuelle Komprimierung mit Ghostscript

Falls Sie die PDF direkt mit Ghostscript komprimieren möchten:

```bash
# Für maximale Komprimierung (niedrigste Qualität)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf

# Für bessere Qualität (empfohlen für 4MB Ziel)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf

# Für hohe Qualität
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf
```

## Qualitätsstufen

- `/screen` - Niedrigste Qualität, höchste Komprimierung
- `/ebook` - Mittlere Qualität, gute Komprimierung (empfohlen)
- `/printer` - Hohe Qualität, weniger Komprimierung






