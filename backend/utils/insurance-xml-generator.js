// XML-Generatoren für alle österreichischen Versicherungen
// SVS, BVAEB, KFA, PVA

const { format } = require('date-fns');

class InsuranceXMLGenerator {
  /**
   * Generiert XML basierend auf Versicherungsanbieter
   */
  generateXML(invoices, doctor, insuranceProvider) {
    const provider = this.normalizeProvider(insuranceProvider);
    
    switch (provider) {
      case 'SVS':
        return this.generateSVSXML(invoices, doctor);
      case 'BVAEB':
        return this.generateBVAEBXML(invoices, doctor);
      case 'KFA':
        return this.generateKFAXML(invoices, doctor);
      case 'PVA':
        return this.generatePVAXML(invoices, doctor);
      case 'ÖGK':
        // ÖGK wird von ogk-xml-generator.js gehandhabt
        throw new Error('ÖGK-XML sollte über ogk-xml-generator generiert werden');
      default:
        throw new Error(`Unbekannter Versicherungsanbieter: ${insuranceProvider}`);
    }
  }

  /**
   * Normalisiert Versicherungsanbieter-Name
   */
  normalizeProvider(provider) {
    if (!provider) return null;
    const normalized = provider.toUpperCase();
    
    if (normalized.includes('SVS') || normalized.includes('SELBSTÄNDIG')) {
      return 'SVS';
    }
    if (normalized.includes('BVAEB') || normalized.includes('EISENBAHN') || normalized.includes('BERGBAU')) {
      return 'BVAEB';
    }
    if (normalized.includes('KFA') || normalized.includes('STADT WIEN')) {
      return 'KFA';
    }
    if (normalized.includes('PVA') || normalized.includes('PENSIONSVERSICHERUNG')) {
      return 'PVA';
    }
    if (normalized.includes('ÖGK') || normalized.includes('GESUNDHEITSKASSE')) {
      return 'ÖGK';
    }
    
    return null;
  }

  /**
   * Generiert SVS-XML (Sozialversicherung der Selbständigen)
   */
  generateSVSXML(invoices, doctor) {
    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<SVSBilling xmlns="http://www.svs.at/billing" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Sender>AID</Sender>
    <SenderSoftware>OrdinationsSoftware</SenderSoftware>
    <Timestamp>${timestamp}</Timestamp>
    <Doctor>
      <Name>${this.escapeXML(doctor.name || '')}</Name>
      <ChamberNumber>${this.escapeXML(doctor.chamberNumber || '')}</ChamberNumber>
      <TaxNumber>${this.escapeXML(doctor.taxNumber || '')}</TaxNumber>
    </Doctor>
  </Header>
  <Invoices>
    ${invoices.map(inv => this.generateSVSInvoice(inv)).join('\n    ')}
  </Invoices>
</SVSBilling>`;
  }

  /**
   * Generiert BVAEB-XML (Versicherungsanstalt für Eisenbahnen und Bergbau)
   */
  generateBVAEBXML(invoices, doctor) {
    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<BVAEBBilling xmlns="http://www.bvaeb.at/billing" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Sender>AID</Sender>
    <SenderSoftware>OrdinationsSoftware</SenderSoftware>
    <Timestamp>${timestamp}</Timestamp>
    <Doctor>
      <Name>${this.escapeXML(doctor.name || '')}</Name>
      <ChamberNumber>${this.escapeXML(doctor.chamberNumber || '')}</ChamberNumber>
      <TaxNumber>${this.escapeXML(doctor.taxNumber || '')}</TaxNumber>
    </Doctor>
  </Header>
  <Invoices>
    ${invoices.map(inv => this.generateBVAEBInvoice(inv)).join('\n    ')}
  </Invoices>
</BVAEBBilling>`;
  }

  /**
   * Generiert KFA-XML (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)
   */
  generateKFAXML(invoices, doctor) {
    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<KFABilling xmlns="http://www.kfa.at/billing" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Sender>AID</Sender>
    <SenderSoftware>OrdinationsSoftware</SenderSoftware>
    <Timestamp>${timestamp}</Timestamp>
    <Doctor>
      <Name>${this.escapeXML(doctor.name || '')}</Name>
      <ChamberNumber>${this.escapeXML(doctor.chamberNumber || '')}</ChamberNumber>
      <TaxNumber>${this.escapeXML(doctor.taxNumber || '')}</TaxNumber>
    </Doctor>
  </Header>
  <Invoices>
    ${invoices.map(inv => this.generateKFAInvoice(inv)).join('\n    ')}
  </Invoices>
</KFABilling>`;
  }

  /**
   * Generiert PVA-XML (Pensionsversicherungsanstalt)
   */
  generatePVAXML(invoices, doctor) {
    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<PVABilling xmlns="http://www.pva.at/billing" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Sender>AID</Sender>
    <SenderSoftware>OrdinationsSoftware</SenderSoftware>
    <Timestamp>${timestamp}</Timestamp>
    <Doctor>
      <Name>${this.escapeXML(doctor.name || '')}</Name>
      <ChamberNumber>${this.escapeXML(doctor.chamberNumber || '')}</ChamberNumber>
      <TaxNumber>${this.escapeXML(doctor.taxNumber || '')}</TaxNumber>
    </Doctor>
  </Header>
  <Invoices>
    ${invoices.map(inv => this.generatePVAInvoice(inv)).join('\n    ')}
  </Invoices>
</PVABilling>`;
  }

  /**
   * Generiert SVS-Rechnung
   */
  generateSVSInvoice(invoice) {
    const patient = invoice.patient?.id || invoice.patient || {};
    const invoiceDate = this.formatDate(invoice.invoiceDate);
    
    return `<Invoice>
      <InvoiceNumber>${this.escapeXML(invoice.invoiceNumber)}</InvoiceNumber>
      <InvoiceDate>${invoiceDate}</InvoiceDate>
      <Patient>
        <InsuranceNumber>${this.escapeXML(patient.insuranceNumber || patient.socialSecurityNumber || '')}</InsuranceNumber>
        <Name>${this.escapeXML(`${patient.firstName || ''} ${patient.lastName || ''}`.trim())}</Name>
        <DateOfBirth>${patient.dateOfBirth ? this.formatDate(patient.dateOfBirth) : ''}</DateOfBirth>
      </Patient>
      <Services>
        ${invoice.services?.map(s => this.generateService(s)).join('\n        ') || ''}
      </Services>
      <TotalAmount>${this.formatAmount(invoice.totalAmount || 0)}</TotalAmount>
      <Copay>${this.formatAmount(invoice.services?.reduce((sum, s) => sum + (s.copay || 0), 0) || 0)}</Copay>
      <InsuranceAmount>${this.formatAmount((invoice.totalAmount || 0) - (invoice.services?.reduce((sum, s) => sum + (s.copay || 0), 0) || 0))}</InsuranceAmount>
    </Invoice>`;
  }

  /**
   * Generiert BVAEB-Rechnung
   */
  generateBVAEBInvoice(invoice) {
    return this.generateSVSInvoice(invoice); // Gleiches Format
  }

  /**
   * Generiert KFA-Rechnung
   */
  generateKFAInvoice(invoice) {
    return this.generateSVSInvoice(invoice); // Gleiches Format
  }

  /**
   * Generiert PVA-Rechnung
   */
  generatePVAInvoice(invoice) {
    return this.generateSVSInvoice(invoice); // Gleiches Format
  }

  /**
   * Generiert Service-Eintrag
   */
  generateService(service) {
    return `<Service>
          <ServiceDate>${this.formatDate(service.date)}</ServiceDate>
          <ServiceCode>${this.escapeXML(service.serviceCode || '')}</ServiceCode>
          <Description>${this.escapeXML(service.description || '')}</Description>
          <Quantity>${service.quantity || 1}</Quantity>
          <UnitPrice>${this.formatAmount(service.unitPrice || 0)}</UnitPrice>
          <TotalPrice>${this.formatAmount(service.totalPrice || 0)}</TotalPrice>
          <Copay>${this.formatAmount(service.copay || 0)}</Copay>
        </Service>`;
  }

  /**
   * Formatiert Datum
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Formatiert Betrag (Cent zu Euro)
   */
  formatAmount(cents) {
    return (cents / 100).toFixed(2);
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
}

module.exports = new InsuranceXMLGenerator();

