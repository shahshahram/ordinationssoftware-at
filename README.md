# MyMediCloud MMC 🇦🇹

Eine moderne, webbasierte Ordinationssoftware für niedergelassene Ärzt:innen in Österreich mit ELGA-Kompatibilität und umfassendem medizinischen Dokumentenmanagement.

## 🏥 Überblick

Diese Software wurde speziell für österreichische Arztpraxen entwickelt und bietet:

- **Patientenverwaltung** mit vollständigen Stammdaten
- **Terminplanung** mit Kalender-Integration
- **Medizinische Dokumentation** mit 19 verschiedenen Dokumenttypen
- **ICD-10 Diagnoseverwaltung** mit österreichischen Standards
- **ELGA-Kompatibilität** für elektronische Gesundheitsakte
- **Sicherheitsfeatures** mit Rollen- und Berechtigungsmanagement

## 🚀 Features

### 📋 Patientenverwaltung
- Vollständige Patientenstammdaten
- Versicherungsdaten (ÖGK, SVS, etc.)
- Notfallkontakte und Anamnese
- Patienten-Organizer für zentrale Übersicht

### 📅 Terminplanung
- Interaktiver Kalender
- Ressourcenverwaltung (Räume, Geräte, Personal)
- Online-Buchungssystem
- Kollisionserkennung

### 📄 Medizinische Dokumente
**19 verschiedene Dokumenttypen in 5 Kategorien:**

#### 🩺 Kern-Dokumente
- Arztbrief / Befundbrief
- Überweisungsbrief
- Zuweisung / Einweisung
- Rücküberweisungsbrief
- Befundbericht (Labor, Radiologie)
- Operationsbericht

#### 💊 Verordnungen & Formulare
- e-Rezept
- Heilmittelverordnung
- Krankenstandsbestätigung
- Bildgebende Diagnostik
- Impfbestätigung

#### 🧠 Patientenbezogene Berichte
- Patientenaufklärung
- Therapieplan
- Verlaufsdokumentation
- Konsiliarbericht
- Pflegebrief

#### 🧾 Administrative Schreiben
- Gutachten / Attest
- Gutachten
- Kostenübernahmeantrag

### 🔍 ICD-10 Diagnoseverwaltung
- Österreichischer ICD-10 Katalog
- Hierarchische Suche
- Favoriten und Verlauf
- Automatische Validierung

### 🔐 Sicherheit & Compliance
- JWT-basierte Authentifizierung
- Rollen- und Berechtigungsmanagement
- DSGVO-konforme Datenverarbeitung
- Audit-Logging
- 2-Faktor-Authentifizierung

## 🛠 Technologie-Stack

### Frontend
- **React 18** mit TypeScript
- **Material-UI (MUI)** für UI-Komponenten
- **Redux Toolkit** für State Management
- **React Router** für Navigation
- **Axios** für API-Kommunikation

### Backend
- **Node.js** mit Express.js
- **MongoDB** mit Mongoose ODM
- **JWT** für Authentifizierung
- **bcryptjs** für Passwort-Hashing
- **CORS, Helmet, Compression** für Sicherheit

### Entwicklungstools
- **TypeScript** für Typsicherheit
- **ESLint** für Code-Qualität
- **Prettier** für Code-Formatierung
- **Git** für Versionskontrolle

## 📦 Installation

### Voraussetzungen
- Node.js (v16 oder höher)
- MongoDB (lokale Installation oder Atlas)
- Git

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Bearbeite .env mit deinen MongoDB-Daten
npm run start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Datenbank Setup
```bash
# ICD-10 Daten importieren
cd backend
node scripts/importAustrianIcd10.js

# Demo-Daten erstellen
node scripts/setupDemoUser.js
node scripts/setupDemoStaffData.js
node scripts/setupDemoResources.js
```

## 🏗 Projektstruktur

```
ordinationssoftware-at/
├── backend/                 # Node.js Backend
│   ├── controllers/         # API Controller
│   ├── models/             # MongoDB Modelle
│   ├── routes/             # Express Routes
│   ├── middleware/         # Auth & Security
│   ├── services/           # Business Logic
│   └── scripts/            # Setup & Import Scripts
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # React Komponenten
│   │   ├── pages/          # Hauptseiten
│   │   ├── store/          # Redux Store
│   │   ├── templates/      # Medizinische Vorlagen
│   │   └── utils/          # Hilfsfunktionen
│   └── public/             # Statische Assets
├── docs/                   # Dokumentation
└── scripts/                # Deployment Scripts
```

## 🔧 Konfiguration

### Umgebungsvariablen (Backend)
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ordinationssoftware
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Umgebungsvariablen (Frontend)
```env
REACT_APP_API_URL=http://localhost:5001
```

## 📚 API Dokumentation

### Authentifizierung
- `POST /api/auth/login` - Benutzer anmelden
- `POST /api/auth/register` - Benutzer registrieren
- `GET /api/auth/me` - Aktueller Benutzer

### Patienten
- `GET /api/patients` - Alle Patienten
- `POST /api/patients` - Neuen Patienten erstellen
- `PUT /api/patients/:id` - Patienten aktualisieren
- `DELETE /api/patients/:id` - Patienten löschen

### Termine
- `GET /api/appointments` - Alle Termine
- `POST /api/appointments` - Neuen Termin erstellen
- `PUT /api/appointments/:id` - Termin aktualisieren

### Dokumente
- `GET /api/documents` - Alle Dokumente
- `POST /api/documents` - Neues Dokument erstellen
- `GET /api/documents/templates` - Verfügbare Vorlagen

## 🚀 Deployment

### Docker (Empfohlen)
```bash
docker-compose up -d
```

### Manuell
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Statische Dateien auf Webserver bereitstellen
```

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne eine Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

## 🆘 Support

Bei Fragen oder Problemen:
- Erstelle ein Issue auf GitHub
- Kontaktiere das Entwicklungsteam

## 🔮 Roadmap

- [ ] ELGA-Integration vollständig implementieren
- [ ] Mobile App (React Native)
- [ ] KI-gestützte Diagnosevorschläge
- [ ] Integration mit österreichischen Krankenkassen
- [ ] Erweiterte Reporting-Funktionen

## 👥 Team

Entwickelt mit ❤️ für österreichische Ärzt:innen

---

**Wichtiger Hinweis:** Diese Software ist für den Einsatz in österreichischen Arztpraxen entwickelt und berücksichtigt österreichische Gesetze und Standards (DSGVO, ELGA, ICD-10 AT).