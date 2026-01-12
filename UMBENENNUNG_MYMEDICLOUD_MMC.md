# Umbenennung: Ordinationssoftware AT → MyMediCloud MMC

## 📋 Übersicht

Diese Liste dokumentiert alle Dateien und Bereiche, die für die Umbenennung von "Ordinationssoftware AT" zu "MyMediCloud MMC" geändert werden müssen.

---

## 🎯 Priorität 1: Sichtbare UI-Texte (Höchste Priorität)

### Frontend - Header & Navigation

1. **`frontend/src/components/Layout/Header.tsx`**
   - Zeile 176: `Ordinationssoftware AT` → `MyMediCloud MMC`
   - **Typ:** Sichtbarer Text im Header

2. **`frontend/src/components/Layout/SidebarNavigation.tsx`**
   - Zeile 87: `Ordinationssoftware` → `MyMediCloud MMC`
   - **Typ:** Sichtbarer Text in der Sidebar

### Frontend - HTML Meta-Tags

3. **`frontend/public/index.html`**
   - Zeile 27: `<title>React App</title>` → `<title>MyMediCloud MMC</title>`
   - Zeile 10: Meta-Description aktualisieren
   - **Typ:** Browser-Tab-Titel und SEO

### Frontend - Login-Seite

4. **`frontend/src/pages/Login.tsx`**
   - Zeile 152: `Ordinationssoftware` → `MyMediCloud MMC`
   - Zeile 260: `admin@ordinationssoftware.at` → `admin@mymedicloud.at` (oder neue E-Mail)
   - **Typ:** Login-UI

---

## 🎯 Priorität 2: Package.json & Projekt-Konfiguration

### Backend

5. **`backend/package.json`**
   - Zeile 2: `"name": "ordinationssoftware-backend"` → `"name": "mymedicloud-backend"`
   - Zeile 4: `"description": "Professionelle Ordinationssoftware..."` → `"description": "MyMediCloud MMC - Professionelle Ordinationssoftware..."`
   - Zeile 21: `"author": "Ordinationssoftware AT"` → `"author": "MyMediCloud MMC"`
   - **Typ:** NPM-Paket-Metadaten

### Frontend

6. **`frontend/package.json`**
   - Zeile 2: `"name": "frontend"` → `"name": "mymedicloud-frontend"` (optional)
   - **Typ:** NPM-Paket-Metadaten

---

## 🎯 Priorität 3: Dokumentation

### Haupt-README

7. **`README.md`** (Root)
   - Zeile 1: `# Ordinationssoftware AT 🇦🇹` → `# MyMediCloud MMC 🇦🇹`
   - Zeile 3: Beschreibung aktualisieren
   - Alle weiteren Vorkommen im Dokument
   - **Typ:** Hauptdokumentation

### Weitere Dokumentationsdateien

8. **`LEISTUNGEN_LEITFADEN.md`**
   - Prüfen auf Vorkommen von "Ordinationssoftware"
   - **Typ:** Leitfaden

9. **`TEST_ONLINE_BOOKING.md`**
   - Prüfen auf Vorkommen von "Ordinationssoftware"
   - **Typ:** Test-Dokumentation

10. **`PRODUCTION_DEPLOYMENT.md`**
    - Prüfen auf Vorkommen von "Ordinationssoftware"
    - **Typ:** Deployment-Dokumentation

11. **`ARCHITECTURE_RECOMMENDATIONS.md`**
    - Prüfen auf Vorkommen von "Ordinationssoftware"
    - **Typ:** Architektur-Dokumentation

12. **`HYBRID_IMPLEMENTATION_GUIDE.md`**
    - Prüfen auf Vorkommen von "Ordinationssoftware"
    - **Typ:** Implementierungs-Guide

13. **`backend/ELGA_GINA_CONFIG.md`**
    - Prüfen auf Vorkommen von "Ordinationssoftware"
    - **Typ:** Konfigurations-Dokumentation

14. **Alle Dateien im `docs/` Ordner**
    - Systematisch durchgehen
    - **Typ:** Verschiedene Dokumentationen

15. **Alle Dateien im `backend/docs/` Ordner**
    - Systematisch durchgehen
    - **Typ:** Backend-Dokumentationen

---

## 🎯 Priorität 4: Backend - Server & Logs

### Server-Dateien

16. **`backend/server.js`**
   - Zeile 562: `Ordinationssoftware Server` → `MyMediCloud MMC Server`
   - Prüfen auf weitere Vorkommen in:
     - Konsolen-Logs
     - Fehlermeldungen
     - Server-Start-Nachrichten
   - **Typ:** Server-Logik

17. **`backend/routes/auth.js`**
   - Prüfen auf Vorkommen in Fehlermeldungen
   - **Typ:** Authentifizierung

18. **`backend/routes/settings.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Einstellungen

---

## 🎯 Priorität 5: Frontend - Seiten & Komponenten

### Seiten mit möglichen Vorkommen

19. **`frontend/src/pages/Settings.tsx`**
   - Prüfen auf Vorkommen
   - **Typ:** Einstellungsseite

20. **`frontend/src/pages/ELGA.tsx`**
   - Prüfen auf Vorkommen
   - **Typ:** ELGA-Seite

21. **`frontend/src/pages/ECardValidation.tsx`**
   - Prüfen auf Vorkommen
   - **Typ:** eCard-Validierung

22. **`frontend/src/pages/ServiceCatalog.tsx`**
   - Prüfen auf Vorkommen in Kommentaren/Texten
   - **Typ:** Service-Katalog

23. **Alle anderen Seiten in `frontend/src/pages/`**
   - Systematisch durchgehen
   - **Typ:** Verschiedene Seiten

---

## 🎯 Priorität 6: Utilities & Services

### Frontend Utilities

24. **`frontend/src/utils/rbac.ts`**
   - Prüfen auf Vorkommen in Kommentaren
   - **Typ:** RBAC-Utilities

25. **`frontend/src/utils/placeholders.ts`**
   - Prüfen auf Vorkommen in Platzhalter-Texten
   - **Typ:** Platzhalter

### Backend Utilities

26. **`backend/utils/timezone.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Timezone-Utilities

27. **`backend/utils/rbac.js`**
   - Prüfen auf Vorkommen
   - **Typ:** RBAC-Utilities

### Backend Services

28. **`backend/services/dataBreachService.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Datenschutz-Service

29. **`backend/services/dataRetentionService.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Datenaufbewahrung-Service

30. **`backend/services/ogkTariffDownloader.js`**
   - Prüfen auf Vorkommen
   - **Typ:** ÖGK-Tarif-Downloader

31. **`backend/services/emailService.js`** (falls vorhanden)
   - Prüfen auf Vorkommen in E-Mail-Vorlagen
   - **Typ:** E-Mail-Service

---

## 🎯 Priorität 7: Scripts

### Backend Scripts

32. **`backend/scripts/test-journal-location-filter.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Test-Script

33. **`backend/scripts/test-journal-filter.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Test-Script

34. **`backend/scripts/check-journal-status.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Check-Script

35. **`backend/scripts/create-missing-journal-entries.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Migration-Script

36. **`backend/scripts/encrypt-existing-data.js`**
   - Prüfen auf Vorkommen
   - **Typ:** Verschlüsselungs-Script

37. **Alle anderen Scripts in `backend/scripts/`**
   - Systematisch durchgehen
   - **Typ:** Verschiedene Scripts

---

## 🎯 Priorität 8: Konfigurationsdateien

### Environment-Dateien

38. **`.env` Dateien** (falls vorhanden)
   - Prüfen auf Vorkommen in Kommentaren
   - **Typ:** Umgebungsvariablen

39. **`backend/billing-config.env.example`**
   - Prüfen auf Vorkommen
   - **Typ:** Beispiel-Konfiguration

40. **`backend/email-config.example`**
   - Prüfen auf Vorkommen
   - **Typ:** Beispiel-Konfiguration

41. **`backend/one-click-billing.env.example`**
   - Prüfen auf Vorkommen
   - **Typ:** Beispiel-Konfiguration

42. **`backend/update-config.env.example`**
   - Prüfen auf Vorkommen
   - **Typ:** Beispiel-Konfiguration

---

## 🎯 Priorität 9: Manifest & PWA

### Frontend Manifest

43. **`frontend/public/manifest.json`** (falls vorhanden)
   - `name`, `short_name`, `description` aktualisieren
   - **Typ:** PWA-Manifest

---

## 🎯 Priorität 10: Backup-Dateien (Optional)

### Backup-Ordner

44. **`backups/` Ordner**
   - **Hinweis:** Backup-Dateien müssen NICHT geändert werden
   - Diese sind historische Snapshots
   - **Typ:** Backups (ignorieren)

---

## 📝 Suchmuster

### Zu suchende Begriffe:

1. **"Ordinationssoftware AT"** (exakt)
2. **"Ordinationssoftware"** (alleinstehend)
3. **"ordinationssoftware"** (kleingeschrieben)
4. **"Ordinationssoftware AT"** (mit Leerzeichen)
5. **"ordinationssoftware-at"** (mit Bindestrich)
6. **"ordinationssoftware-backend"** (in package.json)
7. **"Ordinationssoftware"** (in Kommentaren)

### Ersetzungsvorschläge:

- **UI-Texte:** `MyMediCloud MMC`
- **Kurzform (Menüs):** `MMC`
- **Technischer Name:** `mymedicloud` oder `mmc`
- **Package-Namen:** `mymedicloud-backend`, `mymedicloud-frontend`

---

## 🔍 Vorgehen

### Schritt 1: Suchen & Finden
```bash
# Alle Vorkommen finden
grep -r "Ordinationssoftware" --include="*.tsx" --include="*.ts" --include="*.js" --include="*.json" --include="*.md" .
grep -r "ordinationssoftware" --include="*.tsx" --include="*.ts" --include="*.js" --include="*.json" --include="*.md" .
```

### Schritt 2: Systematisch ersetzen
1. **Priorität 1** zuerst (UI-Texte)
2. **Priorität 2** (Package.json)
3. **Priorität 3** (Dokumentation)
4. **Priorität 4-10** (Rest)

### Schritt 3: Testen
- Frontend starten und UI prüfen
- Backend starten und Logs prüfen
- Alle Seiten durchgehen
- Dokumentation prüfen

---

## ⚠️ Wichtige Hinweise

1. **Workspace-Name:** Der Ordner `ordinationssoftware-at/` kann bleiben (technischer Name)
2. **Git-Repository:** Repository-Name kann separat geändert werden
3. **Datenbank:** Keine Änderungen in der Datenbank nötig
4. **Backups:** Backup-Dateien NICHT ändern
5. **Konsistenz:** Einheitliche Schreibweise verwenden

---

## 📊 Statistiken

- **Gefundene Dateien:** ~228 Dateien enthalten "Ordinationssoftware" oder "ordinationssoftware"
- **Kritische Dateien:** ~10-15 Dateien (UI, package.json, README)
- **Dokumentation:** ~50+ Dateien
- **Scripts:** ~30+ Dateien
- **Backend-Code:** ~40+ Dateien
- **Frontend-Code:** ~20+ Dateien

---

## ✅ Checkliste für die Umsetzung

- [ ] Priorität 1: UI-Texte (Header, Sidebar, Login)
- [ ] Priorität 2: package.json Dateien
- [ ] Priorität 3: README.md und Hauptdokumentation
- [ ] Priorität 4: Backend server.js und Routes
- [ ] Priorität 5: Frontend Seiten
- [ ] Priorität 6: Utilities & Services
- [ ] Priorität 7: Scripts
- [ ] Priorität 8: Konfigurationsdateien
- [ ] Priorität 9: Manifest & PWA
- [ ] Test: Frontend starten und prüfen
- [ ] Test: Backend starten und prüfen
- [ ] Test: Alle Seiten durchgehen
- [ ] Finale Überprüfung: Alle Vorkommen gefunden und ersetzt

---

## 🎨 Branding-Überlegungen

### Empfohlene Verwendung:

- **Vollständiger Name:** "MyMediCloud MMC" (für Titel, Header, Dokumentation)
- **Kurzform:** "MMC" (für Menüs, Buttons, kompakte Anzeigen)
- **Technischer Name:** "mymedicloud" (für Code, Variablen, Dateinamen)

### Beispiele:

- Header: "MyMediCloud MMC"
- Sidebar: "MMC" oder "MyMediCloud MMC"
- Browser-Tab: "MyMediCloud MMC"
- package.json name: "mymedicloud-backend"
- README Titel: "# MyMediCloud MMC"

---

**Erstellt:** 2026-01-12  
**Status:** Vorbereitung - Noch nicht umgesetzt
