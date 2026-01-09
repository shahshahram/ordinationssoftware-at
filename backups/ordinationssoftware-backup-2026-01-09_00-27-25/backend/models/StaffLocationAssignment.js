const mongoose = require('mongoose');

const staffLocationAssignmentSchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile',
    required: true
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  allowed_services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog'
  }]
}, {
  timestamps: true
});

// Indizes
staffLocationAssignmentSchema.index({ staff_id: 1 });
staffLocationAssignmentSchema.index({ location_id: 1 });
staffLocationAssignmentSchema.index({ staff_id: 1, location_id: 1 }, { unique: true });
staffLocationAssignmentSchema.index({ is_primary: 1 });

// Validierung: Nur ein primärer Standort pro Mitarbeiter
staffLocationAssignmentSchema.pre('save', async function(next) {
  if (this.is_primary) {
    const existingPrimary = await this.constructor.findOne({
      staff_id: this.staff_id,
      is_primary: true,
      _id: { $ne: this._id }
    });
    
    if (existingPrimary) {
      return next(new Error('Ein Mitarbeiter kann nur einen primären Standort haben'));
    }
  }
  next();
});

module.exports = mongoose.model('StaffLocationAssignment', staffLocationAssignmentSchema);
