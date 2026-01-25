const Performance = require('../models/Performance');
const BillingJob = require('../models/BillingJob');
const BillingAudit = require('../models/BillingAudit');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const PatientExtended = require('../models/PatientExtended'); // Produktivsystem-Standard
const Patient = require('../models/Patient'); // Fallback für Migration
const ServiceCatalog = require('../models/ServiceCatalog');
const InternalMessage = require('../models/InternalMessage');
const eldaConnector = require('./connectors/eldaConnector');
const eldaFormatGenerator = require('./eldaFormatGenerator');
const wahonlineConnector = require('./connectors/wahonlineConnector');
const serviceCodeMappingService = require('./serviceCodeMappingService');

// invoiceService explizit laden (für Abwärtskompatibilität)
// Diese Datei existiert und wird benötigt, auch wenn sie nicht direkt verwendet wird
// Verwende direkten require() mit try-catch, um Fehler abzufangen
const path = require('path');
const fs = require('fs');
try {
  // Versuche zuerst mit relativem Pfad
  require('./invoiceService');
} catch (error) {
  // Falls relativer Pfad fehlschlägt, versuche absoluten Pfad
  try {
    const invoiceServicePath = path.join(__dirname, 'invoiceService.js');
    if (fs.existsSync(invoiceServicePath)) {
      require(invoiceServicePath);
    } else {
      // Datei existiert nicht - das ist OK, wird nicht direkt verwendet
      console.warn('⚠️ invoiceService.js nicht gefunden (nicht kritisch)');
    }
  } catch (error2) {
    // Wenn invoiceService nicht geladen werden kann, ist das OK - es wird nicht direkt verwendet
    // Der Fehler wird nur geloggt, aber nicht weitergeworfen
    if (error2.code !== 'MODULE_NOT_FOUND') {
      console.warn('⚠️ invoiceService konnte nicht geladen werden (nicht kritisch):', error2.message);
    }
  }
}

class BillingService {
  constructor() {
    this.connectors = {
      kassa: require('./connectors/kassenConnector'),
      insurance: require('./connectors/insuranceConnector'),
      payment: require('./connectors/paymentConnector')
    };
  }

  /**
   * Berechnet die Umsatzsteuer für einen Service basierend auf ServiceCatalog und billingType
   * @param {String} serviceCode - Service-Code
   * @param {String} billingType - 'kassenarzt', 'wahlarzt' oder 'privat'
   * @returns {Promise<Number>} taxRate in Prozent (0-100)
   */
  async calculateTaxRateForService(serviceCode, billingType) {
    if (!serviceCode) {
      return billingType === 'kassenarzt' ? 0 : 20;
    }

    try {
      const serviceCatalogEntry = await ServiceCatalog.findOne({ code: serviceCode })
        .select('taxRate')
        .lean();

      // Wenn explizite taxRate vorhanden, verwende diese
      if (serviceCatalogEntry && serviceCatalogEntry.taxRate !== null && serviceCatalogEntry.taxRate !== undefined) {
        return serviceCatalogEntry.taxRate;
      }
    } catch (error) {
      console.warn(`⚠️ Fehler beim Laden der taxRate für Service ${serviceCode}:`, error.message);
    }

    // Standard-Logik: Kassenarzt = 0%, Wahlarzt/Privat = 20%
    return billingType === 'kassenarzt' ? 0 : 20;
  }

  /**
   * One-Click-Abrechnung - Hauptfunktion
   * @param {string} performanceId - ID der Leistung
   * @param {object} user - Benutzer-Objekt
   * @param {object} options - Zusätzliche Optionen
   * @returns {Promise<object>} Job-Ergebnis
   */
  async oneClickBill(performanceId, user, options = {}) {
    const startTime = Date.now();
    
    try {
      // 1. Daten laden
      const performance = await this.loadPerformanceData(performanceId);
      const doctor = await this.loadDoctorData(performance.doctorId);
      const patient = await this.loadPatientData(performance.patientId);
      
      // 2. Route bestimmen (mit Mischformen-Unterstützung)
      const route = await this.determineRoute(doctor, performance, patient, options);
      
      // 3. Idempotency-Key generieren
      const idempotencyKey = this.generateIdempotencyKey(performance, route);
      
      // 4. Prüfen ob Job bereits existiert
      const existingJob = await BillingJob.findOne({ idempotencyKey });
      if (existingJob) {
        return this.handleExistingJob(existingJob);
      }
      
      // 5. Payload erstellen
      const payload = await this.buildPayload(performance, doctor, patient, route);
      
      // 6. Billing-Job erstellen
      const job = await this.createBillingJob(performance, route, payload, idempotencyKey, user);
      
      // 7. Audit-Log erstellen
      await BillingAudit.logEvent(job._id, performanceId, 'JOB_CREATED', {
        request: { performanceId, route, options },
        userId: user._id,
        userRole: user.role,
        processingTime: Date.now() - startTime
      });
      
      // 8. Job in Queue einreihen
      await this.enqueueJob(job);
      
      return {
        success: true,
        jobId: job._id,
        status: 'PENDING',
        route,
        message: this.getRouteMessage(route)
      };
      
    } catch (error) {
      console.error('One-Click-Billing Fehler:', error);
      throw new Error(`One-Click-Abrechnung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Leistungsdaten laden
   */
  async loadPerformanceData(performanceId) {
    const performance = await Performance.findById(performanceId)
      .populate('patientId', 'firstName lastName email socialSecurityNumber insuranceProvider')
      .populate('doctorId', 'firstName lastName contractType specialization')
      .populate('appointmentId', 'startTime endTime type locationId');
    
    if (!performance) {
      throw new Error('Leistung nicht gefunden');
    }
    
    if (!performance.patientId) {
      throw new Error('Leistung hat keinen zugeordneten Patienten');
    }
    
    if (!performance.doctorId) {
      throw new Error('Leistung hat keinen zugeordneten Arzt');
    }
    
    if (performance.status !== 'recorded') {
      throw new Error(`Leistung bereits abgerechnet (Status: ${performance.status})`);
    }
    
    return performance;
  }

  /**
   * Arztdaten laden
   */
  async loadDoctorData(doctorId) {
    // Wenn doctorId bereits ein Objekt ist (populated), extrahiere die ID
    const id = (doctorId && typeof doctorId === 'object' && doctorId._id) 
      ? doctorId._id 
      : doctorId;
    
    if (!id) {
      throw new Error('Arzt-ID fehlt');
    }
    
    const doctor = await User.findById(id).select('+profile');
    if (!doctor) {
      throw new Error('Arzt nicht gefunden');
    }
    
    // contractType aus verschiedenen Quellen laden
    // 1. Direkt im User-Objekt
    // 2. In profile.contractType
    // 3. Aus StaffProfile (falls vorhanden)
    if (!doctor.contractType) {
      if (doctor.profile?.contractType) {
        doctor.contractType = doctor.profile.contractType;
      } else {
        // Versuche StaffProfile zu laden
        try {
          const StaffProfile = require('../models/StaffProfile');
          const staffProfile = await StaffProfile.findOne({ userId: id });
          if (staffProfile && staffProfile.contractType) {
            doctor.contractType = staffProfile.contractType;
          } else {
            // Fallback: Basierend auf role bestimmen
            if (doctor.role === 'arzt' || doctor.role === 'admin') {
              doctor.contractType = 'wahlarzt'; // Standard: Wahlarzt
            } else {
              doctor.contractType = 'wahlarzt'; // Standard für alle anderen
            }
          }
        } catch (error) {
          // Fallback wenn StaffProfile nicht verfügbar
          doctor.contractType = 'wahlarzt';
        }
      }
    }
    
    return doctor;
  }

  /**
   * Patientendaten laden
   */
  async loadPatientData(patientId) {
    // Wenn patientId bereits ein Objekt ist (populated), extrahiere die ID
    const id = (patientId && typeof patientId === 'object' && patientId._id) 
      ? patientId._id 
      : patientId;
    
    if (!id) {
      throw new Error('Patient-ID fehlt');
    }
    
    // Zuerst in PatientExtended suchen (Produktivsystem-Standard)
    let patient = await PatientExtended.findById(id);
    
    // Fallback: Wenn nicht gefunden, in alter Patient Collection suchen (Migration)
    if (!patient) {
      console.warn(`⚠️ Patient ${id} nicht in PatientExtended gefunden, suche in alter Patient Collection...`);
      patient = await Patient.findById(id);
      if (patient) {
        console.warn(`⚠️ WARNING: Patient ${id} existiert nur in alter Patient Collection. Bitte migrieren!`);
      }
    }
    
    if (!patient) {
      throw new Error(`Patient nicht gefunden (ID: ${id})`);
    }
    return patient;
  }

  /**
   * Abrechnungsroute bestimmen
   * Berücksichtigt Mischformen:
   * 1. Performance.tariffType (höchste Priorität - explizite Angabe)
   * 2. Location.practiceType (Standort-Konfiguration)
   * 3. Doctor.contractType (Arzt-Vertragstyp)
   * 4. Patient.insuranceProvider (für Privatversicherung)
   * 
   * Mischformen erlaubt:
   * - Kassenarzt in Kassenpraxis kann Privatleistungen erbringen (tariffType: 'privat')
   * - Kassenarzt in Kassenpraxis kann Wahlarzt-Leistungen erbringen (tariffType: 'wahl')
   * - Wahlarzt kann auch Kassenleistungen erbringen (wenn Arzt auch Kassenarzt ist)
   */
  async determineRoute(doctor, performance, patient, options = {}) {
    const Location = require('../models/Location');
    const Appointment = require('../models/Appointment');
    
    // 1. PRIORITÄT: Performance.tariffType (explizite Angabe in der Leistung)
    // Dies hat höchste Priorität, da es die explizite Entscheidung des Arztes ist
    if (performance.tariffType) {
      switch (performance.tariffType) {
        case 'kassa':
          // Kassenleistung - prüfe ob Arzt Kassenarzt ist oder Location Kassenpraxis
          if (doctor.contractType === 'kassenarzt') {
            return 'KASSE';
          }
          
          // Location aus Appointment laden, falls vorhanden
          let location = null;
          if (performance.appointmentId) {
            let appointment = null;
            if (performance.appointmentId && typeof performance.appointmentId === 'object' && performance.appointmentId.locationId) {
              // Bereits populated
              appointment = performance.appointmentId;
            } else if (performance.appointmentId && typeof performance.appointmentId === 'object' && performance.appointmentId._id) {
              // ObjectId als Objekt
              appointment = await Appointment.findById(performance.appointmentId._id || performance.appointmentId).select('locationId');
            } else if (performance.appointmentId) {
              // String/ObjectId
              appointment = await Appointment.findById(performance.appointmentId).select('locationId');
            }
            
            if (appointment && appointment.locationId) {
              location = await Location.findById(appointment.locationId);
            }
          }
          
          // Location aus options laden (falls direkt übergeben)
          if (!location && options.locationId) {
            location = await Location.findById(options.locationId);
          }
          
          // Wenn Location Kassenpraxis ist, auch erlauben
          if (location && location.practiceType === 'kassenpraxis') {
            return 'KASSE';
          }
          
          // Fallback: Wenn Kasse nicht möglich, automatisch auf Wahlarzt umschalten
          // (statt Fehler zu werfen, da der Arzt explizit "kassa" gewählt hat, aber die Bedingungen nicht erfüllt sind)
          // Nur in Development-Modus loggen
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Kassenleistung -> Wahlarzt (Arzt: ' + (doctor.contractType || 'nicht gesetzt') + ', Location: ' + (location?.practiceType || 'nicht gefunden') + ')');
          }
          return 'PATIENT+KASSE_REFUND';
          
        case 'wahl':
          // Wahlarzt-Leistung - immer erlaubt
          return 'PATIENT+KASSE_REFUND';
          
        case 'privat':
          // Privatleistung - immer erlaubt
          return patient.insuranceProvider && 
                 patient.insuranceProvider !== 'Privatversicherung' && 
                 patient.insuranceProvider !== 'Selbstzahler'
            ? 'PATIENT+INSURANCE' 
            : 'PATIENT';
      }
    }
    
    // 2. PRIORITÄT: Location.practiceType (Standort-Konfiguration)
    let location = null;
    let practiceType = null;
    
    // Location aus Appointment laden, falls vorhanden
    // performance.appointmentId kann ein ObjectId oder bereits populated sein
    if (performance.appointmentId) {
      let appointment = null;
      if (performance.appointmentId.locationId) {
        // Bereits populated
        appointment = performance.appointmentId;
      } else if (typeof performance.appointmentId === 'object' && performance.appointmentId._id) {
        // ObjectId als Objekt
        appointment = await Appointment.findById(performance.appointmentId._id || performance.appointmentId).select('locationId');
      } else {
        // String/ObjectId
        appointment = await Appointment.findById(performance.appointmentId).select('locationId');
      }
      
      if (appointment && appointment.locationId) {
        location = await Location.findById(appointment.locationId);
      }
    }
    
    // Location aus options laden (falls direkt übergeben)
    if (!location && options.locationId) {
      location = await Location.findById(options.locationId);
    }
    
    if (location && location.practiceType) {
      practiceType = location.practiceType;
    }
    
    // Wenn Location "gemischt" ist, weiter zu Arzt-Vertragstyp
    if (practiceType === 'gemischt') {
      practiceType = null; // Weiter zu nächster Priorität
    }
    
    // Wenn Location explizit gesetzt ist, verwenden
    if (practiceType) {
      return this._mapPracticeTypeToRoute(practiceType, patient, options);
    }
    
    // 3. PRIORITÄT: Doctor.contractType (Arzt-Vertragstyp)
    if (doctor.contractType) {
      return this._mapContractTypeToRoute(doctor.contractType, patient, options);
    }
    
    // 4. FALLBACK: Privatabrechnung
    return patient.insuranceProvider && 
           patient.insuranceProvider !== 'Privatversicherung' && 
           patient.insuranceProvider !== 'Selbstzahler'
      ? 'PATIENT+INSURANCE' 
      : 'PATIENT';
  }
  
  /**
   * Mappt Praxistyp zu Abrechnungsroute
   */
  _mapPracticeTypeToRoute(practiceType, patient, options = {}) {
    switch (practiceType) {
      case 'kassenpraxis':
        return 'KASSE';
      case 'wahlarzt':
        return 'PATIENT+KASSE_REFUND';
      case 'privat':
        return patient && patient.insuranceProvider && 
               patient.insuranceProvider !== 'Privatversicherung' && 
               patient.insuranceProvider !== 'Selbstzahler'
          ? 'PATIENT+INSURANCE' 
          : 'PATIENT';
      default:
        return patient && patient.insuranceProvider && 
               patient.insuranceProvider !== 'Privatversicherung' && 
               patient.insuranceProvider !== 'Selbstzahler'
          ? 'PATIENT+INSURANCE' 
          : 'PATIENT';
    }
  }
  
  /**
   * Mappt Contract Type zu Abrechnungsroute (Fallback)
   */
  _mapContractTypeToRoute(contractType, patient, options = {}) {
    switch (contractType) {
      case 'kassenarzt':
        return 'KASSE';
      case 'wahlarzt':
        return 'PATIENT+KASSE_REFUND';
      case 'privat':
        return patient && patient.insuranceProvider && 
               patient.insuranceProvider !== 'Privatversicherung' && 
               patient.insuranceProvider !== 'Selbstzahler'
          ? 'PATIENT+INSURANCE' 
          : 'PATIENT';
      default:
        return patient && patient.insuranceProvider && 
               patient.insuranceProvider !== 'Privatversicherung' && 
               patient.insuranceProvider !== 'Selbstzahler'
          ? 'PATIENT+INSURANCE' 
          : 'PATIENT';
    }
  }

  /**
   * Idempotency-Key generieren
   */
  generateIdempotencyKey(performance, route) {
    return `${performance._id}:${performance.updatedAt.getTime()}:${route}`;
  }

  /**
   * Existierenden Job behandeln
   */
  async handleExistingJob(job) {
    return {
      success: true,
      jobId: job._id,
      status: job.status,
      message: 'Job bereits vorhanden',
      existing: true
    };
  }

  /**
   * Payload für Connector erstellen
   */
  async buildPayload(performance, doctor, patient, route) {
    const basePayload = {
      performance: {
        id: performance._id,
        serviceCode: performance.serviceCode,
        serviceDescription: performance.serviceDescription,
        serviceDatetime: performance.serviceDatetime,
        unitPrice: performance.unitPrice,
        quantity: performance.quantity,
        totalPrice: performance.totalPrice,
        tariffType: performance.tariffType
      },
      doctor: {
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        contractType: doctor.contractType,
        specialization: doctor.specialization,
        taxNumber: doctor.taxNumber,
        chamberNumber: doctor.chamberNumber
      },
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        socialSecurityNumber: patient.socialSecurityNumber,
        insuranceProvider: patient.insuranceProvider,
        address: patient.address
      },
      route,
      timestamp: new Date()
    };

    // Route-spezifische Payload-Erweiterungen
    switch (route) {
      case 'KASSE':
        return this.buildKassaPayload(basePayload);
      case 'PATIENT+KASSE_REFUND':
        return this.buildWahlarztPayload(basePayload);
      case 'PATIENT+INSURANCE':
        return this.buildInsurancePayload(basePayload);
      case 'PATIENT':
        return this.buildPrivatPayload(basePayload);
      default:
        return basePayload;
    }
  }

  /**
   * Kassenarzt-Payload erstellen
   */
  buildKassaPayload(basePayload) {
    return {
      ...basePayload,
      kassaData: {
        elgaEnabled: true,
        eCardRequired: true,
        tariffCode: basePayload.performance.serviceCode,
        billingType: 'kassenarzt',
        copayAmount: this.calculateCopay(basePayload.performance.totalPrice)
      }
    };
  }

  /**
   * Wahlarzt-Payload erstellen
   */
  buildWahlarztPayload(basePayload) {
    const totalPrice = basePayload.performance.totalPrice;
    const refundAmount = this.calculateRefund(totalPrice);
    const copayAmount = this.calculateCopay(totalPrice);
    
    return {
      ...basePayload,
      wahlarztData: {
        totalPrice,
        refundAmount,
        copayAmount,
        patientAmount: totalPrice - refundAmount,
        billingType: 'wahlarzt',
        requiresRefundRequest: true
      }
    };
  }

  /**
   * Versicherungs-Payload erstellen
   */
  buildInsurancePayload(basePayload) {
    return {
      ...basePayload,
      insuranceData: {
        insuranceProvider: basePayload.patient.insuranceProvider,
        claimType: 'additional_insurance',
        requiresPreApproval: false,
        billingType: 'privat'
      }
    };
  }

  /**
   * Privatarzt-Payload erstellen
   */
  buildPrivatPayload(basePayload) {
    return {
      ...basePayload,
      privatData: {
        billingType: 'privat',
        paymentRequired: true,
        invoiceRequired: true
      }
    };
  }

  /**
   * Billing-Job erstellen
   */
  async createBillingJob(performance, route, payload, idempotencyKey, user) {
    const job = new BillingJob({
      performanceId: performance._id,
      doctorId: performance.doctorId,
      patientId: performance.patientId,
      target: route,
      payload,
      idempotencyKey,
      createdBy: user._id,
      status: 'PENDING'
    });
    
    return await job.save();
  }

  /**
   * Job in Queue einreihen
   */
  async enqueueJob(job) {
    // Hier würde normalerweise ein Queue-System wie Bull, Agenda oder ähnliches verwendet
    // Für jetzt simulieren wir das mit einem direkten Aufruf
    setTimeout(() => {
      this.processBillingJob(job._id);
    }, 100);
  }

  /**
   * Billing-Job verarbeiten (Queue Worker)
   */
  async processBillingJob(jobId) {
    const job = await BillingJob.findById(jobId);
    if (!job) return;

    const startTime = Date.now();
    
    try {
      // Job als "in Bearbeitung" markieren
      await job.markAsProcessing();
      
      await BillingAudit.logEvent(jobId, job.performanceId, 'JOB_STARTED', {
        attemptNumber: job.attempts,
        processingTime: 0
      });

      // Connector basierend auf Route aufrufen
      let response;
      switch (job.target) {
        case 'KASSE':
          response = await this.connectors.kassa.send(job.payload, job.idempotencyKey);
          break;
        case 'PATIENT+KASSE_REFUND':
          response = await this.processWahlarztBilling(job);
          break;
        case 'PATIENT+INSURANCE':
          response = await this.processInsuranceBilling(job);
          break;
        case 'PATIENT':
          response = await this.processPrivatBilling(job);
          break;
        default:
          throw new Error(`Unbekannte Route: ${job.target}`);
      }

      // Job als erfolgreich markieren
      await job.markAsCompleted(response, response.externalRef);
      
      // Performance-Status aktualisieren
      await this.updatePerformanceStatus(job.performanceId, 'sent', response);
      
      // Audit-Log erstellen
      await BillingAudit.logEvent(jobId, job.performanceId, 'JOB_COMPLETED', {
        response,
        processingTime: Date.now() - startTime
      });

      // Benachrichtigung an Arzt senden
      await this.notifyJobCompleted(job, response, 'success');

      // ELDA-Übermittlung (wenn aktiviert)
      await this.submitToELDA(job, response);

    } catch (error) {
      console.error(`Billing-Job ${jobId} fehlgeschlagen:`, error);
      
      await job.markAsFailed(error.message);
      
      await BillingAudit.logEvent(jobId, job.performanceId, 'JOB_FAILED', {
        error: {
          message: error.message,
          stack: error.stack
        },
        processingTime: Date.now() - startTime
      });

      // Benachrichtigung an Arzt senden
      await this.notifyJobCompleted(job, { error: error.message }, 'failed');
    }
  }

  /**
   * Benachrichtigt den Arzt über Job-Abschluss
   */
  async notifyJobCompleted(job, response, status) {
    try {
      const performance = await Performance.findById(job.performanceId)
        .populate('patientId', 'firstName lastName');
      
      if (!performance) {
        console.error('Performance nicht gefunden für Job:', job._id);
        return;
      }

      const patientName = performance.patientId 
        ? `${performance.patientId.firstName} ${performance.patientId.lastName}`
        : 'Unbekannter Patient';

      const serviceDescription = performance.serviceDescription || 'Unbekannte Leistung';
      const totalPrice = performance.totalPrice || 0;

      // System-User als Absender finden
      const systemUser = await User.findOne({ 
        role: { $in: ['admin', 'super_admin'] },
        isActive: true 
      }).select('_id');

      const senderId = systemUser?._id || job.createdBy;

      let subject, message, priority;

      if (status === 'success') {
        subject = `✅ Abrechnung erfolgreich: ${serviceDescription}`;
        message = `Die Abrechnung wurde erfolgreich verarbeitet:\n\n` +
          `Leistung: ${serviceDescription}\n` +
          `Patient: ${patientName}\n` +
          `Betrag: ${totalPrice.toFixed(2)} €\n` +
          `Route: ${job.target}\n` +
          (response.externalRef ? `Referenz: ${response.externalRef}\n` : '') +
          `\nDie Leistung wurde an die ${job.target === 'KASSE' ? 'Krankenkasse' : 'Versicherung'} übermittelt.`;
        priority = 'normal';
      } else {
        subject = `❌ Abrechnung fehlgeschlagen: ${serviceDescription}`;
        message = `Die Abrechnung konnte nicht verarbeitet werden:\n\n` +
          `Leistung: ${serviceDescription}\n` +
          `Patient: ${patientName}\n` +
          `Betrag: ${totalPrice.toFixed(2)} €\n` +
          `Route: ${job.target}\n` +
          `Fehler: ${response.error || 'Unbekannter Fehler'}\n\n` +
          `Bitte prüfen Sie die Leistung und versuchen Sie es erneut.`;
        priority = 'high';
      }

      const notification = new InternalMessage({
        senderId: senderId,
        recipientId: job.createdBy,
        subject: subject,
        message: message,
        priority: priority,
        status: 'sent',
        patientId: job.patientId,
        relatedResource: {
          type: 'BillingJob',
          id: job._id
        }
      });

      await notification.save();
      console.log(`✅ Billing-Benachrichtigung an Arzt gesendet (Job: ${job._id}, Status: ${status})`);

    } catch (error) {
      console.error('Fehler beim Senden der Billing-Benachrichtigung:', error);
      // Fehler nicht weiterwerfen, da dies nicht kritisch ist
    }
  }

  /**
   * Wahlarzt-Abrechnung verarbeiten
   */
  async processWahlarztBilling(job) {
    try {
      // 1. Rechnung erstellen
      const invoice = await this.createInvoice(job.payload);
      
      // 2. Zahlung initiieren (optional - nur wenn Zahlungsanbieter konfiguriert)
      let paymentResponse = null;
      try {
        paymentResponse = await this.connectors.payment.charge(
          job.payload.patient,
          invoice,
          { paymentMethod: 'stripe' } // Standard: Stripe
        );
      } catch (paymentError) {
        // Wenn Zahlungsanbieter nicht verfügbar, Rechnung trotzdem erstellen
        // Die Zahlung kann später manuell verarbeitet werden
        if (paymentError.code === 'PAYMENT_PROVIDER_NOT_AVAILABLE' || paymentError.message.includes('nicht verfügbar')) {
          console.warn('⚠️ Zahlungsanbieter nicht verfügbar, Rechnung wird ohne sofortige Zahlung erstellt:', paymentError.message);
          paymentResponse = {
            success: false,
            message: 'Zahlung nicht automatisch verarbeitet - Rechnung erstellt, Zahlung muss manuell erfolgen',
            invoiceNumber: invoice.invoiceNumber
          };
        } else {
          // Andere Fehler weiterwerfen
          throw paymentError;
        }
      }
      
      // 3. Rückerstattungsantrag an Kasse (optional - kann auch fehlschlagen)
      let refundResponse = null;
      try {
        refundResponse = await this.connectors.kassa.submitRefundRequest(
          job.payload,
          job.idempotencyKey
        );
      } catch (refundError) {
        // Wenn Rückerstattungsantrag fehlschlägt, Rechnung trotzdem erstellen
        console.warn('⚠️ Rückerstattungsantrag konnte nicht gestellt werden:', refundError.message);
        refundResponse = {
          success: false,
          message: 'Rückerstattungsantrag konnte nicht automatisch gestellt werden - muss manuell erfolgen',
          invoiceNumber: invoice.invoiceNumber
        };
      }
      
      const result = {
        invoice: invoice,
        payment: paymentResponse,
        refund: refundResponse,
        externalRef: refundResponse?.kassaRef || invoice.invoiceNumber
      };
      
      // WAHonline-Übermittlung (wenn aktiviert)
      await this.submitToWAHonline(job, result);
      
      return result;
    } catch (error) {
      // Falls ein kritischer Fehler auftritt (z.B. beim createInvoice), diesen weiterwerfen
      console.error('Kritischer Fehler in processWahlarztBilling:', error);
      throw error;
    }
  }

  /**
   * Versicherungsabrechnung verarbeiten
   */
  async processInsuranceBilling(job) {
    // 1. Rechnung erstellen
    const invoice = await this.createInvoice(job.payload);
    
    // 2. Antrag an Versicherung
    const insuranceResponse = await this.connectors.insurance.submitClaim(
      invoice,
      job.payload
    );
    
    return {
      invoice: invoice,
      insurance: insuranceResponse,
      externalRef: insuranceResponse.claimRef
    };
  }

  /**
   * Privatarzt-Abrechnung verarbeiten
   */
  async processPrivatBilling(job) {
    try {
      // 1. Rechnung erstellen
      const invoice = await this.createInvoice(job.payload);
      
      // 2. Zahlung initiieren (optional - nur wenn Zahlungsanbieter konfiguriert)
      let paymentResponse = null;
      try {
        paymentResponse = await this.connectors.payment.charge(
          job.payload.patient,
          invoice,
          { paymentMethod: 'stripe' } // Standard: Stripe
        );
      } catch (paymentError) {
        // Wenn Zahlungsanbieter nicht verfügbar, Rechnung trotzdem erstellen
        // Die Zahlung kann später manuell verarbeitet werden
        if (paymentError.code === 'PAYMENT_PROVIDER_NOT_AVAILABLE' || paymentError.message.includes('nicht verfügbar')) {
          console.warn('⚠️ Zahlungsanbieter nicht verfügbar, Rechnung wird ohne sofortige Zahlung erstellt:', paymentError.message);
          paymentResponse = {
            success: false,
            message: 'Zahlung nicht automatisch verarbeitet - Rechnung erstellt, Zahlung muss manuell erfolgen',
            invoiceNumber: invoice.invoiceNumber
          };
        } else {
          // Andere Fehler weiterwerfen
          throw paymentError;
        }
      }
      
      return {
        invoice: invoice,
        payment: paymentResponse,
        externalRef: invoice.invoiceNumber
      };
    } catch (error) {
      // Falls ein kritischer Fehler auftritt (z.B. beim createInvoice), diesen weiterwerfen
      console.error('Kritischer Fehler in processPrivatBilling:', error);
      throw error;
    }
  }

  /**
   * Rechnung erstellen
   */
  async createInvoice(payload) {
    const { performance, doctor, patient, route } = payload;
    
    // Billing-Type basierend auf Route bestimmen
    let billingType = 'privat';
    if (route === 'KASSE') {
      billingType = 'kassenarzt';
    } else if (route === 'PATIENT+KASSE_REFUND') {
      billingType = 'wahlarzt';
    } else if (route === 'PATIENT+INSURANCE') {
      billingType = 'privat'; // Privat mit Versicherung
    } else {
      billingType = 'privat';
    }
    
    // Arzt-Adresse extrahieren (kann in profile.address sein)
    const doctorAddress = doctor.profile?.address || doctor.address || {};
    const doctorStreet = (doctorAddress.street || doctorAddress.address_line1 || '').trim() || 'Adresse nicht angegeben';
    const doctorCity = (doctorAddress.city || '').trim() || 'Stadt nicht angegeben';
    const doctorPostalCode = (doctorAddress.postalCode || doctorAddress.postal_code || '').trim() || '0000';
    
    // Patient-Adresse extrahieren
    const patientAddress = patient.address || {};
    const patientStreet = (patientAddress.street || patientAddress.address_line1 || '').trim() || 'Adresse nicht angegeben';
    const patientCity = (patientAddress.city || '').trim() || 'Stadt nicht angegeben';
    const patientPostalCode = (patientAddress.postalCode || patientAddress.postal_code || '').trim() || '0000';
    
    // Invoice-Daten zusammenstellen
    const invoiceData = {
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Tage Fälligkeit
      doctor: {
        name: doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
        title: doctor.profile?.title || doctor.title || '',
        specialization: doctor.profile?.specialization || doctor.specialization || '',
        address: {
          street: doctorStreet,
          city: doctorCity,
          postalCode: doctorPostalCode,
          country: doctorAddress.country || 'Österreich'
        },
        taxNumber: doctor.taxNumber || '',
        chamberNumber: doctor.chamberNumber || ''
      },
      patient: {
        id: patient.id,
        name: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        address: {
          street: patientStreet,
          city: patientCity,
          postalCode: patientPostalCode,
          country: patientAddress.country || 'Österreich'
        },
        insuranceNumber: patient.insuranceNumber || '',
        insuranceProvider: patient.insuranceProvider || 'ÖGK (Österreichische Gesundheitskasse)'
      },
      billingType,
      services: [{
        date: performance.serviceDatetime ? new Date(performance.serviceDatetime) : new Date(),
        serviceCode: performance.serviceCode,
        description: performance.serviceDescription,
        quantity: performance.quantity || 1,
        unitPrice: performance.unitPrice,
        totalPrice: performance.totalPrice
      }],
      subtotal: performance.totalPrice,
      taxRate: await this.calculateTaxRateForService(performance.serviceCode, billingType),
      taxAmount: performance.totalPrice * (await this.calculateTaxRateForService(performance.serviceCode, billingType)) / 100,
      totalAmount: performance.totalPrice + (performance.totalPrice * (await this.calculateTaxRateForService(performance.serviceCode, billingType)) / 100),
      status: 'sent', // Rechnung wird direkt als "gesendet" markiert
      createdBy: doctor.id // Arzt als Ersteller
    };
    
    // Route-spezifische Daten hinzufügen
    if (route === 'KASSE' && payload.kassaData) {
      invoiceData.ogkBilling = {
        xmlExported: false,
        billingPeriod: this.getBillingPeriod(),
        status: 'pending'
      };
      // Copay-Betrag für Kassenleistungen
      if (payload.kassaData.copayAmount) {
        invoiceData.services[0].copay = payload.kassaData.copayAmount;
      }
    } else if (route === 'PATIENT+KASSE_REFUND' && payload.wahlarztData) {
      invoiceData.privateBilling = {
        honorNote: false,
        reimbursementAmount: payload.wahlarztData.refundAmount || 0,
        patientAmount: payload.wahlarztData.patientAmount || performance.totalPrice
      };
    }
    
    // Diagnosen hinzufügen, falls vorhanden
    if (payload.diagnoses && Array.isArray(payload.diagnoses)) {
      invoiceData.diagnoses = payload.diagnoses.map((diag) => ({
        code: diag.code || diag.icd10Code,
        display: diag.display || diag.description || '',
        isPrimary: diag.isPrimary || false,
        date: diag.date ? new Date(diag.date) : new Date()
      }));
    }
    
    // Invoice-Nummer explizit generieren (vor Validierung)
    if (!invoiceData.invoiceNumber) {
      const count = await Invoice.countDocuments();
      const year = new Date().getFullYear();
      invoiceData.invoiceNumber = `R-${year}-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Sicherstellen, dass alle Pflichtfelder gesetzt sind (vor Validierung)
    // Arzt-Adresse - explizit setzen, auch wenn leer
    invoiceData.doctor.address = {
      street: invoiceData.doctor.address.street || 'Adresse nicht angegeben',
      city: invoiceData.doctor.address.city || 'Stadt nicht angegeben',
      postalCode: invoiceData.doctor.address.postalCode || '0000',
      country: invoiceData.doctor.address.country || 'Österreich'
    };
    
    // Patient-Adresse - explizit setzen, auch wenn leer
    invoiceData.patient.address = {
      street: invoiceData.patient.address.street || 'Adresse nicht angegeben',
      city: invoiceData.patient.address.city || 'Stadt nicht angegeben',
      postalCode: invoiceData.patient.address.postalCode || '0000',
      country: invoiceData.patient.address.country || 'Österreich'
    };
    
    // Debug: Log invoiceData vor dem Speichern
    console.log('DEBUG: invoiceData vor Validierung:', {
      invoiceNumber: invoiceData.invoiceNumber,
      doctorAddress: invoiceData.doctor.address,
      patientAddress: invoiceData.patient.address
    });
    
    // Invoice erstellen
    const invoice = new Invoice(invoiceData);
    
    // Validierung manuell durchführen, bevor save()
    const validationError = invoice.validateSync();
    if (validationError) {
      console.error('DEBUG: Validierungsfehler:', validationError.errors);
      throw new Error(`Invoice validation failed: ${Object.keys(validationError.errors).map(key => `${key}: ${validationError.errors[key].message}`).join(', ')}`);
    }
    
    await invoice.save();
    
    return invoice;
  }
  
  /**
   * Übermittelt Abrechnung an ELDA (wenn aktiviert)
   */
  async submitToELDA(job, billingResponse) {
    try {
      // Prüfe ob ELDA aktiviert ist
      const doctor = await User.findById(job.createdBy).select('+profile');
      if (!doctor || !doctor.profile?.preferences?.eldaEnabled) {
        return; // ELDA nicht aktiviert
      }

      // Nur für Kassenarzt-Abrechnungen
      if (job.target !== 'KASSE') {
        return; // ELDA nur für Kassenabrechnungen
      }

      // Lade Performance und Patient
      const performance = await Performance.findById(job.performanceId);
      if (!performance) {
        console.warn('⚠️ Performance nicht gefunden für ELDA-Übermittlung:', job.performanceId);
        return;
      }

      const patient = await this.loadPatientData(performance.patientId);
      if (!patient || !patient.socialSecurityNumber) {
        console.warn('⚠️ Patient oder Sozialversicherungsnummer fehlt für ELDA-Übermittlung');
        return;
      }

      // NEU: Konvertiere Service-Code für Versicherungsträger
      const insuranceProviderCode = serviceCodeMappingService.mapInsuranceProviderToCode(
        patient.insuranceProvider
      );
      
      let serviceCode = performance.serviceCode;
      let serviceName = performance.serviceDescription;
      let servicePrice = performance.unitPrice;
      
      if (insuranceProviderCode) {
        const mapping = await serviceCodeMappingService.findMapping(
          performance.serviceCode,
          insuranceProviderCode
        );
        
        if (mapping) {
          serviceCode = mapping.providerCode;
          serviceName = mapping.providerName || serviceName;
          // Verwende Provider-Preis, falls vorhanden
          if (mapping.providerPrice !== undefined) {
            servicePrice = mapping.providerPrice;
          }
        }
      }

      // Erstelle ELDA-Abrechnungs-Datensatz
      const period = this.getBillingPeriod();
      const periodParts = period.split('-');
      const periodStart = new Date(parseInt(periodParts[0]), parseInt(periodParts[1]) - 1, 1);
      const periodEnd = new Date(parseInt(periodParts[0]), parseInt(periodParts[1]), 0, 23, 59, 59);

      const eldaData = {
        patient: {
          socialSecurityNumber: patient.socialSecurityNumber,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          insuranceNumber: patient.insuranceNumber,
          insuranceProvider: patient.insuranceProvider,
          address: patient.address
        },
        doctor: {
          taxNumber: doctor.taxNumber,
          chamberNumber: doctor.chamberNumber,
          name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
          title: doctor.profile?.title || '',
          specialization: doctor.profile?.specialization || '',
          address: doctor.profile?.address || {}
        },
        services: [{
          date: performance.serviceDatetime || new Date(),
          code: serviceCode, // Konvertierter Code für Versicherungsträger
          ebmCode: serviceCode, // EBM-Code (kann auch konvertiert sein)
          description: serviceName, // Konvertierter Name
          quantity: performance.quantity || 1,
          unitPrice: servicePrice, // Konvertierter Preis, falls vorhanden
          totalPrice: servicePrice * (performance.quantity || 1), // Neu berechnet
          copay: job.payload.kassaData?.copayAmount || 0
        }],
        period: {
          startDate: periodStart,
          endDate: periodEnd,
          year: parseInt(periodParts[0]),
          month: parseInt(periodParts[1])
        },
        totals: {
          totalAmount: performance.totalPrice,
          totalCopay: job.payload.kassaData?.copayAmount || 0,
          insuranceAmount: performance.totalPrice - (job.payload.kassaData?.copayAmount || 0)
        }
      };

      // Bestimme ELDA-Methode
      const eldaMethod = doctor.profile?.preferences?.eldaMethod || 'auto';

      // Sende an ELDA
      const eldaResult = await eldaConnector.send(
        eldaData,
        'Abrechnung',
        eldaMethod === 'auto' ? null : eldaMethod,
        true // autoFormat = true
      );

      console.log(`✅ Abrechnung erfolgreich an ELDA übermittelt (Job: ${job._id})`);

      // Audit-Log erstellen
      await BillingAudit.logEvent(job._id, job.performanceId, 'ELDA_SUBMITTED', {
        eldaResult,
        method: eldaMethod,
        processingTime: Date.now()
      });

    } catch (error) {
      // ELDA-Fehler nicht kritisch - Abrechnung war bereits erfolgreich
      console.error('⚠️ Fehler bei ELDA-Übermittlung (nicht kritisch):', error.message);
      
      // Audit-Log für ELDA-Fehler
      try {
        await BillingAudit.logEvent(job._id, job.performanceId, 'ELDA_SUBMIT_FAILED', {
          error: error.message,
          processingTime: Date.now()
        });
      } catch (auditError) {
        // Ignoriere Audit-Fehler
      }
    }
  }

  /**
   * Übermittelt Wahlarzt-Abrechnung an WAHonline (wenn aktiviert)
   * @param {object} job - BillingJob-Objekt
   * @param {object} billingResponse - Antwort der Wahlarzt-Abrechnung
   */
  async submitToWAHonline(job, billingResponse) {
    try {
      // Prüfe ob WAHonline aktiviert ist
      const doctor = await User.findById(job.createdBy).select('+profile');
      if (!doctor || !doctor.profile?.preferences?.wahonlineEnabled) {
        return; // WAHonline nicht aktiviert
      }

      // WAHonline nur für Wahlarzt-Abrechnungen
      if (job.route !== 'PATIENT+KASSE_REFUND') {
        return; // WAHonline nur für Wahlarzt-Leistungen
      }

      // Lade Performance und Patient
      const performance = await Performance.findById(job.performanceId);
      if (!performance) {
        console.warn('⚠️ Performance nicht gefunden für WAHonline-Übermittlung:', job.performanceId);
        return;
      }

      const patient = await PatientExtended.findById(job.patientId);
      if (!patient || !patient.socialSecurityNumber) {
        console.warn('⚠️ Patient oder Sozialversicherungsnummer fehlt für WAHonline-Übermittlung');
        return;
      }

      // NEU: Konvertiere Service-Code für Versicherungsträger (WAHonline verwendet meist ÖGK)
      const insuranceProviderCode = serviceCodeMappingService.mapInsuranceProviderToCode(
        patient.insuranceProvider
      ) || 'oegk'; // Fallback auf ÖGK für WAHonline
      
      let serviceCode = performance.serviceCode;
      let serviceName = performance.serviceDescription;
      let servicePrice = performance.unitPrice;
      
      if (insuranceProviderCode) {
        const mapping = await serviceCodeMappingService.findMapping(
          performance.serviceCode,
          insuranceProviderCode
        );
        
        if (mapping) {
          serviceCode = mapping.providerCode;
          serviceName = mapping.providerName || serviceName;
          // Verwende Provider-Preis, falls vorhanden
          if (mapping.providerPrice !== undefined) {
            servicePrice = mapping.providerPrice;
          }
        }
      }

      // Erstelle WAHonline-Meldungs-Datensatz
      const wahonlineData = {
        performance: {
          ...performance.toObject(),
          serviceCode: serviceCode, // Konvertierter Code
          serviceDescription: serviceName, // Konvertierter Name
          unitPrice: servicePrice, // Konvertierter Preis
          totalPrice: servicePrice * (performance.quantity || 1), // Neu berechnet
          idempotencyKey: job.idempotencyKey
        },
        patient: patient.toObject(),
        doctor: doctor.toObject()
      };

      // Generiere Idempotency-Key für WAHonline
      const wahonlineIdempotencyKey = `wahonline_${job._id}_${Date.now()}`;

      // Sende an WAHonline
      const wahonlineResult = await wahonlineConnector.send(
        wahonlineData,
        wahonlineIdempotencyKey,
        true // autoFormat
      );

      console.log(`✅ Wahlarzt-Abrechnung erfolgreich an WAHonline übermittelt (Job: ${job._id})`);

      // Audit-Log für WAHonline-Übermittlung
      await BillingAudit.logEvent(job._id, job.performanceId, 'WAHONLINE_SUBMITTED', {
        wahonlineResult,
        wahonlineRef: wahonlineResult.wahonlineRef
      });

    } catch (error) {
      // WAHonline-Fehler nicht kritisch - Abrechnung war bereits erfolgreich
      console.error('⚠️ Fehler bei WAHonline-Übermittlung (nicht kritisch):', error.message);

      // Audit-Log für WAHonline-Fehler
      try {
        await BillingAudit.logEvent(job._id, job.performanceId, 'WAHONLINE_SUBMIT_FAILED', {
          error: error.message,
          stack: error.stack
        });
      } catch (auditError) {
        // Audit-Fehler ignorieren
      }
    }
  }

  /**
   * Billing-Period für ÖGK-Abrechnungen generieren
   */
  getBillingPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Performance-Status aktualisieren
   */
  async updatePerformanceStatus(performanceId, status, response) {
    const updateData = {
      status,
      billedAt: new Date()
    };
    
    if (response.kassaRef) updateData['billingData.kassaRef'] = response.kassaRef;
    if (response.insuranceRef) updateData['billingData.insuranceRef'] = response.insuranceRef;
    if (response.invoiceNumber) updateData['billingData.invoiceNumber'] = response.invoiceNumber;
    
    await Performance.findByIdAndUpdate(performanceId, updateData);
  }

  /**
   * Copay berechnen
   */
  calculateCopay(totalPrice) {
    // Vereinfachte Copay-Berechnung (20% der Kosten)
    return Math.round(totalPrice * 0.2);
  }

  /**
   * Rückerstattung berechnen
   */
  calculateRefund(totalPrice) {
    // Vereinfachte Rückerstattungsberechnung (80% vom Kassentarif)
    return Math.round(totalPrice * 0.8);
  }

  /**
   * Route-Nachricht generieren
   */
  getRouteMessage(route) {
    const messages = {
      'KASSE': 'Leistung wird direkt an die Krankenkasse gemeldet',
      'PATIENT+KASSE_REFUND': 'Rechnung wird erstellt und Rückerstattungsantrag an Kasse gestellt',
      'PATIENT+INSURANCE': 'Rechnung wird erstellt und an Versicherung eingereicht',
      'PATIENT': 'Rechnung wird erstellt und an Patient gesendet'
    };
    return messages[route] || 'Abrechnung wird verarbeitet';
  }

  /**
   * Job-Status abfragen
   */
  async getJobStatus(jobId) {
    const job = await BillingJob.findById(jobId)
      .populate('performanceId', 'serviceDescription totalPrice status')
      .populate('patientId', 'firstName lastName');
    
    if (!job) {
      throw new Error('Job nicht gefunden');
    }
    
    const auditHistory = await BillingAudit.getJobHistory(jobId);
    
    return {
      job: job,
      auditHistory: auditHistory,
      canRetry: job.canRetry()
    };
  }

  /**
   * Fehlgeschlagene Jobs abrufen
   */
  async getFailedJobs(doctorId = null) {
    const filter = { status: 'FAILED' };
    if (doctorId) filter.doctorId = doctorId;
    
    return await BillingJob.find(filter)
      .populate('performanceId', 'serviceDescription totalPrice')
      .populate('patientId', 'firstName lastName')
      .sort({ updatedAt: -1 });
  }

  /**
   * Job erneut versuchen
   */
  async retryJob(jobId, user) {
    const job = await BillingJob.findById(jobId);
    if (!job) {
      throw new Error('Job nicht gefunden');
    }
    
    if (!job.canRetry()) {
      throw new Error('Job kann nicht erneut versucht werden');
    }
    
    // Job zurücksetzen
    job.status = 'PENDING';
    job.nextRetryAt = null;
    job.lastError = null;
    await job.save();
    
    // Audit-Log
    await BillingAudit.logEvent(jobId, job.performanceId, 'RETRY_ATTEMPT', {
      userId: user._id,
      userRole: user.role
    });
    
    // Job erneut einreihen
    await this.enqueueJob(job);
    
    return { success: true, message: 'Job wird erneut verarbeitet' };
  }
}

module.exports = new BillingService();






