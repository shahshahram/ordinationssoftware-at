/**
 * CLI: Jährliche Tarife generieren (updateYearlyTariffs aufrufen)
 *
 * Usage:
 *   node backend/scripts/run-update-yearly-tariffs.js <factor> [targetYear] [sourceYear]
 *
 * Beispiele:
 *   node run-update-yearly-tariffs.js 1.04              → 2026 (4 % aus Root/2025)
 *   node run-update-yearly-tariffs.js 1.04 2026        → 2026 explizit
 *   node run-update-yearly-tariffs.js 1.02 2027         → 2027 mit 2 % aus Root/2025
 *   node run-update-yearly-tariffs.js 1.02 2027 2026    → 2027 mit 2 % aus 2026 (Quelle: 2026)
 */

const { updateYearlyTariffs } = require('../utils/update-yearly-tariffs');

const factorArg = process.argv[2];
const targetYearArg = process.argv[3];
const sourceYearArg = process.argv[4];

if (!factorArg) {
  console.error('Usage: node run-update-yearly-tariffs.js <factor> [targetYear] [sourceYear]');
  console.error('  factor:     z.B. 1.04 für 4 % Erhöhung');
  console.error('  targetYear: optional, z.B. 2027 (sonst: sourceYear/validFrom + 1)');
  console.error('  sourceYear: optional, z.B. 2026 = Punktwerte von 2026 als Basis (sonst: Root/2025)');
  process.exit(1);
}

const factor = parseFloat(factorArg);
if (Number.isNaN(factor) || factor <= 0) {
  console.error('Fehler: factor muss eine positive Zahl sein (z.B. 1.04).');
  process.exit(1);
}

const targetYear = targetYearArg ? parseInt(targetYearArg, 10) : null;
if (targetYearArg && Number.isNaN(targetYear)) {
  console.error('Fehler: targetYear muss eine Zahl sein (z.B. 2026).');
  process.exit(1);
}

const sourceYear = sourceYearArg ? String(sourceYearArg) : undefined;

try {
  const result = updateYearlyTariffs(factor, targetYear, sourceYear);
  console.log(`✓ Tarife für ${result.targetYear} generiert (validFrom: ${result.validFrom})`);
  console.log(`  Faktor: ${factor}`);
  if (sourceYear) console.log(`  Quelle (Kettenindex): config[${sourceYear}].pointValues`);
  console.log(`  Punktwerte unter Config-Key "${result.targetYear}" gespeichert.`);
  process.exit(0);
} catch (err) {
  console.error('Fehler:', err.message);
  process.exit(1);
}
