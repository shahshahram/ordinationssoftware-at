# Online-Buchung: Integrationsoptionen für Patienten

**Erstellt am**: 2025-12-19  
**Status**: Zur Entscheidung  
**Zweck**: Evaluierung verschiedener Optionen zur Integration der Online-Buchung für Patienten

---

## Aktueller Status

### ✅ Bereits vorhanden
- **Route**: `/online-booking` (öffentlich, ohne Login)
- **Komponente**: `frontend/src/pages/OnlineBooking.tsx`
- **Backend API**: `/api/online-booking/*`
- **Zugriff**: Direkt über URL möglich (z.B. `http://localhost:3000/online-booking`)

### ❌ Fehlt noch
- Öffentliche Homepage/Landing Page für Patienten
- Integration in externe Website
- Branding-Anpassungen (Praxis-Logo, Farben, etc.)
- SEO-Optimierung
- Mobile-optimierte Landing Page

---

## Option 1: Separate öffentliche Homepage (Empfohlen)

### Konzept
Eine eigene öffentliche Homepage für Patienten, die:
- Praxis-Informationen zeigt
- Link/Button zur Online-Buchung enthält
- Weitere Informationen (Öffnungszeiten, Kontakt, etc.) zeigt
- Branding der Praxis verwendet

### Struktur
```
/ (Homepage - öffentlich)
├── Praxis-Informationen
├── "Termin online buchen" Button → /online-booking
├── Öffnungszeiten
├── Kontakt
└── Weitere Services
```

### Vorteile
- ✅ **Vollständige Kontrolle**: Eigene Homepage mit Praxis-Branding
- ✅ **SEO**: Suchmaschinenoptimierung möglich
- ✅ **Professionell**: Zeigt Praxis-Informationen vor Buchung
- ✅ **Vertrauen**: Patienten sehen Praxis-Details vor Buchung
- ✅ **Flexibel**: Kann weitere Inhalte integrieren (News, Services, etc.)

### Nachteile
- ⚠️ **Aufwand**: Separate Homepage muss erstellt werden
- ⚠️ **Wartung**: Zusätzliche Seite zu pflegen

### Implementierung
**Neue Dateien**:
- `frontend/src/pages/PublicHomepage.tsx` (Homepage-Komponente)
- `frontend/src/components/Public/` (Öffentliche Komponenten)
- `frontend/src/pages/PublicOnlineBooking.tsx` (Optional: Wrapper für Online-Buchung mit Branding)

**Route**:
```typescript
// In App.tsx
<Route path="/" element={<PublicHomepage />} /> // Öffentliche Homepage
<Route path="/online-booking" element={<PublicOnlineBooking />} /> // Online-Buchung mit Branding
```

**Features**:
- Praxis-Logo und Farben (aus Location Model)
- Öffnungszeiten (aus WeeklySchedule)
- Kontaktinformationen (aus Location Model)
- "Termin online buchen" Button → `/online-booking`
- Responsive Design (Mobile-first)

### Beispiel-Layout
```
┌─────────────────────────────────────┐
│  [Praxis-Logo]  Dr. Mustermann       │
│  Facharzt für Allgemeinmedizin       │
├─────────────────────────────────────┤
│                                     │
│  Willkommen in unserer Ordination   │
│                                     │
│  [Großer Button: "Termin buchen"]  │
│                                     │
│  Öffnungszeiten:                    │
│  Mo-Fr: 08:00 - 17:00               │
│                                     │
│  Kontakt:                           │
│  Tel: 01 234 567                    │
│  Email: info@praxis.at              │
│                                     │
└─────────────────────────────────────┘
```

---

## Option 2: Direkte Online-Buchung (Aktuell)

### Konzept
Patienten gelangen direkt zur Online-Buchung ohne Homepage.

### Zugriff
- Direkter Link: `https://praxis.at/online-booking`
- QR-Code (z.B. in Praxis, auf Visitenkarte)
- E-Mail-Link
- Social Media Link

### Vorteile
- ✅ **Einfach**: Keine zusätzliche Seite nötig
- ✅ **Schnell**: Direkt zur Buchung
- ✅ **Bereits vorhanden**: Funktioniert bereits

### Nachteile
- ❌ **Kein Branding**: Keine Praxis-Informationen sichtbar
- ❌ **Weniger Vertrauen**: Patienten sehen keine Praxis-Details
- ❌ **SEO**: Schlechter für Suchmaschinen

### Verbesserungen möglich
- Header mit Praxis-Logo (aus Location Model)
- Footer mit Kontaktinformationen
- Branding-Anpassungen (Farben, Logo)

---

## Option 3: Integration in bestehende Website (Embedding)

### Konzept
Online-Buchung wird in bestehende Praxis-Website eingebettet.

### Optionen

#### 3a) Iframe-Embedding
```html
<!-- In bestehender Website -->
<iframe src="https://praxis.at/online-booking" 
        width="100%" 
        height="800px"
        frameborder="0">
</iframe>
```

**Vorteile**:
- ✅ Einfache Integration
- ✅ Keine Änderungen an bestehender Website nötig

**Nachteile**:
- ❌ Mobile-Ansicht kann problematisch sein
- ❌ SEO-Probleme
- ❌ Iframe-Sicherheitsrichtlinien

#### 3b) API-Integration
Bestehende Website nutzt Backend-API direkt.

**Vorteile**:
- ✅ Vollständige Kontrolle über UI
- ✅ Bestes Branding möglich

**Nachteile**:
- ❌ Hoher Entwicklungsaufwand
- ❌ API-Dokumentation nötig
- ❌ Wartung beider Systeme

#### 3c) Link-Integration
Einfacher Link von bestehender Website zur Online-Buchung.

**Vorteile**:
- ✅ Sehr einfach
- ✅ Keine technischen Hürden

**Nachteile**:
- ❌ Patienten verlassen Website
- ❌ Kein nahtloser Übergang

---

## Option 4: QR-Code basierter Zugang

### Konzept
QR-Codes führen direkt zur Online-Buchung (mit optionaler Homepage).

### Verwendung
- **In Praxis**: QR-Code an Rezeption, Wartezimmer
- **Visitenkarte**: QR-Code auf Visitenkarte
- **E-Mail-Signatur**: QR-Code in E-Mail-Signatur
- **Social Media**: QR-Code in Posts

### QR-Code Inhalt
- **Option A**: Direkt zur Buchung: `https://praxis.at/online-booking`
- **Option B**: Zur Homepage: `https://praxis.at/` (dann Button zur Buchung)

### Vorteile
- ✅ **Einfach**: Patienten scannen und gelangen direkt zur Buchung
- ✅ **Mobile-first**: Perfekt für Smartphones
- ✅ **Kontaktlos**: Wichtig in Zeiten von COVID-19

### Implementierung
**Backend API**:
```javascript
// QR-Code Generation (optional)
GET /api/online-booking/qr-code
// Gibt QR-Code als Bild zurück
```

**Frontend**:
- QR-Code kann in Admin-Bereich generiert werden
- Download als PNG/SVG möglich
- Verschiedene Größen (für Visitenkarte, Poster, etc.)

---

## Option 5: Multi-Standort-Unterstützung

### Konzept
Wenn mehrere Standorte vorhanden sind, sollte die Online-Buchung standort-spezifisch sein.

### URL-Struktur
```
/online-booking                    → Standort-Auswahl
/online-booking/:locationId        → Online-Buchung für spezifischen Standort
/online-booking/:locationId/:doctorId → Online-Buchung für spezifischen Arzt
```

### Vorteile
- ✅ **Flexibel**: Patienten können Standort wählen
- ✅ **Klarheit**: Keine Verwirrung bei mehreren Standorten
- ✅ **SEO**: Separate URLs pro Standort

### Implementierung
**Standort-Auswahl-Seite**:
```typescript
// Neue Komponente: PublicLocationSelection.tsx
// Zeigt alle aktiven Standorte
// Patient wählt Standort → Weiterleitung zu /online-booking/:locationId
```

**Online-Buchung erweitern**:
```typescript
// OnlineBooking.tsx erweitern um locationId Parameter
const { locationId } = useParams();
// Filtere Ärzte nach Standort
// Filtere Leistungen nach Standort
```

---

## Option 6: Kombination (Empfohlen)

### Konzept
Kombination aus mehreren Optionen für maximale Flexibilität.

### Struktur
```
/ (Öffentliche Homepage)
├── Praxis-Informationen
├── "Termin online buchen" Button
└── Weitere Inhalte

/online-booking (Online-Buchung mit Branding)
├── Header mit Praxis-Logo
├── Buchungsprozess
└── Footer mit Kontakt

/online-booking/:locationId (Standort-spezifische Buchung)
└── Buchung für spezifischen Standort

/online-booking/qr (QR-Code Generator - Admin)
└── Generiert QR-Codes für verschiedene Zwecke
```

### Vorteile
- ✅ **Flexibel**: Verschiedene Zugangswege möglich
- ✅ **Professionell**: Homepage + Branding
- ✅ **SEO**: Optimiert für Suchmaschinen
- ✅ **Multi-Standort**: Unterstützt mehrere Standorte

---

## Empfehlung: Option 6 (Kombination)

### Phase 1: Basis-Integration (1-2 Wochen)
1. ✅ **Öffentliche Homepage erstellen**
   - `PublicHomepage.tsx` Komponente
   - Praxis-Informationen aus Location Model
   - "Termin online buchen" Button
   - Route: `/` (öffentlich)

2. ✅ **Online-Buchung mit Branding erweitern**
   - Header mit Praxis-Logo (aus Location Model)
   - Footer mit Kontaktinformationen
   - Farben anpassen (aus Location Model: `color_hex`)
   - Route: `/online-booking` (öffentlich, bleibt bestehen)

3. ✅ **QR-Code Generator (Admin)**
   - QR-Code Generation für verschiedene URLs
   - Download als PNG/SVG
   - Verschiedene Größen

### Phase 2: Erweiterte Features (2-3 Wochen)
4. ✅ **Multi-Standort-Unterstützung**
   - Standort-Auswahl-Seite
   - Standort-spezifische Buchung
   - URLs: `/online-booking/:locationId`

5. ✅ **SEO-Optimierung**
   - Meta-Tags
   - Structured Data (Schema.org)
   - Sitemap

6. ✅ **Analytics Integration**
   - Google Analytics
   - Conversion Tracking

---

## Technische Details

### Neue Komponenten

#### 1. PublicHomepage.tsx
```typescript
interface PublicHomepageProps {
  locationId?: string; // Optional: Für Multi-Standort
}

const PublicHomepage: React.FC<PublicHomepageProps> = ({ locationId }) => {
  // Lade Location-Daten
  // Zeige Praxis-Informationen
  // "Termin online buchen" Button → /online-booking
  // Öffnungszeiten, Kontakt, etc.
};
```

#### 2. PublicOnlineBooking.tsx (Wrapper)
```typescript
const PublicOnlineBooking: React.FC = () => {
  // Lade Location-Daten für Branding
  // Zeige Header mit Logo
  // Zeige OnlineBooking Komponente
  // Zeige Footer mit Kontakt
};
```

#### 3. PublicLocationSelection.tsx
```typescript
const PublicLocationSelection: React.FC = () => {
  // Lade alle aktiven Standorte
  // Zeige Standort-Liste
  // Weiterleitung zu /online-booking/:locationId
};
```

### Backend-Erweiterungen

#### 1. Public API Endpoints
```javascript
// Öffentliche Endpoints (ohne Auth)
GET /api/public/location/:id          // Standort-Informationen
GET /api/public/locations              // Alle aktiven Standorte
GET /api/public/doctors/:locationId   // Ärzte eines Standorts
GET /api/public/services/:locationId  // Leistungen eines Standorts
```

#### 2. QR-Code Generation
```javascript
GET /api/online-booking/qr-code
  ?url=https://praxis.at/online-booking
  &size=large|medium|small
  &format=png|svg
```

### Datenquellen

#### Location Model (bereits vorhanden)
- `name`: Praxis-Name
- `logo`: Praxis-Logo
- `color_hex`: Branding-Farbe
- `address_line1`, `postal_code`, `city`: Adresse
- `phone`, `email`: Kontakt
- `owner`: Praxis-Inhaber (Dr. Mustermann, etc.)

#### WeeklySchedule (bereits vorhanden)
- Öffnungszeiten pro Personal
- Kann aggregiert werden für "Praxis-Öffnungszeiten"

---

## Design-Überlegungen

### Branding
- **Logo**: Aus `Location.logo` (falls vorhanden)
- **Farben**: Aus `Location.color_hex`
- **Schriftart**: Professionell, lesbar
- **Layout**: Clean, modern, vertrauenswürdig

### Mobile-First
- Responsive Design
- Touch-optimiert
- Schnelle Ladezeiten

### Accessibility
- WCAG 2.1 AA konform
- Screen Reader unterstützt
- Keyboard-Navigation

---

## Entscheidungspunkte

### 1. Homepage: Ja oder Nein?
- **Ja**: Option 1 oder 6 (Kombination)
- **Nein**: Option 2 (Direkte Buchung)

### 2. Multi-Standort: Ja oder Nein?
- **Ja**: Option 5 oder 6 (Kombination)
- **Nein**: Option 1 oder 2

### 3. Externe Website: Ja oder Nein?
- **Ja**: Option 3 (Embedding)
- **Nein**: Option 1, 2, oder 6

### 4. QR-Codes: Ja oder Nein?
- **Ja**: Option 4 (kann mit allen kombiniert werden)
- **Nein**: Nicht nötig

---

## Nächste Schritte

1. ✅ **Evaluierung abgeschlossen** (dieses Dokument)
2. ⏳ **Entscheidung über Integrationsoption** (durch Benutzer)
3. ⏳ **Detaillierte Spezifikation** (für ausgewählte Option)
4. ⏳ **Implementierung** (schrittweise)

---

**Erstellt von**: AI Assistant  
**Datum**: 2025-12-19  
**Status**: Zur Review und Entscheidung

