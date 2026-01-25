# Anleitung: Custom Role Permissions erstellen und sichtbar machen

## 🎯 Ziel

Diese Anleitung zeigt Ihnen, wie Sie Custom Permissions für System-Rollen erstellen, damit die neuen visuellen Indikatoren (Badge "Angepasst", etc.) sichtbar werden.

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: RBAC Management öffnen

1. **Navigieren Sie zu RBAC Management**
   - Klicken Sie im Menü auf **"RBAC Management"** oder gehen Sie direkt zu `/rbac-management`
   - Sie benötigen Admin- oder Super-Admin-Rechte

2. **Überprüfen Sie die Rollen-Liste**
   - Sie sehen alle System-Rollen (Super Admin, Admin, Arzt, Assistent, Rezeption, Billing, Patient)
   - Aktuell haben diese noch **keine** Custom Permissions (kein "Angepasst"-Badge sichtbar)

---

### Schritt 2: Eine System-Rolle bearbeiten

1. **Wählen Sie eine Rolle aus**
   - Beispiel: Klicken Sie auf die Rolle **"Arzt"**
   - Sie sehen die Rollen-Karte mit den aktuellen Permissions

2. **Klicken Sie auf "Bearbeiten"**
   - Der **Edit-Button** (✏️) befindet sich oben rechts in der Rollen-Karte
   - Ein Dialog öffnet sich: **"Rolle bearbeiten"**

3. **Lesen Sie den Hinweis**
   - Im Dialog sehen Sie einen **blauen Info-Banner**:
   - *"System-Rolle: Sie bearbeiten eine System-Rolle. Änderungen werden als Custom Permissions gespeichert..."*

---

### Schritt 3: Permissions anpassen

1. **Scrollen Sie zur Permission-Matrix**
   - Im Dialog sehen Sie alle Resources (patient, appointment, document, etc.)
   - Für jede Resource gibt es Switches für alle Actions (create, read, update, delete, etc.)

2. **Ändern Sie eine Permission**
   - **Beispiel 1**: Entfernen Sie `patient.delete` für die Rolle "Arzt"
     - Scrollen Sie zu "patient"
     - Schalten Sie den Switch für "delete" aus (von ON zu OFF)
   
   - **Beispiel 2**: Fügen Sie `billing.create` hinzu
     - Scrollen Sie zu "billing"
     - Schalten Sie den Switch für "create" ein (von OFF zu ON)

3. **Optional: Geben Sie einen Grund an**
   - Im Backend können Sie optional einen `changeReason` angeben
   - Dies wird für Audit-Zwecke gespeichert

---

### Schritt 4: Speichern

1. **Klicken Sie auf "Aktualisieren"**
   - Der Button befindet sich unten rechts im Dialog
   - Die Änderungen werden als Custom Permissions im Backend gespeichert

2. **Warten Sie auf Bestätigung**
   - Eine grüne Snackbar-Nachricht erscheint: *"Rolle erfolgreich aktualisiert"*
   - Die Seite lädt automatisch neu

---

### Schritt 5: Sichtbare Änderungen prüfen

Nach dem Speichern sollten Sie **sofort** folgende Änderungen sehen:

#### ✅ **Badge "Angepasst"**
- **Wo**: Neben dem Rollen-Namen in der Rollen-Karte
- **Aussehen**: Gelber Chip mit "Angepasst" Text und Edit-Icon
- **Beispiel**:
  ```
  [Arzt] [System] [Angepasst] ← Dieser Badge erscheint jetzt!
  ```

#### ✅ **Chip "Custom Permissions aktiv"**
- **Wo**: Unter dem Rollen-Namen, neben "Level: X | Permissions: Y"
- **Aussehen**: Kleiner gelber Chip mit Text "Custom Permissions aktiv"
- **Beispiel**:
  ```
  Level: 4 | Permissions: 15 [Custom Permissions aktiv] ← Dieser Chip erscheint!
  ```

#### ✅ **Restore-Button (Wiederherstellen)**
- **Wo**: Neben dem Edit-Button, oben rechts in der Rollen-Karte
- **Aussehen**: Gelbes/Orange Icon (Wiederherstellen-Symbol)
- **Tooltip**: "Angepasste Permissions zurücksetzen"
- **Funktion**: Setzt Custom Permissions auf Standard zurück

---

## 🧪 Test-Szenario: Komplettes Beispiel

### Szenario: "Arzt" darf keine Patienten löschen

1. **Öffnen Sie RBAC Management**

2. **Klicken Sie auf "Arzt" → "Bearbeiten"**

3. **Entfernen Sie `patient.delete`**:
   - Scrollen Sie zu "patient"
   - Finden Sie den Switch für "delete"
   - Schalten Sie ihn aus (OFF)

4. **Speichern Sie** (Button "Aktualisieren")

5. **Erwartetes Ergebnis**:
   - ✅ Badge "Angepasst" erscheint
   - ✅ Chip "Custom Permissions aktiv" erscheint
   - ✅ Restore-Button erscheint
   - ✅ Die Rolle "Arzt" hat jetzt keine `patient.delete` Permission mehr

6. **Testen Sie die Änderung**:
   - Gehen Sie zu Tab "Test"
   - Wählen Sie einen Benutzer mit Rolle "Arzt"
   - Testen Sie: Action `delete` auf Resource `patient`
   - **Erwartet**: Autorisierung sollte verweigert werden

---

## 🔄 Custom Permissions zurücksetzen

### Methode 1: Über den Restore-Button

1. **Klicken Sie auf den Restore-Button** (Wiederherstellen-Icon)
2. **Bestätigen Sie** die Rückfrage
3. **Ergebnis**: Custom Permissions werden gelöscht, Standard-Permissions werden wiederhergestellt
4. **Sichtbar**: Badge "Angepasst" und Chip verschwinden

### Methode 2: Über den Bearbeiten-Dialog

1. **Öffnen Sie die Rolle erneut** → "Bearbeiten"
2. **Setzen Sie alle Permissions zurück** auf die Standard-Werte
3. **Speichern Sie**
4. **Ergebnis**: Custom Permissions werden überschrieben

---

## 📊 Visueller Vergleich

### Vorher (Standard-Permissions):
```
┌─────────────────────────────────────┐
│ [Arzt] [System]                     │
│                                      │
│ Medizinische Behandlung...          │
│ Level: 4 | Permissions: 15          │
│                                      │
│ [✏️ Bearbeiten]                     │
└─────────────────────────────────────┘
```

### Nachher (mit Custom Permissions):
```
┌─────────────────────────────────────┐
│ [Arzt] [System] [Angepasst] ⚠️      │
│                                      │
│ Medizinische Behandlung...          │
│ Level: 4 | Permissions: 14          │
│ [Custom Permissions aktiv] ⚠️       │
│                                      │
│ [✏️ Bearbeiten] [🔄 Wiederherstellen]│
└─────────────────────────────────────┘
```

---

## ⚠️ Wichtige Hinweise

### Was passiert beim Speichern?

1. **Backend speichert Custom Permissions**
   - Die Änderungen werden in `RolePermission` Model gespeichert
   - Standard-Permissions bleiben unverändert
   - Custom Permissions überschreiben Standard-Permissions

2. **Cache wird gelöscht**
   - Permission-Cache wird automatisch invalidiert
   - Änderungen sind sofort wirksam

3. **Audit-Log wird erstellt**
   - Alle Änderungen werden protokolliert
   - Siehe Tab "Audit Logs" in RBAC Management

### Was passiert beim Zurücksetzen?

1. **Custom Permissions werden gelöscht**
   - `RolePermission` Eintrag wird entfernt
   - Standard-Permissions werden wieder aktiv

2. **Badge verschwindet**
   - "Angepasst"-Badge wird entfernt
   - Chip "Custom Permissions aktiv" verschwindet
   - Restore-Button verschwindet

---

## 🎓 Best Practices

### ✅ Empfohlen:

1. **Dokumentieren Sie Änderungen**
   - Geben Sie einen Grund an (wenn möglich)
   - Notieren Sie, warum Custom Permissions erstellt wurden

2. **Testen Sie vor der Produktion**
   - Verwenden Sie den "Test"-Tab
   - Prüfen Sie, ob Autorisierungen korrekt funktionieren

3. **Regelmäßig prüfen**
   - Überprüfen Sie Custom Permissions regelmäßig
   - Entfernen Sie nicht mehr benötigte Custom Permissions

### ❌ Nicht empfohlen:

1. **Zu viele Custom Permissions**
   - Vermeiden Sie zu viele Anpassungen
   - Erwägen Sie stattdessen eine neue Rolle zu erstellen

2. **Ohne Grund ändern**
   - Ändern Sie Permissions nur, wenn es einen guten Grund gibt
   - Dokumentieren Sie den Grund

---

## 🔍 Troubleshooting

### Problem: Badge erscheint nicht nach dem Speichern

**Lösung**:
1. Prüfen Sie, ob die Seite neu geladen wurde
2. Hard Refresh: `Cmd+Shift+R` (Mac) oder `Ctrl+Shift+R` (Windows)
3. Prüfen Sie die Browser-Konsole auf Fehler
4. Prüfen Sie, ob `hasCustomPermissions` im Backend gesetzt ist

### Problem: Änderungen werden nicht gespeichert

**Lösung**:
1. Prüfen Sie die Browser-Konsole auf Fehler
2. Prüfen Sie die Network-Tab im Browser (API-Response)
3. Prüfen Sie Backend-Logs
4. Stellen Sie sicher, dass Sie Admin-Rechte haben

### Problem: Restore-Button funktioniert nicht

**Lösung**:
1. Prüfen Sie, ob die API-Route `/api/rbac/roles/:role/permissions` (DELETE) existiert
2. Prüfen Sie Backend-Logs
3. Prüfen Sie Browser-Konsole auf Fehler

---

## 📝 Zusammenfassung

### So erstellen Sie Custom Permissions:

1. ✅ Gehen Sie zu RBAC Management
2. ✅ Klicken Sie auf eine System-Rolle → "Bearbeiten"
3. ✅ Ändern Sie Permissions in der Matrix
4. ✅ Speichern Sie
5. ✅ Badge "Angepasst" erscheint automatisch

### Sichtbare Indikatoren:

- ✅ **Badge "Angepasst"** - Gelber Chip neben Rollen-Namen
- ✅ **Chip "Custom Permissions aktiv"** - Unter dem Rollen-Namen
- ✅ **Restore-Button** - Wiederherstellen-Icon neben Edit-Button

### Zurücksetzen:

- ✅ Klicken Sie auf Restore-Button
- ✅ Oder setzen Sie Permissions im Bearbeiten-Dialog zurück

---

**Viel Erfolg beim Testen!** 🎉
