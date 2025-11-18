#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    break;
  }
}

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ElgaValueSet = require('../models/ElgaValueSet');
const logger = require('../utils/logger');

const parseXML = (xmlPath) => {
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true
  });
  const jsonObj = parser.parse(xmlContent);

  const valueSet = jsonObj.valueSet;
  const metadata = {
    title: valueSet['@_displayName'] || valueSet['@_name'] || 'ELGA_FormatCode',
    name: valueSet['@_name'],
    version: valueSet['@_version'],
    oid: valueSet['@_id'],
    description: valueSet['@_description'] || '',
    descriptionDe: valueSet['@_beschreibung'] || '',
    effectiveDate: valueSet['@_effectiveDate'],
    lastChangeDate: valueSet['@_last_change_date'],
    statusCode: valueSet['@_statusCode'],
    statusDate: valueSet['@_status_date'],
    responsibleOrg: valueSet['@_verantw_Org'],
    website: valueSet['@_website']
  };

  const concepts = Array.isArray(valueSet.conceptList.concept) 
    ? valueSet.conceptList.concept 
    : [valueSet.conceptList.concept];

  const parsedCodes = concepts.map(concept => ({
    code: concept['@_code'],
    system: concept['@_codeSystem'] || '',
    display: concept['@_displayName'] || concept['@_deutsch'] || '',
    version: metadata.version,
    deutsch: concept['@_deutsch'] || '',
    displayName: concept['@_displayName'] || '',
    hinweise: concept['@_hinweise'] || '',
    concept_beschreibung: concept['@_concept_beschreibung'] || ''
  }));

  return {
    metadata,
    concepts: parsedCodes
  };
};

const main = async () => {
  try {
    await connectDB();
    logger.info('Starte Import von ELGA FormatCode Valueset aus XML...');

    const xmlPath = path.join(__dirname, '../../../Downloads/ValueSet-elga-formatcode.1.svsextelga.xml');

    if (!fs.existsSync(xmlPath)) {
      throw new Error(`XML-Datei nicht gefunden: ${xmlPath}`);
    }

    console.log(`Lese XML-Datei: ${xmlPath}\n`);

    const { metadata, concepts } = parseXML(xmlPath);

    console.log('Metadaten aus XML:');
    console.log(`  Title: ${metadata.title}`);
    console.log(`  Version: ${metadata.version}`);
    console.log(`  OID: ${metadata.oid}`);
    console.log(`  Codes gefunden: ${concepts.length}\n`);

    // Suche existierendes Valueset nach OID oder Title
    const existingValueSet = await ElgaValueSet.findOne({
      $or: [
        { oid: metadata.oid },
        { title: { $regex: /formatcode|FormatCode/i } },
        { category: 'formatcode' }
      ]
    }).sort({ version: -1 });

    if (existingValueSet) {
      console.log(`Gefundenes Valueset: ${existingValueSet.title} (${existingValueSet.version})`);
      console.log(`Aktuelle Codes: ${existingValueSet.codes.length}`);
      console.log(`Neue Codes: ${concepts.length}\n`);

      // Update existing valueset
      existingValueSet.codes = concepts.map(c => ({
        code: c.code,
        system: c.system,
        display: c.display || c.displayName || c.deutsch || c.code,
        version: c.version,
        deutsch: c.deutsch,
        displayName: c.displayName,
        hinweise: c.hinweise,
        concept_beschreibung: c.concept_beschreibung
      }));
      existingValueSet.version = metadata.version;
      existingValueSet.title = metadata.title;
      existingValueSet.description = metadata.description;
      existingValueSet.descriptionDe = metadata.descriptionDe;
      existingValueSet.lastUpdated = new Date();
      existingValueSet.category = 'formatcode';
      existingValueSet.rawData = {
        source: 'XML-Import',
        xmlFile: path.basename(xmlPath),
        metadata: metadata,
        concepts: concepts,
        importedAt: new Date().toISOString()
      };

      await existingValueSet.save();

      console.log(`✅ Valueset aktualisiert: ${existingValueSet.title} (${existingValueSet.version})`);
      console.log(`   OID: ${existingValueSet.oid}`);
      console.log(`   Total Codes: ${existingValueSet.codes.length}`);
    } else {
      // Create new valueset
      const newValueSet = await ElgaValueSet.create({
        title: metadata.title,
        version: metadata.version,
        url: metadata.website || `https://termgit.elga.gv.at/ValueSet/${metadata.name || 'elga-formatcode'}`,
        oid: metadata.oid,
        description: metadata.description,
        descriptionDe: metadata.descriptionDe,
        codes: concepts.map(c => ({
          code: c.code,
          system: c.system,
          display: c.display || c.displayName || c.deutsch || c.code,
          version: c.version,
          deutsch: c.deutsch,
          displayName: c.displayName,
          hinweise: c.hinweise,
          concept_beschreibung: c.concept_beschreibung
        })),
        category: 'formatcode',
        status: 'active',
        rawData: {
          source: 'XML-Import',
          xmlFile: path.basename(xmlPath),
          metadata: metadata,
          concepts: concepts,
          importedAt: new Date().toISOString()
        },
        sourceUrl: 'https://termgit.elga.gv.at/codesystems.html'
      });

      console.log(`✅ Valueset erstellt: ${newValueSet.title} (${newValueSet.version})`);
      console.log(`   OID: ${newValueSet.oid}`);
      console.log(`   Total Codes: ${newValueSet.codes.length}`);
    }

    console.log(`\n✅ FormatCode Import abgeschlossen!`);
    logger.info(`ELGA FormatCode erfolgreich importiert: ${metadata.title} (${metadata.version}), ${concepts.length} Codes`);

    process.exit(0);
  } catch (error) {
    logger.error(`Fehler beim Import der FormatCode XML: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { parseXML };



