# SIT-Testdaten (ELDA/WAHonline)

Nur die in den offiziellen ELDA-Testdaten-Dateien angeführten Personen sind in der SIT-Plattform eingerichtet.

## Option 1: CSV-Pfade per Umgebungsvariable

In `backend/.env`:

```bash
# Pfad zur Stammdaten-CSV (Patienten)
SIT_STAMMDATEN_CSV=/Users/IhrName/Downloads/Stammdaten_ASWH_MRSA_20251219.csv

# Pfad zur Vertragspartner-Arzt-CSV
SIT_VERTRAGSPARTNER_ARZT_CSV=/Users/IhrName/Downloads/ASWH_Vertragspartner_20250617/ASWH-VP-Arzt-Linz-A-Tabelle 1.csv
```

## Option 2: Dateien hier ablegen

Kopieren Sie die CSV-Dateien in dieses Verzeichnis:

- `Stammdaten_ASWH_MRSA_20251219.csv` (von ELDA/ÖGK)
- `ASWH-VP-Arzt-Linz-A-Tabelle 1.csv` (aus dem Ordner ASWH_Vertragspartner_20250617)

Dann werden sie automatisch verwendet (Standardpfade).

## Fallback

Wenn keine CSV geladen werden kann, werden die fest hinterlegten Testdaten verwendet:

- **Patient:** Mark, ASWH-VS-MRSA-Familie-A, VSNR 1137041190, Duftschmidgasse 18, 4020 Linz
- **Vertragspartner/Arzt:** Vanessa, ASWH-VP-Arzt-Linz-A, VPNR 100014, Gruberstraße 77, 4020 Linz, Fachgebiet 01

Diese entsprechen den ersten Einträgen der offiziellen CSVs.
