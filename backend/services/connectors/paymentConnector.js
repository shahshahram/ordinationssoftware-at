const axios = require('axios');
const crypto = require('crypto');

class PaymentConnector {
  constructor() {
    this.providers = {
      // Stripe für Kreditkarten
      stripe: {
        apiKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        enabled: !!process.env.STRIPE_SECRET_KEY
      },
      // SEPA für Banküberweisungen
      sepa: {
        apiKey: process.env.SEPA_API_KEY,
        enabled: !!process.env.SEPA_API_KEY
      },
      // PayPal als Alternative
      paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        enabled: !!process.env.PAYPAL_CLIENT_ID
      }
    };
  }

  /**
   * Zahlung für Patient initiieren
   * @param {object} patient - Patientendaten
   * @param {object} invoice - Rechnungsdaten
   * @param {object} options - Zahlungsoptionen
   * @returns {Promise<object>} Zahlungs-Response
   */
  async charge(patient, invoice, options = {}) {
    const paymentMethod = options.paymentMethod || 'stripe';
    const provider = this.providers[paymentMethod];
    
    if (!provider || !provider.enabled) {
      throw new Error(`Zahlungsanbieter ${paymentMethod} nicht verfügbar`);
    }

    try {
      switch (paymentMethod) {
        case 'stripe':
          return await this.chargeWithStripe(patient, invoice, options);
        case 'sepa':
          return await this.chargeWithSEPA(patient, invoice, options);
        case 'paypal':
          return await this.chargeWithPayPal(patient, invoice, options);
        default:
          throw new Error(`Unbekannte Zahlungsmethode: ${paymentMethod}`);
      }
    } catch (error) {
      console.error('Payment-Connector Fehler:', error);
      throw new Error(`Zahlung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Zahlung mit Stripe (Kreditkarte)
   */
  async chargeWithStripe(patient, invoice, options) {
    const stripe = require('stripe')(this.providers.stripe.apiKey);
    
    try {
      // Payment Intent erstellen
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.totalAmount * 100), // Cent umrechnen
        currency: 'eur',
        customer: await this.getOrCreateStripeCustomer(patient, stripe),
        description: `Rechnung ${invoice.invoiceNumber}`,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          patientId: patient.id,
          serviceDescription: invoice.serviceDescription
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      return {
        success: true,
        paymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: invoice.totalAmount,
        currency: 'EUR',
        method: 'stripe'
      };
      
    } catch (error) {
      throw new Error(`Stripe-Zahlung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Stripe-Kunde erstellen oder abrufen
   */
  async getOrCreateStripeCustomer(patient, stripe) {
    try {
      // Zuerst nach existierendem Kunden suchen
      const customers = await stripe.customers.list({
        email: patient.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        return customers.data[0].id;
      }

      // Neuen Kunden erstellen
      const customer = await stripe.customers.create({
        email: patient.email,
        name: patient.name,
        metadata: {
          patientId: patient.id,
          source: 'ordinationssoftware'
        }
      });

      return customer.id;
      
    } catch (error) {
      throw new Error(`Stripe-Kunde erstellen fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Zahlung mit SEPA
   */
  async chargeWithSEPA(patient, invoice, options) {
    // SEPA-Mandat erstellen
    const mandate = await this.createSEPAMandate(patient, invoice);
    
    // SEPA-Lastschrift initiieren
    const sepaCharge = await this.initiateSEPACharge(mandate, invoice);
    
    return {
      success: true,
      paymentId: sepaCharge.id,
      mandateId: mandate.id,
      status: 'pending',
      amount: invoice.totalAmount,
      currency: 'EUR',
      method: 'sepa',
      dueDate: sepaCharge.dueDate
    };
  }

  /**
   * SEPA-Mandat erstellen
   */
  async createSEPAMandate(patient, invoice) {
    const mandateData = {
      customer: {
        name: patient.name,
        email: patient.email,
        address: patient.address
      },
      bankAccount: {
        iban: patient.iban,
        bic: patient.bic,
        accountHolder: patient.name
      },
      mandate: {
        reference: `MANDATE_${invoice.invoiceNumber}`,
        type: 'recurring',
        description: `SEPA-Mandat für Ordinationssoftware`
      }
    };

    // Hier würde die SEPA-API aufgerufen
    // Für jetzt simulieren wir das
    return {
      id: `mandate_${Date.now()}`,
      status: 'active',
      reference: mandateData.mandate.reference
    };
  }

  /**
   * SEPA-Lastschrift initiieren
   */
  async initiateSEPACharge(mandate, invoice) {
    const chargeData = {
      mandateId: mandate.id,
      amount: invoice.totalAmount,
      currency: 'EUR',
      description: `Rechnung ${invoice.invoiceNumber}`,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 Tage
    };

    // Hier würde die SEPA-API aufgerufen
    return {
      id: `sepa_${Date.now()}`,
      status: 'pending',
      dueDate: chargeData.dueDate,
      amount: chargeData.amount
    };
  }

  /**
   * Zahlung mit PayPal
   */
  async chargeWithPayPal(patient, invoice, options) {
    const paypal = require('@paypal/checkout-server-sdk');
    
    const environment = new paypal.core.SandboxEnvironment(
      this.providers.paypal.clientId,
      this.providers.paypal.clientSecret
    );
    const client = new paypal.core.PayPalHttpClient(environment);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: invoice.totalAmount.toFixed(2)
        },
        description: `Rechnung ${invoice.invoiceNumber}`,
        custom_id: invoice.invoiceNumber
      }],
      payer: {
        email_address: patient.email,
        name: {
          given_name: patient.firstName,
          surname: patient.lastName
        }
      }
    });

    try {
      const order = await client.execute(request);
      
      return {
        success: true,
        paymentId: order.result.id,
        status: order.result.status,
        amount: invoice.totalAmount,
        currency: 'EUR',
        method: 'paypal',
        approvalUrl: order.result.links.find(link => link.rel === 'approve').href
      };
      
    } catch (error) {
      throw new Error(`PayPal-Zahlung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Zahlungsstatus abfragen
   */
  async getPaymentStatus(paymentId, method) {
    const provider = this.providers[method];
    if (!provider || !provider.enabled) {
      throw new Error(`Zahlungsanbieter ${method} nicht verfügbar`);
    }

    try {
      switch (method) {
        case 'stripe':
          return await this.getStripePaymentStatus(paymentId);
        case 'sepa':
          return await this.getSEPAPaymentStatus(paymentId);
        case 'paypal':
          return await this.getPayPalPaymentStatus(paymentId);
        default:
          throw new Error(`Unbekannte Zahlungsmethode: ${method}`);
      }
    } catch (error) {
      throw new Error(`Status-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Stripe-Zahlungsstatus abfragen
   */
  async getStripePaymentStatus(paymentId) {
    const stripe = require('stripe')(this.providers.stripe.apiKey);
    
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        method: 'stripe',
        created: new Date(paymentIntent.created * 1000)
      };
      
    } catch (error) {
      throw new Error(`Stripe-Status-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * SEPA-Zahlungsstatus abfragen
   */
  async getSEPAPaymentStatus(paymentId) {
    // Hier würde die SEPA-API aufgerufen
    // Für jetzt simulieren wir das
    return {
      id: paymentId,
      status: 'pending',
      method: 'sepa',
      created: new Date()
    };
  }

  /**
   * PayPal-Zahlungsstatus abfragen
   */
  async getPayPalPaymentStatus(paymentId) {
    const paypal = require('@paypal/checkout-server-sdk');
    
    const environment = new paypal.core.SandboxEnvironment(
      this.providers.paypal.clientId,
      this.providers.paypal.clientSecret
    );
    const client = new paypal.core.PayPalHttpClient(environment);

    const request = new paypal.orders.OrdersGetRequest(paymentId);

    try {
      const order = await client.execute(request);
      
      return {
        id: order.result.id,
        status: order.result.status,
        amount: parseFloat(order.result.purchase_units[0].amount.value),
        currency: order.result.purchase_units[0].amount.currency_code,
        method: 'paypal',
        created: new Date(order.result.create_time)
      };
      
    } catch (error) {
      throw new Error(`PayPal-Status-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Zahlung stornieren
   */
  async refundPayment(paymentId, method, amount = null) {
    const provider = this.providers[method];
    if (!provider || !provider.enabled) {
      throw new Error(`Zahlungsanbieter ${method} nicht verfügbar`);
    }

    try {
      switch (method) {
        case 'stripe':
          return await this.refundStripePayment(paymentId, amount);
        case 'sepa':
          return await this.refundSEPAPayment(paymentId, amount);
        case 'paypal':
          return await this.refundPayPalPayment(paymentId, amount);
        default:
          throw new Error(`Unbekannte Zahlungsmethode: ${method}`);
      }
    } catch (error) {
      throw new Error(`Rückerstattung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Stripe-Zahlung stornieren
   */
  async refundStripePayment(paymentId, amount) {
    const stripe = require('stripe')(this.providers.stripe.apiKey);
    
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentId,
        amount: amount ? Math.round(amount * 100) : undefined
      });
      
      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        method: 'stripe'
      };
      
    } catch (error) {
      throw new Error(`Stripe-Rückerstattung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Verfügbare Zahlungsmethoden abrufen
   */
  getAvailablePaymentMethods() {
    return Object.keys(this.providers)
      .filter(method => this.providers[method].enabled)
      .map(method => ({
        method,
        name: this.getPaymentMethodName(method),
        enabled: this.providers[method].enabled
      }));
  }

  /**
   * Zahlungsmethoden-Name abrufen
   */
  getPaymentMethodName(method) {
    const names = {
      stripe: 'Kreditkarte (Stripe)',
      sepa: 'SEPA-Lastschrift',
      paypal: 'PayPal'
    };
    return names[method] || method;
  }

  /**
   * Webhook für Zahlungsbenachrichtigungen verarbeiten
   */
  async handleWebhook(payload, signature, method) {
    const provider = this.providers[method];
    if (!provider || !provider.enabled) {
      throw new Error(`Zahlungsanbieter ${method} nicht verfügbar`);
    }

    try {
      switch (method) {
        case 'stripe':
          return await this.handleStripeWebhook(payload, signature);
        case 'paypal':
          return await this.handlePayPalWebhook(payload);
        default:
          throw new Error(`Webhook für ${method} nicht unterstützt`);
      }
    } catch (error) {
      throw new Error(`Webhook-Verarbeitung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Stripe-Webhook verarbeiten
   */
  async handleStripeWebhook(payload, signature) {
    const stripe = require('stripe')(this.providers.stripe.apiKey);
    
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.providers.stripe.webhookSecret
      );
      
      return {
        success: true,
        eventType: event.type,
        eventId: event.id,
        data: event.data
      };
      
    } catch (error) {
      throw new Error(`Stripe-Webhook-Verarbeitung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * PayPal-Webhook verarbeiten
   */
  async handlePayPalWebhook(payload) {
    // PayPal-Webhook-Verarbeitung
    return {
      success: true,
      eventType: payload.event_type,
      eventId: payload.id,
      data: payload.resource
    };
  }
}

module.exports = new PaymentConnector();


