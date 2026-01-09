Vollständiges Backup der Ordinationssoftware
============================================

Erstellt am: $(date)

Enthaltene Komponenten:
- Vollständiger Quellcode (ohne node_modules)
- Git-Bundle mit vollständiger Historie
- Alle Konfigurationsdateien
- Alle Dokumentationen

Backup-Verzeichnis:
- Enthält alle Source-Dateien
- Exkludiert: node_modules, .git, logs, bundles

Git-Bundle:
- Vollständige Git-Historie
- Kann mit "git clone backups/ordinationssoftware-git-bundle-*.bundle" wiederhergestellt werden

Wiederherstellung:
1. Quellcode: Kopieren Sie das Backup-Verzeichnis an den gewünschten Ort
2. Git-Repository: git clone backups/ordinationssoftware-git-bundle-*.bundle
3. Dependencies: npm install (im backend und frontend Verzeichnis)
