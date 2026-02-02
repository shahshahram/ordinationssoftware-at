// ELDA-Connector für elektronischen Datenaustausch mit österreichischen Sozialversicherungsträgern
// Unterstützt FTPS (aktuell) und Webservice (ab 02.02.2026)

const axios = require('axios');
const crypto = require('crypto');
const ftp = require('basic-ftp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const eldaConfig = require('../../config/elda.config');
const eldaFormatGenerator = require('../eldaFormatGenerator');

/** Anonymisiert XML-Body für Log (SV-Nummern, IBAN, Namen, Adressen). */
function anonymizeXmlForLog(xml) {
  if (!xml || typeof xml !== 'string') return xml || '';
  let out = xml;
  // SV-Nummer (10 Ziffern, österreichisches Format)
  out = out.replace(/\b(\d{4}\s?\d{6})\b/g, '[SV-NR]');
  out = out.replace(/\b(\d{10})\b/g, (m) => (/^\d{10}$/.test(m) ? '[SV-NR]' : m));
  // IBAN (AT + 20 Ziffern)
  out = out.replace(/\bAT\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/gi, '[IBAN]');
  out = out.replace(/\bAT\d{20}\b/gi, '[IBAN]');
  // Tag-Inhalte: versicherungsnummer*, internationalBankAccountNumber
  out = out.replace(/<(versicherungsnummer[A-Za-z]*)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  out = out.replace(/<(internationalBankAccountNumber)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  // Namen und Adressen (Inhalt von typischen Tags)
  out = out.replace(/<(familienname[A-Za-z]*)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  out = out.replace(/<(vorname[A-Za-z]*)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  out = out.replace(/<(strasseHausnummer|strasse[A-Za-z]*)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  out = out.replace(/<(ort)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  // SIT v4 SOAP: Passwort und API-Key nicht loggen
  out = out.replace(/<(passwort)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  out = out.replace(/<(apiKey)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  // SIT v4 securityParameters: kundenpasswort, apiKey
  out = out.replace(/<(kundenpasswort)>([^<]*)<\/\1>/g, '<$1>[ANON]</$1>');
  out = out.replace(/<apiKey>([^<]*)<\/apiKey>/g, '<apiKey>[ANON]</apiKey>');
  return out;
}

/** Namespace für ELDA v4 TransferService (senden) – laut Server-Fehlermeldung. */
const ELDA_V4_NS = 'http://v4.transfer.ws.elda.at/';
const SOAP_ENV_NS = 'http://schemas.xmlsoap.org/soap/envelope/';

/**
 * Baut den SOAP-Envelope für ELDA v4 senden (laut offizieller Schnittstellenbeschreibung).
 * arg0 enthält: securityParameters (nonce, created, seriennummer, kundenpasswort SHA512, apiKey) + dateiName + payload (Base64).
 * @param {string} honorarnotenXml - Rohe n1:honorarnotenMeldung-XML
 * @param {string} seriennummer - Seriennummer (z.B. 800062)
 * @param {string} kundenpasswortPlain - ELDA-Kundenpasswort (wird SHA512 hex lowercase gesendet)
 * @param {string} apiKey - API-Key
 * @param {string} dateiName - Dateiname (max 255 Zeichen, z.B. honorarnote_20260128.xml)
 * @returns {string} SOAP-XML
 */
function buildSitV4SoapEnvelope(honorarnotenXml, seriennummer, kundenpasswortPlain, apiKey, dateiName) {
  const xmlUtf8 = String(honorarnotenXml).replace(/^\uFEFF/, '');
  const payloadBase64 = Buffer.from(xmlUtf8, 'utf8').toString('base64');
  const nonce = crypto.randomUUID();
  const created = new Date().toISOString().replace(/\.\d{3}/, '.000'); // yyyy-MM-dd'T'HH:mm:ss.000'Z'
  const kundenpasswort = crypto.createHash('sha512').update(String(kundenpasswortPlain || ''), 'utf8').digest('hex');
  const escape = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<soap:Envelope xmlns:soap="${SOAP_ENV_NS}" xmlns:ns2="${ELDA_V4_NS}">`,
    '  <soap:Body>',
    '    <ns2:senden>',
    '      <arg0>',
    '        <securityParameters>',
    `          <apiKey>${escape(apiKey)}</apiKey>`,
    `          <created>${escape(created)}</created>`,
    `          <kundenpasswort>${escape(kundenpasswort)}</kundenpasswort>`,
    `          <nonce>${escape(nonce)}</nonce>`,
    `          <seriennummer>${escape(seriennummer)}</seriennummer>`,
    '        </securityParameters>',
    `        <dateiName>${escape(dateiName)}</dateiName>`,
    `        <payload>${escape(payloadBase64)}</payload>`,
    '      </arg0>',
    '    </ns2:senden>',
    '  </soap:Body>',
    '</soap:Envelope>'
  ].join('\n');
}

/** Schreibt Log-File des letzten gescheiterten ELDA-SIT-Requests. */
async function writeEldaSitFailedRequestLog(options) {
  const {
    requestUrl,
    requestHeaders,
    requestBody,
    responseStatus,
    responseHeaders,
    responseBody,
    timestamp
  } = options;
  const logDir = path.join(__dirname, '../../../docs/logs');
  const logPath = path.join(logDir, 'ELDA_SIT_LAST_FAILED_REQUEST.log');
  const headersForLog = { ...requestHeaders };
  if (headersForLog.Authorization) headersForLog.Authorization = 'Basic ***';
  const anonymizedBody = anonymizeXmlForLog(requestBody);
  const lines = [
    '# ELDA-SIT – Letzter gescheiterter Request',
    `# Erstellt: ${timestamp || new Date().toISOString()}`,
    '',
    '## Request',
    `URL: ${requestUrl}`,
    '',
    '### HTTP-Request-Header',
    ...Object.entries(headersForLog).map(([k, v]) => `${k}: ${v}`),
    '',
    '### Request-Body (XML, anonymisiert)',
    '```xml',
    anonymizedBody,
    '```',
    '',
    '## Response',
    `Status: ${responseStatus}`,
    '',
    '### HTTP-Response-Header',
    ...(responseHeaders && typeof responseHeaders === 'object'
      ? Object.entries(responseHeaders).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      : ['(nicht verfügbar)']),
    '',
    '### Response-Body',
    '```',
    typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2),
    '```'
  ];
  try {
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(logPath, lines.join('\n'), 'utf8');
    console.warn('[ELDA] Log geschrieben:', logPath);
  } catch (e) {
    console.warn('[ELDA] Log-File konnte nicht geschrieben werden:', e.message);
  }
}

class ELDAConnector {
  constructor() {
    // Konfiguration wird beim Erstellen geladen
    this.updateConfig();
  }
  
  /**
   * Aktualisiert die Konfiguration (wichtig für dynamische Umgebungsvariablen)
   */
  updateConfig() {
    this.config = eldaConfig.getActiveConfig();
    this.method = this.config.defaultMethod;
    
    // HTTPS-Agent für Webservice (mit Zertifikaten falls vorhanden)
    // WICHTIG: Erstelle neuen Agent, da sich die Konfiguration geändert haben könnte
    this.httpsAgent = this.createHttpsAgent();
  }
  
  /**
   * Erstellt HTTPS-Agent mit Zertifikaten
   * WICHTIG: Für SIT-Umgebung werden KEINE Client-Zertifikate verwendet (nur Basic Auth)
   */
  createHttpsAgent() {
    const env = this.config.environment;
    
    // Für SIT: Keine Client-Zertifikate, nur Basic Auth
    if (env === 'sit') {
      return new https.Agent({
        rejectUnauthorized: true, // Prüfe Server-Zertifikat
        keepAlive: false,
        // Erlaube alle TLS-Versionen
        secureProtocol: 'TLSv1_2_method'
      });
    }
    
    // Für Test/Production: Client-Zertifikate falls vorhanden
    if (!eldaConfig.hasCertificates()) {
      return new https.Agent({ 
        rejectUnauthorized: true,
        keepAlive: false
      });
    }
    
    try {
      const cert = fsSync.readFileSync(eldaConfig.certificates.certPath);
      const key = fsSync.readFileSync(eldaConfig.certificates.keyPath);
      
      return new https.Agent({
        cert,
        key,
        rejectUnauthorized: true,
        keepAlive: false
      });
    } catch (error) {
      console.warn('⚠️ ELDA-Zertifikate konnten nicht geladen werden:', error.message);
      return new https.Agent({ 
        rejectUnauthorized: true,
        keepAlive: false
      });
    }
  }
  
  /**
   * Sendet Daten an ELDA
   * @param {object} payload - ELDA-Datensatz (roh oder bereits formatiert)
   * @param {string} datasetType - Datensatztyp (z.B. 'KSB', 'Lohnmeldung', 'Abrechnung')
   * @param {string} method - Übertragungsmethode ('ftps' oder 'webservice'), optional
   * @param {boolean} autoFormat - Automatisch ELDA-Format generieren (default: true)
   * @returns {Promise<object>} ELDA-Response
   */
  async send(payload, datasetType, method = null, autoFormat = true) {
    const transferMethod = method || this.method;
    
    try {
      let formattedPayload = payload;
      
      // Automatische Format-Generierung wenn aktiviert
      if (autoFormat) {
        // Validiere Datensatz
        const validation = eldaFormatGenerator.validateDataset(payload, datasetType);
        if (!validation.valid) {
          throw new Error(`Datensatz-Validierung fehlgeschlagen: ${validation.errors.join(', ')}`);
        }
        
        // Generiere ELDA-Format
        switch (datasetType.toUpperCase()) {
          case 'KSB':
            formattedPayload = eldaFormatGenerator.generateKSB(payload);
            break;
          case 'LOHNMEDLUNG':
            formattedPayload = eldaFormatGenerator.generateLohnmeldung(payload);
            break;
          case 'ABRECHNUNG':
            formattedPayload = eldaFormatGenerator.generateAbrechnung(payload);
            break;
          default:
            // Verwende Payload wie übergeben
            formattedPayload = payload;
        }
      }
      
      // Validiere Payload-Größe
      const payloadSize = JSON.stringify(formattedPayload).length;
      const limit = transferMethod === 'ftps' 
        ? this.config.limits.ftps 
        : this.config.limits.https;
      
      if (payloadSize > limit) {
        throw new Error(`Payload zu groß: ${payloadSize} bytes (Limit: ${limit} bytes)`);
      }
      
      // Wähle Übertragungsmethode
      if (transferMethod === 'webservice') {
        return await this.sendViaWebservice(formattedPayload, datasetType);
      } else {
        return await this.sendViaFTPS(formattedPayload, datasetType);
      }
    } catch (error) {
      console.error('ELDA-Connector Fehler:', error);
      throw new Error(`ELDA-Übertragung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Sendet Daten via FTPS
   */
  async sendViaFTPS(payload, datasetType) {
    if (!this.config.ftps.enabled) {
      throw new Error('FTPS ist für diese Umgebung nicht verfügbar');
    }
    
    const client = new ftp.Client(this.config.timeout.ftps);
    let tempFilePath = null;
    
    try {
      // Erstelle temporäre Datei
      const fileName = this.generateFileName(datasetType);
      tempFilePath = path.join(__dirname, '../../temp', fileName);
      
      // Stelle sicher, dass temp-Verzeichnis existiert
      const tempDir = path.dirname(tempFilePath);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Schreibe Payload in Datei (XML-Format)
      const xmlContent = this.convertToXML(payload, datasetType);
      await fs.writeFile(tempFilePath, xmlContent, 'utf8');
      
      // Prüfe Dateigröße
      const stats = await fs.stat(tempFilePath);
      if (stats.size > this.config.limits.ftps) {
        throw new Error(`Datei zu groß: ${stats.size} bytes (Limit: ${this.config.limits.ftps} bytes)`);
      }
      
      // Verbinde mit FTPS-Server
      await client.access({
        host: this.config.ftps.host,
        port: this.config.ftps.port,
        user: this.config.credentials.username,
        password: this.config.credentials.password,
        secure: true,
        secureOptions: {
          rejectUnauthorized: true
        }
      });
      
      // Lade Datei hoch
      await client.uploadFrom(tempFilePath, fileName);
      
      // Schließe Verbindung
      client.close();
      
      // Lösche temporäre Datei
      await fs.unlink(tempFilePath);
      
      return {
        success: true,
        method: 'ftps',
        fileName,
        message: 'Daten erfolgreich via FTPS übertragen',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // Lösche temporäre Datei bei Fehler
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.warn('Fehler beim Löschen der temporären Datei:', unlinkError);
        }
      }
      
      // Schließe Verbindung bei Fehler
      try {
        client.close();
      } catch (closeError) {
        // Ignoriere Fehler beim Schließen
      }
      
      throw error;
    }
  }
  
  /**
   * Sendet Daten via Webservice
   */
  async sendViaWebservice(payload, datasetType) {
    // WICHTIG: Aktualisiere Config vor jedem Request, falls Umgebungsvariablen geändert wurden
    this.updateConfig();
    
    if (!this.config.webservice.enabled) {
      throw new Error('Webservice ist für diese Umgebung nicht verfügbar');
    }
    
    // SIT-Plattform verwendet Seriennummer/Passwort statt API-Key
    const isSIT = this.config.environment === 'sit';
    
    if (isSIT) {
      const sitApiKey = this.config.sit?.apiKey ?? this.config.apiKey;
      if (!this.config.sit?.seriennummer || !this.config.sit?.passwort) {
        throw new Error('ELDA-Seriennummer und Passwort für SIT fehlen');
      }
      if (!sitApiKey) {
        throw new Error('ELDA API-Key für SIT v4 fehlt (ELDA_SIT_API_KEY oder ELDA_API_KEY)');
      }
    } else {
      if (!this.config.apiKey) {
        throw new Error('ELDA API-Key fehlt');
      }
    }
    
    try {
      // Konvertiere Payload zu XML (oder verwende direkt, wenn bereits XML)
      let xmlContent;
      try {
        // Payload bereits fertiges XML? (WAHonline liefert String; nie durch convertToXML jagen – sonst <0>,<1>,…)
        const raw = typeof payload === 'string' ? payload : '';
        const trimmed = raw.trim().replace(/^\uFEFF/, '');
        const looksLikeXml =
          raw.length > 0 &&
          (trimmed.startsWith('<?xml') ||
            trimmed.startsWith('<') ||
            (datasetType === 'WA' &&
              (trimmed.includes('honorarnotenMeldung') ||
                trimmed.includes('<n1:WahOnlineAnfrage') ||
                trimmed.includes('WahOnlineAnfrage'))));
        if (typeof payload === 'string' && looksLikeXml) {
          xmlContent = payload;
        } else {
          xmlContent = this.convertToXML(payload, datasetType);
        }
        
        // Validiere XML-Content
        if (!xmlContent || xmlContent.trim().length === 0) {
          throw new Error('XML-Content ist leer nach Konvertierung');
        }
        
        // Log XML-Content für Debugging (nur erste 500 Zeichen)
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug(`[ELDA] XML-Content (erste 500 Zeichen):\n${xmlContent.substring(0, 500)}`);
        }
      } catch (xmlError) {
        console.error('[ELDA] XML-Generierung fehlgeschlagen:', xmlError.message);
        if (typeof payload === 'string') {
          console.error('[ELDA] Payload (erste 500 Zeichen):', payload.substring(0, 500));
        } else {
          console.error('[ELDA] Payload:', JSON.stringify(payload, null, 2).substring(0, 1000));
        }
        throw new Error(`XML-Generierung fehlgeschlagen: ${xmlError.message}`);
      }
      
      // SIT v4: SOAP-Envelope mit Base64-kodierter Honorarnoten-XML (SendenRequest: absender, passwort, apiKey, inhalt)
      let requestBody = xmlContent;
      if (isSIT) {
        // BOM entfernen, strikt UTF-8 (keine Byte-Order-Mark vor Base64)
        xmlContent = xmlContent.replace(/^\uFEFF/, '');
        // Support-Vorgabe: XML-Deklaration im Base64-String belassen (nicht entfernen)
        const firstLine = xmlContent.split('\n')[0] || '';
        console.log('[ELDA] Honorarnoten-XML (vor Base64) – erste Zeile (Deklaration/Root):', firstLine);
        console.log('[ELDA] Honorarnoten-XML komplett (mit XML-Header):');
        console.log(xmlContent);
        const sitApiKey = this.config.sit?.apiKey ?? this.config.apiKey;
        const seriennummer = (this.config.sit?.seriennummer || '800062').replace(/[^0-9]/g, '') || '800062';
        const dateiName = `WA${seriennummer}.xml`;
        requestBody = buildSitV4SoapEnvelope(
          xmlContent,
          this.config.sit.seriennummer,
          this.config.sit.passwort,
          sitApiKey,
          dateiName
        );
      }
      
      // Headers für SIT v4 (SOAP) oder normale Umgebung
      const headers = {
        'Content-Type': isSIT ? 'text/xml; charset=utf-8' : 'application/xml; charset=UTF-8',
        'X-Dataset-Type': datasetType
      };
      
      if (isSIT) {
        // SIT v4: HTTP Basic Auth (Seriennummer:Passwort) – SIT erwartet oft Basic Auth zusätzlich zu SOAP securityParameters
        const basicCredentials = Buffer.from(
          `${String(this.config.sit.seriennummer)}:${String(this.config.sit.passwort)}`,
          'utf8'
        ).toString('base64');
        headers['Authorization'] = `Basic ${basicCredentials}`;
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug(`[ELDA SIT v4] Sende Request an: ${this.config.webservice.baseUrl}`);
          console.debug(`[ELDA SIT v4] Seriennummer: ${this.config.sit.seriennummer}`);
          console.debug(`[ELDA SIT v4] SOAP-Body-Größe: ${requestBody.length} bytes`);
        }
      } else {
        // Test/Production: Bearer Token mit API-Key
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      const requestConfig = {
        headers,
        timeout: this.config.timeout.webservice,
        httpsAgent: this.httpsAgent,
        maxContentLength: this.config.limits.https,
        maxBodyLength: this.config.limits.https,
        validateStatus: (status) => status >= 200 && status < 600
      };
      
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug('[ELDA] Request-URL:', this.config.webservice.baseUrl);
        console.debug('[ELDA] Request-Headers:', JSON.stringify(headers, null, 2));
        console.debug('[ELDA] Body-Länge:', requestBody.length, 'bytes');
      }
      
      const response = await axios.post(
        this.config.webservice.baseUrl,
        requestBody,
        requestConfig
      );
      
      const responseData = response.data;
      let isError = false;
      let errorMessage = null;
      let errorDetails = null;
      
      // v4 SendenResult: HTTP 200, aber statusCode im Body (558 = Credentials falsch, 403/405 etc.)
      if (!isError && typeof responseData === 'string' && responseData.includes('sendenResponse') && responseData.includes('statusCode')) {
        const statusCodeMatch = responseData.match(/<statusCode>([^<]*)<\/statusCode>/i);
        const statusCode = statusCodeMatch ? statusCodeMatch[1].trim() : null;
        const okCodes = ['000'];
        if (statusCode && !okCodes.includes(statusCode)) {
          isError = true;
          // Alle Inhalte zwischen <messages> und </messages> extrahieren (oft Klartext wie „Feld X hat ungültiges Format“)
          const messagesMatches = responseData.match(/<messages>([\s\S]*?)<\/messages>/gi);
          const messages = messagesMatches
            ? messagesMatches.map((m) => m.replace(/<\/?messages>/gi, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()).filter(Boolean)
            : [];
          errorMessage = messages[0] || `ELDA StatusCode ${statusCode}`;
          if (messages.length > 1) {
            errorDetails = messages.slice(1).join('; ');
          }
          console.warn('[ELDA] SendenResult Fehler – statusCode:', statusCode);
          if (messages.length) {
            console.warn('[ELDA] Alle <messages>-Inhalte der SOAP-Antwort (einzeln – oft „Feld X hat ungültiges Format“):');
            messages.forEach((msg, i) => {
              const lines = String(msg).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
              if (lines.length > 1) {
                lines.forEach((line, j) => console.warn(`  [ELDA] <messages> Nr.${i + 1}, Zeile ${j + 1}: ${line}`));
              } else {
                console.warn(`  [ELDA] <messages> Nr.${i + 1}: ${msg}`);
              }
            });
          } else {
            const serviceResultMatch = responseData.match(/<serviceResult>[\s\S]*?<\/serviceResult>/i);
            if (serviceResultMatch) {
              console.warn('[ELDA] <serviceResult>-Block (Rohtext):', serviceResultMatch[0]);
            }
          }
          if (messages.some((m) => String(m).includes('WA001'))) {
            console.warn('[ELDA] Hinweis WA001: In den obigen <messages> steht oft im Klartext, welches Feld ungültig ist (z.B. „Feld X hat ungültiges Format“).');
            console.warn('[ELDA] Vollständige SOAP-Antwort in Log-Datei – dort nach weiteren <messages>-Einträgen oder Fehlerdetails suchen.');
          }
          if (this.config.environment === 'sit') {
            await writeEldaSitFailedRequestLog({
              requestUrl: this.config.webservice.baseUrl,
              requestHeaders: requestConfig.headers,
              requestBody,
              responseStatus: response.status,
              responseHeaders: response.headers,
              responseBody: responseData,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      // SOAP Fault (v4 Fehlerantwort als XML)
      if (typeof responseData === 'string' && (responseData.includes('soap:Fault') || responseData.includes('<Fault>'))) {
        isError = true;
        const faultStringMatch = responseData.match(/<faultstring[^>]*>([^<]*)<\/faultstring>/i) ||
          responseData.match(/<faultstring>([^<]*)<\/faultstring>/i);
        const faultCodeMatch = responseData.match(/<faultcode[^>]*>([^<]*)<\/faultcode>/i);
        const detailMatch = responseData.match(/<detail[^>]*>([\s\S]*?)<\/detail>/i);
        const decode = (s) => (s || '').trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        errorMessage = faultStringMatch && faultStringMatch[1] ? decode(faultStringMatch[1]) : 'SOAP Fault';
        if (faultCodeMatch && faultCodeMatch[1]) {
          errorDetails = `faultcode: ${decode(faultCodeMatch[1])}`;
        }
        if (detailMatch && detailMatch[1]) {
          const detailText = detailMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (detailText) {
            errorDetails = (errorDetails ? errorDetails + ' | ' : '') + `detail: ${detailText}`;
          }
        }
        if (this.config.environment === 'sit') {
          await writeEldaSitFailedRequestLog({
            requestUrl: this.config.webservice.baseUrl,
            requestHeaders: requestConfig.headers,
            requestBody,
            responseStatus: response.status,
            responseHeaders: response.headers,
            responseBody: responseData,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // HTML-Antwort (ältere Fehlermeldung)
      if (!isError && typeof responseData === 'string' && responseData.includes('<HTML>')) {
        // HTML-Antwort bedeutet meistens einen Fehler
        isError = true;
        
        // Extrahiere Fehlermeldung aus HTML (verschiedene Patterns)
        let errorMatch = responseData.match(/<CENTER><P>&nbsp;<P>&nbsp;<P>(.*?)<\/CENTER>/i);
        if (!errorMatch) {
          errorMatch = responseData.match(/<FONT[^>]*>(.*?)<\/FONT>/i);
        }
        if (!errorMatch) {
          errorMatch = responseData.match(/<BODY[^>]*>(.*?)<\/BODY>/is);
        }
        
        if (errorMatch && errorMatch[1]) {
          errorMessage = errorMatch[1]
            .replace(/<[^>]+>/g, '') // Entferne HTML-Tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
        }
        
        // Suche nach spezifischen Fehlermeldungen
        if (!errorMessage || errorMessage === 'unbekannter Fehler') {
          const specificErrors = [
            /(?:Fehlercode|Error Code|Fehler-Code)[:\s]*(\d+)/i,
            /(?:Fehlermeldung|Error Message)[:\s]*(.+?)(?:<|$)/i,
            /(?:Beschreibung|Description)[:\s]*(.+?)(?:<|$)/i
          ];
          
          for (const pattern of specificErrors) {
            const match = responseData.match(pattern);
            if (match && match[1]) {
              errorDetails = match[1].trim();
              break;
            }
          }
        }
        
        // Log für Debugging (immer, nicht nur bei debug)
        console.warn('[ELDA] ⚠️ Server antwortet mit HTML-Fehlermeldung');
        console.warn('[ELDA] Extrahiert:', errorMessage || 'Keine Fehlermeldung gefunden');
        if (errorDetails) {
          console.warn('[ELDA] Details:', errorDetails);
        }
        
        // Immer das gesendete Body loggen (SIT: SOAP, sonst XML)
        console.warn('[ELDA] Gesendeter Body (erste 2000 Zeichen):');
        console.warn(requestBody.substring(0, 2000));
        
        console.warn('[ELDA] Vollständige HTML-Antwort vom Server:');
        console.warn(responseData);
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('[ELDA] Vollständiger Body:', requestBody);
        }

        // Log-File des letzten gescheiterten ELDA-SIT-Requests (SOAP-Envelope inkl. Base64-Inhalt)
        if (this.config.environment === 'sit') {
          await writeEldaSitFailedRequestLog({
            requestUrl: this.config.webservice.baseUrl,
            requestHeaders: headers,
            requestBody,
            responseStatus: response.status,
            responseHeaders: response.headers,
            responseBody: responseData,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (isError) {
        const fullErrorMessage = errorMessage 
          ? `ELDA-Server-Fehler: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`
          : 'ELDA-Server-Fehler: Unbekannter Fehler (HTML-Antwort erhalten)';
        throw new Error(fullErrorMessage);
      }

      // Erfolg: statusCode und protokollnummer aus SendenResponse extrahieren (für WAHonline-Sync-Status)
      let statusCode = null;
      let protokollnummer = null;
      if (typeof responseData === 'string' && responseData.includes('sendenResponse')) {
        const statusCodeMatch = responseData.match(/<statusCode>([^<]*)<\/statusCode>/i);
        statusCode = statusCodeMatch ? statusCodeMatch[1].trim() : null;
        const protokollMatch = responseData.match(/<protokollnummer>([^<]*)<\/protokollnummer>/i);
        protokollnummer = protokollMatch ? protokollMatch[1].trim() : null;
      }

      return {
        success: true,
        method: 'webservice',
        environment: this.config.environment,
        status: response.status,
        statusCode: statusCode || '000',
        protokollnummer: protokollnummer || undefined,
        data: responseData,
        message: 'Daten erfolgreich via Webservice übertragen',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // Detaillierte Fehlerbehandlung
      if (error.response) {
        // Server hat geantwortet, aber mit Fehler
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        let errorMessage = `ELDA-Webservice Fehler: ${status} - ${statusText}`;
        if (responseData) {
          if (typeof responseData === 'string') {
            errorMessage += `\nAntwort: ${responseData.substring(0, 500)}`;
          } else if (responseData.message) {
            errorMessage += `\nFehler: ${responseData.message}`;
          }
        }
        
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request wurde gesendet, aber keine Antwort erhalten
        const errorDetails = [];
        errorDetails.push('Keine Antwort vom ELDA-Webservice');
        errorDetails.push(`URL: ${this.config.webservice.baseUrl}`);
        errorDetails.push(`Timeout: ${this.config.timeout.webservice}ms`);
        errorDetails.push(`Umgebung: ${this.config.environment}`);
        
        if (error.code) {
          errorDetails.push(`Fehlercode: ${error.code}`);
        }
        if (error.message) {
          errorDetails.push(`Details: ${error.message}`);
        }
        
        // Prüfe ob es ein Netzwerk-Problem ist
        if (error.code === 'ECONNREFUSED') {
          errorDetails.push('Verbindung verweigert - Server möglicherweise nicht erreichbar');
          errorDetails.push('Hinweis: Prüfen Sie, ob der SIT-Server erreichbar ist');
        } else if (error.code === 'ETIMEDOUT') {
          errorDetails.push(`Timeout - Server antwortet nicht innerhalb von ${this.config.timeout.webservice}ms`);
          errorDetails.push('Hinweis: Der Server könnte überlastet sein oder die Anfrage wird nicht verarbeitet');
        } else if (error.code === 'ENOTFOUND') {
          errorDetails.push('DNS-Fehler - Server-Adresse nicht gefunden');
          errorDetails.push(`Prüfen Sie die URL: ${this.config.webservice.baseUrl}`);
        } else if (error.code === 'ECONNRESET') {
          errorDetails.push('Verbindung wurde vom Server zurückgesetzt');
          errorDetails.push('Hinweis: Möglicherweise wird das XML-Format nicht akzeptiert');
        } else if (error.code === 'EPROTO') {
          errorDetails.push('TLS/SSL-Protokollfehler');
          errorDetails.push('Hinweis: Prüfen Sie die Zertifikatskonfiguration');
        }
        
        // Zusätzliche Debug-Informationen
        if (process.env.LOG_LEVEL === 'debug') {
          console.error('[ELDA] Request-Objekt:', {
            method: error.request.method,
            path: error.request.path,
            host: error.request.host,
            headers: error.request.headers
          });
        }
        
        throw new Error(errorDetails.join('\n'));
      } else {
        // Fehler beim Erstellen des Requests
        throw new Error(`Fehler beim Erstellen des Requests: ${error.message}`);
      }
    }
  }
  
  /**
   * Generiert Dateinamen für FTPS-Übertragung
   */
  generateFileName(datasetType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `ELDA_${datasetType}_${timestamp}.xml`;
  }
  
  /**
   * Konvertiert Payload zu XML-Format
   * Verwendet ELDA-Format-Generator für korrekte XML-Generierung
   */
  convertToXML(payload, datasetType) {
    return eldaFormatGenerator.generateXML(payload, datasetType);
  }
  
  /**
   * Konvertiert Objekt zu XML-Elementen (vereinfacht)
   */
  objectToXML(obj, indent = 2) {
    const spaces = ' '.repeat(indent);
    const lines = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (Array.isArray(value)) {
        value.forEach(item => {
          lines.push(`${spaces}<${key}>`);
          if (typeof item === 'object') {
            lines.push(this.objectToXML(item, indent + 2));
          } else {
            lines.push(`${spaces}  ${this.escapeXML(String(item))}`);
          }
          lines.push(`${spaces}</${key}>`);
        });
      } else if (typeof value === 'object') {
        lines.push(`${spaces}<${key}>`);
        lines.push(this.objectToXML(value, indent + 2));
        lines.push(`${spaces}</${key}>`);
      } else {
        lines.push(`${spaces}<${key}>${this.escapeXML(String(value))}</${key}>`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Escaped XML-Sonderzeichen
   */
  escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Testet die Verbindung
   */
  async testConnection(method = null) {
    let testMethod = method || this.method;
    
    // Für SIT: Immer Webservice verwenden (FTPS nicht verfügbar)
    if (this.config.environment === 'sit') {
      testMethod = 'webservice';
    } else if (testMethod === 'auto') {
      // Für andere Umgebungen: Auto auflösen
      testMethod = eldaConfig.getDefaultMethod();
    }
    
    try {
      if (testMethod === 'webservice') {
        return await this.testWebserviceConnection();
      } else if (testMethod === 'ftps') {
        return await this.testFTPSConnection();
      } else {
        throw new Error(`Unbekannte Methode: ${testMethod}`);
      }
    } catch (error) {
      return {
        success: false,
        method: testMethod,
        error: error.message
      };
    }
  }
  
  /**
   * Testet FTPS-Verbindung
   */
  async testFTPSConnection() {
    // Prüfe ob FTPS verfügbar ist
    if (!this.config.ftps.enabled) {
      throw new Error('FTPS ist für diese Umgebung nicht verfügbar');
    }
    
    // Validiere Port (darf nicht null sein)
    if (!this.config.ftps.port) {
      throw new Error('FTPS-Port ist nicht konfiguriert');
    }
    
    if (!this.config.ftps.host) {
      throw new Error('FTPS-Host ist nicht konfiguriert');
    }
    
    const client = new ftp.Client(this.config.timeout.ftps);
    
    try {
      await client.access({
        host: this.config.ftps.host,
        port: this.config.ftps.port,
        user: this.config.credentials.username,
        password: this.config.credentials.password,
        secure: true,
        secureOptions: {
          rejectUnauthorized: true
        }
      });
      
      client.close();
      
      return {
        success: true,
        method: 'ftps',
        message: 'FTPS-Verbindung erfolgreich'
      };
    } catch (error) {
      try {
        client.close();
      } catch (closeError) {
        // Ignoriere Fehler beim Schließen
      }
      
      throw error;
    }
  }
  
  /**
   * Testet Webservice-Verbindung
   */
  async testWebserviceConnection() {
    if (!this.config.webservice.enabled) {
      throw new Error('Webservice ist für diese Umgebung nicht verfügbar');
    }
    
    // SIT-Plattform verwendet Basic Auth statt Bearer Token
    const isSIT = this.config.environment === 'sit';
    
    try {
      // Für SIT: Teste mit Basic Auth
      if (isSIT) {
        if (!this.config.sit?.seriennummer || !this.config.sit?.passwort) {
          throw new Error('ELDA-Seriennummer und Passwort für SIT fehlen');
        }
        
        // Erstelle Basic Auth Header
        const credentials = Buffer.from(`${this.config.sit.seriennummer}:${this.config.sit.passwort}`).toString('base64');
        
        // Versuche einfachen Test-Request (kann fehlschlagen, aber zeigt ob Verbindung möglich ist)
        try {
          const response = await axios.get(
            this.config.webservice.baseUrl,
            {
              headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/xml'
              },
              timeout: this.config.timeout.webservice,
              httpsAgent: this.httpsAgent,
              validateStatus: () => true // Akzeptiere alle Status-Codes
            }
          );
          
          return {
            success: true,
            method: 'webservice',
            environment: 'sit',
            status: response.status,
            message: 'Webservice-Verbindung (SIT) erfolgreich',
            url: this.config.webservice.baseUrl
          };
        } catch (testError) {
          // Auch wenn Request fehlschlägt, Verbindung ist möglich (nur Endpunkt nicht verfügbar)
          if (testError.code === 'ECONNREFUSED' || testError.code === 'ETIMEDOUT') {
            throw new Error(`Verbindung zum Webservice fehlgeschlagen: ${testError.message}`);
          }
          
          // Andere Fehler (z.B. 404, 401) bedeuten, dass Verbindung funktioniert
          return {
            success: true,
            method: 'webservice',
            environment: 'sit',
            status: testError.response?.status || 'unknown',
            message: 'Webservice-Verbindung (SIT) erfolgreich (Endpunkt antwortet)',
            url: this.config.webservice.baseUrl,
            note: 'Test-Endpunkt möglicherweise nicht verfügbar, aber Verbindung funktioniert'
          };
        }
      }
      
      // Für Test/Production: Verwende Bearer Token
      if (!this.config.apiKey) {
        throw new Error('ELDA API-Key fehlt');
      }
      
      // Sende Test-Request
      const response = await axios.get(
        this.config.webservice.baseUrl.replace('/servlet/WebTrans', '/status'),
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: this.config.timeout.webservice,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        method: 'webservice',
        status: response.status,
        message: 'Webservice-Verbindung erfolgreich'
      };
    } catch (error) {
      // Falls Status-Endpunkt nicht existiert, versuche Haupt-Endpunkt
      try {
        await axios.post(
          this.config.webservice.baseUrl,
          '<?xml version="1.0"?><test/>',
          {
            headers: {
              'Content-Type': 'application/xml',
              'Authorization': `Bearer ${this.config.apiKey}`
            },
            timeout: this.config.timeout.webservice,
            httpsAgent: this.httpsAgent,
            validateStatus: () => true // Akzeptiere alle Status-Codes
          }
        );
        
        return {
          success: true,
          method: 'webservice',
          message: 'Webservice-Endpunkt erreichbar'
        };
      } catch (testError) {
        throw new Error(`Webservice-Verbindung fehlgeschlagen: ${testError.message}`);
      }
    }
  }
  
  /**
   * Gibt verfügbare Übertragungsmethoden zurück
   */
  getAvailableMethods() {
    const methods = [];
    
    if (this.config.ftps.enabled) {
      methods.push('ftps');
    }
    
    if (this.config.webservice.enabled) {
      // Prüfe ob Produktivumgebung und Datum erreicht
      if (this.config.environment === 'production') {
        const now = new Date();
        if (now >= this.config.webservice.activationDate) {
          methods.push('webservice');
        }
      } else {
        // Test/SIT: Webservice ist bereits verfügbar
        methods.push('webservice');
      }
    }
    
    return methods;
  }
}

module.exports = new ELDAConnector();

