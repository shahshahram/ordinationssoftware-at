const { XMLBuilder } = require('fast-xml-parser');
const { decryptField, isEncrypted } = require('../utils/fieldEncryption');
const wahonlineConfig = require('../config/wahonline.config');
const sitTestdata = require('../data/sitTestdata');

/** ELDA WA_V7-04: Namespace und Schema für honorarnotenMeldung (SIT/WebTrans) – laut ELDA-Support. */
const HONORARNOTEN_NS = 'http://at.sozvers.stp.elda.wa';
const HONORARNOTEN_SCHEMA = 'WA_V7-04_2025.xsd';

/** Root-Opening-Tag OHNE Default-Namespace xmlns (XSD unqualified: Kind-Elemente namespace-frei). */
const ROOT_OPEN_TAG = `<n1:honorarnotenMeldung akz="a" xsi:schemaLocation="http://at.sozvers.stp.elda.wa ${HONORARNOTEN_SCHEMA}" xmlns:n1="http://at.sozvers.stp.elda.wa" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;

class WAHonlineFormatGenerator {
  constructor() {
    this.config = wahonlineConfig.getActiveConfig();
  }

  setConfig(cfg) {
    if (cfg) this.config = cfg;
  }

  /**
   * Erzeugt XML im ELDA-Format n1:honorarnotenMeldung (WA_V7-04_2025.xsd) für WebTrans/SIT.
   * Root: n1:honorarnotenMeldung, Attributreihenfolge und Feldreihenfolge laut ELDA-Support.
   */
  generateMeldung(data) {
    let { performance, patient, doctor } = data;

    const isSIT = process.env.ELDA_ENVIRONMENT === 'sit' || this.config?.environment === 'sit';

    if (isSIT) {
      patient = sitTestdata.getSitPatient('1137041190');
      doctor = sitTestdata.getSitDoctor();
      console.log(`⚠️ SIT-Modus aktiv: Patient "${patient.firstName} ${patient.lastName}" (VSNR ${patient.socialSecurityNumber}), Vertragspartner "${doctor.firstName} ${doctor.lastName}" (${doctor.chamberNumber})`);
    }

    let vsnr = patient.socialSecurityNumber || patient.insuranceNumber;
    if (vsnr && isEncrypted(vsnr)) {
      try {
        vsnr = decryptField(vsnr);
      } catch (e) {
        console.error('VSNR Entschlüsselungsfehler:', e);
      }
    }

    const todayIso = new Date().toISOString().split('T')[0];
    let serviceDate = performance.serviceDatetime
      ? new Date(performance.serviceDatetime).toISOString().split('T')[0]
      : todayIso;
    if (serviceDate > todayIso) {
      serviceDate = todayIso;
    }
    // ELDA xs:dateTime ohne Millisekunden: YYYY-MM-DDTHH:mm:ssZ (Formatfehler vermeiden)
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    // XSD: rechnungsbetrag und bruttoBetragProPosition sind xs:nonNegativeInteger (ELDA oft in Euro-Ganzzahl, min. 1)
    const bruttoBetrag = Number(performance.totalPrice ?? performance.unitPrice ?? 0);
    const bruttoInteger = Math.max(1, Math.round(bruttoBetrag));
    const rechnungsbetragInteger = Math.max(1, Math.round(bruttoBetrag));
    const rechnungsnummerRaw = performance.invoiceNumber || `2026/${Date.now().toString(36)}`;
    const rechnungsnummer = rechnungsnummerRaw.replace(/\//g, '-');
    const chamberRaw = String(doctor?.chamberNumber ?? doctor?.profile?.chamberNumber ?? '100014');
    // zustaendigeAbrechnungsstelle = Landesstelle (z.B. 14), NICHT die volle VPNR (100014)
    const landesstelle =
      doctor?.landesstelle || doctor?.profile?.landesstelle || (chamberRaw.length <= 2 ? chamberRaw : String(chamberRaw).slice(-2));
    const zustaendigeStelle = landesstelle && landesstelle.trim() !== '' ? landesstelle : '14';
    // vertragspartnernummerBehandler: SIT/ELDA erwartet VPNR mit genau 6 Stellen (z.B. 100014)
    const vpnrRaw = this.config?.sit?.vpnr || (isSIT ? '100014' : chamberRaw);
    const vpnr = String(vpnrRaw).trim().padStart(6, '0');
    // referenznummer: beginnt mit VPNR des Arztes (z.B. '100014/' + rechnungsnummer)
    const referenznummer = `${vpnr}/${rechnungsnummer.replace(/-/g, '')}`;

    const doctorName = doctor?.lastName ?? doctor?.last_name ?? doctor?.name ?? 'Test Arzt';
    const doctorFirst = doctor?.firstName ?? doctor?.first_name ?? '';
    const fachgebietRaw = doctor?.fachgebietCode ?? '01';
    const fachgebietNum = Math.max(1, Math.min(999, parseInt(String(fachgebietRaw).replace(/\D/g, ''), 10) || 1));
    const fachgebiet = String(fachgebietNum);
    const addr = patient?.address ?? {};
    const docAddr = doctor?.address ?? doctor?.profile?.address ?? {};
    const plz = addr.postalCode ?? addr.postal_code ?? '4020';
    const strasse = [addr.street, addr.houseNumber].filter(Boolean).join(' ') || 'Teststraße 1';
    const ort = addr.city ?? addr.ort ?? 'Linz';
    const docPlz = docAddr.postalCode ?? docAddr.postal_code ?? '4020';
    const docStrasse = [docAddr.street, docAddr.houseNumber].filter(Boolean).join(' ') || 'Teststraße 1';
    const docOrt = docAddr.city ?? docAddr.ort ?? 'Linz';

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      suppressEmptyNode: true
    });

    // --- 1. patientenDaten (Container): XSD-Sequenz diagnosen → adresseDesPatienten → leistungsDaten → datenZahlungsempfaenger → dokumentDaten → patientDaten (MUSS letztes sein)

    const diagnosisCodes = performance.diagnosisCodes && performance.diagnosisCodes.length > 0
      ? performance.diagnosisCodes
      : ['Z00.0'];
    const diagnoseEntries = diagnosisCodes.map((c) => (typeof c === 'string' ? c : c.code || c.title || 'Z00.0'));
    const diagnosenBlock = diagnoseEntries.length === 1
      ? { diagnose: diagnoseEntries[0] }
      : { diagnose: diagnoseEntries };

    // Adressen: XSD postleitzahl (zuerst!) → strasseHausnummer → ort
    const adresseDesPatienten = {
      postleitzahl: plz,
      strasseHausnummer: strasse,
      ort
    };

    // --- 2. leistungsDaten: XSD-Sequenz datumVon → datumBis → bruttoBetragProPosition → leistungsart → positionsnummer → positionsnummerAnzahl → positionstext (optional)
    const leistungsDatenBlock = {
      datumLeistungserbringungVon: serviceDate,
      datumLeistungserbringungBis: serviceDate,
      bruttoBetragProPosition: bruttoInteger,
      leistungsart: '114',
      positionsnummer: '1010',
      positionsnummerAnzahl: String(Math.max(1, Math.min(999, Math.round(performance.quantity ?? 1))))
    };
    const positionstext = performance.serviceDescription ?? performance.serviceName ?? '';
    if (positionstext && positionstext.length <= 100) {
      leistungsDatenBlock.positionstext = positionstext;
    }

    // --- 4. patientDaten (Inneres Objekt): XSD-Sequenz leistungsbestaetigungAnforderung → rechnungsbetragBezahlt → versicherungsnummerVersicherter → versicherungsnummerPatienten → rechnungsbetrag → familiennamePatienten → rechnungsnummer → umsatzsteuerbetrag (optional) → vornamePatienten → datumRechnung (ganz am Ende)
    const patientDatenBlock = {
      leistungsbestaetigungAnforderung: false,
      rechnungsbetragBezahlt: true,
      versicherungsnummerVersicherter: vsnr,
      versicherungsnummerPatienten: vsnr,
      rechnungsbetrag: rechnungsbetragInteger,
      familiennamePatienten: patient.lastName ?? patient.last_name ?? '',
      rechnungsnummer: rechnungsnummer
    };
    const umsatzsteuerbetrag = performance.umsatzsteuerbetrag ?? performance.taxAmount;
    if (umsatzsteuerbetrag != null && Number(umsatzsteuerbetrag) >= 0) {
      patientDatenBlock.umsatzsteuerbetrag = Math.round(Number(umsatzsteuerbetrag));
    }
    patientDatenBlock.vornamePatienten = patient.firstName ?? patient.first_name ?? '';
    patientDatenBlock.datumRechnung = serviceDate;

    // patientenDaten-Container: Reihenfolge strikt – diagnosen, adresseDesPatienten, leistungsDaten, [datenZahlungsempfaenger], [dokumentDaten], patientDaten (letztes!)
    const patientenDatenOrdered = {
      diagnosen: diagnosenBlock,
      adresseDesPatienten,
      leistungsDaten: leistungsDatenBlock
    };
    if (!isSIT && patient?.iban) {
      patientenDatenOrdered.datenZahlungsempfaenger = {
        internationalBankAccountNumber: patient.iban,
        versicherungsnummerZahlungsempfaenger: vsnr
      };
    }
    patientenDatenOrdered.patientDaten = patientDatenBlock;

    const xmlData = {
      'n1:honorarnotenMeldung': {
        '@_akz': 'a',
        '@_xsi:schemaLocation': `${HONORARNOTEN_NS} ${HONORARNOTEN_SCHEMA}`,
        '@_xmlns:n1': HONORARNOTEN_NS,
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',

        patientenDaten: patientenDatenOrdered,
        infoDaten: {
          identifikationsSatz: {
            bundeslandAbrechnungsstelle: '4',
            listkennzeichen: 'HO',
            projektkennzeichen: 'WA',
            zustaendigeAbrechnungsstelle: zustaendigeStelle,
            versionDatenbestand: '07',
            referenznummer
          },
          // --- 3. vertragspartnerDaten: XSD-Sequenz datumBehandlung → datumUebermittlung → fachgebietLeistungserbringerBehandler → [fachgebietUeberweisenderArzt] → familiennameBehandler → ... → vertragspartnernummerBehandler (weit unten) → vornameBehandler → ordiAdresseDesVertragspartners (ganz am Ende). Adresse: postleitzahl → strasseHausnummer → ort
          vertragspartnerDaten: (() => {
            const vp = {
              datumBehandlung: serviceDate,
              datumUebermittlung: nowIso,
              fachgebietLeistungserbringerBehandler: fachgebiet,
              familiennameBehandler: doctorName,
              vertragspartnernummerBehandler: vpnr,
              vornameBehandler: doctorFirst,
              ordiAdresseDesVertragspartners: {
                postleitzahl: docPlz,
                strasseHausnummer: docStrasse,
                ort: docOrt
              }
            };
            return vp;
          })()
        }
      }
    };

    let out = builder.build(xmlData);
    // Root-Tag durch exakte ELDA-Vorgabe ersetzen (Reihenfolge + n1: garantiert)
    out = out.replace(/<n1:honorarnotenMeldung[\s\S]*?>/, ROOT_OPEN_TAG);
    if (out && !out.trimStart().startsWith('<?xml')) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n${out}`;
    }
    return out;
  }

  /**
   * Für Kompatibilität mit wahonlineConnector: wenn generateMeldung bereits XML zurückgibt, wird es durchgereicht.
   */
  generateXML(dataset) {
    return typeof dataset === 'string' ? dataset : '';
  }
}

module.exports = new WAHonlineFormatGenerator();
