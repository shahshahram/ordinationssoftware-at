const mongoose = require('mongoose');

/**
 * Archivierung von ELDA-Übermittlungen (Honorarnoten-Meldung)
 * Speichert raw_request_xml (Honorarnoten-XML) und raw_response_soap pro Übermittlung
 */
const EldaSubmissionSchema = new mongoose.Schema({
  performanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Performance',
    required: true,
    index: true
  },
  rawRequestXml: {
    type: String,
    default: null
  },
  rawResponseSoap: {
    type: String,
    default: null
  },
  statusCode: {
    type: String,
    trim: true,
    default: null
  },
  protokollnummer: {
    type: String,
    trim: true,
    default: null
  },
  errorText: {
    type: String,
    trim: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: false,
  collection: 'eldasubmissions'
});

// performanceId hat bereits index: true im Schema
EldaSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EldaSubmission', EldaSubmissionSchema);
