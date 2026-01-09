# Kassenabrechnung - Nachrichtenformat

Dieses Dokument beschreibt das Format der Nachrichten, die an die Kassen-API gesendet werden.

## Übersicht

Die Leistungsabrechnung an die Krankenkasse erfolgt über eine REST-API mit JSON-Payload. Die Nachricht enthält ELGA-Daten, Leistungsdaten, Arztdaten und Metadaten.

## API-Endpunkt

```
POST {KASSA_API_URL}/api/v1/billing/submit
```

### Headers

```
Authorization: Bearer {API_KEY}
Content-Type: application/json
X-Idempotency-Key: {idempotencyKey}
X-Source: ordinationssoftware
```

## Nachrichtenstruktur

### 1. Kassenarzt-Abrechnung (KASSE)

```json
{
  "elga": {
    "patientId": "1234567890123",
    "doctorId": "ATU12345678",
    "timestamp": "2025-12-16T08:36:30.000Z"
  },
  "service": {
    "code": "111",
    "description": "Ordinationskonsultation",
    "datetime": "2025-12-16T10:00:00.000Z",
    "price": 35.00,
    "copay": 5.00
  },
  "doctor": {
    "taxNumber": "ATU12345678",
    "chamberNumber": "12345",
    "specialization": "Allgemeinmedizin"
  },
  "metadata": {
    "idempotencyKey": "test_1734341790000_abc123xyz",
    "version": "1.0",
    "source": "ordinationssoftware"
  }
}
```

### 2. Wahlarzt-Abrechnung mit Rückerstattungsantrag (PATIENT+KASSE_REFUND)

Für Wahlarzt-Abrechnungen wird zusätzlich ein Rückerstattungsantrag gestellt:

**Hauptabrechnung:**
```json
{
  "elga": {
    "patientId": "1234567890123",
    "doctorId": "ATU12345678",
    "timestamp": "2025-12-16T08:36:30.000Z"
  },
  "service": {
    "code": "111",
    "description": "Ordinationskonsultation",
    "datetime": "2025-12-16T10:00:00.000Z",
    "price": 35.00,
    "copay": 0.00
  },
  "doctor": {
    "taxNumber": "ATU12345678",
    "chamberNumber": "12345",
    "specialization": "Allgemeinmedizin"
  },
  "metadata": {
    "idempotencyKey": "test_1734341790000_abc123xyz",
    "version": "1.0",
    "source": "ordinationssoftware"
  }
}
```

**Rückerstattungsantrag:**
```
POST {KASSA_API_URL}/api/v1/billing/refund
```

```json
{
  "elga": {
    "patientId": "1234567890123",
    "doctorId": "ATU12345678",
    "timestamp": "2025-12-16T08:36:30.000Z"
  },
  "service": {
    "code": "111",
    "description": "Ordinationskonsultation",
    "datetime": "2025-12-16T10:00:00.000Z",
    "price": 35.00,
    "copay": 0.00
  },
  "doctor": {
    "taxNumber": "ATU12345678",
    "chamberNumber": "12345",
    "specialization": "Allgemeinmedizin"
  },
  "refundRequest": {
    "type": "wahlarzt",
    "patientAmount": 35.00,
    "refundAmount": 30.00,
    "reason": "Wahlarztleistung"
  },
  "metadata": {
    "idempotencyKey": "test_refund_1734341790000_abc123xyz",
    "version": "1.0",
    "source": "ordinationssoftware"
  }
}
```

## Feldbeschreibungen

### ELGA-Daten (`elga`)

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `patientId` | String | Sozialversicherungsnummer des Patienten | `"1234567890123"` |
| `doctorId` | String | Steuernummer des Arztes | `"ATU12345678"` |
| `timestamp` | ISO 8601 | Zeitstempel der Abrechnung | `"2025-12-16T08:36:30.000Z"` |

### Leistungsdaten (`service`)

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `code` | String | Leistungscode (z.B. GOÄ, EBM) | `"111"` |
| `description` | String | Beschreibung der Leistung | `"Ordinationskonsultation"` |
| `datetime` | ISO 8601 | Datum/Zeit der Leistungserbringung | `"2025-12-16T10:00:00.000Z"` |
| `price` | Number | Gesamtpreis in EUR | `35.00` |
| `copay` | Number | Selbstbehalt des Patienten in EUR | `5.00` |

### Arztdaten (`doctor`)

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `taxNumber` | String | Steuernummer des Arztes | `"ATU12345678"` |
| `chamberNumber` | String | Kammer-Nummer | `"12345"` |
| `specialization` | String | Fachrichtung | `"Allgemeinmedizin"` |

### Metadaten (`metadata`)

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `idempotencyKey` | String | Eindeutiger Key für Idempotenz | `"test_1734341790000_abc123xyz"` |
| `version` | String | API-Version | `"1.0"` |
| `source` | String | Quelle der Abrechnung | `"ordinationssoftware"` |

### Rückerstattungsantrag (`refundRequest`)

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `type` | String | Typ des Antrags | `"wahlarzt"` |
| `patientAmount` | Number | Vom Patienten zu zahlender Betrag | `35.00` |
| `refundAmount` | Number | Von der Kasse zu erstattender Betrag | `30.00` |
| `reason` | String | Grund für den Antrag | `"Wahlarztleistung"` |

## API-Antwort

### Erfolgreiche Abrechnung

```json
{
  "success": true,
  "referenceNumber": "KASSA-2025-123456",
  "status": "ACCEPTED",
  "message": "Abrechnung erfolgreich verarbeitet",
  "processingTime": 150
}
```

### Abgelehnte Abrechnung

```json
{
  "success": false,
  "referenceNumber": "KASSA-2025-123456",
  "status": "REJECTED",
  "message": "Leistungscode nicht gültig",
  "errorCode": "INVALID_SERVICE_CODE",
  "processingTime": 120
}
```

## Beispiel: Komplette Abrechnung

### Eingabe (vom System)

```javascript
{
  performance: {
    serviceCode: "111",
    serviceDescription: "Ordinationskonsultation",
    serviceDatetime: "2025-12-16T10:00:00.000Z",
    totalPrice: 35.00,
    tariffType: "kassa"
  },
  doctor: {
    taxNumber: "ATU12345678",
    chamberNumber: "12345",
    specialization: "Allgemeinmedizin"
  },
  patient: {
    socialSecurityNumber: "1234567890123",
    insuranceProvider: "ÖGK"
  }
}
```

### Ausgabe (an Kassen-API)

```json
{
  "elga": {
    "patientId": "1234567890123",
    "doctorId": "ATU12345678",
    "timestamp": "2025-12-16T08:36:30.000Z"
  },
  "service": {
    "code": "111",
    "description": "Ordinationskonsultation",
    "datetime": "2025-12-16T10:00:00.000Z",
    "price": 35.00,
    "copay": 5.00
  },
  "doctor": {
    "taxNumber": "ATU12345678",
    "chamberNumber": "12345",
    "specialization": "Allgemeinmedizin"
  },
  "metadata": {
    "idempotencyKey": "test_1734341790000_abc123xyz",
    "version": "1.0",
    "source": "ordinationssoftware"
  }
}
```

## Idempotenz

Jede Abrechnung verwendet einen eindeutigen `idempotencyKey`, um sicherzustellen, dass doppelte Abrechnungen vermieden werden. Der Key hat folgendes Format:

```
{prefix}_{timestamp}_{random}
```

Beispiele:
- `test_1734341790000_abc123xyz` (für Test-Abrechnungen)
- `prod_1734341790000_def456uvw` (für Produktions-Abrechnungen)
- `test_refund_1734341790000_ghi789rst` (für Rückerstattungsanträge)

## Validierung

Vor dem Senden werden folgende Validierungen durchgeführt:

1. **Sozialversicherungsnummer:** Muss im österreichischen Format vorliegen (13 Ziffern)
2. **Steuernummer:** Muss im österreichischen Format vorliegen (ATU + 8 Ziffern)
3. **Leistungscode:** Muss gültig sein (wird von der Kassen-API validiert)
4. **Preis:** Muss positiv sein
5. **Datum:** Muss in der Vergangenheit oder Gegenwart liegen

## Fehlerbehandlung

Bei Fehlern gibt die API folgende HTTP-Status-Codes zurück:

- `200 OK`: Abrechnung erfolgreich verarbeitet
- `400 Bad Request`: Ungültige Daten
- `401 Unauthorized`: API-Key ungültig
- `404 Not Found`: Endpunkt nicht gefunden
- `409 Conflict`: Doppelte Abrechnung (gleicher idempotencyKey)
- `500 Internal Server Error`: Server-Fehler

## Testmodus

Wenn die Kassen-API nicht konfiguriert ist, simuliert das System die Antwort:

```json
{
  "success": true,
  "message": "Kassenabrechnung erfolgreich gesendet (simuliert - Kassen-API nicht konfiguriert)",
  "data": {
    "kassaRef": "TEST-1734341790000_abc123xyz",
    "status": "ACCEPTED",
    "message": "Test-Abrechnung erfolgreich verarbeitet",
    "processingTime": 100,
    "simulated": true,
    "warning": "Kassen-API ist nicht konfiguriert. Dies ist eine simulierte Antwort für Testzwecke."
  }
}
```




