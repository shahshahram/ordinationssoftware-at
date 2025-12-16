// Diese Datei ist ein Workaround für die Abwärtskompatibilität
// Die createInvoice-Funktionalität wurde in billingService.js integriert

module.exports = {
  createInvoiceFromPerformance: async (payload) => {
    // Diese Methode wird nicht mehr verwendet
    // Die Funktionalität wurde in billingService.createInvoice() verschoben
    throw new Error('invoiceService.createInvoiceFromPerformance ist veraltet. Verwenden Sie billingService.createInvoice() stattdessen.');
  }
};

