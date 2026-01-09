# One-Click-Abrechnen - Konzept & Implementierungsplan

## Überblick
Das "One-Click-Abrechnen" ist ein Workflow-Konzept, das es Ärzten ermöglicht, Leistungen mit einem einzigen Klick abzurechnen. Das System automatisiert die Abrechnung basierend auf dem Arzttyp (Kassenarzt, Wahlarzt, Privatarzt) und den entsprechenden Anforderungen.

## Kernfunktionen

### 1. **One-Click-Button**
- Ein Button "Leistung abrechnen" in der Performance-Ansicht
- Dynamisches Label basierend auf Arzttyp:
  - "Als Kassenleistung abrechnen" (Kassenarzt)
  - "Leistung fakturieren" (Wahlarzt)
  - "Honorarnote erstellen" (Privatarzt)

### 2. **Automatischer Workflow**
- **Kassenarzt**: Sofortige elektronische Meldung an Kasse (ELGA/e-Card)
- **Wahlarzt**: Rechnung erstellen + Patient belasten + Erstattung an Kasse (80%)
- **Privat**: Honorar verrechnen + ggf. Zusatzversicherung

### 3. **Technische Architektur**

#### Backend-Komponenten
```
- API Gateway (Auth via JWT/OAuth2)
- Billing Service (One-Click Workflow)
- Integration Layer:
  * Kassen-Connector (ELGA/e-Card, Kassen-APIs)
  * Insurance-Connector (PDF/XML/SOAP/REST)
  * Payment-Gateway (SEPA/Kreditkarte)
- Queue/Job System (RabbitMQ/Redis/Sidekiq)
- Audit & Ledger DB (immutable log)
- Document Service (PDF/UBL/XML/ABO/ELDA)
- Notification Service (UI/Email/Webhook)
```

#### Frontend-Komponenten
```
- PerformanceView (Leistungsansicht)
- BillingButton (One-Click Button)
- Inline-Modal (Bestätigungsdialog)
- Status-Spinner (Live-Feedback)
- History/Journal (Abrechnungs-Status)
```

### 4. **Datenmodell**

#### Performances (Leistungserfassung)
```json
{
  "id": "perf_0001",
  "patient_id": "pt_123",
  "doctor_id": "dr_456",
  "service_code": "111",
  "service_description": "Ordinationskonsultation",
  "service_datetime": "2025-10-28T09:30:00+01:00",
  "unit_price": 35.00,
  "tariff_type": "kassa", // kassa / wahl / privat
  "status": "recorded" // recorded, billed, sent, accepted, rejected, refunded
}
```

#### Billing Jobs (Abrechnungsjobs)
```json
{
  "id": "job_abc",
  "performance_id": "perf_0001",
  "doctor_id": "dr_456",
  "target": "KASSE|PATIENT|INSURANCE",
  "payload": {},
  "status": "PENDING", // PENDING, PROCESSING, COMPLETED, FAILED
  "attempts": 0,
  "idempotency_key": "unique_key",
  "created_at": "...",
  "updated_at": "..."
}
```

#### Billing Audit (Audit-Log)
```json
{
  "id": "audit_1",
  "job_id": "job_abc",
  "event": "SENT_TO_KASSA",
  "response": { "code": 200, "message": "accepted", "ref": "K12345" },
  "timestamp": "..."
}
```

### 5. **Backend-Pseudocode**

#### One-Click Handler
```javascript
def one_click_bill(performance_id, user) {
  // 1. Load performance, doctor, patient, insurance
  perf = db.get_performance(performance_id)
  doctor = db.get_doctor(perf.doctor_id)
  patient = db.get_patient(perf.patient_id)

  // 2. Determine route
  if (doctor.contract_type == "kassenarzt") {
    route = "KASSE"
  } else if (doctor.contract_type == "wahlarzt") {
    route = "PATIENT+KASSE_REFUND"
  } else {
    route = "PATIENT+INSURANCE"
  }

  // 3. Generate idempotent key
  idempotency_key = `${perf.id}:${perf.updated_at}`
  payload = build_payload(perf, doctor, patient, route)

  // 4. Create billing_job (PENDING)
  job = db.create_billing_job(perf.id, route, payload, idempotency_key)

  // 5. Enqueue job
  queue.enqueue("billing", job.id)

  // 6. Return immediate success
  return { job_id: job.id, status: "PENDING" }
}
```

#### Queue Worker
```javascript
def process_billing_job(job_id) {
  job = db.get_job(job_id)
  
  if (job.attempts > MAX) mark_failed()
  
  job.attempts += 1
  
  // Call connector based on route
  if (job.route == "KASSE") {
    resp = kassen_connector.send(job.payload, idempotency_key = job.idempotency_key)
  } else if (job.route == "PATIENT+KASSE_REFUND") {
    invoice = document_service.create_invoice(job.payload)
    payment_gateway.charge(patient, invoice)
    resp = kassen_connector.submit_refund_request(...)
  } else {
    invoice = document_service.create_invoice(job.payload)
    resp = insurance_connector.submit_claim(invoice)
  }
  
  // Persist response to audit
  db.append_audit(job.id, resp)
  // Update job status
}
```

## Implementierungsstatus

### ✅ Bereits vorhanden (60-70%)
- Invoice-Schema mit Abrechnungstypen
- Backend Billing-API
- Frontend Billing-Interface
- Service-Katalog (78 Services)
- Patientendaten mit Versicherungsinfos
- AuditLog-System
- RKSVO QR-Code Support
- ÖGK-XML Export

### ⚠️ Teilweise vorhanden
- Job-System (kein Queue)
- Connector-Layer (keine echten APIs)
- Error-Handling (basis, kein Retry)

### ❌ Nicht implementiert (30-40%)
- One-Click-Button
- Queue-System (RabbitMQ/Redis)
- Kassen-Connector (echte APIs)
- Idempotency-Keys
- Retry-Mechanismen
- Reconciliation-Tool
- Payment-Gateway

## Implementierungsplan

### Phase 1: MVP (2 Wochen)
- One-Click-Button in UI
- BillingJob-Schema erweitern
- Basis-Queue mit Node.js
- Idempotency-Keys
- Erweiterte Error-Behandlung

### Phase 2: Erweiterte Features (4 Wochen)
- Bull.js Queue-Integration
- Kassen-Connector-Simulation
- PDF-Generierung
- Retry-Logic

### Phase 3: Production-Ready (8 Wochen)
- Echte Kassen-APIs
- Payment-Integration
- Vollständige Compliance

## Nächste Schritte
1. BillingJob-Modell erstellen
2. One-Click-Button hinzufügen
3. Bull.js Queue implementieren
4. Kassen-Connector-Simulation
5. Admin-Dashboard für Job-Status

## Compliance & Security
- TLS, HSTS, PKI für Behörden
- Unveränderliches Audit-Log
- DSGVO-konform
- Rolle-basierte Berechtigungen

## Test-Strategy
- Unit-Tests für Payload-Builder
- Integration-Tests gegen Sandbox
- End-to-End Tests
- Load-Tests
- User Acceptance Tests

---
**Zuletzt aktualisiert**: 2025-10-28
**Status**: Konzept dokumentiert, wartet auf Implementierung






