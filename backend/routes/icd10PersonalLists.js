const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Icd10PersonalList = require('../models/Icd10PersonalList');
const Icd10Catalog = require('../models/Icd10Catalog');

// GET /api/icd10/personal-lists - Alle persönlichen Listen des Benutzers
router.get('/', auth, async (req, res) => {
  try {
    const { type, includeShared = false } = req.query;
    
    const lists = await Icd10PersonalList.findByUser(req.user._id, {
      type: type || null,
      isActive: true,
      includeShared: includeShared === 'true'
    });

    res.json({
      success: true,
      data: lists
    });
  } catch (error) {
    console.error('Error fetching personal lists:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der persönlichen Listen: ' + error.message
    });
  }
});

// GET /api/icd10/personal-lists/favorites - Favoriten-Liste
router.get('/favorites', auth, async (req, res) => {
  try {
    const favorites = await Icd10PersonalList.getFavorites(req.user._id);
    
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Favoriten: ' + error.message
    });
  }
});

// POST /api/icd10/personal-lists - Neue persönliche Liste erstellen
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'custom',
      specialty,
      isPublic = false,
      settings = {}
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name der Liste ist erforderlich'
      });
    }

    // Check if list name already exists for this user
    const existingList = await Icd10PersonalList.findOne({
      userId: req.user._id,
      name: name.trim(),
      isActive: true
    });

    if (existingList) {
      return res.status(400).json({
        success: false,
        message: 'Eine Liste mit diesem Namen existiert bereits'
      });
    }

    const newList = new Icd10PersonalList({
      userId: req.user._id,
      name: name.trim(),
      description: description?.trim(),
      type,
      specialty: specialty?.trim(),
      isPublic,
      settings: {
        autoSort: true,
        sortBy: 'code',
        groupBy: 'none',
        showNotes: false,
        showTags: true,
        ...settings
      },
      codes: []
    });

    await newList.save();

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.personal-list.create',
        description: 'ICD-10 persönliche Liste erstellt',
        details: { 
          listId: newList._id,
          name: newList.name,
          type: newList.type
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.status(201).json({
      success: true,
      data: newList,
      message: 'Persönliche Liste erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating personal list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Liste: ' + error.message
    });
  }
});

// GET /api/icd10/personal-lists/:id - Einzelne Liste abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const list = await Icd10PersonalList.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { 'sharing.isShared': true, 'sharing.sharedWith.userId': req.user._id }
      ],
      isActive: true
    })
    .populate('userId', 'email firstName lastName')
    .populate('codes.addedBy', 'email firstName lastName');

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Liste nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    console.error('Error fetching personal list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Liste: ' + error.message
    });
  }
});

// PUT /api/icd10/personal-lists/:id - Liste aktualisieren
router.put('/:id', auth, async (req, res) => {
  try {
    const list = await Icd10PersonalList.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Liste nicht gefunden'
      });
    }

    const {
      name,
      description,
      specialty,
      isPublic,
      settings
    } = req.body;

    if (name && name.trim().length > 0) {
      // Check if new name conflicts with existing lists
      const existingList = await Icd10PersonalList.findOne({
        userId: req.user._id,
        name: name.trim(),
        _id: { $ne: req.params.id },
        isActive: true
      });

      if (existingList) {
        return res.status(400).json({
          success: false,
          message: 'Eine Liste mit diesem Namen existiert bereits'
        });
      }

      list.name = name.trim();
    }

    if (description !== undefined) {
      list.description = description?.trim();
    }

    if (specialty !== undefined) {
      list.specialty = specialty?.trim();
    }

    if (isPublic !== undefined) {
      list.isPublic = isPublic;
    }

    if (settings) {
      list.settings = { ...list.settings, ...settings };
    }

    await list.save();

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.personal-list.update',
        description: 'ICD-10 persönliche Liste aktualisiert',
        details: { 
          listId: list._id,
          name: list.name
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      data: list,
      message: 'Liste erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating personal list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Liste: ' + error.message
    });
  }
});

// DELETE /api/icd10/personal-lists/:id - Liste löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    const list = await Icd10PersonalList.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Liste nicht gefunden'
      });
    }

    // Soft delete
    list.isActive = false;
    await list.save();

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.personal-list.delete',
        description: 'ICD-10 persönliche Liste gelöscht',
        details: { 
          listId: list._id,
          name: list.name
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      message: 'Liste erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting personal list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Liste: ' + error.message
    });
  }
});

// POST /api/icd10/personal-lists/:id/codes - Code zur Liste hinzufügen
router.post('/:id/codes', auth, async (req, res) => {
  try {
    const list = await Icd10PersonalList.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { 'sharing.sharedWith': { $elemMatch: { userId: req.user._id, permission: { $in: ['write', 'admin'] } } } }
      ],
      isActive: true
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Liste nicht gefunden oder keine Berechtigung'
      });
    }

    const {
      code,
      title,
      longTitle,
      chapter,
      isBillable = true,
      notes,
      tags = [],
      sortOrder = 0
    } = req.body;

    if (!code || !title) {
      return res.status(400).json({
        success: false,
        message: 'Code und Titel sind erforderlich'
      });
    }

    // Check if code already exists in list
    const existingCode = list.codes.find(c => c.code === code);
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Code bereits in der Liste vorhanden'
      });
    }

    // Verify code exists in ICD-10 catalog
    const catalogEntry = await Icd10Catalog.findOne({
      code: code,
      isActive: true
    });

    if (!catalogEntry) {
      return res.status(400).json({
        success: false,
        message: 'ICD-10 Code nicht im Katalog gefunden'
      });
    }

    await list.addCode({
      code,
      title,
      longTitle: longTitle || catalogEntry.longTitle,
      chapter: chapter || catalogEntry.chapter,
      isBillable,
      notes,
      tags,
      sortOrder
    }, req.user._id);

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.personal-list.add-code',
        description: 'ICD-10 Code zur persönlichen Liste hinzugefügt',
        details: { 
          listId: list._id,
          code: code,
          title: title
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      data: list,
      message: 'Code erfolgreich zur Liste hinzugefügt'
    });
  } catch (error) {
    console.error('Error adding code to list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen des Codes: ' + error.message
    });
  }
});

// DELETE /api/icd10/personal-lists/:id/codes/:code - Code aus Liste entfernen
router.delete('/:id/codes/:code', auth, async (req, res) => {
  try {
    const list = await Icd10PersonalList.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { 'sharing.sharedWith': { $elemMatch: { userId: req.user._id, permission: { $in: ['write', 'admin'] } } } }
      ],
      isActive: true
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Liste nicht gefunden oder keine Berechtigung'
      });
    }

    await list.removeCode(req.params.code);

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.personal-list.remove-code',
        description: 'ICD-10 Code aus persönlicher Liste entfernt',
        details: { 
          listId: list._id,
          code: req.params.code
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      data: list,
      message: 'Code erfolgreich aus der Liste entfernt'
    });
  } catch (error) {
    console.error('Error removing code from list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen des Codes: ' + error.message
    });
  }
});

// POST /api/icd10/personal-lists/favorites/add - Code zu Favoriten hinzufügen
router.post('/favorites/add', auth, async (req, res) => {
  try {
    const { code, title, longTitle, chapter, isBillable = true, notes, tags = [] } = req.body;

    if (!code || !title) {
      return res.status(400).json({
        success: false,
        message: 'Code und Titel sind erforderlich'
      });
    }

    const favorites = await Icd10PersonalList.addToFavorites(req.user._id, {
      code,
      title,
      longTitle,
      chapter,
      isBillable,
      notes,
      tags
    });

    res.json({
      success: true,
      data: favorites,
      message: 'Code zu Favoriten hinzugefügt'
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen zu Favoriten: ' + error.message
    });
  }
});

// DELETE /api/icd10/personal-lists/favorites/:code - Code aus Favoriten entfernen
router.delete('/favorites/:code', auth, async (req, res) => {
  try {
    const favorites = await Icd10PersonalList.removeFromFavorites(req.user._id, req.params.code);

    res.json({
      success: true,
      data: favorites,
      message: 'Code aus Favoriten entfernt'
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen aus Favoriten: ' + error.message
    });
  }
});

// GET /api/icd10/personal-lists/most-used - Meist verwendete Codes
router.get('/most-used', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const mostUsed = await Icd10PersonalList.getMostUsed(req.user._id, parseInt(limit));

    res.json({
      success: true,
      data: mostUsed
    });
  } catch (error) {
    console.error('Error fetching most used codes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der meist verwendeten Codes: ' + error.message
    });
  }
});

// GET /api/icd10/personal-lists/search - Suche in persönlichen Listen
router.get('/search', auth, async (req, res) => {
  try {
    const { q, types = 'favorites,custom', limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Suchbegriff muss mindestens 2 Zeichen lang sein'
      });
    }

    const listTypes = types.split(',').filter(t => t.trim().length > 0);
    const results = await Icd10PersonalList.searchInLists(req.user._id, q.trim(), {
      listTypes,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching personal lists:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche: ' + error.message
    });
  }
});

module.exports = router;
