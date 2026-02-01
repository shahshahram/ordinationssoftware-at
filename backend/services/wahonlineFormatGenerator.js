const { XMLBuilder } = require('fast-xml-parser');
const { decryptField, isEncrypted } = require('../utils/fieldEncryption');
const wahonlineConfig = require('../config/wahonline.config');

class WAHonlineFormatGenerator {
  constructor() {
    this.config = wahonlineConfig.getActiveConfig();
  }

  setConfig(cfg) {
    if (cfg) this.config = cfg;
  }

  generateMeldung(data) {
    let { performance, patient, doctor } = data;

    // --- LOGIK FÜR MONTAG (SIT-TEST) ---
    // Erzwingt den Test-Patienten "Mark", egal welchen Patient Sie in der DB wählen.
    const isSIT = process.env.ELDA_ENVIRONMENT === 'sit' || this.config?.environment === 'sit';

    if (isSIT) {
      console.log('⚠️ SIT-Modus aktiv: Überschreibe Patientendaten mit Test-Patient "Mark"');
      patient = {
        ...patient,
        socialSecurityNumber: '1137041190', // Der einzige VSNR, die im Test funktioniert
        firstName: 'Mark',
        lastName: 'ASWH-VS-MRSA-Familie-A',
        insuranceProvider: 'ÖGK'
      };
    }

    // VSNR Entschlüsselung (Sicherheitsnetz)
    let vsnr = patient.socialSecurityNumber || patient.insuranceNumber;
    if (vsnr && isEncrypted(vsnr)) {
      try {
        vsnr = decryptField(vsnr);
      } catch (e) {
        console.error('VSNR Entschlüsselungsfehler:', e);
      }
    }

    // XML Builder konfigurieren
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      suppressEmptyNode: true
    });

    // --- DAS KRITISCHE XML MIT n1: NAMESPACE ---
    const xmlData = {
      'n1:WahOnlineAnfrage': {
        '@_xmlns:n1': 'http://www.elda.at/schema/wah/v7-04',
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',

        'n1:Kopfdaten': {
          'n1:Absender': {
            'n1:TeilnehmerID': doctor.chamberNumber || '100014', // Test-VPNR Vanessa
            'n1:Name': `${doctor.firstName || doctor.first_name || ''} ${doctor.lastName || doctor.last_name || ''}`.trim()
          },
          'n1:Erstellungszeitpunkt': new Date().toISOString()
        },

        'n1:Behandlungsdaten': {
          'n1:Patient': {
            'n1:VSNR': vsnr,
            'n1:Vorname': patient.firstName || patient.first_name || '',
            'n1:Nachname': patient.lastName || patient.last_name || ''
          },
          'n1:Leistungen': {
            'n1:Leistung': {
              'n1:Positionsnummer': performance.serviceCode || '1',
              'n1:Bezeichnung': performance.serviceDescription || 'Ordination',
              'n1:Datum': new Date(performance.serviceDatetime || Date.now()).toISOString().split('T')[0],
              'n1:Anzahl': performance.quantity || 1,
              'n1:Betrag': Number(performance.totalPrice || performance.unitPrice || 0).toFixed(2)
            }
          },
          // Diagnosen nur wenn vorhanden
          ...(performance.diagnosisCodes &&
            performance.diagnosisCodes.length > 0 && {
              'n1:Diagnosen': {
                'n1:Diagnose': performance.diagnosisCodes.map((code) => ({
                  'n1:ICDCode': typeof code === 'string' ? code : code.code || code
                }))
              }
            })
        }
      }
    };

    return builder.build(xmlData);
  }

  /**
   * Für Kompatibilität mit wahonlineConnector: wenn generateMeldung bereits XML zurückgibt, wird es durchgereicht.
   */
  generateXML(dataset) {
    return typeof dataset === 'string' ? dataset : '';
  }
}

module.exports = new WAHonlineFormatGenerator();
