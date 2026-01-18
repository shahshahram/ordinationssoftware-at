# SIT-Plattform: ECONNRESET Problem

## Problem

Bei Verbindungsversuchen zur SIT-Plattform (`https://online-itu5test.elda.at/elda-online/servlet/WebTrans`) wird der Fehler `ECONNRESET` (Connection Reset) zurückgegeben.

## Symptome

- Alle HTTP-Requests (GET, POST) schlagen fehl mit `ECONNRESET`
- Die Verbindung wird hergestellt, aber sofort vom Server zurückgesetzt
- Keine Antwort vom Server

## Mögliche Ursachen

### 1. Client-Zertifikate werden verwendet (obwohl nicht benötigt)

**Problem:** Der ELDA-Connector versucht möglicherweise, Client-Zertifikate zu verwenden, obwohl die SIT-Plattform nur Basic Auth benötigt.

**Lösung:** Der `createHttpsAgent()` wurde angepasst, um für SIT-Umgebung **keine** Client-Zertifikate zu verwenden.

### 2. TLS/SSL-Handshake schlägt fehl

**Problem:** Der Server akzeptiert möglicherweise nicht die verwendete TLS-Version oder Cipher-Suite.

**Lösung:** Der HTTPS-Agent wurde angepasst, um `TLSv1_2_method` zu verwenden.

### 3. Server blockiert Verbindungen

**Problem:** Der Server blockiert möglicherweise Verbindungen aus Sicherheitsgründen (z.B. IP-Whitelist, Rate-Limiting).

**Lösung:** 
- Prüfen Sie, ob Ihre IP-Adresse erlaubt ist
- Prüfen Sie, ob es Rate-Limiting gibt
- Kontaktieren Sie ELDA-Support

### 4. Firewall/Proxy blockiert Verbindung

**Problem:** Eine Firewall oder ein Proxy blockiert möglicherweise die Verbindung.

**Lösung:**
- Prüfen Sie Firewall-Einstellungen
- Prüfen Sie Proxy-Konfiguration
- Testen Sie von einem anderen Netzwerk aus

## Implementierte Lösungen

### 1. HTTPS-Agent für SIT angepasst

Der `createHttpsAgent()` wurde so angepasst, dass für SIT-Umgebung:
- **Keine** Client-Zertifikate verwendet werden
- Nur Basic Auth verwendet wird
- TLS 1.2 verwendet wird
- `keepAlive` deaktiviert ist

### 2. Test-Script verbessert

Das Test-Script (`backend/scripts/test-elda-sit-connection.js`) wurde verbessert, um:
- Detailliertere Fehlermeldungen zu zeigen
- Spezifische Hinweise für `ECONNRESET` zu geben
- HTTPS-Agent mit korrekten Optionen zu verwenden

## Nächste Schritte

### 1. Backend-Server neu starten

```bash
cd backend
# Server stoppen (Ctrl+C)
npm start
```

### 2. Test-Script erneut ausführen

```bash
cd backend
node scripts/test-elda-sit-connection.js
```

### 3. Prüfen Sie die Backend-Logs

Aktivieren Sie Debug-Logging in `backend/.env`:
```bash
LOG_LEVEL=debug
```

### 4. Kontaktieren Sie ELDA-Support

Falls das Problem weiterhin besteht:
- Kontaktieren Sie den ELDA-Support
- Fragen Sie nach:
  - IP-Whitelist-Anforderungen
  - Rate-Limiting
  - Spezifische TLS/SSL-Anforderungen
  - Client-Zertifikat-Anforderungen (falls doch benötigt)

## Weitere Informationen

- Siehe auch: `docs/SIT_PLATTFORM_ANALYSE.md`
- Siehe auch: `docs/SIT_TEST_ANLEITUNG.md`
- Siehe auch: `docs/SIT_TROUBLESHOOTING.md`
