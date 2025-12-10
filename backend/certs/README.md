# Zertifikatsverzeichnis

Dieses Verzeichnis enthält die Zertifikate für ELGA und GINA.

## Wichtige Sicherheitshinweise

⚠️ **NIEMALS Zertifikate oder private Schlüssel committen!**

Dieses Verzeichnis ist in `.gitignore` eingetragen.

## Erforderliche Dateien

### ELGA-Zertifikate

- `elga-client.crt` - Client-Zertifikat von ELGA
- `elga-client.key` - Privater Schlüssel (NICHT teilen!)
- `elga-ca.crt` - CA-Zertifikat (optional)

### GINA-Zertifikate

- `gina-client.crt` - Client-Zertifikat von GINA/SVC
- `gina-client.key` - Privater Schlüssel (NICHT teilen!)
- `gina-ca.crt` - CA-Zertifikat (optional)

## Zertifikate beantragen

### ELGA

1. Kontaktieren Sie ELGA für die Zertifikatsbeantragung
2. Weitere Informationen: https://www.elga.gv.at/
3. Dokumentation: https://www.elga.gv.at/technik/

### GINA/SVC

1. Kontaktieren Sie die SVC (Sozialversicherungs-Chipkarten Betriebs- und Errichtungsgesellschaft m.b.H.)
2. Weitere Informationen: https://www.svc.at/
3. Technische Dokumentation: https://www.svc.at/technik/

## Berechtigungen setzen

Nach dem Einrichten der Zertifikate:

```bash
# Private Schlüssel schützen
chmod 600 elga-client.key
chmod 600 gina-client.key

# Zertifikate lesbar machen
chmod 644 elga-client.crt
chmod 644 gina-client.crt
chmod 644 elga-ca.crt
chmod 644 gina-ca.crt
```

## Test-Zertifikate

Für die Entwicklung können Test-Zertifikate verwendet werden. Diese erhalten Sie von ELGA/GINA für die Test-Umgebung.

## Produktions-Zertifikate

Für die Produktionsumgebung müssen Sie offizielle Zertifikate von ELGA und GINA beantragen. Diese werden nach erfolgreicher Registrierung und Zertifizierung ausgestellt.












