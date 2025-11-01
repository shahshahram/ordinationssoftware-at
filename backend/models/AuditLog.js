const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // User Information
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true, trim: true },
  userRole: { type: String, required: true, trim: true },
  
  // Action Information
  action: { 
    type: String, 
    required: true,
    enum: [
      // Authentication & User Management
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
      'PASSWORD_CHANGED', 'PASSWORD_RESET', '2FA_ENABLED', '2FA_DISABLED',
      'PROFILE_UPDATED', 'USER_CREATED', 'USER_DELETED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
      
      // RBAC & Authorization
      'authorization', 'permission_granted', 'permission_denied', 'role_assigned', 'role_revoked',
      'acl_created', 'acl_updated', 'acl_deleted', 'policy_updated',
      'permission_auto_granted', 'rbac_changes_detected', 'rbac_discovery_started', 'rbac_discovery_stopped',
      
      // Patient Management
      'PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_DELETED', 'PATIENT_VIEWED',
      'patient.read', 'patient.create', 'patient.update', 'patient.delete',
      
      // Appointment Management
      'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_DELETED', 'APPOINTMENT_VIEWED',
      'appointment.read', 'appointment.create', 'appointment.update', 'appointment.delete',
      'appointment.book', 'appointment.cancel', 'appointment.reschedule',
      
      // Document Management
      'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED',
      'document.read', 'document.create', 'document.update', 'document.delete',
      'document.generate', 'document.print', 'document.share', 'document.export',
      
      // Billing Management
      'INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_DELETED', 'INVOICE_VIEWED',
      'billing.read', 'billing.create', 'billing.update', 'billing.delete', 'billing.generate',
      
      // System & Data Management
      'DATA_EXPORT', 'DATA_DELETION', 'AUDIT_LOG_EXPORT', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE',
      'staff_profiles.read', 'staff_profiles.create', 'staff_profiles.update', 'staff_profiles.delete', 'staff_profiles.toggle_status', 'staff_profiles.statistics',
      'work_shifts.read', 'work_shifts.create', 'work_shifts.update', 'work_shifts.delete', 'work_shifts.toggle_status',
      'absences.read', 'absences.create', 'absences.update', 'absences.delete', 'absences.approve',
      'availability.read', 'availability.check', 'availability.utilization', 'availability.staff',
      'locations.read', 'locations.create', 'locations.update', 'locations.delete',
      'staff-location-assignments.read', 'staff-location-assignments.create', 'staff-location-assignments.update', 'staff-location-assignments.delete',
      'location-hours.read', 'location-hours.create', 'location-hours.update', 'location-hours.delete',
      'location-closures.read', 'location-closures.create', 'location-closures.update', 'location-closures.delete',
      'weekly_schedules.read', 'weekly_schedules.create', 'weekly_schedules.update', 'weekly_schedules.delete',
      'location-weekly-schedules.read', 'location-weekly-schedules.create', 'location-weekly-schedules.update', 'location-weekly-schedules.delete',
      'service-catalog.read', 'service-catalog.create', 'service-catalog.update', 'service-catalog.delete',
      'service-bookings.read', 'service-bookings.create', 'service-bookings.update', 'service-bookings.delete',
      'service-categories.read', 'service-categories.create', 'service-categories.update', 'service-categories.delete',
      'diagnoses.read', 'diagnoses.create', 'diagnoses.update', 'diagnoses.delete',
        'icd10.search', 'icd10.top', 'icd10.recent', 'icd10.chapters', 'icd10.analytics',
        'icd10.hierarchy', 'icd10.children', 'icd10.parent', 'icd10.siblings', 'icd10.related', 'icd10.breadcrumb',
        'icd10.validate', 'icd10.autocorrect',
        'icd10.personal-list.create', 'icd10.personal-list.update', 'icd10.personal-list.delete',
        'icd10.personal-list.add-code', 'icd10.personal-list.remove-code', 'icd10.personal-list.share',
        'icd10.import', 'icd10.export', 'icd10.activate', 'icd10.deactivate', 'icd10.delete'
    ]
  },
  resource: { type: String, trim: true }, // e.g., 'Patient', 'Document', 'Invoice'
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  
  // Request Information
  ipAddress: { type: String, trim: true },
  userAgent: { type: String, trim: true },
  requestId: { type: String, trim: true },
  
  // Details
  description: { type: String, required: true, trim: true },
  details: { type: mongoose.Schema.Types.Mixed }, // Additional context data
  severity: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  
  // Result
  success: { type: Boolean, required: true, default: true },
  errorMessage: { type: String, trim: true },
  
  // DSGVO Compliance
  dataSubject: { type: String, trim: true }, // Patient ID or name for data access logs
  legalBasis: { type: String, trim: true }, // Legal basis for data processing
  retentionPeriod: { type: Number, default: 10 }, // Years to keep this log (default 10 years)
  
  // Timestamps
  timestamp: { type: Date, default: Date.now, required: true },
  expiresAt: { type: Date } // For automatic cleanup after retention period
}, {
  timestamps: true
});

// Indexes for performance and compliance
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ ipAddress: 1, timestamp: -1 });
AuditLogSchema.index({ dataSubject: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Pre-save middleware to set expiration date
AuditLogSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set expiration date based on retention period
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + this.retentionPeriod);
    this.expiresAt = expirationDate;
  }
  next();
});

// Static method to create audit log entry
AuditLogSchema.statics.createLog = function(logData) {
  return this.create({
    ...logData,
    timestamp: new Date()
  });
};

// Static method to get audit logs for a specific user
AuditLogSchema.statics.getUserLogs = function(userId, limit = 100, skip = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .select('-__v');
};

// Static method to get audit logs for a specific resource
AuditLogSchema.statics.getResourceLogs = function(resource, resourceId, limit = 100, skip = 0) {
  return this.find({ resource, resourceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .select('-__v');
};

// Static method to export audit logs for compliance
AuditLogSchema.statics.exportLogs = function(startDate, endDate, format = 'json') {
  const query = {};
  if (startDate) query.timestamp = { ...query.timestamp, $gte: new Date(startDate) };
  if (endDate) query.timestamp = { ...query.timestamp, $lte: new Date(endDate) };
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .select('-__v');
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
