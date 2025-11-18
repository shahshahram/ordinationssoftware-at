// ÖGK XML-Generator für Einzelleistungsauszug (ELA)

/**
 * Generiert XML für ÖGK Einzelleistungsauszug
 * @param {Array} invoices - Array von Rechnungen
 * @param {Object} doctorInfo - Arztinformationen
 * @returns {String} XML-String
 */
function generateELA(invoices, doctorInfo) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ELA xmlns="http://www.elga.gv.at/ELA">',
    generateHeader(),
    '<Invoices>',
    ...invoices.map(inv => generateInvoice(inv, doctorInfo)),
    '</Invoices>',
    '</ELA>'
  ].join('\n');
  
  return xml;
}

/**
 * Generiert XML-Header
 * @returns {String} Header-XML
 */
function generateHeader() {
  const now = new Date().toISOString();
  return `
    <Header>
      <Sender>AID</Sender>
      <SenderSoftware>OrdinationsSoftware v1.0</SenderSoftware>
      <Timestamp>${now}</Timestamp>
    </Header>
  `.trim();
}

/**
 * Generiert XML für einzelne Rechnung
 * @param {Object} invoice - Rechnungsobjekt
 * @param {Object} doctorInfo - Arztinformationen
 * @returns {String} Invoice-XML
 */
function generateInvoice(invoice, doctorInfo) {
  return `
    <Invoice>
      <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
      <InvoiceDate>${formatDate(invoice.invoiceDate)}</InvoiceDate>
      <Doctor>
        <Name>${escapeXML(doctorInfo.name || invoice.doctor.name)}</Name>
        <ChamberNumber>${escapeXML(doctorInfo.chamberNumber || invoice.doctor.chamberNumber || '')}</ChamberNumber>
        <TaxNumber>${escapeXML(doctorInfo.taxNumber || invoice.doctor.taxNumber || '')}</TaxNumber>
        <Specialization>${escapeXML(doctorInfo.specialization || '')}</Specialization>
      </Doctor>
      <Patient>
        <InsuranceNumber>${escapeXML(invoice.patient.insuranceNumber || '')}</InsuranceNumber>
        <Name>${escapeXML(invoice.patient.name)}</Name>
        <Street>${escapeXML(invoice.patient.address.street)}</Street>
        <City>${escapeXML(invoice.patient.address.city)}</City>
        <PostalCode>${escapeXML(invoice.patient.address.postalCode)}</PostalCode>
      </Patient>
      <Services>
        ${invoice.services.map(s => generateService(s)).join('')}
      </Services>
      <TotalAmount>${invoice.totalAmount}</TotalAmount>
      <Copay>${calculateTotalCopay(invoice)}</Copay>
      ${invoice.notes ? `<Notes>${escapeXML(invoice.notes)}</Notes>` : ''}
    </Invoice>
  `.trim();
}

/**
 * Generiert XML für einzelnen Service
 * @param {Object} service - Serviceobjekt
 * @returns {String} Service-XML
 */
function generateService(service) {
  return `
        <Service>
          <ServiceDate>${formatDate(service.date)}</ServiceDate>
          <EBMCode>${escapeXML(service.serviceCode || service.ebmCode || '')}</EBMCode>
          <Description>${escapeXML(service.description)}</Description>
          <Quantity>${service.quantity}</Quantity>
          <UnitPrice>${service.unitPrice}</UnitPrice>
          <TotalPrice>${service.totalPrice}</TotalPrice>
          <Category>${escapeXML(service.category || '')}</Category>
          ${service.copay ? `<Copay>${service.copay}</Copay>` : ''}
        </Service>
  `.trim();
}

/**
 * Formatiert Datum im ÖGK-Format (YYYY-MM-DD)
 * @param {Date|String} date - Datum
 * @returns {String} Formatierter Datum
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * XML-Zeichen escapen
 * @param {String} text - Text zum Escapen
 * @returns {String} Escapter Text
 */
function escapeXML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Berechnet Gesamtselbstbehalt für Rechnung
 * @param {Object} invoice - Rechnungsobjekt
 * @returns {Number} Gesamtselbstbehalt in Cent
 */
function calculateTotalCopay(invoice) {
  return invoice.services.reduce((sum, service) => {
    return sum + (service.copay || 0);
  }, 0);
}

/**
 * Generiert XML für Turnusabrechnung (Mehrere Rechnungen)
 * @param {Array} invoices - Array von Rechnungen
 * @param {Object} doctorInfo - Arztinformationen
 * @returns {String} XML-String
 */
function generateTurnusabrechnung(invoices, doctorInfo) {
  const totals = calculateTotals(invoices);
  
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Turnusabrechnung xmlns="http://www.elga.gv.at/ELA">',
    generateHeader(),
    '<Summary>',
    `<TotalInvoices>${invoices.length}</TotalInvoices>`,
    `<TotalAmount>${totals.totalAmount}</TotalAmount>`,
    `<TotalCopay>${totals.totalCopay}</TotalCopay>`,
    `<InsuranceAmount>${totals.insuranceAmount}</InsuranceAmount>`,
    `<StartDate>${formatDate(totals.startDate)}</StartDate>`,
    `<EndDate>${formatDate(totals.endDate)}</EndDate>`,
    '</Summary>',
    '<Invoices>',
    ...invoices.map(inv => generateInvoice(inv, doctorInfo)),
    '</Invoices>',
    '</Turnusabrechnung>'
  ].join('\n');
  
  return xml;
}

/**
 * Berechnet Gesamtbeträge für Turnusabrechnung
 * @param {Array} invoices - Array von Rechnungen
 * @returns {Object} Totals
 */
function calculateTotals(invoices) {
  const totals = invoices.reduce((acc, invoice) => {
    acc.totalAmount += invoice.totalAmount;
    acc.totalCopay += calculateTotalCopay(invoice);
    acc.insuranceAmount += invoice.totalAmount - calculateTotalCopay(invoice);
    
    if (!acc.startDate || new Date(invoice.invoiceDate) < new Date(acc.startDate)) {
      acc.startDate = invoice.invoiceDate;
    }
    if (!acc.endDate || new Date(invoice.invoiceDate) > new Date(acc.endDate)) {
      acc.endDate = invoice.invoiceDate;
    }
    
    return acc;
  }, {
    totalAmount: 0,
    totalCopay: 0,
    insuranceAmount: 0,
    startDate: null,
    endDate: null
  });
  
  return totals;
}

/**
 * Validiert XML gegen XSD-Schema
 * @param {String} xml - XML-String
 * @returns {Boolean} Valide
 */
function validateXML(xml) {
  // TODO: XSD-Validierung implementieren
  // Für jetzt: grundlegende Validierung
  return xml.includes('<?xml') && xml.includes('<ELA');
}

module.exports = {
  generateELA,
  generateTurnusabrechnung,
  generateInvoice,
  generateService,
  formatDate,
  escapeXML,
  calculateTotalCopay,
  calculateTotals,
  validateXML
};







