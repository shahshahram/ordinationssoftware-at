#!/usr/bin/env node
/**
 * Test-Script für ELDA SIT-Verbindung
 * Testet die Verbindung und zeigt detaillierte Informationen
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');
const https = require('https');
const tls = require('tls');

// Konfiguration
const config = {
  url: 'https://online-itu5test.elda.at/elda-online/servlet/WebTrans',
  seriennummer: process.env.ELDA_SIT_SERIENNUMMER || process.env.ELDA_SERIENNUMMER,
  passwort: process.env.ELDA_SIT_PASSWORT || process.env.ELDA_PASSWORT,
  timeout: 60000
};

// HTTPS-Agent mit erweiterten Optionen
const httpsAgent = new https.Agent({
  rejectUnauthorized: true, // Prüfe Zertifikat
  keepAlive: false,
  // Erlaube alle TLS-Versionen
  secureProtocol: 'TLSv1_2_method',
  // Erlaube alle Cipher-Suites
  ciphers: 'ALL'
});

console.log('🔍 ELDA SIT-Verbindungstest\n');
console.log('Konfiguration:');
console.log(`  URL: ${config.url}`);
console.log(`  Seriennummer: ${config.seriennummer ? '✅ Gesetzt' : '❌ Fehlt'}`);
console.log(`  Passwort: ${config.passwort ? '✅ Gesetzt' : '❌ Fehlt'}`);
console.log(`  Timeout: ${config.timeout}ms\n`);

if (!config.seriennummer || !config.passwort) {
  console.error('❌ Fehler: Seriennummer oder Passwort fehlen!');
  console.error('   Bitte setzen Sie ELDA_SIT_SERIENNUMMER und ELDA_SIT_PASSWORT in .env');
  process.exit(1);
}

// Test 1: Einfacher GET-Request (ohne Authentifizierung)
async function test1_SimpleGet() {
  console.log('📡 Test 1: Einfacher GET-Request (ohne Auth)...');
  try {
    const response = await axios.get(config.url, {
      httpsAgent: httpsAgent,
      timeout: config.timeout,
      validateStatus: () => true, // Akzeptiere alle Status-Codes
      // Zusätzliche Optionen für besseres Error-Handling
      maxRedirects: 0
    });
    console.log(`  ✅ Server antwortet: ${response.status} ${response.statusText}`);
    console.log(`  📄 Response-Länge: ${response.data?.length || 0} bytes`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('  ❌ Verbindung verweigert - Server nicht erreichbar');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('  ❌ Timeout - Server antwortet nicht');
    } else if (error.code === 'ENOTFOUND') {
      console.log('  ❌ DNS-Fehler - Server-Adresse nicht gefunden');
    } else if (error.code === 'ECONNRESET') {
      console.log('  ❌ Verbindung zurückgesetzt - Server schließt Verbindung');
      console.log('  💡 Mögliche Ursachen:');
      console.log('     - Server erwartet Client-Zertifikat');
      console.log('     - TLS/SSL-Handshake schlägt fehl');
      console.log('     - Server blockiert die Verbindung');
      if (error.response) {
        console.log(`     - Response Status: ${error.response.status}`);
      }
    } else if (error.code === 'EPROTO') {
      console.log('  ❌ TLS/SSL-Protokollfehler');
      console.log('  💡 Möglicherweise erwartet der Server eine andere TLS-Version');
    } else {
      console.log(`  ❌ Fehler: ${error.message}`);
      console.log(`  📋 Fehlercode: ${error.code || 'unbekannt'}`);
      if (error.stack) {
        console.log(`  📋 Stack: ${error.stack.split('\n')[0]}`);
      }
    }
    return false;
  }
}

// Test 2: GET-Request mit Basic Auth
async function test2_GetWithAuth() {
  console.log('\n📡 Test 2: GET-Request mit Basic Auth...');
  try {
    const credentials = Buffer.from(`${config.seriennummer}:${config.passwort}`).toString('base64');
    const response = await axios.get(config.url, {
      httpsAgent: httpsAgent,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/xml',
        'User-Agent': 'MyMediCloud-MMC/1.0'
      },
      timeout: config.timeout,
      validateStatus: () => true,
      maxRedirects: 0
    });
    console.log(`  ✅ Server antwortet: ${response.status} ${response.statusText}`);
    console.log(`  📄 Response-Länge: ${response.data?.length || 0} bytes`);
    if (response.status === 401) {
      console.log('  ⚠️  Unauthorized - Credentials möglicherweise falsch');
    } else if (response.status === 404) {
      console.log('  ⚠️  Not Found - Endpunkt möglicherweise falsch');
    }
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('  ❌ Verbindung verweigert');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('  ❌ Timeout');
    } else if (error.code === 'ECONNRESET') {
      console.log('  ❌ Verbindung zurückgesetzt');
      console.log('  💡 Server schließt Verbindung - möglicherweise erwartet er Client-Zertifikat');
    } else {
      console.log(`  ❌ Fehler: ${error.message}`);
      console.log(`  📋 Fehlercode: ${error.code || 'unbekannt'}`);
    }
    return false;
  }
}

// Test 3: POST-Request mit minimalem XML
async function test3_PostWithMinimalXML() {
  console.log('\n📡 Test 3: POST-Request mit minimalem XML...');
  try {
    const credentials = Buffer.from(`${config.seriennummer}:${config.passwort}`).toString('base64');
    const minimalXML = '<?xml version="1.0" encoding="UTF-8"?><test>Test</test>';
    
    const response = await axios.post(
      config.url,
      minimalXML,
      {
        httpsAgent: httpsAgent,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/xml; charset=UTF-8',
          'User-Agent': 'MyMediCloud-MMC/1.0'
        },
        timeout: config.timeout,
        validateStatus: () => true,
        maxRedirects: 0
      }
    );
    console.log(`  ✅ Server antwortet: ${response.status} ${response.statusText}`);
    console.log(`  📄 Response-Länge: ${response.data?.length || 0} bytes`);
    if (response.data && typeof response.data === 'string' && response.data.length < 500) {
      console.log(`  📝 Response (erste 200 Zeichen): ${response.data.substring(0, 200)}`);
    }
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('  ❌ Verbindung verweigert');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('  ❌ Timeout - Server antwortet nicht innerhalb von 60 Sekunden');
      console.log('  💡 Möglicherweise wird das XML-Format nicht akzeptiert');
    } else if (error.code === 'ENOTFOUND') {
      console.log('  ❌ DNS-Fehler');
    } else if (error.code === 'ECONNRESET') {
      console.log('  ❌ Verbindung zurückgesetzt');
      console.log('  💡 Server schließt Verbindung - möglicherweise:');
      console.log('     - XML-Format wird nicht akzeptiert');
      console.log('     - Client-Zertifikat erforderlich');
      console.log('     - TLS/SSL-Handshake schlägt fehl');
    } else {
      console.log(`  ❌ Fehler: ${error.message}`);
      console.log(`  📋 Fehlercode: ${error.code || 'unbekannt'}`);
      if (error.response) {
        console.log(`  📄 Response Status: ${error.response.status}`);
        console.log(`  📄 Response Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
    }
    return false;
  }
}

// Test 4: POST-Request mit ELDA-Format XML
async function test4_PostWithELDAFormat() {
  console.log('\n📡 Test 4: POST-Request mit ELDA-Format XML...');
  try {
    const credentials = Buffer.from(`${config.seriennummer}:${config.passwort}`).toString('base64');
    
    // Minimales ELDA-Format XML
    const eldaXML = `<?xml version="1.0" encoding="UTF-8"?>
<ELDADataset xmlns="http://www.elda.at/schema/Abrechnung" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Datensatztyp>Abrechnung</Datensatztyp>
  <Version>1.0</Version>
  <Seriennummer>TEST-${Date.now()}</Seriennummer>
  <Erstellungsdatum>${new Date().toISOString()}</Erstellungsdatum>
  <Patient>
    <Sozialversicherungsnummer>1133280290</Sozialversicherungsnummer>
    <Vorname>Scarlett</Vorname>
    <Nachname>Test</Nachname>
    <Geburtsdatum>1990-02-28</Geburtsdatum>
  </Patient>
  <Arzt>
    <Steuernummer>ATU12345678</Steuernummer>
    <Kammernummer>14</Kammernummer>
    <Name>Test Arzt</Name>
  </Arzt>
  <Abrechnungsperiode>
    <Von>2026-01-01</Von>
    <Bis>2026-01-31</Bis>
    <Jahr>2026</Jahr>
    <Monat>1</Monat>
  </Abrechnungsperiode>
  <Leistungen>
    <Leistung>
      <Leistungsdatum>2026-01-18</Leistungsdatum>
      <Leistungscode>111</Leistungscode>
      <Beschreibung>Test-Leistung</Beschreibung>
      <Menge>1</Menge>
      <Gesamtpreis>35</Gesamtpreis>
    </Leistung>
  </Leistungen>
  <Summen>
    <Gesamtbetrag>35</Gesamtbetrag>
    <AnzahlLeistungen>1</AnzahlLeistungen>
  </Summen>
</ELDADataset>`;
    
    const response = await axios.post(
      config.url,
      eldaXML,
      {
        httpsAgent: httpsAgent,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/xml; charset=UTF-8',
          'X-Dataset-Type': 'Abrechnung',
          'User-Agent': 'MyMediCloud-MMC/1.0'
        },
        timeout: config.timeout,
        validateStatus: () => true,
        maxRedirects: 0
      }
    );
    console.log(`  ✅ Server antwortet: ${response.status} ${response.statusText}`);
    console.log(`  📄 Response-Länge: ${response.data?.length || 0} bytes`);
    if (response.data && typeof response.data === 'string' && response.data.length < 1000) {
      console.log(`  📝 Response: ${response.data.substring(0, 500)}`);
    }
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('  ❌ Verbindung verweigert');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('  ❌ Timeout - Server antwortet nicht');
      console.log('  💡 Möglicherweise wird das XML-Format nicht akzeptiert');
    } else if (error.code === 'ECONNRESET') {
      console.log('  ❌ Verbindung zurückgesetzt');
      console.log('  💡 Server schließt Verbindung - möglicherweise:');
      console.log('     - XML-Format wird nicht akzeptiert');
      console.log('     - Client-Zertifikat erforderlich');
      console.log('     - TLS/SSL-Handshake schlägt fehl');
    } else if (error.response) {
      console.log(`  ⚠️  Server antwortet mit Status: ${error.response.status}`);
      console.log(`  📄 Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    } else {
      console.log(`  ❌ Fehler: ${error.message}`);
      console.log(`  📋 Fehlercode: ${error.code || 'unbekannt'}`);
    }
    return false;
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 Starte ELDA SIT-Verbindungstests...\n');
  
  const results = {
    test1: await test1_SimpleGet(),
    test2: await test2_GetWithAuth(),
    test3: await test3_PostWithMinimalXML(),
    test4: await test4_PostWithELDAFormat()
  };
  
  console.log('\n📊 Test-Zusammenfassung:');
  console.log(`  Test 1 (GET ohne Auth): ${results.test1 ? '✅' : '❌'}`);
  console.log(`  Test 2 (GET mit Auth): ${results.test2 ? '✅' : '❌'}`);
  console.log(`  Test 3 (POST minimal XML): ${results.test3 ? '✅' : '❌'}`);
  console.log(`  Test 4 (POST ELDA XML): ${results.test4 ? '✅' : '❌'}`);
  
  if (!results.test1 && !results.test2 && !results.test3 && !results.test4) {
    console.log('\n❌ Alle Tests fehlgeschlagen - Server ist möglicherweise nicht erreichbar');
    console.log('   Prüfen Sie:');
    console.log('   - Internetverbindung');
    console.log('   - Firewall/Proxy-Einstellungen');
    console.log('   - Server-URL: https://online-itu5test.elda.at/elda-online/servlet/WebTrans');
  } else if (results.test1 || results.test2) {
    console.log('\n✅ Server ist erreichbar');
    if (!results.test3 && !results.test4) {
      console.log('⚠️  POST-Requests werden möglicherweise nicht akzeptiert');
      console.log('   Prüfen Sie das XML-Format und die Content-Type-Header');
    }
  }
}

main().catch(console.error);
