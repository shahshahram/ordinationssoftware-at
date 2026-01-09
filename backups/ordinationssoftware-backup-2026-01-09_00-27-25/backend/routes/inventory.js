const express = require('express');
const router = express.Router();
const { authorize } = require('../utils/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');

// Beispiel-Modul: Inventar-Management
// Dieses Modul demonstriert, wie neue Module automatisch in das RBAC-System integriert werden

/**
 * GET /api/inventory
 * Alle Inventar-Items abrufen
 */
router.get('/', async (req, res) => {
  try {
    // Mock-Daten für Demo
    const inventory = [
      { id: 1, name: 'Stethoskop', category: 'Medizin', quantity: 5, location: 'Raum 1' },
      { id: 2, name: 'Blutdruckmessgerät', category: 'Medizin', quantity: 3, location: 'Raum 2' },
      { id: 3, name: 'Computer', category: 'IT', quantity: 10, location: 'Büro' },
      { id: 4, name: 'Drucker', category: 'IT', quantity: 2, location: 'Büro' }
    ];
    
    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Inventars:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Inventars',
      error: error.message
    });
  }
});

/**
 * GET /api/inventory/:id
 * Spezifisches Inventar-Item abrufen
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock-Daten für Demo
    const item = {
      id: parseInt(id),
      name: 'Stethoskop',
      category: 'Medizin',
      quantity: 5,
      location: 'Raum 1',
      description: 'Digitales Stethoskop für Herz- und Lungenuntersuchungen',
      lastChecked: new Date().toISOString(),
      status: 'Funktionsfähig'
    };
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Inventar-Items:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Inventar-Items',
      error: error.message
    });
  }
});

/**
 * POST /api/inventory
 * Neues Inventar-Item erstellen
 */
router.post('/', async (req, res) => {
  try {
    const { name, category, quantity, location, description } = req.body;
    
    // Validierung
    if (!name || !category || !quantity || !location) {
      return res.status(400).json({
        success: false,
        message: 'Name, Kategorie, Menge und Standort sind erforderlich'
      });
    }
    
    // Mock-Erstellung
    const newItem = {
      id: Date.now(),
      name,
      category,
      quantity: parseInt(quantity),
      location,
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };
    
    res.status(201).json({
      success: true,
      message: 'Inventar-Item erfolgreich erstellt',
      data: newItem
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Inventar-Items:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Inventar-Items',
      error: error.message
    });
  }
});

/**
 * PUT /api/inventory/:id
 * Inventar-Item aktualisieren
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Mock-Update
    const updatedItem = {
      id: parseInt(id),
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };
    
    res.json({
      success: true,
      message: 'Inventar-Item erfolgreich aktualisiert',
      data: updatedItem
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Inventar-Items:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Inventar-Items',
      error: error.message
    });
  }
});

/**
 * DELETE /api/inventory/:id
 * Inventar-Item löschen
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock-Löschung
    res.json({
      success: true,
      message: 'Inventar-Item erfolgreich gelöscht',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Inventar-Items:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Inventar-Items',
      error: error.message
    });
  }
});

/**
 * GET /api/inventory/categories
 * Alle Kategorien abrufen
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 1, name: 'Medizin', description: 'Medizinische Geräte und Instrumente' },
      { id: 2, name: 'IT', description: 'Computer und IT-Ausstattung' },
      { id: 3, name: 'Möbel', description: 'Büromöbel und Einrichtung' },
      { id: 4, name: 'Verbrauchsmaterial', description: 'Verbrauchsmaterialien und Zubehör' }
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kategorien:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kategorien',
      error: error.message
    });
  }
});

/**
 * POST /api/inventory/check
 * Inventar-Check durchführen
 */
router.post('/check', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items-Array ist erforderlich'
      });
    }
    
    // Mock-Check
    const checkResult = {
      checkId: Date.now(),
      checkedAt: new Date().toISOString(),
      checkedBy: req.user.id,
      totalItems: items.length,
      foundItems: items.length - 1, // Mock: ein Item fehlt
      missingItems: 1,
      status: 'Abgeschlossen'
    };
    
    res.json({
      success: true,
      message: 'Inventar-Check erfolgreich durchgeführt',
      data: checkResult
    });
  } catch (error) {
    console.error('Fehler beim Inventar-Check:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Inventar-Check',
      error: error.message
    });
  }
});

module.exports = router;
