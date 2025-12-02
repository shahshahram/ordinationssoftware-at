# Git-Schutz und Backup-Anleitung

## Übersicht

Dieses System verhindert Datenverlust durch uncommitted Änderungen mit automatischen Backups und Git-Hooks.

## Installation

```bash
# Führe das Setup-Script aus
./scripts/setup-git-protection.sh
```

## Verfügbare Tools

### 1. Automatisches Backup

**Manuell:**
```bash
./scripts/backup-repository.sh
# oder
git backup
```

**Automatisch (täglich um 2 Uhr):**
Füge zu `crontab -e` hinzu:
```
0 2 * * * /pfad/zum/repo/scripts/backup-repository.sh >> /pfad/zum/repo/backup.log 2>&1
```

**Was wird gesichert:**
- Alle Dateien (außer node_modules, .git, etc.)
- Git-Status und Diffs
- Automatischer Stash bei uncommitted Änderungen
- Backups werden 30 Tage aufbewahrt

**Backup-Verzeichnis:**
`~/.ordinationssoftware-backups/`

### 2. Automatischer WIP-Commit

**Schnell:**
```bash
git save          # Erstellt WIP-Commit ohne Bestätigung
git wip           # Noch schnellerer WIP-Commit
```

**Mit Bestätigung:**
```bash
./scripts/auto-commit-wip.sh
```

**Mit Push:**
```bash
./scripts/auto-commit-wip.sh --yes --push
```

### 3. Git-Hooks (Automatische Warnungen)

**pre-checkout:**
- Warnt vor Branch-Wechsel mit uncommitted Änderungen
- Fragt nach Bestätigung

**pre-reset:**
- Warnt vor `git reset` mit uncommitted Änderungen
- Verhindert versehentlichen Datenverlust

**post-commit:**
- Erinnert an Push nach Commit
- Zeigt verbleibende uncommitted Änderungen

## Best Practices

### Täglicher Workflow

1. **Morgens:**
   ```bash
   git status          # Prüfe Status
   git pull            # Hole Updates
   ```

2. **Während der Arbeit:**
   ```bash
   git save            # Alle 2-3 Stunden
   ```

3. **Abends:**
   ```bash
   git save            # Alle Änderungen committen
   git push            # Zum Remote pushen
   git backup          # Optional: Backup erstellen
   ```

### Vor gefährlichen Operationen

**Vor Branch-Wechsel:**
```bash
git status            # Prüfe uncommitted Änderungen
git save              # Committe oder stash
```

**Vor git reset:**
```bash
git save              # Sicherheits-Commit
# oder
git stash             # Temporär speichern
```

**Vor git pull mit Konflikten:**
```bash
git save              # Lokale Änderungen sichern
git pull              # Dann pullen
```

## Wiederherstellung

### Aus Backup wiederherstellen

```bash
# Liste aller Backups
ls -la ~/.ordinationssoftware-backups/

# Backup wiederherstellen
cp -r ~/.ordinationssoftware-backups/backup_YYYYMMDD_HHMMSS/* /pfad/zum/repo/
```

### Aus Stash wiederherstellen

```bash
# Liste aller Stashes
git stash list

# Stash wiederherstellen
git stash pop        # Wiederherstellen und löschen
# oder
git stash apply      # Wiederherstellen, behalten
```

### Aus Git Reflog wiederherstellen

```bash
# Zeige alle Git-Operationen
git reflog

# Wiederherstelle gelöschten Commit
git cherry-pick <commit-hash>
```

## Troubleshooting

### Hook funktioniert nicht

```bash
# Prüfe ob Hook ausführbar ist
ls -la .git/hooks/

# Mache Hook ausführbar
chmod +x .git/hooks/pre-checkout
```

### Backup-Script funktioniert nicht

```bash
# Prüfe Berechtigungen
chmod +x scripts/backup-repository.sh

# Teste manuell
./scripts/backup-repository.sh
```

### Git-Alias funktioniert nicht

```bash
# Prüfe Aliase
git config --local --list | grep alias

# Setze Alias neu
git config --local alias.save "!bash scripts/auto-commit-wip.sh --yes"
```

## Wichtige Hinweise

⚠️ **Diese Tools schützen vor versehentlichem Datenverlust, aber:**
- Sie ersetzen nicht regelmäßige Commits
- Sie ersetzen nicht regelmäßige Pushes zum Remote
- Sie ersetzen nicht System-Backups (Time Machine, etc.)

✅ **Empfohlene Strategie:**
1. Täglich committen (auch WIP)
2. Täglich pushen
3. Wöchentlich vollständiges Backup
4. Monatlich System-Backup

## Support

Bei Problemen:
1. Prüfe `git status`
2. Prüfe Backups in `~/.ordinationssoftware-backups/`
3. Prüfe Git Reflog: `git reflog`
4. Prüfe IDE Local History (falls verfügbar)

