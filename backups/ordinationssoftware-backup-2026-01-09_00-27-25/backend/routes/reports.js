const express = require('express');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const ReportDefinition = require('../models/ReportDefinition');
const ReportExecution = require('../models/ReportExecution');
const ReportGeneratorService = require('../services/reportGeneratorService');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// @route   GET /api/reports
// @desc    Get all report definitions
// @access  Private (requires 'reports.read' permission)
router.get('/', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.REPORTS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'reports.read',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    const { category, search, isActive } = req.query;
    const query = {};
    
    // Filter nach Kategorie
    if (category) {
      query.category = category;
    }
    
    // Filter nach aktiv/inaktiv
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Suche
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Berechtigungen prüfen - nur Reports anzeigen, die der Benutzer sehen darf
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      query.$or = [
        { isPublic: true },
        { 'permissions.canView': { $in: [req.user.role] } },
        { createdBy: req.user._id }
      ];
    }

    let reports = await ReportDefinition.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('lastExecutedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Mock-Daten als Fallback, wenn keine Reports in der DB sind
    if (reports.length === 0) {
      reports = [
        {
          id: 1,
          _id: '1',
          name: 'Patientenbericht',
          description: 'Übersicht aller Patienten',
          category: 'patient',
          dataSource: 'patients',
          type: 'patient',
          isActive: true,
          isPublic: true,
          executionCount: 0,
          lastGenerated: new Date(),
          config: {
            dateRange: { enabled: true, field: 'createdAt' },
            columns: [
              { field: 'firstName', label: 'Vorname', visible: true },
              { field: 'lastName', label: 'Nachname', visible: true },
              { field: 'email', label: 'E-Mail', visible: true }
            ]
          },
          permissions: {
            canView: ['admin', 'doctor'],
            canEdit: ['admin'],
            canDelete: ['admin'],
            canGenerate: ['admin', 'doctor']
          }
        },
        {
          id: 2,
          _id: '2',
          name: 'Terminbericht',
          description: 'Übersicht aller Termine',
          category: 'appointment',
          dataSource: 'appointments',
          type: 'appointment',
          isActive: true,
          isPublic: true,
          executionCount: 0,
          lastGenerated: new Date(),
          config: {
            dateRange: { enabled: true, field: 'startTime' },
            columns: [
              { field: 'patientName', label: 'Patient', visible: true },
              { field: 'startTime', label: 'Startzeit', visible: true },
              { field: 'status', label: 'Status', visible: true }
            ]
          },
          permissions: {
            canView: ['admin', 'doctor'],
            canEdit: ['admin'],
            canDelete: ['admin'],
            canGenerate: ['admin', 'doctor']
          }
        },
        {
          id: 3,
          _id: '3',
          name: 'Abrechnungsbericht',
          description: 'Übersicht aller Abrechnungen',
          category: 'billing',
          dataSource: 'invoices',
          type: 'billing',
          isActive: true,
          isPublic: true,
          executionCount: 0,
          lastGenerated: new Date(),
          config: {
            dateRange: { enabled: true, field: 'createdAt' },
            columns: [
              { field: 'invoiceNumber', label: 'Rechnungsnummer', visible: true },
              { field: 'totalAmount', label: 'Betrag', visible: true },
              { field: 'status', label: 'Status', visible: true }
            ]
          },
          permissions: {
            canView: ['admin', 'doctor'],
            canEdit: ['admin'],
            canDelete: ['admin'],
            canGenerate: ['admin', 'doctor']
          }
        }
      ];
    }

    res.status(200).json({ 
      success: true, 
      data: reports,
      message: 'Reports erfolgreich geladen',
      permissions: {
        canRead: authResult.allowed,
        canGenerate: await authorize(req.user, ACTIONS.GENERATE, RESOURCES.REPORTS, null, context).then(r => r.allowed),
        canExport: await authorize(req.user, ACTIONS.EXPORT, RESOURCES.REPORTS, null, context).then(r => r.allowed),
        canCreate: await authorize(req.user, ACTIONS.CREATE, RESOURCES.REPORTS, null, context).then(r => r.allowed)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Reports', error: error.message });
  }
});

// @route   GET /api/reports/:id
// @desc    Get single report definition
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await ReportDefinition.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('lastExecutedBy', 'firstName lastName email');
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report nicht gefunden' });
    }
    
    // Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const canView = report.isPublic || 
                    report.permissions.canView.includes(req.user.role) ||
                    report.createdBy._id.toString() === req.user._id.toString() ||
                    req.user.role === 'super_admin' || req.user.role === 'admin';
    
    if (!canView) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung zum Anzeigen dieses Reports' });
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Reports', error: error.message });
  }
});

// @route   POST /api/reports
// @desc    Create new report definition
// @access  Private (requires 'reports.create' permission)
router.post('/', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.CREATE, RESOURCES.REPORTS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    const reportData = {
      ...req.body,
      createdBy: req.user._id
    };

    const report = new ReportDefinition(reportData);
    await report.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'reports.create',
      description: `Report erstellt: ${report.name}`,
      details: { reportId: report._id, reportName: report.name }
    });

    res.status(201).json({ success: true, data: report, message: 'Report erfolgreich erstellt' });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Reports', error: error.message });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update report definition
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const report = await ReportDefinition.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report nicht gefunden' });
    }
    
    // Berechtigung prüfen
    const canEdit = report.permissions.canEdit.includes(req.user.role) ||
                   report.createdBy.toString() === req.user._id.toString() ||
                   req.user.role === 'super_admin' || req.user.role === 'admin';
    
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung zum Bearbeiten dieses Reports' });
    }
    
    Object.assign(report, req.body);
    report.lastModifiedBy = req.user._id;
    await report.save();
    
    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'reports.update',
      description: `Report aktualisiert: ${report.name}`,
      details: { reportId: report._id }
    });
    
    res.json({ success: true, data: report, message: 'Report erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Reports', error: error.message });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete report definition
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await ReportDefinition.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report nicht gefunden' });
    }
    
    // Berechtigung prüfen
    const canDelete = report.permissions.canDelete.includes(req.user.role) ||
                      report.createdBy.toString() === req.user._id.toString() ||
                      req.user.role === 'super_admin' || req.user.role === 'admin';
    
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung zum Löschen dieses Reports' });
    }
    
    await ReportDefinition.findByIdAndDelete(req.params.id);
    
    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'reports.delete',
      description: `Report gelöscht: ${report.name}`,
      details: { reportId: report._id }
    });
    
    res.json({ success: true, message: 'Report erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen des Reports', error: error.message });
  }
});

// @route   POST /api/reports/:id/generate
// @desc    Generate report
// @access  Private
router.post('/:id/generate', auth, async (req, res) => {
  try {
    console.log('🔍 POST /api/reports/:id/generate called with ID:', req.params.id);
    console.log('🔍 User:', req.user?.email, 'Role:', req.user?.role);
    
    // Prüfe zuerst, ob die ID numerisch ist (Mock-Report)
    let report;
    if (req.params.id.match(/^[0-9]+$/)) {
      // Numerische ID - verwende Mock-Report-Definition (numerische IDs sind keine gültigen MongoDB ObjectIds)
      console.log('📋 Numeric ID detected, using mock report definition:', req.params.id);
      // Numerische ID - Mock-Report-Definition verwenden, aber echte Daten generieren
      const mockReports = {
        '1': {
          _id: '1',
          id: 1,
          name: 'Patientenbericht',
          description: 'Übersicht aller Patienten',
          category: 'patient',
          dataSource: 'patients',
          isActive: true,
          isPublic: true,
          config: {
            dateRange: { enabled: false, field: 'createdAt', defaultRange: 'thisMonth' },
            columns: [
              { field: 'firstName', label: 'Vorname', visible: true },
              { field: 'lastName', label: 'Nachname', visible: true },
              { field: 'email', label: 'E-Mail', visible: true }
            ],
            limit: 10000 // Kein praktisches Limit für Patientenbericht
          },
          permissions: {
            canGenerate: ['admin', 'doctor']
          },
          createdBy: { _id: req.user._id }
        },
        '2': {
          _id: '2',
          id: 2,
          name: 'Terminbericht',
          description: 'Übersicht aller Termine',
          category: 'appointment',
          dataSource: 'appointments',
          isActive: true,
          isPublic: true,
          config: {
            dateRange: { enabled: true, field: 'startTime' },
            columns: [
              { field: 'patientName', label: 'Patient', visible: true },
              { field: 'startTime', label: 'Startzeit', visible: true },
              { field: 'status', label: 'Status', visible: true }
            ]
          },
          permissions: {
            canGenerate: ['admin', 'doctor']
          },
          createdBy: { _id: req.user._id }
        },
        '3': {
          _id: '3',
          id: 3,
          name: 'Abrechnungsbericht',
          description: 'Übersicht aller Abrechnungen',
          category: 'billing',
          dataSource: 'invoices',
          isActive: true,
          isPublic: true,
          config: {
            dateRange: { enabled: true, field: 'createdAt' },
            columns: [
              { field: 'invoiceNumber', label: 'Rechnungsnummer', visible: true },
              { field: 'totalAmount', label: 'Betrag', visible: true },
              { field: 'status', label: 'Status', visible: true }
            ]
          },
          permissions: {
            canGenerate: ['admin', 'doctor']
          },
          createdBy: { _id: req.user._id }
        }
      };
      report = mockReports[req.params.id];
      console.log('📋 Mock report definition found:', report ? report.name : 'NOT FOUND');
    } else {
      // MongoDB ObjectId - aus DB laden
      console.log('📋 Loading report from database with ID:', req.params.id);
      report = await ReportDefinition.findById(req.params.id);
      console.log('📋 Database report found:', report ? report.name : 'NOT FOUND');
    }
    
    if (!report) {
      console.error('❌ Report not found for ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Report nicht gefunden' });
    }
    
    console.log('✅ Report found:', report.name, 'Active:', report.isActive);
    
    if (!report.isActive) {
      return res.status(400).json({ success: false, message: 'Report ist nicht aktiv' });
    }
    
    // Berechtigung prüfen
    const canGenerate = (report.permissions && report.permissions.canGenerate && report.permissions.canGenerate.includes(req.user.role)) ||
                       (report.createdBy && (report.createdBy._id || report.createdBy).toString() === req.user._id.toString()) ||
                       req.user.role === 'super_admin' || req.user.role === 'admin';
    
    if (!canGenerate) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung zum Generieren dieses Reports' });
    }
    
    // Report generieren
    let result;
    let execution;
    
    // Versuche IMMER zuerst, echte Daten aus der Datenbank zu generieren
    const isMockReport = req.params.id.match(/^[0-9]+$/) && (!report._id || report._id.toString() === req.params.id);
    
    console.log('📊 Generating report data for dataSource:', report.dataSource, isMockReport ? '(mock report definition)' : '(database report)');
    
    // Sichereres Logging (vermeidet Probleme mit großen Objekten)
    try {
      console.log('📊 Report config keys:', report.config ? Object.keys(report.config) : 'no config');
      console.log('📊 Report config.dateRange:', report.config?.dateRange ? { enabled: report.config.dateRange.enabled, field: report.config.dateRange.field } : 'no dateRange');
      console.log('📊 Report config.columns count:', report.config?.columns?.length || 0);
      console.log('📊 Report config.filters count:', report.config?.filters?.length || 0);
    } catch (logError) {
      console.warn('⚠️ Error logging report config:', logError.message);
    }
    
    try {
      // Validiere Report-Definition
      if (!report.config) {
        throw new Error('Report-Definition hat keine config');
      }
      if (!report.dataSource) {
        throw new Error('Report-Definition hat keine dataSource');
      }
      
      // Versuche echte Daten zu generieren (für alle Reports, auch Mock-Definitionen)
      result = await ReportGeneratorService.generateReport(report, req.body.parameters || {});
      console.log('✅ Real data generated:', { 
        totalRecords: result.totalRecords, 
        dataLength: Array.isArray(result.data) ? result.data.length : 0 
      });
    } catch (genError) {
      console.error('❌ Error generating report:', genError);
      console.error('❌ Error stack:', genError.stack);
      
      // Nur für Mock-Reports: Fallback zu Mock-Daten, wenn echte Daten nicht generiert werden können
      if (isMockReport) {
        console.warn('⚠️ Could not generate real data for mock report, falling back to mock data:', genError.message);
        console.log('📊 Generating mock report data for dataSource:', report.dataSource);
      let mockData = [];
      let mockSummary = {};
      
      // Generiere Mock-Daten basierend auf dem dataSource
      // Verwende die Spalten aus der Report-Definition, um die richtigen Felder zu generieren
      const columns = report.config?.columns || [];
      const columnFields = columns.map(col => col.field).filter(f => f);
      
      switch (report.dataSource) {
        case 'patients':
          mockData = [
            { firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@example.com', dateOfBirth: '1970-01-15', gender: 'männlich', createdAt: new Date('2024-01-15') },
            { firstName: 'Maria', lastName: 'Musterfrau', email: 'maria.musterfrau@example.com', dateOfBirth: '1985-05-20', gender: 'weiblich', createdAt: new Date('2024-02-10') },
            { firstName: 'Peter', lastName: 'Schmidt', email: 'peter.schmidt@example.com', dateOfBirth: '1990-08-12', gender: 'männlich', createdAt: new Date('2024-03-05') },
            { firstName: 'Anna', lastName: 'Weber', email: 'anna.weber@example.com', dateOfBirth: '1975-11-30', gender: 'weiblich', createdAt: new Date('2024-04-18') },
            { firstName: 'Thomas', lastName: 'Müller', email: 'thomas.mueller@example.com', dateOfBirth: '1988-03-22', gender: 'männlich', createdAt: new Date('2024-05-12') }
          ];
          // Filtere nur die Spalten, die in der Report-Definition definiert sind
          if (columnFields.length > 0) {
            mockData = mockData.map(item => {
              const filtered = {};
              columnFields.forEach(field => {
                filtered[field] = item[field] ?? null;
              });
              return filtered;
            });
          }
          mockSummary = { totalPatients: mockData.length, averageAge: 45.2 };
          break;
          
        case 'appointments':
          mockData = [
            { patientName: 'Max Mustermann', startTime: new Date('2024-12-17T09:00:00'), endTime: new Date('2024-12-17T09:30:00'), status: 'geplant', serviceName: 'Ordinationskonsultation', staffName: 'Dr. Mustermann' },
            { patientName: 'Maria Musterfrau', startTime: new Date('2024-12-17T10:00:00'), endTime: new Date('2024-12-17T10:45:00'), status: 'in_behandlung', serviceName: 'Untersuchung', staffName: 'Dr. Mustermann' },
            { patientName: 'Peter Schmidt', startTime: new Date('2024-12-17T11:00:00'), endTime: new Date('2024-12-17T11:30:00'), status: 'abgeschlossen', serviceName: 'Nachsorge', staffName: 'Dr. Mustermann' },
            { patientName: 'Anna Weber', startTime: new Date('2024-12-18T09:00:00'), endTime: new Date('2024-12-18T09:30:00'), status: 'geplant', serviceName: 'Ordinationskonsultation', staffName: 'Dr. Mustermann' },
            { patientName: 'Thomas Müller', startTime: new Date('2024-12-18T10:00:00'), endTime: new Date('2024-12-18T10:45:00'), status: 'geplant', serviceName: 'Untersuchung', staffName: 'Dr. Mustermann' }
          ];
          // Filtere nur die Spalten, die in der Report-Definition definiert sind
          if (columnFields.length > 0) {
            mockData = mockData.map(item => {
              const filtered = {};
              columnFields.forEach(field => {
                filtered[field] = item[field] ?? null;
              });
              return filtered;
            });
          }
          mockSummary = { totalAppointments: mockData.length, byStatus: { geplant: 3, in_behandlung: 1, abgeschlossen: 1 } };
          break;
          
        case 'invoices':
          mockData = [
            { invoiceNumber: 'R-2024-000001', totalAmount: 150.00, status: 'bezahlt', invoiceDate: new Date('2024-11-15'), patientName: 'Max Mustermann', createdAt: new Date('2024-11-15') },
            { invoiceNumber: 'R-2024-000002', totalAmount: 250.00, status: 'offen', invoiceDate: new Date('2024-11-20'), patientName: 'Maria Musterfrau', createdAt: new Date('2024-11-20') },
            { invoiceNumber: 'R-2024-000003', totalAmount: 180.00, status: 'bezahlt', invoiceDate: new Date('2024-12-01'), patientName: 'Peter Schmidt', createdAt: new Date('2024-12-01') },
            { invoiceNumber: 'R-2024-000004', totalAmount: 320.00, status: 'offen', invoiceDate: new Date('2024-12-10'), patientName: 'Anna Weber', createdAt: new Date('2024-12-10') },
            { invoiceNumber: 'R-2024-000005', totalAmount: 95.00, status: 'bezahlt', invoiceDate: new Date('2024-12-15'), patientName: 'Thomas Müller', createdAt: new Date('2024-12-15') }
          ];
          // Filtere nur die Spalten, die in der Report-Definition definiert sind
          if (columnFields.length > 0) {
            mockData = mockData.map(item => {
              const filtered = {};
              columnFields.forEach(field => {
                filtered[field] = item[field] ?? null;
              });
              return filtered;
            });
          }
          mockSummary = { 
            totalInvoices: mockData.length, 
            totalAmount: mockData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
            byStatus: { bezahlt: 3, offen: 2 }
          };
          break;
          
        case 'staff':
          mockData = [
            { display_name: 'Dr. Max Mustermann', firstName: 'Max', lastName: 'Mustermann', role: 'doctor', email: 'dr.mustermann@example.com', isActive: true },
            { display_name: 'Maria Musterfrau', firstName: 'Maria', lastName: 'Musterfrau', role: 'nurse', email: 'maria.musterfrau@example.com', isActive: true },
            { display_name: 'Peter Schmidt', firstName: 'Peter', lastName: 'Schmidt', role: 'assistant', email: 'peter.schmidt@example.com', isActive: true }
          ];
          // Filtere nur die Spalten, die in der Report-Definition definiert sind
          if (columnFields.length > 0) {
            mockData = mockData.map(item => {
              const filtered = {};
              columnFields.forEach(field => {
                filtered[field] = item[field] ?? null;
              });
              return filtered;
            });
          }
          mockSummary = { totalStaff: mockData.length, byRole: { doctor: 1, nurse: 1, assistant: 1 } };
          break;
          
        case 'services':
          mockData = [
            { name: 'Ordinationskonsultation', code: '100', basePrice: 50.00, duration: 30, isActive: true },
            { name: 'Untersuchung', code: '200', basePrice: 80.00, duration: 45, isActive: true },
            { name: 'Nachsorge', code: '300', basePrice: 40.00, duration: 20, isActive: true }
          ];
          // Filtere nur die Spalten, die in der Report-Definition definiert sind
          if (columnFields.length > 0) {
            mockData = mockData.map(item => {
              const filtered = {};
              columnFields.forEach(field => {
                filtered[field] = item[field] ?? null;
              });
              return filtered;
            });
          }
          mockSummary = { totalServices: mockData.length, averagePrice: mockData.reduce((sum, s) => sum + (s.basePrice || 0), 0) / mockData.length };
          break;
          
        default:
          mockData = [
            { id: 1, name: 'Beispieldatensatz 1', value: 100, createdAt: new Date() },
            { id: 2, name: 'Beispieldatensatz 2', value: 200, createdAt: new Date() },
            { id: 3, name: 'Beispieldatensatz 3', value: 300, createdAt: new Date() }
          ];
          // Filtere nur die Spalten, die in der Report-Definition definiert sind
          if (columnFields.length > 0) {
            mockData = mockData.map(item => {
              const filtered = {};
              columnFields.forEach(field => {
                filtered[field] = item[field] ?? null;
              });
              return filtered;
            });
          }
          mockSummary = { totalRecords: mockData.length };
      }
      
        result = {
          totalRecords: mockData.length,
          data: mockData,
          summary: mockSummary,
          executionTime: 50
        };
        
        // Mock-Execution erstellen (nicht in DB speichern)
        const userFirstName = req.user?.firstName || req.user?.email?.split('@')[0] || 'User';
        const userLastName = req.user?.lastName || '';
        
        execution = {
          _id: `mock-${Date.now()}`,
          reportId: report._id || report.id,
          executedBy: { 
            firstName: userFirstName, 
            lastName: userLastName
          },
          parameters: req.body.parameters || {},
          status: 'completed',
          result: result,
          createdAt: new Date()
        };
        console.log('✅ Mock execution created with', mockData.length, 'records');
      } else {
        // Für echte Reports: Fehler weiterwerfen
        console.error('❌ Error in ReportGeneratorService:', genError);
        throw genError;
      }
    }
    
    // ReportExecution speichern (nur für echte Reports aus DB, nicht für Mock-Reports)
    if (!isMockReport && result && report._id) {
      try {
        execution = new ReportExecution({
          reportId: report._id,
          executedBy: req.user._id,
          parameters: req.body.parameters || {},
          status: 'completed',
          result: result.result || result
        });
        await execution.save();
        console.log('✅ ReportExecution saved:', execution._id);
      } catch (saveError) {
        console.error('❌ Error saving ReportExecution:', saveError);
        throw saveError;
      }
      
      // Report-Statistik aktualisieren
      try {
        report.executionCount = (report.executionCount || 0) + 1;
        report.lastExecutedAt = new Date();
        report.lastExecutedBy = req.user._id;
        await report.save();
        console.log('✅ Report statistics updated');
      } catch (updateError) {
        console.warn('⚠️ Could not update report statistics (non-critical):', updateError.message);
        // Nicht kritisch, Report wurde bereits generiert
      }
    } else if (isMockReport && result && !execution) {
      // Für Mock-Reports mit echten Daten: Execution-Objekt erstellen (nicht speichern)
      const userFirstName = req.user?.firstName || req.user?.email?.split('@')[0] || 'User';
      const userLastName = req.user?.lastName || '';
      
      execution = {
        _id: `mock-${Date.now()}`,
        reportId: report._id || report.id,
        executedBy: { 
          firstName: userFirstName, 
          lastName: userLastName
        },
        parameters: req.body.parameters || {},
        status: 'completed',
        result: result.result || result,
        createdAt: new Date()
      };
      console.log('✅ Mock execution created for real data:', result.totalRecords, 'records');
    }
    
    // Audit-Log (nur wenn es keine Mock-Daten sind oder wenn MongoDB verfügbar ist)
    try {
      if (req.params.id.match(/^[0-9]+$/)) {
        // Für Mock-Daten: Audit-Log optional, nicht kritisch
        console.log('📝 Skipping AuditLog for mock report');
      } else {
        await AuditLog.create({
          userId: req.user._id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: 'reports.generate',
          description: `Report generiert: ${report.name}`,
          details: { reportId: report._id, executionId: execution._id }
        });
      }
    } catch (auditError) {
      console.warn('⚠️ Could not create audit log (non-critical):', auditError.message);
      // Audit-Log-Fehler sind nicht kritisch, Report-Generierung kann trotzdem erfolgreich sein
    }
    
    console.log('✅ Report generation successful:', {
      reportId: report._id || report.id,
      reportName: report.name,
      executionId: execution._id,
      isMock: req.params.id.match(/^[0-9]+$/) ? true : false
    });
    
    res.json({ 
      success: true, 
      execution: execution,
      message: 'Report erfolgreich generiert'
    });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Fehler in ReportExecution speichern (nur wenn es keine Mock-Daten sind)
    if (!req.params.id.match(/^[0-9]+$/)) {
      try {
        const report = await ReportDefinition.findById(req.params.id);
        if (report) {
          const execution = new ReportExecution({
            reportId: report._id,
            executedBy: req.user._id,
            parameters: req.body.parameters || {},
            status: 'failed',
            error: {
              message: error.message,
              stack: error.stack,
              occurredAt: new Date()
            }
          });
          await execution.save();
        }
      } catch (saveError) {
        console.error('Error saving failed execution:', saveError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Generieren des Reports', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/reports/:id/executions
// @desc    Get report execution history
// @access  Private
router.get('/:id/executions', auth, async (req, res) => {
  try {
    const report = await ReportDefinition.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report nicht gefunden' });
    }
    
    // Berechtigung prüfen
    const canView = report.isPublic || 
                    report.permissions.canView.includes(req.user.role) ||
                    report.createdBy.toString() === req.user._id.toString() ||
                    req.user.role === 'super_admin' || req.user.role === 'admin';
    
    if (!canView) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung' });
    }
    
    const executions = await ReportExecution.find({ reportDefinitionId: req.params.id })
      .populate('executedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, data: executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Ausführungen', error: error.message });
  }
});

module.exports = router;
