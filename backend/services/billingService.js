const Performance = require('../models/Performance');
const BillingJob = require('../models/BillingJob');
const BillingAudit = require('../models/BillingAudit');
const User = require('../models/User');
const Patient = require('../models/Patient');
const ServiceCatalog = require('../models/ServiceCatalog');

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
      
      // 2. Route bestimmen
      const route = this.determineRoute(doctor, performance, options);
      
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
      .populate('appointmentId', 'startTime endTime type');
    
    if (!performance) {
      throw new Error('Leistung nicht gefunden');
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
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      throw new Error('Arzt nicht gefunden');
    }
    return doctor;
  }

  /**
   * Patientendaten laden
   */
  async loadPatientData(patientId) {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new Error('Patient nicht gefunden');
    }
    return patient;
  }

  /**
   * Abrechnungsroute bestimmen
   */
  determineRoute(doctor, performance, options) {
    const contractType = doctor.contractType || 'privat';
    
    switch (contractType) {
      case 'kassenarzt':
        return 'KASSE';
      case 'wahlarzt':
        return 'PATIENT+KASSE_REFUND';
      case 'privat':
        return options.insuranceClaim ? 'PATIENT+INSURANCE' : 'PATIENT';
      default:
        return 'PATIENT';
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
    // Hier würde der bestehende Invoice-Service verwendet
    const invoiceService = require('./invoiceService');
    return await invoiceService.createInvoiceFromPerformance(payload);
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


