// Facharztkataloge mit EBM-Codes für Österreich

const SPECIALTY_CATALOGS = {
  allgemeinmedizin: {
    name: 'Allgemeinmedizin',
    ebmGroups: {
      konsultation: {
        name: 'Konsultationen',
        services: [
          { code: 'KON-001', name: 'Erstkonsultation', ebmCode: 'EBM-001', price: 4500, description: 'Erstvorstellung mit Anamnese' },
          { code: 'KON-002', name: 'Folgekonsultation', ebmCode: 'EBM-002', price: 3000, description: 'Kontrolluntersuchung' },
          { code: 'KON-003', name: 'Telefonische Beratung', ebmCode: 'EBM-003', price: 1500, description: 'Kurze telefonische Beratung' }
        ]
      },
      untersuchung: {
        name: 'Untersuchungen',
        services: [
          { code: 'UNT-001', name: 'Vorsorgeuntersuchung', ebmCode: 'EBM-010', price: 12000, description: 'Gesundheitscheck' },
          { code: 'UNT-002', name: 'EKG', ebmCode: 'EBM-011', price: 2500, description: 'Elektrokardiogramm' },
          { code: 'UNT-003', name: 'Blutdruckmessung', ebmCode: 'EBM-012', price: 800, description: '24h Blutdruckmessung' }
        ]
      },
      impfung: {
        name: 'Impfungen',
        services: [
          { code: 'IMP-001', name: 'Grippeimpfung', ebmCode: 'EBM-020', price: 2500, description: 'Saisonale Grippeimpfung' },
          { code: 'IMP-002', name: 'COVID-19 Impfung', ebmCode: 'EBM-021', price: 2000, description: 'COVID-19 Impfung' },
          { code: 'IMP-003', name: 'Tetanusimpfung', ebmCode: 'EBM-022', price: 2000, description: 'Tetanus-Auffrischung' }
        ]
      }
    }
  },

  dermatologie: {
    name: 'Dermatologie',
    ebmGroups: {
      untersuchung: {
        name: 'Hautuntersuchungen',
        services: [
          { code: 'DER-001', name: 'Hautuntersuchung', ebmCode: 'EBM-100', price: 6000, description: 'Ganzkörper-Hautcheck' },
          { code: 'DER-002', name: 'Dermatoskopie', ebmCode: 'EBM-101', price: 3500, description: 'Auflichtmikroskopie' },
          { code: 'DER-003', name: 'Hautbiopsie', ebmCode: 'EBM-102', price: 8000, description: 'Gewebeprobe' }
        ]
      },
      behandlung: {
        name: 'Behandlungen',
        services: [
          { code: 'DER-004', name: 'Muttermal-Entfernung', ebmCode: 'EBM-110', price: 15000, description: 'Chirurgische Entfernung' },
          { code: 'DER-005', name: 'Kryotherapie', ebmCode: 'EBM-111', price: 8000, description: 'Vereisung von Hautveränderungen' },
          { code: 'DER-006', name: 'Laserbehandlung', ebmCode: 'EBM-112', price: 25000, description: 'Laserentfernung' }
        ]
      }
    }
  },

  chirurgie: {
    name: 'Chirurgie',
    ebmGroups: {
      operation: {
        name: 'Operationen',
        services: [
          { code: 'CHI-001', name: 'Ambulante Operation', ebmCode: 'EBM-200', price: 30000, description: 'Kleiner chirurgischer Eingriff' },
          { code: 'CHI-002', name: 'Wundversorgung', ebmCode: 'EBM-201', price: 4500, description: 'Wundreinigung und Verband' },
          { code: 'CHI-003', name: 'Nahtentfernung', ebmCode: 'EBM-202', price: 2500, description: 'Fadenentfernung' }
        ]
      },
      diagnostik: {
        name: 'Diagnostik',
        services: [
          { code: 'CHI-004', name: 'Ultraschall', ebmCode: 'EBM-210', price: 6000, description: 'Sonographie' },
          { code: 'CHI-005', name: 'Röntgen', ebmCode: 'EBM-211', price: 4000, description: 'Röntgenaufnahme' }
        ]
      }
    }
  },

  gynaekologie: {
    name: 'Gynäkologie',
    ebmGroups: {
      vorsorge: {
        name: 'Vorsorgeuntersuchungen',
        services: [
          { code: 'GYN-001', name: 'Vorsorgeuntersuchung', ebmCode: 'EBM-300', price: 8000, description: 'Jährliche Vorsorge' },
          { code: 'GYN-002', name: 'Zytologie', ebmCode: 'EBM-301', price: 3500, description: 'Abstrich-Untersuchung' },
          { code: 'GYN-003', name: 'HPV-Test', ebmCode: 'EBM-302', price: 4500, description: 'HPV-Nachweis' }
        ]
      },
      untersuchung: {
        name: 'Untersuchungen',
        services: [
          { code: 'GYN-004', name: 'Ultraschall', ebmCode: 'EBM-310', price: 12000, description: 'Gynäkologischer Ultraschall' },
          { code: 'GYN-005', name: 'Mammographie', ebmCode: 'EBM-311', price: 15000, description: 'Brustkrebsvorsorge' }
        ]
      }
    }
  },

  orthopaedie: {
    name: 'Orthopädie',
    ebmGroups: {
      untersuchung: {
        name: 'Untersuchungen',
        services: [
          { code: 'ORT-001', name: 'Orthopädische Untersuchung', ebmCode: 'EBM-400', price: 7000, description: 'Bewegungsapparat-Check' },
          { code: 'ORT-002', name: 'Röntgen', ebmCode: 'EBM-401', price: 4000, description: 'Knochen-Röntgen' },
          { code: 'ORT-003', name: 'MRT', ebmCode: 'EBM-402', price: 25000, description: 'Magnetresonanztomographie' }
        ]
      },
      therapie: {
        name: 'Therapien',
        services: [
          { code: 'ORT-004', name: 'Physiotherapie-Verordnung', ebmCode: 'EBM-410', price: 2000, description: 'Rezept für Physio' },
          { code: 'ORT-005', name: 'Injektion', ebmCode: 'EBM-411', price: 6000, description: 'Gelenkinjektion' }
        ]
      }
    }
  },

  neurologie: {
    name: 'Neurologie',
    ebmGroups: {
      untersuchung: {
        name: 'Neurologische Untersuchungen',
        services: [
          { code: 'NEU-001', name: 'Neurologische Untersuchung', ebmCode: 'EBM-500', price: 8000, description: 'Reflexe, Koordination' },
          { code: 'NEU-002', name: 'EEG', ebmCode: 'EBM-501', price: 12000, description: 'Elektroenzephalographie' },
          { code: 'NEU-003', name: 'EMG', ebmCode: 'EBM-502', price: 15000, description: 'Elektromyographie' }
        ]
      }
    }
  },

  kardiologie: {
    name: 'Kardiologie',
    ebmGroups: {
      untersuchung: {
        name: 'Herzuntersuchungen',
        services: [
          { code: 'KAR-001', name: 'Echokardiographie', ebmCode: 'EBM-600', price: 18000, description: 'Herzultraschall' },
          { code: 'KAR-002', name: 'Belastungs-EKG', ebmCode: 'EBM-601', price: 12000, description: 'Ergometrie' },
          { code: 'KAR-003', name: 'Langzeit-EKG', ebmCode: 'EBM-602', price: 8000, description: '24h EKG' }
        ]
      }
    }
  },

  labor: {
    name: 'Labor',
    ebmGroups: {
      blutbild: {
        name: 'Blutuntersuchungen',
        services: [
          { code: 'LAB-001', name: 'Kleines Blutbild', ebmCode: 'EBM-700', price: 3000, description: 'Hb, Ery, Leuko, Thrombo' },
          { code: 'LAB-002', name: 'Großes Blutbild', ebmCode: 'EBM-701', price: 4500, description: 'Differenzialblutbild' },
          { code: 'LAB-003', name: 'Blutzucker', ebmCode: 'EBM-702', price: 2000, description: 'Glukose nüchtern' }
        ]
      },
      biochemie: {
        name: 'Biochemie',
        services: [
          { code: 'LAB-004', name: 'Leberwerte', ebmCode: 'EBM-710', price: 4000, description: 'GOT, GPT, GGT' },
          { code: 'LAB-005', name: 'Nierenwerte', ebmCode: 'EBM-711', price: 3500, description: 'Kreatinin, Harnstoff' },
          { code: 'LAB-006', name: 'Lipidprofil', ebmCode: 'EBM-712', price: 5000, description: 'Cholesterin, Triglyzeride' }
        ]
      }
    }
  },

  pneumologie: {
    name: 'Pneumologie',
    ebmGroups: {
      untersuchung: {
        name: 'Lungenuntersuchungen',
        services: [
          { code: 'PNE-001', name: 'Spirometrie', ebmCode: 'EBM-800', price: 12000, description: 'Lungenfunktionstest' },
          { code: 'PNE-002', name: 'Bodyplethysmographie', ebmCode: 'EBM-801', price: 25000, description: 'Volumenmessung' },
          { code: 'PNE-003', name: 'Blutgasanalyse', ebmCode: 'EBM-802', price: 3500, description: 'BGA-Analyse' }
        ]
      },
      diagnostik: {
        name: 'Diagnostik',
        services: [
          { code: 'PNE-004', name: 'Bronchoskopie', ebmCode: 'EBM-810', price: 30000, description: 'Luftröhrenspiegelung' },
          { code: 'PNE-005', name: 'Röntgen Thorax', ebmCode: 'EBM-811', price: 4000, description: 'Röntgen Lunge' },
          { code: 'PNE-006', name: 'EBUS', ebmCode: 'EBM-812', price: 45000, description: 'Endobronchialer Ultraschall' },
          { code: 'PNE-007', name: 'Lavage', ebmCode: 'EBM-813', price: 50000, description: 'Bronchoalveoläre Lavage' }
        ]
      }
    }
  },

  gastroenterologie: {
    name: 'Gastroenterologie',
    ebmGroups: {
      untersuchung: {
        name: 'Magen-Darm-Untersuchungen',
        services: [
          { code: 'GAST-001', name: 'Gastroskopie', ebmCode: 'EBM-900', price: 35000, description: 'Magenspiegelung' },
          { code: 'GAST-002', name: 'Koloskopie', ebmCode: 'EBM-901', price: 45000, description: 'Darmspiegelung' },
          { code: 'GAST-003', name: 'Sonographie Abdomen', ebmCode: 'EBM-902', price: 8000, description: 'Bauchultraschall' },
          { code: 'GAST-004', name: 'Reflux-Endoskopie', ebmCode: 'EBM-903', price: 40000, description: 'Speiseröhrenendoskopie' },
          { code: 'GAST-005', name: 'ERCP', ebmCode: 'EBM-904', price: 60000, description: 'Gallenwegsendoskopie' }
        ]
      },
      },
      endoskopie: {
        name: 'Therapeutische Endoskopie',
        services: [
          { code: 'GAST-006', name: 'Polypektomie', ebmCode: 'EBM-910', price: 55000, description: 'Polypenentfernung bei Koloskopie' },
          { code: 'GAST-007', name: 'Fremdkörperentfernung', ebmCode: 'EBM-911', price: 45000, description: 'Magenspiegelung mit Entfernung' },
          { code: 'GAST-008', name: 'Blutstillung', ebmCode: 'EBM-912', price: 50000, description: 'Endoskopische Blutstillung' },
          { code: 'GAST-009', name: 'Dilatation', ebmCode: 'EBM-913', price: 48000, description: 'Aufdehnung der Speiseröhre' }
        ]
      }
    }
  },

  urologie: {
    name: 'Urologie',
    ebmGroups: {
      untersuchung: {
        name: 'Urologische Untersuchungen',
        services: [
          { code: 'URO-001', name: 'PSA-Test', ebmCode: 'EBM-1000', price: 4500, description: 'Prostataspezifisches Antigen' },
          { code: 'URO-002', name: 'Ultraschall Niere', ebmCode: 'EBM-1001', price: 8000, description: 'Nierenultraschall' },
          { code: 'URO-003', name: 'Uroflowmetrie', ebmCode: 'EBM-1002', price: 6000, description: 'Harnstrahlstärke' }
        ]
      },
      endoskopie: {
        name: 'Urologische Endoskopie',
        services: [
          { code: 'URO-004', name: 'Zystoskopie', ebmCode: 'EBM-1003', price: 35000, description: 'Blasenspiegelung' },
          { code: 'URO-005', name: 'Urethroskopie', ebmCode: 'EBM-1004', price: 28000, description: 'Harnröhrenspiegelung' },
          { code: 'URO-006', name: 'Nephroskopie', ebmCode: 'EBM-1005', price: 55000, description: 'Nierenspiegelung' }
        ]
      }
    }
  },

  ophthalmologie: {
    name: 'Ophthalmologie',
    ebmGroups: {
      untersuchung: {
        name: 'Augenuntersuchungen',
        services: [
          { code: 'OPH-001', name: 'Sehtest', ebmCode: 'EBM-1100', price: 3500, description: 'Visusbestimmung' },
          { code: 'OPH-002', name: 'Fundusuntersuchung', ebmCode: 'EBM-1101', price: 5000, description: 'Netzhautuntersuchung' },
          { code: 'OPH-003', name: 'Tonometrie', ebmCode: 'EBM-1102', price: 3000, description: 'Augendruckmessung' },
          { code: 'OPH-005', name: 'Spaltlampenuntersuchung', ebmCode: 'EBM-1103', price: 4500, description: 'Spaltlampenmikroskopie' }
        ]
      },
      operation: {
        name: 'Operationen',
        services: [
          { code: 'OPH-004', name: 'Katarakt-OP', ebmCode: 'EBM-1110', price: 120000, description: 'Grauer Star' },
          { code: 'OPH-006', name: 'Endoskopie Auge', ebmCode: 'EBM-1111', price: 25000, description: 'Endoskopische Augenuntersuchung' }
        ]
      }
    }
  },

  hno: {
    name: 'HNO',
    ebmGroups: {
      untersuchung: {
        name: 'HNO-Untersuchungen',
        services: [
          { code: 'HNO-001', name: 'Audiometrie', ebmCode: 'EBM-1200', price: 8000, description: 'Hörtest' },
          { code: 'HNO-002', name: 'Endoskopie', ebmCode: 'EBM-1201', price: 6000, description: 'Kehlkopfspiegelung' },
          { code: 'HNO-003', name: 'Tympanometrie', ebmCode: 'EBM-1202', price: 4000, description: 'Mittelohrdruck' },
          { code: 'HNO-004', name: 'Rhinoskopie', ebmCode: 'EBM-1203', price: 5000, description: 'Nasenspiegelung' },
          { code: 'HNO-005', name: 'Laryngoskopie', ebmCode: 'EBM-1204', price: 8000, description: 'Kehlkopfspiegelung mit Probenentnahme' }
        ]
      }
    }
  },

  psychiatrie: {
    name: 'Psychiatrie',
    ebmGroups: {
      therapie: {
        name: 'Psychotherapie',
        services: [
          { code: 'PSY-001', name: 'Psychotherapie (50 Min)', ebmCode: 'EBM-1300', price: 10000, description: 'Gesprächstherapie' },
          { code: 'PSY-002', name: 'Verhaltenstherapie', ebmCode: 'EBM-1301', price: 12000, description: 'Kognitive Verhaltenstherapie' },
          { code: 'PSY-003', name: 'Medikamentöse Behandlung', ebmCode: 'EBM-1302', price: 8000, description: 'Psychopharmaka-Anpassung' }
        ]
      }
    }
  },

  radiologie: {
    name: 'Radiologie',
    ebmGroups: {
      untersuchung: {
        name: 'Bildgebende Verfahren',
        services: [
          { code: 'RAD-001', name: 'CT Thorax', ebmCode: 'EBM-1400', price: 80000, description: 'Computertomographie Brustkorb' },
          { code: 'RAD-002', name: 'MRT Gelenk', ebmCode: 'EBM-1401', price: 100000, description: 'Magnetresonanztomographie' },
          { code: 'RAD-003', name: 'Mammographie', ebmCode: 'EBM-1402', price: 15000, description: 'Brustkrebsvorsorge' }
        ]
      }
    }
  },

  anästhesie: {
    name: 'Anästhesie',
    ebmGroups: {
      narkose: {
        name: 'Narkoseleistungen',
        services: [
          { code: 'ANA-001', name: 'Prämedikation', ebmCode: 'EBM-1500', price: 5000, description: 'Narkosevorbereitung' },
          { code: 'ANA-002', name: 'Lokalanästhesie', ebmCode: 'EBM-1501', price: 3000, description: 'Lokale Betäubung' },
          { code: 'ANA-003', name: 'Allgemeinanästhesie', ebmCode: 'EBM-1502', price: 20000, description: 'Vollnarkose' }
        ]
      }
    }
  },

  notfallmedizin: {
    name: 'Notfallmedizin',
    ebmGroups: {
      notfall: {
        name: 'Notfallbehandlungen',
        services: [
          { code: 'NOT-001', name: 'Erstversorgung', ebmCode: 'EBM-1600', price: 12000, description: 'Notfall-Einschätzung' },
          { code: 'NOT-002', name: 'Reanimation', ebmCode: 'EBM-1601', price: 35000, description: 'Wiederbelebungsmaßnahmen' },
          { code: 'NOT-003', name: 'Traumaversorgung', ebmCode: 'EBM-1602', price: 25000, description: 'Verletzungsversorgung' }
        ]
      }
    }
  },

  sportmedizin: {
    name: 'Sportmedizin',
    ebmGroups: {
      untersuchung: {
        name: 'Sportmedizinische Untersuchungen',
        services: [
          { code: 'SPO-001', name: 'Sporttauglichkeitsuntersuchung', ebmCode: 'EBM-1700', price: 12000, description: 'Eignungstest' },
          { code: 'SPO-002', name: 'Leistungsdiagnostik', ebmCode: 'EBM-1701', price: 25000, description: 'Belastungstest' },
          { code: 'SPO-003', name: 'Funktionstest', ebmCode: 'EBM-1702', price: 15000, description: 'Beweglichkeitstest' }
        ]
      }
    }
  },

  arbeitsmedizin: {
    name: 'Arbeitsmedizin',
    ebmGroups: {
      vorsorge: {
        name: 'Arbeitsmedizinische Vorsorge',
        services: [
          { code: 'ARB-001', name: 'Grundbetreuung', ebmCode: 'EBM-1800', price: 15000, description: 'Unternehmensberatung' },
          { code: 'ARB-002', name: 'Arbeitssicherheitsuntersuchung', ebmCode: 'EBM-1801', price: 12000, description: 'Vorsorgeuntersuchung' },
          { code: 'ARB-003', name: 'Belastungsbeurteilung', ebmCode: 'EBM-1802', price: 18000, description: 'Risikoanalyse' }
        ]
      }
    }
  }
};

// EBM-Preislisten pro Jahr
const EBM_PRICE_LISTS = {
  2025: {
    'EBM-001': 4500,   // Erstkonsultation
    'EBM-002': 3000,   // Folgekonsultation
    'EBM-003': 1500,   // Telefonische Beratung
    'EBM-010': 12000,  // Vorsorgeuntersuchung
    'EBM-011': 2500,   // EKG
    'EBM-012': 800,    // Blutdruckmessung
    'EBM-020': 2500,   // Grippeimpfung
    'EBM-021': 2000,   // COVID-19 Impfung
    'EBM-022': 2000,   // Tetanusimpfung
    'EBM-100': 6000,   // Hautuntersuchung
    'EBM-101': 3500,   // Dermatoskopie
    'EBM-102': 8000,   // Hautbiopsie
    'EBM-110': 15000,  // Muttermal-Entfernung
    'EBM-111': 8000,   // Kryotherapie
    'EBM-112': 25000,  // Laserbehandlung
    'EBM-200': 30000,  // Ambulante Operation
    'EBM-201': 4500,   // Wundversorgung
    'EBM-202': 2500,   // Nahtentfernung
    'EBM-210': 6000,   // Ultraschall
    'EBM-211': 4000,   // Röntgen
    'EBM-300': 8000,   // Gynäkologische Vorsorge
    'EBM-301': 3500,   // Zytologie
    'EBM-302': 4500,   // HPV-Test
    'EBM-310': 12000,  // Gynäkologischer Ultraschall
    'EBM-311': 15000,  // Mammographie
    'EBM-400': 7000,   // Orthopädische Untersuchung
    'EBM-401': 4000,   // Orthopädisches Röntgen
    'EBM-402': 25000,  // Orthopädisches MRT
    'EBM-410': 2000,   // Physiotherapie-Verordnung
    'EBM-411': 6000,   // Orthopädische Injektion
    'EBM-500': 8000,   // Neurologische Untersuchung
    'EBM-501': 12000,  // EEG
    'EBM-502': 15000,  // EMG
    'EBM-600': 18000,  // Echokardiographie
    'EBM-601': 12000,  // Belastungs-EKG
    'EBM-602': 8000,   // Langzeit-EKG
    'EBM-700': 3000,   // Kleines Blutbild
    'EBM-701': 4500,   // Großes Blutbild
    'EBM-702': 2000,   // Blutzucker
    'EBM-710': 4000,   // Leberwerte
    'EBM-711': 3500,   // Nierenwerte
    'EBM-712': 5000,   // Lipidprofil
    // Pneumologie
    'EBM-800': 12000, 'EBM-801': 25000, 'EBM-802': 3500, 'EBM-810': 30000, 'EBM-811': 4000,
    // Gastroenterologie
    'EBM-900': 35000, 'EBM-901': 45000, 'EBM-902': 8000,
    // Urologie
    'EBM-1000': 4500, 'EBM-1001': 8000, 'EBM-1002': 6000,
    // Ophthalmologie
    'EBM-1100': 3500, 'EBM-1101': 5000, 'EBM-1102': 3000, 'EBM-1110': 120000,
    // HNO
    'EBM-1200': 8000, 'EBM-1201': 6000, 'EBM-1202': 4000,
    // Psychiatrie
    'EBM-1300': 10000, 'EBM-1301': 12000, 'EBM-1302': 8000,
    // Radiologie
    'EBM-1400': 80000, 'EBM-1401': 100000, 'EBM-1402': 15000,
    // Anästhesie
    'EBM-1500': 5000, 'EBM-1501': 3000, 'EBM-1502': 20000,
    // Notfallmedizin
    'EBM-1600': 12000, 'EBM-1601': 35000, 'EBM-1602': 25000,
    // Sportmedizin
    'EBM-1700': 12000, 'EBM-1701': 25000, 'EBM-1702': 15000,
    // Arbeitsmedizin
    'EBM-1800': 15000, 'EBM-1801': 12000, 'EBM-1802': 18000
  }
};

// Selbstbehalt-Regeln pro Fachrichtung
const COPAY_RULES = {
  allgemeinmedizin: {
    standard: { rate: 0.10, max: 2850 }, // 10%, max 28,50€
    exempt: ['Vorsorgeuntersuchung', 'Impfung']
  },
  dermatologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Hautkrebsvorsorge']
  },
  chirurgie: {
    standard: { rate: 0.20, max: 34300 }, // 20%, max 343€
    exempt: ['Notfallbehandlung']
  },
  gynaekologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Vorsorgeuntersuchung', 'Zytologie']
  },
  orthopaedie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Physiotherapie-Verordnung']
  },
  neurologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: []
  },
  kardiologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: []
  },
  labor: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Vorsorgeuntersuchung']
  },
  pneumologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Spirometrie']
  },
  gastroenterologie: {
    standard: { rate: 0.20, max: 34300 },
    exempt: ['Vorsorgeuntersuchung']
  },
  urologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['PSA-Test']
  },
  ophthalmologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Sehtest']
  },
  hno: {
    standard: { rate: 0.10, max: 2850 },
    exempt: []
  },
  psychiatrie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: []
  },
  radiologie: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Vorsorgeuntersuchung']
  },
  anästhesie: {
    standard: { rate: 0.20, max: 34300 },
    exempt: []
  },
  notfallmedizin: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Notfallbehandlung']
  },
  sportmedizin: {
    standard: { rate: 0.10, max: 2850 },
    exempt: []
  },
  arbeitsmedizin: {
    standard: { rate: 0.10, max: 2850 },
    exempt: ['Vorsorgeuntersuchung']
  }
};

module.exports = {
  SPECIALTY_CATALOGS,
  EBM_PRICE_LISTS,
  COPAY_RULES
};
