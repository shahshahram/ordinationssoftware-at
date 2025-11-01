const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const resourceRoutes = require('./routes/resources');
const billingRoutes = require('./routes/billing');
const documentRoutes = require('./routes/documents');
const onlineBookingRoutes = require('./routes/onlineBooking');
const elgaRoutes = require('./routes/elga');
const ecardRoutes = require('./routes/ecard');
const userRoutes = require('./routes/users');
const backupRoutes = require('./routes/backup');
const reportRoutes = require('./routes/reports');
const auditLogRoutes = require('./routes/auditLogs');
const staffProfileRoutes = require('./routes/staffProfiles');
const workShiftRoutes = require('./routes/workShifts');
const absenceRoutes = require('./routes/absences');
const availabilityRoutes = require('./routes/availability');
const serviceCatalogRoutes = require('./routes/serviceCatalog');
const serviceBookingRoutes = require('./routes/serviceBookings');
const serviceCategoryRoutes = require('./routes/serviceCategories');
const weeklyScheduleRoutes = require('./routes/weeklySchedules');
const appointmentParticipantRoutes = require('./routes/appointmentParticipants');
const appointmentServiceRoutes = require('./routes/appointmentServices');
const appointmentResourceRoutes = require('./routes/appointmentResources');
const clinicHoursRoutes = require('./routes/clinicHours');
const roomsRoutes = require('./routes/rooms');
const devicesRoutes = require('./routes/devices');
const locationsRoutes = require('./routes/locations');
const staffLocationAssignmentsRoutes = require('./routes/staffLocationAssignments');
const locationWeeklySchedulesRoutes = require('./routes/locationWeeklySchedules');
const collisionDetectionRoutes = require('./routes/collisionDetection');
const icd10Routes = require('./routes/icd10');
const diagnosesRoutes = require('./routes/diagnoses');
const icd10CatalogRoutes = require('./routes/icd10Catalog');
const icd10PersonalListsRoutes = require('./routes/icd10PersonalLists');
const slotReservationRoutes = require('./routes/slotReservation');
const documentTemplateRoutes = require('./routes/documentTemplates');
const pdfGenerationRoutes = require('./routes/pdfGeneration');
// const oneClickBillingRoutes = require('./routes/oneClickBilling'); // Temporär deaktiviert
const patientsExtendedRoutes = require('./routes/patientsExtended');
const medicationCatalogRoutes = require('./routes/medicationCatalog');
const rbacRoutes = require('./routes/rbac');
const rbacDiscoveryRoutes = require('./routes/rbacDiscovery');
const inventoryRoutes = require('./routes/inventory');
const setupRoutes = require('./routes/setup');
const settingsRoutes = require('./routes/settings');

// RBAC Auto-Discovery Service
const rbacAutoDiscovery = require('./services/rbacAutoDiscovery');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const backupService = require('./utils/backupService');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting - temporarily disabled for development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.'
// });
// app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.178.163:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
// XSS protection is handled by helmet

// Compression
app.use(compression());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('MongoDB erfolgreich verbunden');
})
.catch((err) => {
  logger.error('MongoDB Verbindungsfehler:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/documents', documentRoutes);
app.use('/api/online-booking', onlineBookingRoutes);
app.use('/api/elga', elgaRoutes);
app.use('/api/ecard', ecardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/staff-profiles', staffProfileRoutes);
app.use('/api/work-shifts', workShiftRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/service-catalog', serviceCatalogRoutes);
app.use('/api/service-bookings', serviceBookingRoutes);
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/weekly-schedules', weeklyScheduleRoutes);
app.use('/api/appointment-participants', appointmentParticipantRoutes);
app.use('/api/appointment-services', appointmentServiceRoutes);
app.use('/api/appointment-resources', appointmentResourceRoutes);
app.use('/api/clinic-hours', clinicHoursRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/staff-location-assignments', staffLocationAssignmentsRoutes);
app.use('/api/location-weekly-schedules', locationWeeklySchedulesRoutes);
app.use('/api/collision-detection', collisionDetectionRoutes);
app.use('/api/icd10', icd10Routes);
app.use('/api/diagnoses', diagnosesRoutes);
app.use('/api/icd10-catalog', icd10CatalogRoutes);
app.use('/api/icd10/personal-lists', icd10PersonalListsRoutes);
app.use('/api/slot-reservations', slotReservationRoutes);
app.use('/api/document-templates', documentTemplateRoutes);
app.use('/api/pdf', pdfGenerationRoutes);
// app.use('/api/billing', oneClickBillingRoutes); // Temporär deaktiviert
app.use('/api/patients-extended', patientsExtendedRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/rbac/discovery', rbacDiscoveryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/medications', medicationCatalogRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint nicht gefunden'
  });
});

// Scheduled tasks
if (process.env.NODE_ENV === 'production') {
  // Daily backup at 2 AM
  cron.schedule(process.env.BACKUP_SCHEDULE || '0 2 * * *', () => {
    logger.info('Starte automatisches Backup...');
    backupService.createBackup();
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM empfangen, fahre Server herunter...');
  server.close(() => {
    logger.info('Server heruntergefahren');
    process.exit(0);
  });
});

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Ordinationssoftware Server läuft auf Port ${PORT}`);
  logger.info(`📊 Health Check: http://localhost:${PORT}/api/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Server erreichbar auf allen Interfaces`);
  
  // Starte RBAC Auto-Discovery Service
  try {
    await rbacAutoDiscovery.start();
    logger.info('✅ RBAC Auto-Discovery Service gestartet');
  } catch (error) {
    logger.error('❌ Fehler beim Starten des RBAC Auto-Discovery Services:', error);
  }
});

module.exports = app;
