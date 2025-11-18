#!/usr/bin/env node

/**
 * ELGA Terminology Verification Script
 * 
 * Erstellt eine Zusammenfassung aller importierten Valuesets und CodeSystems
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ElgaValueSet = require('../models/ElgaValueSet');
const ElgaCodeSystem = require('../models/ElgaCodeSystem');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Erstellt Zusammenfassung
 */
const createSummary = async () => {
  try {
    await connectDB();
    logger.info('Erstelle Zusammenfassung...');

    // Valuesets
    const valuesets = await ElgaValueSet.find({}).sort({ title: 1 });
    const valuesetSummary = valuesets.map(vs => ({
      title: vs.title,
      version: vs.version,
      url: vs.url,
      oid: vs.oid,
      category: vs.category,
      codeCount: vs.codes ? vs.codes.length : 0,
      status: vs.status,
      lastUpdated: vs.lastUpdated,
      importedAt: vs.importedAt
    }));

    // CodeSystems
    const codesystems = await ElgaCodeSystem.find({}).sort({ title: 1 });
    const codesystemSummary = codesystems.map(cs => ({
      title: cs.title,
      version: cs.version,
      url: cs.url,
      oid: cs.oid,
      category: cs.category,
      conceptCount: cs.concepts ? cs.concepts.length : 0,
      status: cs.status,
      lastUpdated: cs.lastUpdated,
      importedAt: cs.importedAt
    }));

    // Statistiken
    const stats = {
      valuesets: {
        total: valuesets.length,
        byCategory: {},
        byStatus: {},
        totalCodes: 0
      },
      codesystems: {
        total: codesystems.length,
        byCategory: {},
        byStatus: {},
        totalConcepts: 0
      }
    };

    // Valueset-Statistiken
    valuesets.forEach(vs => {
      const cat = vs.category || 'unknown';
      const status = vs.status || 'unknown';
      stats.valuesets.byCategory[cat] = (stats.valuesets.byCategory[cat] || 0) + 1;
      stats.valuesets.byStatus[status] = (stats.valuesets.byStatus[status] || 0) + 1;
      stats.valuesets.totalCodes += vs.codes ? vs.codes.length : 0;
    });

    // CodeSystem-Statistiken
    codesystems.forEach(cs => {
      const cat = cs.category || 'unknown';
      const status = cs.status || 'unknown';
      stats.codesystems.byCategory[cat] = (stats.codesystems.byCategory[cat] || 0) + 1;
      stats.codesystems.byStatus[status] = (stats.codesystems.byStatus[status] || 0) + 1;
      stats.codesystems.totalConcepts += cs.concepts ? cs.concepts.length : 0;
    });

    // Zusammenfassung erstellen
    const summary = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      valuesets: valuesetSummary,
      codesystems: codesystemSummary
    };

    // JSON speichern
    const summaryPath = path.join(__dirname, '../../docs/ELGA_TERMINOLOGY_SUMMARY.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    logger.info(`Zusammenfassung gespeichert: ${summaryPath}`);

    // Markdown-Report erstellen
    const reportPath = path.join(__dirname, '../../docs/ELGA_TERMINOLOGY_SUMMARY.md');
    const markdown = generateMarkdownReport(summary);
    fs.writeFileSync(reportPath, markdown, 'utf8');
    logger.info(`Report gespeichert: ${reportPath}`);

    // Konsolen-Output
    console.log('\n=== ELGA Terminology Repository Zusammenfassung ===\n');
    console.log(`Erstellt am: ${summary.generatedAt}\n`);
    
    console.log('📊 STATISTIKEN:\n');
    console.log('Valuesets:');
    console.log(`  Total: ${stats.valuesets.total}`);
    console.log(`  Total Codes: ${stats.valuesets.totalCodes}`);
    console.log(`  Nach Kategorie:`);
    Object.entries(stats.valuesets.byCategory).forEach(([cat, count]) => {
      console.log(`    ${cat}: ${count}`);
    });
    console.log(`  Nach Status:`);
    Object.entries(stats.valuesets.byStatus).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });
    
    console.log('\nCodeSystems:');
    console.log(`  Total: ${stats.codesystems.total}`);
    console.log(`  Total Concepts: ${stats.codesystems.totalConcepts}`);
    console.log(`  Nach Kategorie:`);
    Object.entries(stats.codesystems.byCategory).forEach(([cat, count]) => {
      console.log(`    ${cat}: ${count}`);
    });
    console.log(`  Nach Status:`);
    Object.entries(stats.codesystems.byStatus).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });

    console.log('\n📋 VALUESETS LISTE:');
    console.log(`\nAnzahl: ${valuesetSummary.length}\n`);
    valuesetSummary.slice(0, 20).forEach((vs, i) => {
      console.log(`${i + 1}. ${vs.title} (${vs.version})`);
      console.log(`   OID: ${vs.oid}`);
      console.log(`   Codes: ${vs.codeCount} | Kategorie: ${vs.category} | Status: ${vs.status}`);
    });
    if (valuesetSummary.length > 20) {
      console.log(`\n... und ${valuesetSummary.length - 20} weitere Valuesets`);
    }

    console.log('\n📋 CODESYSTEMS LISTE:');
    console.log(`\nAnzahl: ${codesystemSummary.length}\n`);
    codesystemSummary.slice(0, 20).forEach((cs, i) => {
      console.log(`${i + 1}. ${cs.title} (${cs.version})`);
      console.log(`   OID: ${cs.oid}`);
      console.log(`   Concepts: ${cs.conceptCount} | Kategorie: ${cs.category} | Status: ${cs.status}`);
    });
    if (codesystemSummary.length > 20) {
      console.log(`\n... und ${codesystemSummary.length - 20} weitere CodeSystems`);
    }

    console.log(`\n✅ Vollständige Details in: ${summaryPath}`);
    console.log(`📄 Markdown-Report in: ${reportPath}\n`);

    process.exit(0);
  } catch (error) {
    logger.error(`Fehler beim Erstellen der Zusammenfassung: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

/**
 * Generiert Markdown-Report
 */
const generateMarkdownReport = (summary) => {
  let md = `# ELGA Terminology Repository - Zusammenfassung\n\n`;
  md += `**Erstellt am:** ${new Date(summary.generatedAt).toLocaleString('de-DE')}\n\n`;
  md += `**Quelle:** [ELGA Terminologie Browser](https://termgit.elga.gv.at/)\n\n`;
  md += `---\n\n`;

  // Statistiken
  md += `## 📊 Statistiken\n\n`;
  
  md += `### Valuesets\n\n`;
  md += `- **Total:** ${summary.statistics.valuesets.total}\n`;
  md += `- **Total Codes:** ${summary.statistics.valuesets.totalCodes}\n`;
  md += `- **Nach Kategorie:**\n`;
  Object.entries(summary.statistics.valuesets.byCategory).forEach(([cat, count]) => {
    md += `  - ${cat}: ${count}\n`;
  });
  md += `- **Nach Status:**\n`;
  Object.entries(summary.statistics.valuesets.byStatus).forEach(([status, count]) => {
    md += `  - ${status}: ${count}\n`;
  });
  
  md += `\n### CodeSystems\n\n`;
  md += `- **Total:** ${summary.statistics.codesystems.total}\n`;
  md += `- **Total Concepts:** ${summary.statistics.codesystems.totalConcepts}\n`;
  md += `- **Nach Kategorie:**\n`;
  Object.entries(summary.statistics.codesystems.byCategory).forEach(([cat, count]) => {
    md += `  - ${cat}: ${count}\n`;
  });
  md += `- **Nach Status:**\n`;
  Object.entries(summary.statistics.codesystems.byStatus).forEach(([status, count]) => {
    md += `  - ${status}: ${count}\n`;
  });

  md += `\n---\n\n`;

  // Valuesets Liste
  md += `## 📋 Valuesets Liste (${summary.valuesets.length})\n\n`;
  md += `| # | Titel | Version | OID | Codes | Kategorie | Status |\n`;
  md += `|---|-------|--------|-----|-------|----------|--------|\n`;
  summary.valuesets.forEach((vs, i) => {
    md += `| ${i + 1} | ${vs.title} | ${vs.version} | ${vs.oid} | ${vs.codeCount} | ${vs.category} | ${vs.status} |\n`;
  });

  md += `\n---\n\n`;

  // CodeSystems Liste
  md += `## 📋 CodeSystems Liste (${summary.codesystems.length})\n\n`;
  md += `| # | Titel | Version | OID | Concepts | Kategorie | Status |\n`;
  md += `|---|-------|--------|-----|----------|----------|--------|\n`;
  summary.codesystems.forEach((cs, i) => {
    md += `| ${i + 1} | ${cs.title} | ${cs.version} | ${cs.oid} | ${cs.conceptCount} | ${cs.category} | ${cs.status} |\n`;
  });

  md += `\n---\n\n`;
  md += `**Hinweis:** Diese Daten wurden von [termgit.elga.gv.at](https://termgit.elga.gv.at/) importiert und unverändert gespeichert.\n`;
  md += `Für Updates: \`node backend/scripts/import-elga-terminology.js\`\n`;

  return md;
};

// Script ausführen
if (require.main === module) {
  createSummary();
}

module.exports = { createSummary };



