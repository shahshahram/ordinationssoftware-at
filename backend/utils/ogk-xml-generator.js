// ÖGK XML-Generator für ELA (Einzelleistungsauszug)
// Format basierend auf ELGA-Standard

const { format } = require('date-fns');

class OGKXMLGenerator {
  /**
   * Generiert ELA-XML für eine oder mehrere Rechnungen
   * @param {Array} invoices - Array von Invoice-Objekten
   * @param {Object} doctor - Arzt-Informationen
   * @returns {String} XML-String
   */
  generateELA(invoices, doctor) {
    const timestamp = new Date().toISOString();
    
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ELA xmlns="http://www.elga.gv.at/ELA" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      this.generateHeader(timestamp, doctor),
      '<Invoices>',
      ...invoices.map(inv => this.generateInvoice(inv, doctor)),
      '</Invoices>',
      '</ELA>'
    ].join('\n');
    
    return xml;
  }

  /**
   * Generiert Header-Bereich
   */
  generateHeader(timestamp, doctor) {
    return `  <Header>
    <Sender>AID</Sender>
    <SenderSoftware>OrdinationsSoftware</SenderSoftware>
    <SenderVersion>1.0</SenderVersion>
    <Timestamp>${timestamp}</Timestamp>
    <Doctor>
      <Name>${this.escapeXML(doctor.name || '')}</Name>
      <Title>${this.escapeXML(doctor.title || '')}</Title>
      <ChamberNumber>${this.escapeXML(doctor.chamberNumber || '')}</ChamberNumber>
      <TaxNumber>${this.escapeXML(doctor.taxNumber || '')}</TaxNumber>
      <Address>
        <Street>${this.escapeXML(doctor.address?.street || '')}</Street>
        <City>${this.escapeXML(doctor.address?.city || '')}</City>
        <PostalCode>${this.escapeXML(doctor.address?.postalCode || '')}</PostalCode>
        <Country>${this.escapeXML(doctor.address?.country || 'Österreich')}</Country>
      </Address>
    </Doctor>
  </Header>`;
  }

  /**
   * Generiert Invoice-Bereich für eine Rechnung
   */
  generateInvoice(invoice, doctor) {
    const invoiceDate = this.formatDate(invoice.invoiceDate);
    const patient = invoice.patient || {};
    
    return `  <Invoice>
    <InvoiceNumber>${this.escapeXML(invoice.invoiceNumber)}</InvoiceNumber>
    <InvoiceDate>${invoiceDate}</InvoiceDate>
    <Patient>
      <InsuranceNumber>${this.escapeXML(patient.insuranceNumber || '')}</InsuranceNumber>
      <SocialSecurityNumber>${this.escapeXML(patient.socialSecurityNumber || '')}</SocialSecurityNumber>
      <Name>${this.escapeXML(patient.name || '')}</Name>
      <DateOfBirth>${patient.dateOfBirth ? this.formatDate(patient.dateOfBirth) : ''}</DateOfBirth>
      <Address>
        <Street>${this.escapeXML(patient.address?.street || '')}</Street>
        <City>${this.escapeXML(patient.address?.city || '')}</City>
        <PostalCode>${this.escapeXML(patient.address?.postalCode || '')}</PostalCode>
        <Country>${this.escapeXML(patient.address?.country || 'Österreich')}</Country>
      </Address>
    </Patient>
    <Services>
      ${invoice.services?.map(service => this.generateService(service)).join('\n      ') || ''}
    </Services>
    <Diagnoses>
      ${invoice.diagnoses?.map(diagnosis => this.generateDiagnosis(diagnosis)).join('\n      ') || ''}
    </Diagnoses>
    <Amounts>
      <Subtotal>${this.formatAmount(invoice.subtotal || 0)}</Subtotal>
      <Copay>${this.formatAmount(invoice.services?.reduce((sum, s) => sum + (s.copay || 0), 0) || 0)}</Copay>
      <InsuranceAmount>${this.formatAmount((invoice.subtotal || 0) - (invoice.services?.reduce((sum, s) => sum + (s.copay || 0), 0) || 0))}</InsuranceAmount>
      <TotalAmount>${this.formatAmount(invoice.totalAmount || 0)}</TotalAmount>
    </Amounts>
    ${invoice.ogkBilling?.elaNumber ? `<ELANumber>${this.escapeXML(invoice.ogkBilling.elaNumber)}</ELANumber>` : ''}
    ${invoice.ogkBilling?.billingPeriod ? `<BillingPeriod>${this.escapeXML(invoice.ogkBilling.billingPeriod)}</BillingPeriod>` : ''}
  </Invoice>`;
  }

  /**
   * Generiert Service-Bereich
   */
  generateService(service) {
    const serviceDate = this.formatDate(service.date);
    
    return `<Service>
        <ServiceDate>${serviceDate}</ServiceDate>
        <ServiceCode>${this.escapeXML(service.serviceCode || '')}</ServiceCode>
        <EBMCode>${this.escapeXML(service.ebmCode || service.serviceCode || '')}</EBMCode>
        <Description>${this.escapeXML(service.description || '')}</Description>
        <Quantity>${service.quantity || 1}</Quantity>
        <UnitPrice>${this.formatAmount(service.unitPrice || 0)}</UnitPrice>
        <TotalPrice>${this.formatAmount(service.totalPrice || 0)}</TotalPrice>
        ${service.copay ? `<Copay>${this.formatAmount(service.copay)}</Copay>` : ''}
      </Service>`;
  }

  /**
   * Generiert Diagnosis-Bereich
   */
  generateDiagnosis(diagnosis) {
    const diagnosisDate = this.formatDate(diagnosis.date);
    
    return `<Diagnosis>
        <Code>${this.escapeXML(diagnosis.code || '')}</Code>
        <Display>${this.escapeXML(diagnosis.display || '')}</Display>
        <IsPrimary>${diagnosis.isPrimary ? 'true' : 'false'}</IsPrimary>
        <Date>${diagnosisDate}</Date>
      </Diagnosis>`;
  }

  /**
   * Formatiert Datum im ISO-Format (YYYY-MM-DD)
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return format(d, 'yyyy-MM-dd');
  }

  /**
   * Formatiert Betrag in Cent (ohne Komma)
   */
  formatAmount(amountInCents) {
    return Math.round(amountInCents || 0).toString();
  }

  /**
   * Escaped XML-Sonderzeichen
   */
  escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generiert Turnusabrechnung (monatliche Zusammenfassung)
   * @param {Array} invoices - Array von Invoice-Objekten für einen Monat
   * @param {Object} doctor - Arzt-Informationen
   * @param {String} billingPeriod - Format: YYYY-MM
   * @returns {String} XML-String
   */
  generateTurnusAbrechnung(invoices, doctor, billingPeriod) {
    const timestamp = new Date().toISOString();
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCopay = invoices.reduce((sum, inv) => 
      sum + (inv.services?.reduce((s, svc) => s + (svc.copay || 0), 0) || 0), 0);
    const totalInsuranceAmount = totalAmount - totalCopay;
    const totalServices = invoices.reduce((sum, inv) => sum + (inv.services?.length || 0), 0);
    
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<TurnusAbrechnung xmlns="http://www.elga.gv.at/TurnusAbrechnung" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      this.generateHeader(timestamp, doctor),
      `<BillingPeriod>${billingPeriod}</BillingPeriod>`,
      `<Summary>
    <TotalInvoices>${invoices.length}</TotalInvoices>
    <TotalServices>${totalServices}</TotalServices>
    <TotalAmount>${this.formatAmount(totalAmount)}</TotalAmount>
    <TotalCopay>${this.formatAmount(totalCopay)}</TotalCopay>
    <TotalInsuranceAmount>${this.formatAmount(totalInsuranceAmount)}</TotalInsuranceAmount>
  </Summary>`,
      '<Invoices>',
      ...invoices.map(inv => this.generateInvoice(inv, doctor)),
      '</Invoices>',
      '</TurnusAbrechnung>'
    ].join('\n');
    
    return xml;
  }
}

module.exports = new OGKXMLGenerator();
