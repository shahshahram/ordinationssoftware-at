/**
 * API Routes für Tariff-Konfiguration
 * Stellt Daten aus federal_state_config.json bereit
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const federalStateConfig = require('../utils/federal-state-config');
const Location = require('../models/Location');

/**
 * GET /api/tariff-config/state/:federalState
 * Gibt die vollständige Konfiguration für ein Bundesland zurück
 */
router.get('/state/:federalState', auth, async (req, res) => {
  try {
    const { federalState } = req.params;
    const config = federalStateConfig.loadConfig();
    const stateKey = federalState.toLowerCase().trim();
    const stateConfig = config.pointValues[stateKey];

    if (!stateConfig) {
      return res.status(404).json({
        success: false,
        message: `Bundesland '${federalState}' nicht gefunden`
      });
    }

    res.json({
      success: true,
      data: {
        federalState: stateKey,
        code: stateConfig.code,
        name: stateConfig.name,
        default: stateConfig.default,
        labor: stateConfig.labor,
        specialty: stateConfig.specialty,
        positionSpecific: stateConfig.positionSpecific,
        validFrom: config.validFrom || null
      }
    });
  } catch (error) {
    console.error('[Tariff Config] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Konfiguration',
      error: error.message
    });
  }
});

/**
 * GET /api/tariff-config/current
 * Gibt die Konfiguration für das aktuelle Bundesland des Users zurück
 */
router.get('/current', auth, async (req, res) => {
  try {
    const Location = require('../models/Location');
    let federalState = null;
    let doctorSpecialty = null;

    // 1. Versuche Bundesland aus User's selectedLocation
    if (req.user && req.user.profile?.preferences?.calendarSettings?.selectedLocation) {
      const selectedLocationId = req.user.profile.preferences.calendarSettings.selectedLocation;
      if (selectedLocationId && selectedLocationId !== 'all') {
        const location = await Location.findById(selectedLocationId).select('federalState owner.specialty');
        if (location && location.federalState) {
          federalState = location.federalState;
          doctorSpecialty = location.owner?.specialty || null;
        }
      }
    }

    // 2. Fallback: Erste aktive Location
    if (!federalState) {
      const firstActiveLocation = await Location.findOne({
        is_active: true,
        federalState: { $exists: true, $ne: null }
      }).select('federalState owner.specialty').sort({ createdAt: 1 });
      
      if (firstActiveLocation && firstActiveLocation.federalState) {
        federalState = firstActiveLocation.federalState;
        doctorSpecialty = firstActiveLocation.owner?.specialty || null;
      }
    }

    // 3. Letzter Fallback: OÖ
    if (!federalState) {
      federalState = 'oberoesterreich';
    }

    const config = federalStateConfig.loadConfig();
    const stateKey = federalState.toLowerCase().trim();
    const stateConfig = config.pointValues[stateKey];

    if (!stateConfig) {
      return res.status(404).json({
        success: false,
        message: `Bundesland '${federalState}' nicht gefunden`
      });
    }

    res.json({
      success: true,
      data: {
        federalState: stateKey,
        code: stateConfig.code,
        name: stateConfig.name,
        default: stateConfig.default,
        labor: stateConfig.labor,
        specialty: stateConfig.specialty,
        positionSpecific: stateConfig.positionSpecific,
        doctorSpecialty: doctorSpecialty,
        validFrom: config.validFrom || null
      }
    });
  } catch (error) {
    console.error('[Tariff Config] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Konfiguration',
      error: error.message
    });
  }
});

/**
 * POST /api/tariff-config/calculate
 * Berechnet den Preis basierend auf Positionsnummer, Punkten, etc.
 */
router.post('/calculate', auth, async (req, res) => {
  try {
    const { positionNumber, points, khoCode, specialty, billingGroup, federalState, doctorSpecialty, date } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Punkte müssen angegeben werden'
      });
    }

    // Bestimme Bundesland
    let state = federalState;
    if (!state) {
      const Location = require('../models/Location');
      if (req.user && req.user.profile?.preferences?.calendarSettings?.selectedLocation) {
        const selectedLocationId = req.user.profile.preferences.calendarSettings.selectedLocation;
        if (selectedLocationId && selectedLocationId !== 'all') {
          const location = await Location.findById(selectedLocationId).select('federalState owner.specialty');
          if (location && location.federalState) {
            state = location.federalState;
          }
        }
      }
      
      if (!state) {
        const firstActiveLocation = await Location.findOne({
          is_active: true,
          federalState: { $exists: true, $ne: null }
        }).select('federalState').sort({ createdAt: 1 });
        if (firstActiveLocation && firstActiveLocation.federalState) {
          state = firstActiveLocation.federalState;
        }
      }
      
      if (!state) {
        state = 'oberoesterreich';
      }
    }

    // Berechne Punktwert mit Prioritätssystem (date = Rechnungs-/Behandlungsdatum für Tarif-Jahr)
    const pointValue = federalStateConfig.getPointValue(state, {
      positionNumber: positionNumber,
      khoCode: khoCode,
      doctorSpecialty: doctorSpecialty,
      serviceSpecialty: specialty,
      billingGroup: billingGroup,
      date: date || undefined
    });

    if (!pointValue) {
      return res.status(400).json({
        success: false,
        message: 'Punktwert konnte nicht bestimmt werden'
      });
    }

    // Berechne Preis
    const price = Math.round((points * pointValue) * 100) / 100;
    const refund80 = Math.round((price * 0.8) * 100) / 100;

    res.json({
      success: true,
      data: {
        points: points,
        pointValue: pointValue,
        price: price,
        refund80: refund80,
        federalState: state
      }
    });
  } catch (error) {
    console.error('[Tariff Config] Berechnungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Berechnung',
      error: error.message
    });
  }
});

/**
 * GET /api/tariff-config/all
 * Gibt alle Bundesländer mit ihren Default-Werten zurück
 */
router.get('/all', auth, async (req, res) => {
  try {
    const allValues = federalStateConfig.getAllPointValues();
    const config = federalStateConfig.loadConfig();
    
    const result = Object.keys(config.pointValues).map(stateKey => ({
      federalState: stateKey,
      code: config.pointValues[stateKey].code,
      name: config.pointValues[stateKey].name,
      default: config.pointValues[stateKey].default
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Tariff Config] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Konfiguration',
      error: error.message
    });
  }
});

module.exports = router;
