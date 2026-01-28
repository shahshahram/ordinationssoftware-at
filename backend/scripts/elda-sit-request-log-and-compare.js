/**
 * Führt einen ELDA-SIT-Request aus, erzeugt das Log-File des letzten Fehlers
 * und einen XML-Vergleich (unser Layout vs. offizielles WAH_14_Test_Input.xml).
 *
 * Usage: node backend/scripts/elda-sit-request-log-and-compare.js
 * Voraussetzung: ELDA_ENVIRONMENT=sit, ELDA_SIT_SERIENNUMMER, ELDA_SIT_PASSWORT in .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs').promises;
const wahonlineFormatGenerator = require('../services/wahonlineFormatGenerator');
const wahonlineConfig = require('../config/wahonline.config');
const eldaConnector = require('../services/connectors/eldaConnector');

// Offizielles WAH_14-Referenz-XML (aus SIT_ELDA_SUPPORT_ANFRAGE / WAH_14_Test_Input)
const WAH14_REFERENCE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<n1:honorarnotenMeldung akz="a" xsi:schemaLocation="http://at.sozvers.stp.elda.wa WA_V7.xsd" xmlns:n1="http://at.sozvers.stp.elda.wa" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<patientenDaten>
		<adresseDesPatienten>
			<postleitzahl>4020</postleitzahl>
			<strasseHausnummer>Duftschmidgasse 18</strasseHausnummer>
			<ort>Linz</ort>
		</adresseDesPatienten>
		<leistungsDaten>
			<datumLeistungserbringungVon>2026-01-21</datumLeistungserbringungVon>
			<datumLeistungserbringungBis>2026-01-21</datumLeistungserbringungBis>
			<bruttoBetragProPosition>35</bruttoBetragProPosition>
			<leistungsart>111</leistungsart>
			<positionsnummer>1010</positionsnummer>
			<positionsnummerAnzahl>1</positionsnummerAnzahl>
		</leistungsDaten>
		<datenZahlungsempfaenger>
			<internationalBankAccountNumber>AT999900000000999999</internationalBankAccountNumber>
			<versicherungsnummerZahlungsempfaenger>1133280290</versicherungsnummerZahlungsempfaenger>
		</datenZahlungsempfaenger>
		<patientDaten>
			<leistungsbestaetigungAnforderung>false</leistungsbestaetigungAnforderung>
			<rechnungsbetragBezahlt>true</rechnungsbetragBezahlt>
			<versicherungsnummerVersicherter>1133280290</versicherungsnummerVersicherter>
			<versicherungsnummerPatienten>1133280290</versicherungsnummerPatienten>
			<rechnungsbetrag>35</rechnungsbetrag>
			<familiennamePatienten>ASWH-VS-MRSA-Erwachsene-B</familiennamePatienten>
			<rechnungsnummer>2026/12345</rechnungsnummer>
			<vornamePatienten>Scarlett</vornamePatienten>
			<datumRechnung>2026-01-21</datumRechnung>
		</patientDaten>
	</patientenDaten>
	<infoDaten>
		<identifikationsSatz>
			<bundeslandAbrechnungsstelle>4</bundeslandAbrechnungsstelle>
			<listkennzeichen>HO</listkennzeichen>
			<projektkennzeichen>WA</projektkennzeichen>
			<zustaendigeAbrechnungsstelle>14</zustaendigeAbrechnungsstelle>
			<versionDatenbestand>7</versionDatenbestand>
			<referenznummer>800062/202612345</referenznummer>
		</identifikationsSatz>
		<vertragspartnerDaten>
			<datumBehandlung>2026-01-21</datumBehandlung>
			<datumUebermittlung>2026-01-21T14:40:29</datumUebermittlung>
			<fachgebietLeistungserbringerBehandler>01</fachgebietLeistungserbringerBehandler>
			<familiennameBehandler>Arzt</familiennameBehandler>
			<vertragspartnernummerBehandler>100014</vertragspartnernummerBehandler>
			<vornameBehandler>Test</vornameBehandler>
			<ordiAdresseDesVertragspartners>
				<postleitzahl>4020</postleitzahl>
				<strasseHausnummer>Teststraße 1</strasseHausnummer>
				<ort>Linz</ort>
			</ordiAdresseDesVertragspartners>
		</vertragspartnerDaten>
	</infoDaten>
</n1:honorarnotenMeldung>
`;

const TEST_PAYLOAD = {
  performance: {
    serviceDatetime: '2026-01-21T14:30:00.000Z',
    totalPrice: 35,
    unitPrice: 35,
    quantity: 1,
    serviceCode: '111',
    invoiceNumber: '2026/12345'
  },
  patient: {
    socialSecurityNumber: '1133280290',
    firstName: 'Scarlett',
    lastName: 'ASWH-VS-MRSA-Erwachsene-B',
    address: {
      street: 'Duftschmidgasse',
      houseNumber: '18',
      postalCode: '4020',
      city: 'Linz',
      country: 'Österreich'
    },
    iban: 'AT999900000000999999'
  },
  doctor: {
    profile: {
      chamberNumber: '14',
      address: { postalCode: '4020', city: 'Linz', street: 'Teststraße', houseNumber: '1' }
    },
    name: 'Test Arzt'
  }
};

function compareXmlLines(ourLines, refLines) {
  const deviations = [];
  const maxLen = Math.max(ourLines.length, refLines.length);
  for (let i = 0; i < maxLen; i++) {
    const ourLine = (ourLines[i] || '').trimEnd();
    const refLine = (refLines[i] || '').trimEnd();
    if (ourLine !== refLine) {
      deviations.push({
        line: i + 1,
        ref: refLine || '(fehlt in Referenz)',
        ours: ourLine || '(fehlt bei uns)',
        note: ourLine === '' ? 'Zeile fehlt bei uns' : refLine === '' ? 'Zusätzliche Zeile bei uns' : 'Abweichung'
      });
    }
  }
  return deviations;
}

function normalizeForCompare(xml) {
  return xml
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

async function run() {
  const docsDir = path.join(__dirname, '../../docs');
  const logsDir = path.join(docsDir, 'logs');
  await fs.mkdir(logsDir, { recursive: true });

  console.log('1. Generiere WAH-XML aus Test-Payload …');
  wahonlineFormatGenerator.setConfig(wahonlineConfig.getActiveConfig());
  const dataset = wahonlineFormatGenerator.generateMeldung(TEST_PAYLOAD);
  const ourXml = wahonlineFormatGenerator.generateXML(dataset);

  console.log('2. Sende Request an ELDA-SIT (erwarteter Fehler: „unbekannter Fehler“) …');
  try {
    await eldaConnector.sendViaWebservice(ourXml, 'WA');
    console.log('   (Request war erfolgreich – kein Log-File bei Fehler.)');
  } catch (err) {
    console.log('   Fehler wie erwartet:', err.message);
    console.log('   Log-File wurde vom Connector geschrieben: docs/logs/ELDA_SIT_LAST_FAILED_REQUEST.log');
  }

  console.log('3. Erstelle XML-Vergleich (unser Layout vs. WAH_14_Test_Input) …');
  const ourLines = normalizeForCompare(ourXml).split('\n');
  const refLines = normalizeForCompare(WAH14_REFERENCE_XML).split('\n');
  const deviations = compareXmlLines(ourLines, refLines);

  const comparisonPath = path.join(logsDir, 'ELDA_SIT_XML_VERGLEICH_WAH14.md');
  const md = [
    '# ELDA-SIT: XML-Vergleich unser Layout vs. WAH_14_Test_Input.xml',
    '',
    `Erstellt: ${new Date().toISOString()}`,
    '',
    '## Referenz',
    'Offizielles Beispiel: WAH_14_Test_Input.xml (ELDA) bzw. SIT_ELDA_SUPPORT_ANFRAGE.md.',
    '',
    '## Abweichungen (jede noch so kleine)',
    ''
  ];

  if (deviations.length === 0) {
    md.push('**Keine Abweichungen** – Unser XML entspricht zeilenweise der Referenz.');
  } else {
    md.push('| Zeile | Referenz (WAH_14) | Unser XML | Anmerkung |');
    md.push('|-------|-------------------|-----------|-----------|');
    for (const d of deviations) {
      const refEsc = (d.ref || '').replace(/\|/g, '\\|').substring(0, 60);
      const oursEsc = (d.ours || '').replace(/\|/g, '\\|').substring(0, 60);
      md.push(`| ${d.line} | ${refEsc} | ${oursEsc} | ${d.note} |`);
    }
    md.push('');
    md.push('### Zusammenfassung der Abweichungen');
    md.push('');
    for (const d of deviations) {
      md.push(`- **Zeile ${d.line}**: ${d.note}`);
      if (d.ref !== d.ours) {
        md.push(`  - Referenz: \`${d.ref.substring(0, 80)}${d.ref.length > 80 ? '…' : ''}\``);
        md.push(`  - Unser:     \`${d.ours.substring(0, 80)}${d.ours.length > 80 ? '…' : ''}\``);
      }
    }
  }

  md.push('## Encoding & Format');
  md.push('');
  const ourDecl = ourXml.substring(0, ourXml.indexOf('?>') + 2);
  const refDecl = WAH14_REFERENCE_XML.substring(0, WAH14_REFERENCE_XML.indexOf('?>') + 2);
  if (ourDecl !== refDecl) {
    md.push('- **XML-Deklaration**: Abweichung.');
    md.push(`  - Referenz: \`${refDecl}\``);
    md.push(`  - Unser: \`${ourDecl}\``);
  } else {
    md.push('- **XML-Deklaration**: Identisch (`' + ourDecl + '`).');
  }
  md.push('');
  const ourRootAttrs = ourXml.match(/<n1:honorarnotenMeldung\s+([^>]+)>/);
  const refRootAttrs = WAH14_REFERENCE_XML.match(/<n1:honorarnotenMeldung\s+([^>]+)>/);
  if (ourRootAttrs && refRootAttrs && ourRootAttrs[1] !== refRootAttrs[1]) {
    md.push('- **Root-Attribute (Reihenfolge/Inhalt)**: Abweichung.');
    md.push(`  - Referenz: \`${refRootAttrs[1]}\``);
    md.push(`  - Unser: \`${ourRootAttrs[1]}\``);
  }
  md.push('');
  md.push('## Vollständiges generiertes XML (unser)');
  md.push('```xml');
  md.push(ourXml);
  md.push('```');

  await fs.writeFile(comparisonPath, md.join('\n'), 'utf8');
  console.log('   Geschrieben:', comparisonPath);

  console.log('');
  console.log('Fertig.');
  console.log('  - Log des letzten Fehlers: docs/logs/ELDA_SIT_LAST_FAILED_REQUEST.log');
  console.log('  - XML-Vergleich: docs/logs/ELDA_SIT_XML_VERGLEICH_WAH14.md');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
