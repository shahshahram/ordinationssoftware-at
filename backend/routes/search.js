const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const PatientExtended = require('../models/PatientExtended');
const Appointment = require('../models/Appointment');
const Document = require('../models/Document');
const PatientDiagnosis = require('../models/PatientDiagnosis');

/**
 * POST /api/search/global
 * Intelligente globale Suche über alle Module
 */
router.post('/global', authenticate, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    const userId = req.user.id;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Suchbegriff ist erforderlich' 
      });
    }

    const searchQuery = query.trim();
    const searchLimit = Math.min(limit, 50); // Max 50 Ergebnisse
    const results = [];

    // Suche in Patienten
    try {
      const patientRegex = new RegExp(searchQuery, 'i');
      const patients = await PatientExtended.find({
        $or: [
          { firstName: patientRegex },
          { lastName: patientRegex },
          { email: patientRegex },
          { phone: patientRegex },
          { svnr: patientRegex },
        ],
        isActive: true,
      })
        .select('_id firstName lastName email phone svnr dateOfBirth')
        .limit(Math.ceil(searchLimit * 0.3))
        .lean();

      patients.forEach(patient => {
        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        const relevanceScore = calculateRelevance(searchQuery, [
          patient.firstName,
          patient.lastName,
          fullName,
          patient.email,
          patient.phone,
          patient.svnr,
        ]);

        results.push({
          id: patient._id.toString(),
          type: 'patient',
          title: fullName,
          subtitle: patient.email || patient.phone || patient.svnr || '',
          description: patient.dateOfBirth 
            ? `Geboren: ${new Date(patient.dateOfBirth).toLocaleDateString('de-DE')}`
            : undefined,
          route: `/patient-organizer/${patient._id}`,
          relevanceScore,
        });
      });
    } catch (error) {
      console.error('Error searching patients:', error);
    }

    // Suche in Terminen
    try {
      const appointmentRegex = new RegExp(searchQuery, 'i');
      const appointments = await Appointment.find({
        $or: [
          { title: appointmentRegex },
          { notes: appointmentRegex },
        ],
      })
        .populate('patient', 'firstName lastName')
        .populate('service', 'name')
        .sort({ startTime: -1 })
        .limit(Math.ceil(searchLimit * 0.2))
        .lean();

      appointments.forEach(appointment => {
        const patient = appointment.patient;
        const patientName = patient 
          ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
          : 'Unbekannt';
        const relevanceScore = calculateRelevance(searchQuery, [
          appointment.title,
          appointment.notes,
          patientName,
        ]);

        results.push({
          id: appointment._id.toString(),
          type: 'appointment',
          title: appointment.title || 'Termin',
          subtitle: `${patientName} - ${new Date(appointment.startTime).toLocaleString('de-DE')}`,
          description: appointment.service?.name || appointment.notes || undefined,
          route: `/appointments?appointmentId=${appointment._id}`,
          relevanceScore,
        });
      });
    } catch (error) {
      console.error('Error searching appointments:', error);
    }

    // Suche in Dokumenten
    try {
      const documentRegex = new RegExp(searchQuery, 'i');
      const documents = await Document.find({
        $or: [
          { title: documentRegex },
          { type: documentRegex },
          { 'content.text': documentRegex },
          { 'patient.name': documentRegex },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(Math.ceil(searchLimit * 0.2))
        .lean();

      documents.forEach(document => {
        const patientName = document.patient?.name || 'Unbekannt';
        const relevanceScore = calculateRelevance(searchQuery, [
          document.title,
          document.type,
          document.content?.text,
          document.patient?.name,
        ]);

        results.push({
          id: document._id.toString(),
          type: 'document',
          title: document.title || document.type || 'Dokument',
          subtitle: patientName,
          description: new Date(document.createdAt).toLocaleDateString('de-DE'),
          route: `/documents/${document._id}`,
          relevanceScore,
        });
      });
    } catch (error) {
      console.error('Error searching documents:', error);
    }

    // Suche in Diagnosen
    try {
      const diagnosisRegex = new RegExp(searchQuery, 'i');
      const diagnoses = await PatientDiagnosis.find({
        $or: [
          { display: diagnosisRegex },
          { code: diagnosisRegex },
          { notes: diagnosisRegex },
        ],
      })
        .populate('patientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(searchLimit * 0.1))
        .lean();

      diagnoses.forEach(diagnosis => {
        const patient = diagnosis.patientId;
        const patientName = patient 
          ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
          : 'Unbekannt';
        const relevanceScore = calculateRelevance(searchQuery, [
          diagnosis.display,
          diagnosis.code,
          diagnosis.notes,
        ]);

        results.push({
          id: diagnosis._id.toString(),
          type: 'diagnosis',
          title: diagnosis.display || 'Diagnose',
          subtitle: `${patientName} - ${diagnosis.code || ''}`,
          description: diagnosis.onsetDate 
            ? new Date(diagnosis.onsetDate).toLocaleDateString('de-DE')
            : undefined,
          route: `/patient-organizer/${diagnosis.patientId}?tab=diagnoses`,
          relevanceScore,
        });
      });
    } catch (error) {
      console.error('Error searching diagnoses:', error);
    }

    // Sortiere nach Relevanz
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Limitiere Ergebnisse
    const limitedResults = results.slice(0, searchLimit);

    res.json({
      success: true,
      results: limitedResults,
      total: results.length,
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      error: 'Fehler bei der Suche',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Berechnet Relevanz-Score für Suchergebnisse
 */
function calculateRelevance(query, fields) {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  fields.forEach(field => {
    if (!field) return;
    
    const lowerField = String(field).toLowerCase();
    
    // Exakte Übereinstimmung
    if (lowerField === lowerQuery) {
      score += 100;
    }
    // Beginnt mit Query
    else if (lowerField.startsWith(lowerQuery)) {
      score += 50;
    }
    // Enthält Query
    else if (lowerField.includes(lowerQuery)) {
      score += 25;
    }
    // Wort-Übereinstimmung
    else {
      const words = lowerField.split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(lowerQuery)) {
          score += 10;
        } else if (word.includes(lowerQuery)) {
          score += 5;
        }
      });
    }
  });

  return score;
}

module.exports = router;
