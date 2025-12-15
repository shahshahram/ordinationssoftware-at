const Performance = require('../models/Performance');
const BillingJob = require('../models/BillingJob');
const BillingAudit = require('../models/BillingAudit');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const PatientExtended = require('../models/PatientExtended'); // Produktivsystem-Standard
const Patient = require('../models/Patient'); // Fallback für Migration
const ServiceCatalog = require('../models/ServiceCatalog');
const InternalMessage = require('../models/InternalMessage');

class BillingService {
  constructor() {
    this.connectors = {
      kassa: require('./connectors/kassenConnector'),
      insurance: require('./connectors/insuranceConnector'),
      payment: require('./connectors/paymentConnector')
    };
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
    
    const doctor = await User.findById(id);
    if (!doctor) {
      throw new Error('Arzt nicht gefunden');
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
          console.log('🔍 Kassenleistung - Prüfe Bedingungen:');
          console.log('  - Doctor contractType:', doctor.contractType);
          console.log('  - Performance appointmentId:', performance.appointmentId);
          console.log('  - Options locationId:', options.locationId);
          
          if (doctor.contractType === 'kassenarzt') {
            console.log('✅ Arzt ist Kassenarzt - Route: KASSE');
            return 'KASSE';
          }
          
          // Location aus Appointment laden, falls vorhanden
          let location = null;
          if (performance.appointmentId) {
            let appointment = null;
            if (performance.appointmentId && typeof performance.appointmentId === 'object' && performance.appointmentId.locationId) {
              // Bereits populated
              appointment = performance.appointmentId;
              console.log('  - Appointment bereits populated, locationId:', appointment.locationId);
            } else if (performance.appointmentId && typeof performance.appointmentId === 'object' && performance.appointmentId._id) {
              // ObjectId als Objekt
              appointment = await Appointment.findById(performance.appointmentId._id || performance.appointmentId).select('locationId');
              console.log('  - Appointment aus DB geladen, locationId:', appointment?.locationId);
            } else if (performance.appointmentId) {
              // String/ObjectId
              appointment = await Appointment.findById(performance.appointmentId).select('locationId');
              console.log('  - Appointment aus DB geladen (String/ObjectId), locationId:', appointment?.locationId);
            }
            
            if (appointment && appointment.locationId) {
              location = await Location.findById(appointment.locationId);
              console.log('  - Location gefunden:', location ? { _id: location._id, name: location.name, practiceType: location.practiceType } : 'NICHT GEFUNDEN');
            } else {
              console.log('  - Kein Appointment oder keine locationId im Appointment');
            }
          } else {
            console.log('  - Performance hat kein appointmentId');
          }
          
          // Location aus options laden (falls direkt übergeben)
          if (!location && options.locationId) {
            location = await Location.findById(options.locationId);
            console.log('  - Location aus options geladen:', location ? { _id: location._id, name: location.name, practiceType: location.practiceType } : 'NICHT GEFUNDEN');
          }
          
          // Wenn Location Kassenpraxis ist, auch erlauben
          if (location && location.practiceType === 'kassenpraxis') {
            console.log('✅ Location ist Kassenpraxis - Route: KASSE');
            return 'KASSE';
          }
          
          // Fallback: Wenn Kasse nicht möglich, automatisch auf Wahlarzt umschalten
          // (statt Fehler zu werfen, da der Arzt explizit "kassa" gewählt hat, aber die Bedingungen nicht erfüllt sind)
          const errorDetails = {
            doctorContractType: doctor.contractType || 'nicht gesetzt',
            hasAppointment: !!performance.appointmentId,
            locationFound: !!location,
            locationPracticeType: location?.practiceType || 'nicht gefunden',
            optionsLocationId: options.locationId || 'nicht übergeben'
          };
          console.warn('⚠️ Kassenleistung kann nicht als Kasse abgerechnet werden, wechsle zu Wahlarzt:', errorDetails);
          console.warn('  - Arzt-Vertragstyp:', errorDetails.doctorContractType);
          console.warn('  - Location-Praxistyp:', errorDetails.locationPracticeType);
          console.warn('  - Route geändert: KASSE -> PATIENT+KASSE_REFUND');
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
    // 1. Rechnung erstellen
    const invoice = await this.createInvoice(job.payload);
    
    // 2. Zahlung initiieren
    const paymentResponse = await this.connectors.payment.charge(
      job.payload.patient,
      invoice
    );
    
    // 3. Rückerstattungsantrag an Kasse
    const refundResponse = await this.connectors.kassa.submitRefundRequest(
      job.payload,
      job.idempotencyKey
    );
    
    return {
      invoice: invoice,
      payment: paymentResponse,
      refund: refundResponse,
      externalRef: refundResponse.kassaRef
    };
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
    // 1. Rechnung erstellen
    const invoice = await this.createInvoice(job.payload);
    
    // 2. Zahlung initiieren
    const paymentResponse = await this.connectors.payment.charge(
      job.payload.patient,
      invoice
    );
    
    return {
      invoice: invoice,
      payment: paymentResponse,
      externalRef: invoice.invoiceNumber
    };
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
    
    // Invoice-Daten zusammenstellen
    const invoiceData = {
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Tage Fälligkeit
      doctor: {
        name: doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
        title: doctor.title,
        specialization: doctor.specialization,
        address: doctor.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'Österreich'
        },
        taxNumber: doctor.taxNumber,
        chamberNumber: doctor.chamberNumber
      },
      patient: {
        id: patient.id,
        name: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        address: patient.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'Österreich'
        },
        insuranceNumber: patient.insuranceNumber,
        insuranceProvider: patient.insuranceProvider
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
      taxRate: 0, // 0% für medizinische Leistungen in Österreich
      taxAmount: 0,
      totalAmount: performance.totalPrice,
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
      invoiceData.diagnoses = payload.diagnoses.map((diag: any) => ({
        code: diag.code || diag.icd10Code,
        display: diag.display || diag.description || '',
        isPrimary: diag.isPrimary || false,
        date: diag.date ? new Date(diag.date) : new Date()
      }));
    }
    
    // Invoice erstellen
    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    return invoice;
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






