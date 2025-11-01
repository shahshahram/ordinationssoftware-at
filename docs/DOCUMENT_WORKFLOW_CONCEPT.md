# 🔄 Konzept: Dokumenten-Workflow-System

## 🎯 Übersicht

Ein **Workflow-System** würde sich **sehr auszahlen**, besonders für medizinische Dokumente. Es bietet:
- **Strukturierte Prüf- und Freigabeprozesse**
- **Nachvollziehbarkeit** aller Schritte
- **Flexibilität** für verschiedene Dokumenttypen
- **Integration** mit Versionierung
- **Automatisierung** von Routinetätigkeiten

---

## ✅ Warum ein Workflow-System?

### Aktuelle Probleme
- ❌ Keine strukturierte Prüfphase
- ❌ Keine Freigabe-Workflows
- ❌ Keine Nachvollziehbarkeit: Wer hat wann was gemacht?
- ❌ Keine Benachrichtigungen bei Statusänderungen
- ❌ Keine Validierung vor Freigabe
- ❌ Keine Unterscheidung zwischen verschiedenen Dokumenttypen

### Vorteile eines Workflow-Systems
- ✅ **Rechtssicherheit**: Klarer Freigabeprozess dokumentiert
- ✅ **Qualitätssicherung**: Prüfung vor Freigabe obligatorisch
- ✅ **Effizienz**: Automatisierte Benachrichtigungen
- ✅ **Compliance**: Audit-Trail für alle Aktionen
- ✅ **Flexibilität**: Verschiedene Workflows für verschiedene Dokumenttypen
- ✅ **Transparenz**: Jeder sieht den aktuellen Status und nächste Schritte

---

## 🏗️ Workflow-Architektur

### 1. Workflow-Definitionen

Jeder Dokumenttyp kann einen eigenen Workflow haben:

```javascript
const WorkflowDefinition = {
  workflowId: String,                    // Eindeutige ID
  name: String,                          // "Arztbrief-Workflow"
  documentTypes: [String],                // Welche Dokumenttypen verwenden diesen Workflow
  isMedicalDocument: Boolean,            // Medizinisches Dokument?
  requiresApproval: Boolean,             // Benötigt Freigabe?
  steps: [WorkflowStep],                  // Workflow-Schritte
  defaultAssigneeRole: String,           // Standard-Zuständigkeit
  allowParallelApproval: Boolean,        // Parallele Freigabe erlaubt?
  requireAllApprovers: Boolean           // Alle oder einer reicht?
};

const WorkflowStep = {
  stepId: String,
  stepName: String,                      // "Erstellung", "Prüfung", "Freigabe"
  stepType: Enum,                        // 'action', 'approval', 'review', 'notification'
  order: Number,                         // Reihenfolge im Workflow
  requiredRole: String,                   // Welche Rolle muss diesen Schritt durchführen?
  requiredPermission: String,             // Spezifische Berechtigung
  canSkip: Boolean,                      // Kann übersprungen werden?
  isParallel: Boolean,                   // Kann parallel zu anderen Schritten laufen?
  timeLimit: Number,                     // Zeitlimit in Stunden (optional)
  nextSteps: [String],                   // Mögliche nächste Schritte
  actions: [WorkflowAction]              // Erlaubte Aktionen
};

const WorkflowAction = {
  actionType: Enum,                      // 'approve', 'reject', 'request_changes', 'send'
  label: String,                         // "Freigeben", "Zurückweisen"
  requiresComment: Boolean,               // Kommentar erforderlich?
  requiresSignature: Boolean,             // Digitale Signatur erforderlich?
  nextStep: String                        // Welcher Schritt folgt?
};
```

---

## 📋 2. Workflow-Typen

### 2.1 Einfacher Workflow (Nicht-medizinische Dokumente)

```
ERSTELLUNG → FERTIG → ARCHIVIERT
```

**Beispiel: Rechnung**
- **Schritt 1: Erstellung** (Rezeption)
- **Schritt 2: Finalisierung** (automatisch oder manuell)
- **Schritt 3: Versendung** (automatisch oder manuell)
- **Schritt 4: Archivierung** (automatisch nach Versendung)

### 2.2 Standard-Workflow (Medizinische Dokumente)

```
ERSTELLUNG → PRÜFUNG → FREIGABE → VERSENDUNG → ARCHIVIERT
     ↓           ↓
  ÄNDERUNGEN  ABLEHNUNG
```

**Beispiel: Arztbrief**
- **Schritt 1: Erstellung** (Arzt/Assistenz)
- **Schritt 2: Interne Prüfung** (Assistenz/Oberarzt)
- **Schritt 3: Freigabe** (Arzt mit Freigabeberechtigung)
- **Schritt 4: Versendung** (Assistenz/Rezeption)
- **Schritt 5: Archivierung** (automatisch)

### 2.3 Erweiterter Workflow (Kritische Dokumente)

```
ERSTELLUNG → QUALITÄTSPRÜFUNG → FACHPRÜFUNG → FREIGABE → VERSENDUNG → ARCHIVIERT
     ↓              ↓                ↓
  ÄNDERUNGEN     ÄNDERUNGEN       ABLEHNUNG
```

**Beispiel: Gutachten**
- **Schritt 1: Erstellung** (Arzt)
- **Schritt 2: Qualitätsprüfung** (Oberarzt/Qualitätsbeauftragter)
- **Schritt 3: Fachprüfung** (Fachärztliche Prüfung)
- **Schritt 4: Rechtliche Prüfung** (optional, bei Bedarf)
- **Schritt 5: Freigabe** (Chefarzt/Leitender Arzt)
- **Schritt 6: Versendung** (Rezeption)
- **Schritt 7: Archivierung**

### 2.4 Schnell-Workflow (Einfache Dokumente)

```
ERSTELLUNG → AUTOMATISCHE FREIGABE → VERSENDUNG
```

**Beispiel: Einfache Überweisung**
- **Schritt 1: Erstellung** (Arzt/Assistenz)
- **Schritt 2: Automatische Validierung** (System)
- **Schritt 3: Automatische Freigabe** (wenn validiert)
- **Schritt 4: Versendung** (automatisch oder manuell)

---

## 🔄 3. Workflow-Status und Übergänge

### 3.1 Erweiterte Status-Definition

```javascript
enum DocumentWorkflowStatus {
  // Erstellung
  DRAFT = 'draft',                       // Entwurf
  BEING_REVIEWED = 'being_reviewed',      // In Prüfung
  REVIEW_COMPLETED = 'review_completed',  // Prüfung abgeschlossen
  
  // Freigabe
  PENDING_APPROVAL = 'pending_approval',   // Wartet auf Freigabe
  APPROVED = 'approved',                 // Freigegeben
  REJECTED = 'rejected',                 // Abgelehnt
  
  // Änderungen
  CHANGES_REQUESTED = 'changes_requested', // Änderungen angefordert
  REVISING = 'revising',                  // Wird überarbeitet
  
  // Versendung
  READY_TO_SEND = 'ready_to_send',        // Bereit zum Versenden
  SENDING = 'sending',                   // Wird versendet
  SENT = 'sent',                         // Versendet
  DELIVERED = 'delivered',               // Zustellbestätigung
  
  // Finale
  ARCHIVED = 'archived',                 // Archiviert
  WITHDRAWN = 'withdrawn'                // Zurückgezogen
}
```

### 3.2 Status-Übergangs-Diagramm

```
┌─────────┐
│  DRAFT  │
└────┬────┘
     │ submit()
     ↓
┌──────────────────┐
│ BEING_REVIEWED   │
└────┬─────────────┘
     │ review()
     ├─────────────┐
     ↓             ↓
┌─────────────────┐ ┌─────────────────┐
│ CHANGES_        │ │ REVIEW_         │
│ REQUESTED       │ │ COMPLETED       │
└────┬────────────┘ └────┬────────────┘
     │                   │
     │ revise()          │ requestApproval()
     ↓                   ↓
┌─────────┐      ┌──────────────────┐
│ REVISING│      │ PENDING_         │
└────┬────┘      │ APPROVAL         │
     │           └────┬──────────────┘
     │                │ approve()
     └───────────────┼───────────────┐
                     ↓                │
              ┌──────────────┐       │
              │  APPROVED    │       │
              └────┬─────────┘       │
                   │                 │
                   │ send()          │ reject()
                   ↓                 ↓
              ┌──────────┐    ┌──────────┐
              │  SENT    │    │ REJECTED │
              └────┬─────┘    └──────────┘
                   │
                   │ archive()
                   ↓
              ┌───────────┐
              │ ARCHIVED  │
              └───────────┘
```

---

## 👥 4. Rollen und Berechtigungen

### 4.1 Rollen-basierte Workflow-Aktionen

```javascript
const WorkflowPermissions = {
  // Arzt
  arzt: {
    canCreate: true,
    canEdit: ['draft', 'revising', 'changes_requested'],
    canReview: true,
    canApprove: ['pending_approval'],
    canReject: ['pending_approval', 'being_reviewed'],
    canRequestChanges: ['being_reviewed'],
    canSend: ['ready_to_send', 'approved'],
    canWithdraw: ['approved', 'sent']
  },
  
  // Oberarzt
  oberarzt: {
    canCreate: true,
    canEdit: ['draft', 'revising'],
    canReview: true,
    canApprove: ['pending_approval'],  // Auch ohne Ersteller zu sein
    canReject: true,
    canRequestChanges: true,
    canSend: false,
    canWithdraw: true
  },
  
  // Assistenz
  assistenz: {
    canCreate: true,
    canEdit: ['draft'],
    canReview: ['draft'],
    canApprove: false,
    canReject: false,
    canRequestChanges: ['being_reviewed'],
    canSend: ['ready_to_send'],
    canWithdraw: false
  },
  
  // Rezeption
  rezeption: {
    canCreate: ['rechnung', 'verwaltung'],
    canEdit: ['draft'],
    canReview: false,
    canApprove: false,
    canReject: false,
    canRequestChanges: false,
    canSend: ['ready_to_send', 'approved'],  // Nur Versendung
    canWithdraw: false
  }
};
```

---

## 📨 5. Benachrichtigungen

### 5.1 Automatische Benachrichtigungen

```javascript
const NotificationTriggers = {
  // Bei Status-Änderung
  'draft → being_reviewed': {
    notify: ['reviewer', 'creator'],
    channels: ['email', 'in-app'],
    message: 'Dokument wurde zur Prüfung eingereicht'
  },
  
  'being_reviewed → changes_requested': {
    notify: ['creator'],
    channels: ['email', 'in-app'],
    message: 'Änderungen wurden angefordert',
    includeComment: true
  },
  
  'pending_approval → approved': {
    notify: ['creator', 'reviewers', 'sender'],
    channels: ['email', 'in-app'],
    message: 'Dokument wurde freigegeben'
  },
  
  'approved → ready_to_send': {
    notify: ['sender'],
    channels: ['email', 'in-app'],
    message: 'Dokument ist bereit zum Versenden'
  },
  
  // Zeitlimit-Warnungen
  'review_timeout': {
    notify: ['reviewer'],
    channels: ['email'],
    message: 'Prüfung überfällig',
    when: '24h before deadline'
  }
};
```

---

## 🔐 6. Digitale Signatur und Validierung

### 6.1 Signatur-Anforderungen

```javascript
const SignatureRequirements = {
  // Für kritische Dokumente
  gutachten: {
    requiresSignature: true,
    requiredSignatures: ['arzt', 'oberarzt'],
    signatureType: 'digital',  // oder 'biometric'
    signaturePlacement: 'footer'
  },
  
  // Für Standard-Dokumente
  arztbrief: {
    requiresSignature: true,
    requiredSignatures: ['arzt'],
    signatureType: 'digital',
    signaturePlacement: 'footer'
  },
  
  // Für einfache Dokumente
  ueberweisung: {
    requiresSignature: false,
    requiredSignatures: [],
    signatureType: null
  }
};
```

### 6.2 Validierungsregeln

```javascript
const ValidationRules = {
  arztbrief: {
    requiredFields: ['content.text', 'patient.id', 'doctor.id', 'medicalData.diagnosis'],
    validationChecks: [
      'icd10Code_valid',
      'patient_exists',
      'doctor_has_permission',
      'content_min_length',
      'no_missing_placeholders'
    ]
  },
  
  rezept: {
    requiredFields: ['medicalData.medications'],
    validationChecks: [
      'medications_not_empty',
      'dosage_specified',
      'patient_allergies_checked'
    ]
  }
};
```

---

## 📊 7. Workflow-Instanz und Tracking

### 7.1 WorkflowInstance Schema

```javascript
const WorkflowInstanceSchema = {
  // Referenzen
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document',
    required: true,
    index: true
  },
  workflowDefinitionId: {
    type: String,
    required: true
  },
  
  // Aktueller Status
  currentStep: {
    stepId: String,
    stepName: String,
    startedAt: Date,
    assignedTo: mongoose.Schema.Types.ObjectId,  // Wer ist aktuell zuständig?
    dueDate: Date,
    status: String  // 'active', 'completed', 'skipped', 'blocked'
  },
  
  // Workflow-Historie
  stepHistory: [{
    stepId: String,
    stepName: String,
    startedAt: Date,
    completedAt: Date,
    completedBy: mongoose.Schema.Types.ObjectId,
    action: String,  // 'approve', 'reject', 'request_changes'
    comment: String,
    signature: String,  // Digitale Signatur
    duration: Number  // Minuten
  }],
  
  // Benutzer-Zuordnungen
  assignees: [{
    userId: mongoose.Schema.Types.ObjectId,
    role: String,
    stepId: String,
    assignedAt: Date,
    status: String  // 'pending', 'completed', 'skipped'
  }],
  
  // Parallele Freigaben
  parallelApprovals: [{
    approverId: mongoose.Schema.Types.ObjectId,
    required: Boolean,
    status: String,  // 'pending', 'approved', 'rejected'
    approvedAt: Date,
    signature: String
  }],
  
  // Metadaten
  startedAt: Date,
  completedAt: Date,
  totalDuration: Number,  // Minuten
  isBlocked: Boolean,
  blockReason: String,
  
  // Audit
  createdAt: Date,
  updatedAt: Date
};
```

### 7.2 Workflow-Tracking UI

**Dashboard-Komponenten:**
- **Aktuelle Aufgaben**: Welche Dokumente warten auf mich?
- **Meine Dokumente**: Dokumente in meinem Workflow
- **Warteschlange**: Dokumente die auf Freigabe warten
- **Überfällige Aufgaben**: Tasks die über Zeitlimit sind
- **Workflow-Status**: Visualisierung des aktuellen Stands

---

## 🎯 8. Konkrete Workflow-Beispiele

### 8.1 Arztbrief-Workflow

```yaml
name: Arztbrief Standard-Workflow
documentTypes: ['arztbrief', 'befund']
isMedicalDocument: true

steps:
  - stepId: 'creation'
    stepName: 'Erstellung'
    order: 1
    requiredRole: ['arzt', 'assistenz']
    actions:
      - actionType: 'save_draft'
        label: 'Als Entwurf speichern'
      - actionType: 'submit_review'
        label: 'Zur Prüfung einreichen'
        requiresComment: false
        nextStep: 'review'
  
  - stepId: 'review'
    stepName: 'Interne Prüfung'
    order: 2
    requiredRole: ['assistenz', 'oberarzt']
    timeLimit: 24  # 24 Stunden
    actions:
      - actionType: 'approve'
        label: 'Prüfung OK'
        nextStep: 'approval'
      - actionType: 'request_changes'
        label: 'Änderungen anfordern'
        requiresComment: true
        nextStep: 'creation'
      - actionType: 'reject'
        label: 'Ablehnen'
        requiresComment: true
  
  - stepId: 'approval'
    stepName: 'Freigabe'
    order: 3
    requiredRole: ['arzt', 'oberarzt']
    requiresSignature: true
    actions:
      - actionType: 'approve'
        label: 'Freigeben'
        requiresSignature: true
        requiresComment: false
        nextStep: 'ready_to_send'
      - actionType: 'reject'
        label: 'Nicht freigeben'
        requiresComment: true
  
  - stepId: 'ready_to_send'
    stepName: 'Bereit zum Versenden'
    order: 4
    requiredRole: ['assistenz', 'rezeption']
    actions:
      - actionType: 'send'
        label: 'Versenden'
        nextStep: 'sent'
      - actionType: 'print'
        label: 'Drucken'
  
  - stepId: 'sent'
    stepName: 'Versendet'
    order: 5
    autoArchive: true  # Automatisch archivieren nach 7 Tagen
```

### 8.2 Gutachten-Workflow (Erweitert)

```yaml
name: Gutachten Erweitert-Workflow
documentTypes: ['gutachten']
isMedicalDocument: true
requiresApproval: true
requireAllApprovers: true  # Alle müssen freigeben

steps:
  - stepId: 'creation'
    stepName: 'Erstellung'
    requiredRole: ['arzt']
    actions:
      - actionType: 'submit_review'
        nextStep: 'quality_review'
  
  - stepId: 'quality_review'
    stepName: 'Qualitätsprüfung'
    requiredRole: ['oberarzt']
    timeLimit: 48
    actions:
      - actionType: 'approve'
        nextStep: 'specialist_review'
      - actionType: 'request_changes'
        nextStep: 'creation'
  
  - stepId: 'specialist_review'
    stepName: 'Fachprüfung'
    requiredRole: ['facharzt']
    timeLimit: 72
    actions:
      - actionType: 'approve'
        nextStep: 'legal_review'
      - actionType: 'request_changes'
        nextStep: 'creation'
  
  - stepId: 'legal_review'
    stepName: 'Rechtliche Prüfung'
    requiredRole: ['rechtsabteilung']  # Optional
    canSkip: true
    actions:
      - actionType: 'approve'
        nextStep: 'approval'
      - actionType: 'skip'
        nextStep: 'approval'
  
  - stepId: 'approval'
    stepName: 'Finale Freigabe'
    requiredRole: ['chefarzt']
    requiresSignature: true
    parallelApprovals: false
    actions:
      - actionType: 'approve'
        nextStep: 'ready_to_send'
```

### 8.3 Rechnung-Workflow (Einfach)

```yaml
name: Rechnung Einfach-Workflow
documentTypes: ['rechnung']
isMedicalDocument: false

steps:
  - stepId: 'creation'
    stepName: 'Erstellung'
    requiredRole: ['rezeption']
    actions:
      - actionType: 'finalize'
        label: 'Finalisieren'
        nextStep: 'ready_to_send'
  
  - stepId: 'ready_to_send'
    stepName: 'Versendung'
    requiredRole: ['rezeption']
    actions:
      - actionType: 'send'
        label: 'Versenden'
        nextStep: 'sent'
```

---

## 🔄 9. Integration mit Versionierung

### 9.1 Versions-Erstellung bei Workflow-Schritten

```javascript
// Version wird automatisch erstellt bei:
- Übergang DRAFT → BEING_REVIEWED  // Erste Version
- Freigabe (APPROVED)              // Diese Version wird freigegeben
- Änderungen nach CHANGES_REQUESTED // Neue Version
- Übergang zu RELEASED             // Finale Version
```

### 9.2 Versions-Kommentare im Workflow

```javascript
WorkflowStep.comment = {
  type: 'workflow_comment',
  step: 'review',
  action: 'request_changes',
  message: 'ICD-10 Code fehlt',
  versionNumber: '1.0.0'
};
```

---

## 📈 10. Workflow-Analytics

### 10.1 Metriken

```javascript
const WorkflowMetrics = {
  // Durchschnittliche Bearbeitungszeiten
  averageTimePerStep: {
    creation: Number,      // Minuten
    review: Number,
    approval: Number,
    sending: Number
  },
  
  // Workflow-Effizienz
  averageTotalDuration: Number,  // Von Erstellung bis Versendung
  bottlenecks: [String],         // Welche Schritte dauern am längsten?
  
  // Qualitäts-Metriken
  rejectionRate: Number,         // Wie viele werden abgelehnt?
  changeRequestRate: Number,     // Wie viele Änderungsanfragen?
  firstTimeApprovalRate: Number, // Wie viele beim ersten Mal durch?
  
  // Benutzer-Metriken
  workloadPerUser: {
    userId: {
      pendingTasks: Number,
      averageCompletionTime: Number,
      overdueTasks: Number
    }
  }
};
```

### 10.2 Reporting

- **Workflow-Performance Dashboard**
- **Bottleneck-Analyse**
- **Benutzer-Performance**
- **Compliance-Reports**

---

## 🎨 11. Frontend-Integration

### 11.1 Workflow-UI-Komponenten

**Dokument-Editor:**
- Status-Badge (oben)
- Workflow-Stepper (Fortschrittsanzeige)
- Aktions-Buttons (kontextabhängig)
- Kommentar-Bereich (für Änderungsanfragen)

**Workflow-Dashboard:**
- Meine Aufgaben
- Warteschlangen
- Überfällige Aufgaben
- Workflow-Status-Timeline

**Workflow-Historie:**
- Zeitstrahl aller Schritte
- Wer hat wann was gemacht?
- Kommentare und Signaturen

### 11.2 Benachrichtigungen

- **In-App Benachrichtigungen**
- **E-Mail Benachrichtigungen**
- **Push-Benachrichtigungen** (wenn möglich)

---

## ✅ 12. Implementierungs-Vorteile

### 12.1 Rechtssicherheit
- ✅ Vollständiger Audit-Trail
- ✅ Dokumentierte Freigabe-Prozesse
- ✅ Digitale Signaturen
- ✅ Nachvollziehbare Entscheidungen

### 12.2 Qualität
- ✅ Obligatorische Prüfung
- ✅ Validierung vor Freigabe
- ✅ Reduzierte Fehlerquote
- ✅ Konsistenz in Dokumentation

### 12.3 Effizienz
- ✅ Automatisierte Benachrichtigungen
- ✅ Klare Zuständigkeiten
- ✅ Weniger manuelle Koordination
- ✅ Transparenz über Status

### 12.4 Compliance
- ✅ DSGVO-konform
- ✅ Nachvollziehbarkeit
- ✅ Dokumentierte Prozesse
- ✅ Audit-ready

---

## 🚀 13. Implementierungs-Roadmap

### Phase 1: Basis-Workflow
- [ ] Workflow-Definition Schema
- [ ] Workflow-Instance Schema
- [ ] Einfache Status-Übergänge
- [ ] Basis-Benachrichtigungen

### Phase 2: Erweiterte Features
- [ ] Rollen-basierte Berechtigungen
- [ ] Parallele Freigaben
- [ ] Kommentar-System
- [ ] Validierungsregeln

### Phase 3: Automatisierung
- [ ] Automatische Benachrichtigungen
- [ ] Zeitlimit-Management
- [ ] Auto-Archivierung
- [ ] Workflow-Analytics

### Phase 4: Frontend
- [ ] Workflow-Dashboard
- [ ] Dokument-Editor Integration
- [ ] Status-Visualisierung
- [ ] Benachrichtigungs-Center

### Phase 5: Erweiterte Features
- [ ] Digitale Signaturen
- [ ] Workflow-Templates
- [ ] Bedingte Workflows
- [ ] Integration mit Versendung

---

## 💡 14. Zusätzliche Überlegungen

### 14.1 Flexibilität
- **Workflow-Templates** für verschiedene Szenarien
- **Anpassbare Workflows** pro Dokumenttyp
- **Bedingte Schritte** (wenn X dann Y)

### 14.2 Automatisierung
- **Auto-Validierung** bei Erstellung
- **Auto-Freigabe** für einfache Dokumente
- **Auto-Archivierung** nach Versendung
- **Auto-Benachrichtigungen**

### 14.3 Integration
- **ELGA-Integration**: Workflow bis zur ELGA-Übermittlung
- **E-Mail-Integration**: Versendung direkt aus Workflow
- **PDF-Generierung**: Automatisch beim Freigeben
- **Druck-Integration**: Direkt aus Workflow

---

## ❓ 15. Offene Fragen

1. **Workflow-Flexibilität**: Statisch definiert oder zur Laufzeit anpassbar?
2. **Rückgängig**: Kann man Workflow-Schritte rückgängig machen?
3. **Delegation**: Kann man Aufgaben delegieren?
4. **Escalation**: Was passiert bei Zeitüberschreitung?
5. **Externe Prüfer**: Können externe Benutzer prüfen?

---

## 🎯 Fazit

Ein **Workflow-System lohnt sich definitiv**, besonders für:
- ✅ **Medizinische Dokumente** (Rechtssicherheit)
- ✅ **Kritische Dokumente** (Qualitätssicherung)
- ✅ **Team-Koordination** (Effizienz)
- ✅ **Compliance** (Nachvollziehbarkeit)

**Die Investition zahlt sich aus durch:**
- Reduzierte Fehler
- Bessere Qualität
- Rechtssicherheit
- Effizienzsteigerung
- Compliance-Sicherheit

---

**Dieses Konzept kann als Basis für die Implementierung dienen.**

