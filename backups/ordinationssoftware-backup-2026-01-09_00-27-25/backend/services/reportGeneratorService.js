const Patient = require('../models/Patient');
const PatientExtended = require('../models/PatientExtended');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const Reimbursement = require('../models/Reimbursement');
const StaffProfile = require('../models/StaffProfile');
const ServiceCatalog = require('../models/ServiceCatalog');
const Document = require('../models/Document');
const Performance = require('../models/Performance');
const WaitingList = require('../models/WaitingList');
const Resource = require('../models/Resource');

class ReportGeneratorService {
  /**
   * Generiert einen Report basierend auf einer ReportDefinition
   */
  static async generateReport(reportDefinition, parameters = {}) {
    const startTime = Date.now();
    
    try {
      // Validiere Report-Definition
      if (!reportDefinition) {
        throw new Error('Report-Definition ist erforderlich');
      }
      if (!reportDefinition.dataSource) {
        throw new Error('Report-Definition hat keine dataSource');
      }
      if (!reportDefinition.config) {
        throw new Error('Report-Definition hat keine config');
      }
      
      // Datumsbereich verarbeiten (nur wenn aktiviert)
      let dateRange = null;
      let dateRangeField = null;
      if (reportDefinition.config.dateRange && reportDefinition.config.dateRange.enabled) {
        dateRange = this.processDateRange(
          reportDefinition.config.dateRange,
          parameters.dateRange
        );
        dateRangeField = reportDefinition.config.dateRange.field || 'createdAt';
      }
      
      // Filter aufbauen
      const query = this.buildQuery(
        reportDefinition.dataSource,
        reportDefinition.config.filters || [],
        dateRange,
        dateRangeField
      );
      
      // Sichereres Logging (vermeidet Probleme mit großen Objekten oder zirkulären Referenzen)
      try {
        console.log('📊 Report query keys:', Object.keys(query));
        console.log('📊 Date range enabled:', reportDefinition.config.dateRange?.enabled);
        console.log('📊 Date range field:', dateRangeField);
        if (dateRange) {
          console.log('📊 Date range start:', dateRange.start);
          console.log('📊 Date range end:', dateRange.end);
        }
        console.log('📊 Report limit:', reportDefinition.config.limit);
      } catch (logError) {
        console.warn('⚠️ Error logging report info:', logError.message);
      }
      
      // Daten abrufen
      let data = await this.fetchData(reportDefinition.dataSource, query);
      
      console.log('📊 Fetched data count before limit:', data.length);
      
      // Gruppierung anwenden
      if (reportDefinition.config.groupBy && reportDefinition.config.groupBy.length > 0) {
        data = this.applyGrouping(data, reportDefinition.config.groupBy, reportDefinition.config.columns || []);
      }
      
      // Sortierung anwenden
      if (reportDefinition.config.sortBy && reportDefinition.config.sortBy.field) {
        data = this.applySorting(data, reportDefinition.config.sortBy);
      }
      
      // Spalten filtern und formatieren
      data = this.formatColumns(data, reportDefinition.config.columns || []);
      
      // Limit anwenden (nur wenn definiert und größer als 0)
      const totalRecords = data.length;
      const limit = reportDefinition.config.limit;
      if (limit && limit > 0 && data.length > limit) {
        console.log(`📊 Applying limit: ${limit} (total records: ${totalRecords})`);
        data = data.slice(0, limit);
      } else {
        console.log(`📊 No limit applied (limit: ${limit}, total records: ${totalRecords})`);
      }
      
      // Zusammenfassung berechnen
      const summary = this.calculateSummary(data, reportDefinition.config.columns);
      
      const executionTime = Date.now() - startTime;
      
      return {
        totalRecords,
        data,
        summary,
        executionTime,
        dateRange
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
  
  /**
   * Verarbeitet den Datumsbereich
   */
  static processDateRange(dateRangeConfig, parameters) {
    if (!dateRangeConfig || !dateRangeConfig.enabled) {
      return null;
    }
    
    if (parameters && parameters.startDate && parameters.endDate) {
      return {
        start: new Date(parameters.startDate),
        end: new Date(parameters.endDate)
      };
    }
    
    const now = new Date();
    let start, end;
    
    switch (dateRangeConfig.defaultRange) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        start = new Date(now.setDate(now.getDate() - 1));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        start = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        return null;
    }
    
    return { start, end };
  }
  
  /**
   * Baut die MongoDB Query auf
   */
  static buildQuery(dataSource, filters, dateRange, dateRangeField = 'createdAt') {
    const query = {};
    
    // Datumsbereich hinzufügen
    if (dateRange && dateRange.start && dateRange.end) {
      // Verwende das Datumsfeld aus der ReportDefinition
      query[dateRangeField] = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }
    
    // Filter anwenden
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        const field = filter.field;
        const operator = filter.operator;
        const value = filter.value;
        
        switch (operator) {
          case 'equals':
            query[field] = value;
            break;
          case 'notEquals':
            query[field] = { $ne: value };
            break;
          case 'contains':
            query[field] = { $regex: value, $options: 'i' };
            break;
          case 'notContains':
            query[field] = { $not: { $regex: value, $options: 'i' } };
            break;
          case 'greaterThan':
            query[field] = { $gt: value };
            break;
          case 'lessThan':
            query[field] = { $lt: value };
            break;
          case 'greaterThanOrEqual':
            query[field] = { $gte: value };
            break;
          case 'lessThanOrEqual':
            query[field] = { $lte: value };
            break;
          case 'between':
            query[field] = { $gte: value, $lte: filter.value2 };
            break;
          case 'in':
            query[field] = { $in: Array.isArray(value) ? value : [value] };
            break;
          case 'notIn':
            query[field] = { $nin: Array.isArray(value) ? value : [value] };
            break;
          case 'isNull':
            query[field] = null;
            break;
          case 'isNotNull':
            query[field] = { $ne: null };
            break;
        }
      });
    }
    
    return query;
  }
  
  /**
   * Ruft Daten basierend auf der Datenquelle ab
   */
  static async fetchData(dataSource, query) {
    let Model;
    let selectFields = {};
    
    switch (dataSource) {
      case 'patients':
        Model = Patient;
        break;
      case 'appointments':
        Model = Appointment;
        break;
      case 'invoices':
        Model = Invoice;
        break;
      case 'reimbursements':
        Model = Reimbursement;
        break;
      case 'staff':
        Model = StaffProfile;
        break;
      case 'services':
        Model = ServiceCatalog;
        break;
      case 'documents':
        Model = Document;
        break;
      case 'performances':
        Model = Performance;
        break;
      case 'waiting-list':
        Model = WaitingList;
        break;
      case 'resources':
        Model = Resource;
        break;
      default:
        throw new Error(`Unbekannte Datenquelle: ${dataSource}`);
    }
    
    let data;
    
    // Spezielle Behandlung für Appointments: Populate patient und service
    if (dataSource === 'appointments') {
      try {
        data = await Model.find(query)
          .populate('patient', 'firstName lastName email phone')
          .populate('service', 'name code')
          .populate('doctor', 'firstName lastName')
          .lean();
        
        console.log('📊 Fetched appointments count:', data.length);
      } catch (fetchError) {
        console.error('❌ Error fetching appointments:', fetchError);
        throw new Error(`Fehler beim Laden der Termine: ${fetchError.message}`);
      }
      
      // Transformiere Daten: Erstelle patientName aus patient.firstName und patient.lastName
      try {
        data = data.map(appointment => {
        const patient = appointment.patient;
        if (patient && (patient.firstName || patient.lastName)) {
          appointment.patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        } else {
          appointment.patientName = 'Unbekannt';
        }
        
        // Erstelle serviceName aus service
        if (appointment.service) {
          appointment.serviceName = appointment.service.name || appointment.service.code || 'Unbekannt';
        } else {
          appointment.serviceName = 'Kein Service';
        }
        
        // Erstelle staffName aus doctor
        if (appointment.doctor) {
          appointment.staffName = appointment.doctor.firstName && appointment.doctor.lastName
            ? `${appointment.doctor.firstName} ${appointment.doctor.lastName}`
            : appointment.doctor.display_name || appointment.doctor.email || 'Unbekannt';
        } else {
          appointment.staffName = 'Unbekannt';
        }
        
          return appointment;
        });
      } catch (transformError) {
        console.error('❌ Error transforming appointments:', transformError);
        // Fallback: Verwende Original-Daten ohne Transformation
        console.warn('⚠️ Using original appointment data without transformation');
      }
    } else {
      try {
        // Für Patienten: Limit hinzufügen, um Memory-Probleme zu vermeiden
        let queryBuilder = Model.find(query);
        
        // Standard-Limit für große Datenquellen (kann durch reportDefinition.config.limit überschrieben werden)
        if (dataSource === 'patients' || dataSource === 'appointments') {
          // Kein Limit hier - wird später in generateReport angewendet
          // Aber wir loggen die Anzahl
        }
        
        data = await queryBuilder.lean();
        console.log(`📊 Fetched ${dataSource} count:`, data.length);
        
        // Warnung bei sehr großen Datensätzen
        if (data.length > 10000) {
          console.warn(`⚠️ Large dataset fetched: ${data.length} records for ${dataSource}. Consider adding filters or limits.`);
        }
      } catch (fetchError) {
        console.error(`❌ Error fetching ${dataSource}:`, fetchError);
        console.error(`❌ Query was:`, JSON.stringify(query, null, 2).substring(0, 500)); // Nur ersten 500 Zeichen
        throw new Error(`Fehler beim Laden der ${dataSource}: ${fetchError.message}`);
      }
    }
    
    return data;
  }
  
  /**
   * Wendet Gruppierung an
   */
  static applyGrouping(data, groupBy, columns) {
    const grouped = {};
    
    data.forEach(item => {
      const key = groupBy.map(field => item[field]).join('|');
      if (!grouped[key]) {
        grouped[key] = { ...item, _count: 0 };
      }
      grouped[key]._count++;
    });
    
    return Object.values(grouped);
  }
  
  /**
   * Wendet Sortierung an
   */
  static applySorting(data, sortBy) {
    return data.sort((a, b) => {
      const aVal = a[sortBy.field];
      const bVal = b[sortBy.field];
      
      if (sortBy.direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }
  
  /**
   * Formatiert Spalten
   */
  static formatColumns(data, columns) {
    if (!columns || columns.length === 0) {
      return data;
    }
    
    const visibleColumns = columns.filter(col => col && col.field && col.visible !== false);
    
    if (visibleColumns.length === 0) {
      return data;
    }
    
    return data.map(item => {
      const formatted = {};
      visibleColumns.forEach(col => {
        if (!col.field) {
          return; // Überspringe Spalten ohne field
        }
        
        let value = item[col.field];
        
        // Formatierung anwenden
        if (value !== null && value !== undefined) {
          try {
            switch (col.type) {
              case 'date':
                value = new Date(value).toLocaleDateString('de-DE');
                break;
              case 'currency':
                value = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
                break;
              case 'number':
                if (col.format) {
                  value = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(value);
                }
                break;
              case 'percentage':
                value = `${value}%`;
                break;
            }
          } catch (formatError) {
            console.warn(`⚠️ Error formatting column ${col.field}:`, formatError.message);
            // Behalte den ursprünglichen Wert bei Formatierungsfehler
          }
        }
        
        formatted[col.field] = value;
      });
      
      return formatted;
    });
  }
  
  /**
   * Berechnet Zusammenfassung
   */
  static calculateSummary(data, columns) {
    const summary = {};
    
    columns.forEach(col => {
      if (col.aggregate) {
        const values = data.map(item => item[col.field]).filter(v => v != null);
        
        switch (col.aggregate) {
          case 'sum':
            summary[col.field] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            summary[col.field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'count':
            summary[col.field] = values.length;
            break;
          case 'min':
            summary[col.field] = values.length > 0 ? Math.min(...values) : null;
            break;
          case 'max':
            summary[col.field] = values.length > 0 ? Math.max(...values) : null;
            break;
        }
      }
    });
    
    return summary;
  }
}

module.exports = ReportGeneratorService;

