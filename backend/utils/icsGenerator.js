/**
 * ICS (iCalendar) File Generator
 * Erstellt .ics Dateien für Kalender-Apps (Google Calendar, Apple Calendar, Outlook, etc.)
 */

/**
 * Generiert ein ICS-File für einen Termin
 * @param {Object} appointment - Termin-Daten
 * @param {Date} appointment.start - Startzeit (Date-Objekt)
 * @param {Date} appointment.end - Endzeit (Date-Objekt)
 * @param {String} appointment.title - Titel des Termins
 * @param {String} appointment.description - Beschreibung
 * @param {String} appointment.location - Ort/Adresse
 * @param {String} appointment.organizerEmail - E-Mail des Organisators (Ordination)
 * @param {String} appointment.organizerName - Name des Organisators
 * @param {String} appointment.attendeeEmail - E-Mail des Teilnehmers (Patient)
 * @param {String} appointment.attendeeName - Name des Teilnehmers
 * @param {String} appointment.uid - Eindeutige ID (optional, wird automatisch generiert)
 * @param {String} appointment.status - Status (CONFIRMED, TENTATIVE, CANCELLED)
 * @returns {String} ICS-File als String
 */
function generateICS(appointment) {
  const {
    start,
    end,
    title = 'Arzttermin',
    description = '',
    location = '',
    organizerEmail = 'info@praxis.at',
    organizerName = 'Ordination',
    attendeeEmail = '',
    attendeeName = '',
    uid = null,
    status = 'CONFIRMED'
  } = appointment;

  // Validiere erforderliche Felder
  if (!start || !end) {
    throw new Error('Start- und Endzeit sind erforderlich');
  }

  // Generiere eindeutige ID falls nicht vorhanden
  const eventUID = uid || `appointment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Konvertiere Datum zu UTC im ICS-Format (YYYYMMDDTHHMMSSZ)
  const formatICSDate = (date) => {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  // Escape ICS-Text (Zeilenumbrüche, Kommas, Semikolons, etc.)
  const escapeICS = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  };

  // Aktuelles Datum für DTSTAMP
  const now = new Date();
  const dtstamp = formatICSDate(now);

  // Start- und Endzeit
  const dtstart = formatICSDate(start);
  const dtend = formatICSDate(end);

  // ICS-Datei zusammenstellen
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ordinationssoftware//Online-Buchung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${eventUID}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(title)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : '',
    location ? `LOCATION:${escapeICS(location)}` : '',
    `STATUS:${status}`,
    `ORGANIZER;CN=${escapeICS(organizerName)}:MAILTO:${organizerEmail}`,
    attendeeEmail ? `ATTENDEE;CN=${escapeICS(attendeeName)};RSVP=TRUE:MAILTO:${attendeeEmail}` : '',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Erinnerung: ${escapeICS(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(line => line !== '') // Entferne leere Zeilen
    .join('\r\n');

  return icsContent;
}

/**
 * Generiert ein ICS-File für eine Online-Buchung
 * @param {Object} booking - OnlineBooking Objekt
 * @param {Object} location - Location Objekt (optional, für Adresse)
 * @returns {String} ICS-File als String
 */
function generateICSFromBooking(booking, location = null) {
  // Konvertiere appointment.date (Date) und appointment.startTime (String "HH:MM") zu Date-Objekt
  const appointmentDate = new Date(booking.appointment.date);
  const [hours, minutes] = booking.appointment.startTime.split(':').map(Number);
  const startDateTime = new Date(appointmentDate);
  startDateTime.setHours(hours, minutes, 0, 0);

  // Endzeit berechnen
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + (booking.appointment.duration || 30));

  // Adresse aus Location oder Standard
  let locationAddress = '';
  if (location) {
    locationAddress = [
      location.address_line1,
      location.postal_code,
      location.city
    ].filter(Boolean).join(', ');
  }

  // Beschreibung zusammenstellen
  const description = [
    `Arzt: ${booking.doctor.name}`,
    booking.doctor.specialization ? `Fachrichtung: ${booking.doctor.specialization}` : '',
    booking.appointment.reason ? `Grund: ${booking.appointment.reason}` : '',
    booking.appointment.notes ? `Notizen: ${booking.appointment.notes}` : '',
    `Buchungsnummer: ${booking.bookingNumber}`
  ].filter(Boolean).join('\\n');

  return generateICS({
    start: startDateTime,
    end: endDateTime,
    title: `Arzttermin: ${booking.appointment.type}`,
    description: description,
    location: locationAddress,
    organizerEmail: location?.email || 'info@praxis.at',
    organizerName: location?.name || booking.doctor.name || 'Ordination',
    attendeeEmail: booking.patient.email,
    attendeeName: `${booking.patient.firstName} ${booking.patient.lastName}`,
    uid: `booking-${booking.bookingNumber}`,
    status: booking.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'
  });
}

module.exports = {
  generateICS,
  generateICSFromBooking
};

