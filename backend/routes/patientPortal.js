/**
 * Patient Portal – öffentliche API für Terminverwaltung per Magic Link (managementToken)
 * Kein Auth; Zugriff nur mit gültigem Token. Rate-Limit in server.js.
 */
const express = require('express');
const Appointment = require('../models/Appointment');
const SystemSettings = require('../models/SystemSettings');
const router = express.Router();

/**
 * @route   GET /api/portal/appointment/:token
 * @desc    Termin per managementToken abrufen (öffentlich, token-basiert)
 * @access  Public (Rate-limited)
 */
router.get('/appointment/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Link.',
        code: 'INVALID_TOKEN'
      });
    }

    const appointment = await Appointment.findOne({
      managementToken: token.trim()
    })
      .populate('doctor', 'firstName lastName title')
      .populate({ path: 'room', select: 'name location_id', populate: { path: 'location_id', select: 'name address_line1 address_line2 postal_code city' } })
      .populate('locationId', 'name address_line1 address_line2 postal_code city')
      .lean();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Termin nicht gefunden oder Link ungültig.',
        code: 'NOT_FOUND'
      });
    }

    if (appointment.managementTokenExpires && new Date(appointment.managementTokenExpires) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Dieser Link ist abgelaufen.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (appointment.status === 'abgesagt') {
      return res.status(200).json({
        success: true,
        appointment: buildPortalAppointment(appointment),
        message: 'Dieser Termin wurde storniert.'
      });
    }

    const cancellationPolicy = await getCancellationPolicy();
    const canCancel = canCancelAppointment(appointment, cancellationPolicy);

    res.json({
      success: true,
      appointment: buildPortalAppointment(appointment),
      cancellationPolicy: {
        canCancel,
        deadlineHours: cancellationPolicy.cancellationDeadlineHours,
        allowOnlineCancellation: cancellationPolicy.allowOnlineCancellation,
        cancellationPhoneNumber: cancellationPolicy.cancellationPhoneNumber
      }
    });
  } catch (error) {
    console.error('[PatientPortal] GET appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Termins.'
    });
  }
});

/**
 * @route   POST /api/portal/appointment/:token/cancel
 * @desc    Termin stornieren (öffentlich, token-basiert)
 * @access  Public (Rate-limited)
 */
router.post('/appointment/:token/cancel', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Link.',
        code: 'INVALID_TOKEN'
      });
    }

    const appointment = await Appointment.findOne({
      managementToken: token.trim()
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Termin nicht gefunden oder Link ungültig.',
        code: 'NOT_FOUND'
      });
    }

    if (appointment.managementTokenExpires && new Date(appointment.managementTokenExpires) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Dieser Link ist abgelaufen.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (appointment.status === 'abgesagt') {
      return res.status(400).json({
        success: false,
        message: 'Dieser Termin wurde bereits storniert.',
        code: 'ALREADY_CANCELLED'
      });
    }

    const cancellationPolicy = await getCancellationPolicy();

    if (!cancellationPolicy.allowOnlineCancellation) {
      const phoneMessage = cancellationPolicy.cancellationPhoneNumber
        ? ` Bitte rufen Sie uns an: ${cancellationPolicy.cancellationPhoneNumber}`
        : ' Bitte kontaktieren Sie uns telefonisch.';
      return res.status(400).json({
        success: false,
        message: `Online-Stornierung ist derzeit nicht möglich.${phoneMessage}`,
        code: 'ONLINE_CANCELLATION_DISABLED',
        cancellationPhoneNumber: cancellationPolicy.cancellationPhoneNumber
      });
    }

    const startTime = new Date(appointment.startTime);
    const now = new Date();
    const hoursUntilAppointment = (startTime - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment < cancellationPolicy.cancellationDeadlineHours) {
      const phoneMessage = cancellationPolicy.cancellationPhoneNumber
        ? ` Bitte rufen Sie uns an: ${cancellationPolicy.cancellationPhoneNumber}`
        : ' Bitte kontaktieren Sie uns telefonisch.';
      return res.status(400).json({
        success: false,
        message: `Online-Stornierung ist nur bis ${cancellationPolicy.cancellationDeadlineHours} Stunden vor dem Termin möglich.${phoneMessage}`,
        code: 'CANCELLATION_DEADLINE_EXCEEDED',
        deadlineHours: cancellationPolicy.cancellationDeadlineHours,
        cancellationPhoneNumber: cancellationPolicy.cancellationPhoneNumber
      });
    }

    appointment.status = 'abgesagt';
    appointment.managementToken = undefined;
    appointment.managementTokenExpires = undefined;
    await appointment.save();

    res.json({
      success: true,
      message: 'Termin wurde erfolgreich storniert.'
    });
  } catch (error) {
    console.error('[PatientPortal] POST cancel error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Stornieren.'
    });
  }
});

function buildPortalAppointment(appointment) {
  const doctor = appointment.doctor;
  const doctorName = doctor
    ? [doctor.title, doctor.firstName, doctor.lastName].filter(Boolean).join(' ')
    : null;

  const location = appointment.locationId || (appointment.room && appointment.room.location_id);
  let address = null;
  if (location) {
    const parts = [
      location.address_line1,
      location.address_line2,
      [location.postal_code, location.city].filter(Boolean).join(' ')
    ].filter(Boolean);
    address = parts.join(', ');
  }

  return {
    id: appointment._id,
    doctorName,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    title: appointment.title,
    status: appointment.status,
    bookingReference: appointment.bookingReference || null,
    address,
    locationName: location ? location.name : null,
    roomName: appointment.room ? appointment.room.name : null
  };
}

async function getCancellationPolicy() {
  const cancellationDeadlineHours = await SystemSettings.getSetting(
    'onlineBooking',
    'cancellationDeadlineHours',
    24
  );
  const allowOnlineCancellation = await SystemSettings.getSetting(
    'onlineBooking',
    'allowOnlineCancellation',
    true
  );
  const cancellationPhoneNumber = await SystemSettings.getSetting(
    'onlineBooking',
    'cancellationPhoneNumber',
    null
  );
  return {
    cancellationDeadlineHours: typeof cancellationDeadlineHours === 'number' ? cancellationDeadlineHours : 24,
    allowOnlineCancellation: !!allowOnlineCancellation,
    cancellationPhoneNumber: cancellationPhoneNumber || null
  };
}

function canCancelAppointment(appointment, policy) {
  if (!policy.allowOnlineCancellation || appointment.status === 'abgesagt') return false;
  const startTime = new Date(appointment.startTime);
  const now = new Date();
  const hoursUntil = (startTime - now) / (1000 * 60 * 60);
  return hoursUntil >= policy.cancellationDeadlineHours;
}

module.exports = router;
