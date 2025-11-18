# Jährliches Service-Katalog Update System

## 🎯 Übersicht

Das jährliche Service-Katalog Update System sorgt dafür, dass der Leistungskatalog der Praxis immer aktuell bleibt und den neuesten EBM-Vorgaben entspricht.

## 📅 Warum jährliche Updates notwendig sind

### Gesetzliche Vorgaben
- **EBM (Einheitlicher Bewertungsmaßstab)** wird jährlich aktualisiert
- **ÖGK** veröffentlicht neue Kataloge und Preise
- **Krankenkassen** verlangen aktuelle EBM-Nummern für Abrechnungen
- **Compliance** mit medizinischen Standards

### Praktische Gründe
- **Preisanpassungen** basierend auf Inflation
- **Neue Behandlungsmethoden** und Technologien
- **Veraltete Leistungen** werden entfernt oder geändert
- **Korrekte Abrechnung** mit Krankenkassen

## 🔧 Implementierung

### 1. Automatisches Update-Script
```bash
# Script: backend/scripts/update-service-catalog-annual.js
# Führt jährliche Updates durch:
# - Neue Leistungen hinzufügen
# - Preisanpassungen (Inflationsausgleich)
# - Veraltete Leistungen deaktivieren
# - EBM-Code Änderungen
```

### 2. Cron-Job Setup
```bash
# Script: scripts/run-annual-service-update.sh
# Wird am 1. Januar jeden Jahres ausgeführt
```

### 3. Cron-Job Konfiguration
```bash
# Füge folgende Zeile zur crontab hinzu:
# 0 2 1 1 * /path/to/scripts/run-annual-service-update.sh

# Erklärt:
# 0 2 1 1 * = 2:00 Uhr am 1. Januar jeden Jahres
```

## 📊 Was wird aktualisiert

### Neue Leistungen
- **Telemedizinische Beratung** (Videosprechstunde)
- **KI-gestützte Diagnostik** (KI-Befundung)
- **Neue Behandlungsmethoden** je nach Fachrichtung

### Preisanpassungen
- **Inflationsausgleich** (aktuell 3.5%)
- **Fachspezifische Anpassungen**:
  - Allgemeinmedizin: +3.5%
  - Chirurgie: +4.0%
  - Radiologie: +3.0%

### Veraltete Leistungen
- **Deaktivierung** nicht mehr abrechenbarer Leistungen
- **EBM-Code Änderungen** bei Strukturänderungen
- **Hinweise** in den Notizen

## 🚀 Manuelle Ausführung

### Update-Script direkt ausführen
```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend/scripts
node update-service-catalog-annual.js
```

### Mit Logging
```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at
./scripts/run-annual-service-update.sh
```

## 📋 Vorbereitung für Updates

### 1. EBM-Daten sammeln
- **ÖGK-Katalog** herunterladen
- **Neue EBM-Nummern** identifizieren
- **Preisänderungen** dokumentieren

### 2. Update-Script anpassen
```javascript
// In: backend/scripts/update-service-catalog-annual.js
const EBM_UPDATES_2025 = {
  newServices: [
    // Neue Leistungen hier hinzufügen
  ],
  priceAdjustments: {
    inflationRate: 0.035, // Aktuelle Inflationsrate
    adjustments: [
      // Preisanpassungen hier definieren
    ]
  }
};
```

### 3. Backup erstellen
```bash
# Vor jedem Update:
mongodump --db ordinationssoftware --out backup-$(date +%Y-%m-%d)
```

## 🔍 Monitoring und Logging

### Log-Dateien
- **Jährliche Logs**: `backend/logs/service-catalog-update-YYYY-MM-DD.log`
- **Audit Logs**: In der Datenbank unter `AuditLog` Collection

### Überwachung
- **E-Mail-Benachrichtigungen** bei Erfolg/Fehler
- **Dashboard-Anzeige** der letzten Updates
- **Versionierung** aller Änderungen

## ⚠️ Wichtige Hinweise

### Vor dem Update
1. **Backup** der Datenbank erstellen
2. **Test-Umgebung** verwenden
3. **EBM-Daten** validieren
4. **Benutzer** informieren

### Nach dem Update
1. **Logs** überprüfen
2. **Funktionalität** testen
3. **Benutzer** schulen
4. **Dokumentation** aktualisieren

## 🛠️ Troubleshooting

### Häufige Probleme
- **Datenbankverbindung** fehlgeschlagen
- **EBM-Codes** bereits vorhanden
- **Preisanpassungen** fehlgeschlagen
- **Berechtigungen** unzureichend

### Lösungen
```bash
# Logs überprüfen
tail -f backend/logs/service-catalog-update-*.log

# Manueller Rollback
node scripts/rollback-service-catalog.js

# Datenbank-Status prüfen
mongo --eval "db.ServiceCatalog.countDocuments({is_active: true})"
```

## 📞 Support

Bei Problemen mit dem Update-System:
1. **Logs** überprüfen
2. **Datenbank-Status** prüfen
3. **Support-Team** kontaktieren
4. **Rollback** durchführen falls nötig

---

**Letzte Aktualisierung**: Januar 2025  
**Nächstes Update**: Januar 2026






