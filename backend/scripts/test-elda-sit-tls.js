#!/usr/bin/env node
/**
 * Erweiterter TLS/SSL-Test für ELDA SIT-Verbindung
 * Testet verschiedene TLS-Konfigurationen
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require('https');
const tls = require('tls');
const net = require('net');

const config = {
  host: 'online-itu5test.elda.at',
  port: 443,
  seriennummer: process.env.ELDA_SIT_SERIENNUMMER || process.env.ELDA_SERIENNUMMER,
  passwort: process.env.ELDA_SIT_PASSWORT || process.env.ELDA_PASSWORT
};

console.log('🔍 ELDA SIT TLS/SSL-Diagnose\n');
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}\n`);

// Test 1: TCP-Verbindung (ohne TLS)
async function test1_TCPConnection() {
  return new Promise((resolve) => {
    console.log('📡 Test 1: TCP-Verbindung (ohne TLS)...');
    const socket = new net.Socket();
    let connected = false;
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      connected = true;
      console.log('  ✅ TCP-Verbindung erfolgreich');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log('  ❌ TCP-Verbindung Timeout');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      console.log(`  ❌ TCP-Verbindung Fehler: ${error.message}`);
      resolve(false);
    });
    
    socket.connect(config.port, config.host);
  });
}

// Test 2: TLS-Handshake (ohne Client-Zertifikat)
async function test2_TLSHandshake() {
  return new Promise((resolve) => {
    console.log('\n📡 Test 2: TLS-Handshake (ohne Client-Zertifikat)...');
    
    const options = {
      host: config.host,
      port: config.port,
      rejectUnauthorized: true,
      servername: config.host
    };
    
    const socket = tls.connect(options, () => {
      console.log('  ✅ TLS-Handshake erfolgreich');
      console.log(`  📋 Protokoll: ${socket.getProtocol()}`);
      console.log(`  📋 Cipher: ${socket.getCipher().name}`);
      console.log(`  📋 Authorized: ${socket.authorized}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.setTimeout(10000);
    
    socket.on('timeout', () => {
      console.log('  ❌ TLS-Handshake Timeout');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      if (error.code === 'ECONNRESET') {
        console.log('  ❌ TLS-Handshake: Verbindung zurückgesetzt');
        console.log('  💡 Server schließt Verbindung - möglicherweise Client-Zertifikat erforderlich');
      } else if (error.code === 'EPROTO') {
        console.log('  ❌ TLS-Handshake: Protokollfehler');
        console.log(`  📋 Fehler: ${error.message}`);
      } else {
        console.log(`  ❌ TLS-Handshake Fehler: ${error.message}`);
        console.log(`  📋 Code: ${error.code}`);
      }
      resolve(false);
    });
  });
}

// Test 3: HTTPS GET (mit verschiedenen TLS-Versionen)
async function test3_HTTPSWithTLSVersions() {
  const tlsVersions = [
    { name: 'TLS 1.2', secureProtocol: 'TLSv1_2_method' },
    { name: 'TLS 1.3', secureProtocol: 'TLSv1_3_method' },
    { name: 'Auto', secureProtocol: undefined }
  ];
  
  console.log('\n📡 Test 3: HTTPS GET mit verschiedenen TLS-Versionen...');
  
  for (const version of tlsVersions) {
    try {
      const options = {
        hostname: config.host,
        port: config.port,
        path: '/elda-online/servlet/WebTrans',
        method: 'GET',
        rejectUnauthorized: true,
        ...(version.secureProtocol && { secureProtocol: version.secureProtocol })
      };
      
      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          console.log(`  ✅ ${version.name}: Server antwortet (${res.statusCode})`);
          res.on('data', () => {});
          res.on('end', () => resolve());
        });
        
        req.setTimeout(5000);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.on('error', (error) => {
          if (error.code === 'ECONNRESET') {
            console.log(`  ❌ ${version.name}: Verbindung zurückgesetzt`);
          } else {
            console.log(`  ❌ ${version.name}: ${error.message}`);
          }
          reject(error);
        });
        
        req.end();
      });
    } catch (error) {
      // Fehler bereits geloggt
    }
  }
}

// Test 4: Prüfe Server-Zertifikat
async function test4_ServerCertificate() {
  return new Promise((resolve) => {
    console.log('\n📡 Test 4: Server-Zertifikat prüfen...');
    
    const options = {
      host: config.host,
      port: config.port,
      rejectUnauthorized: false // Temporär deaktivieren für Zertifikat-Info
    };
    
    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate();
      console.log('  ✅ Server-Zertifikat erhalten');
      console.log(`  📋 Subject: ${cert.subject.CN || cert.subject.O || 'N/A'}`);
      console.log(`  📋 Issuer: ${cert.issuer.CN || cert.issuer.O || 'N/A'}`);
      console.log(`  📋 Gültig bis: ${cert.valid_to}`);
      console.log(`  📋 Fingerprint: ${cert.fingerprint}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.setTimeout(10000);
    
    socket.on('timeout', () => {
      console.log('  ❌ Timeout beim Abrufen des Zertifikats');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      console.log(`  ❌ Fehler: ${error.message}`);
      resolve(false);
    });
  });
}

// Hauptfunktion
async function main() {
  await test1_TCPConnection();
  await test2_TLSHandshake();
  await test3_HTTPSWithTLSVersions();
  await test4_ServerCertificate();
  
  console.log('\n📊 Zusammenfassung:');
  console.log('  - Wenn TCP-Verbindung erfolgreich: Netzwerk ist OK');
  console.log('  - Wenn TLS-Handshake fehlschlägt: Möglicherweise Client-Zertifikat erforderlich');
  console.log('  - Wenn alle Tests fehlschlagen: Server blockiert möglicherweise Verbindungen');
  console.log('\n💡 Nächste Schritte:');
  console.log('  1. Kontaktieren Sie ELDA-Support');
  console.log('  2. Fragen Sie nach Client-Zertifikat-Anforderungen für SIT');
  console.log('  3. Fragen Sie nach IP-Whitelist-Anforderungen');
  console.log('  4. Fragen Sie nach spezifischen TLS/SSL-Anforderungen');
}

main().catch(console.error);
