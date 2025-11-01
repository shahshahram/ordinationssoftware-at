const express = require('express');
const router = express.Router();
const Icd10Catalog = require('../models/Icd10Catalog');
const DiagnosisUsageStats = require('../models/DiagnosisUsageStats');
const auth = require('../middleware/auth');
const ICD10Cache = require('../utils/icd10Cache');

// Optional Auth Middleware
const optionalAuth = async (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.user?.id;
      const user = await User.findById(userId).select('-password');
      if (user) req.user = user;
    } catch (err) {
      // Auth optional, weiter ohne User
    }
  }
  next();
};

// GET /api/icd10/search - ICD-10 Code-Suche
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { 
      q = '', 
      year = new Date().getFullYear(), 
      billableOnly = false, 
      chapters = '', 
      limit = 20, 
      offset = 0 
    } = req.query;

    // Parse chapters parameter
    const chapterArray = chapters ? chapters.split(',').filter(Boolean) : [];
    
    const options = {
      year: parseInt(year),
      billableOnly: billableOnly === 'true',
      chapters: chapterArray,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // Prüfe Cache zuerst
    let results = ICD10Cache.getSearchResult(q, options.year, options);
    
    if (!results) {
      results = await Icd10Catalog.search(q, options);
      ICD10Cache.setSearchResult(q, options.year, options, results);
    }

    // Audit-Log (optional, nur wenn User eingeloggt ist)
    if (req.user) {
      try {
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
          userId: req.user._id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: 'icd10.search',
          description: 'ICD-10 Code-Suche durchgeführt',
          details: { query: q, year, billableOnly, chapters: chapterArray }
        });
      } catch (auditError) {
        // Audit-Log ist optional
        console.error('Audit-Log Fehler:', auditError);
      }
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: results.length
      }
    });
  } catch (error) {
    console.error('ICD-10 search error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der ICD-10 Suche'
    });
  }
});

// GET /api/icd10/top - TOP-10 / Häufig verwendete Codes
router.get('/top', optionalAuth, async (req, res) => {
  try {
    const { 
      scope = 'user', 
      scopeId = '', 
      year = new Date().getFullYear(), 
      limit = 10,
      timeRange = null
    } = req.query;

    let actualScopeId = scopeId;
    
    // Bestimme scopeId basierend auf scope
    if (scope === 'user') {
      actualScopeId = req.user?._id?.toString() || 'anonymous';
    } else if (scope === 'location' && req.user?.locationId) {
      actualScopeId = req.user.locationId.toString();
    } else if (scope === 'global') {
      actualScopeId = null;
    }

    const options = {
      catalogYear: parseInt(year),
      limit: parseInt(limit),
      timeRange
    };

    const topCodes = await DiagnosisUsageStats.getTopCodes(scope, actualScopeId, options);

    // Enrich with full ICD-10 data
    const enrichedTopCodes = await Promise.all(topCodes.map(async (stat) => {
      const fullCode = await Icd10Catalog.findOne({ 
        code: stat.code, 
        releaseYear: stat.catalogYear 
      });
      return {
        ...stat.toObject(),
        title: fullCode?.title || stat.code,
        longTitle: fullCode?.longTitle || fullCode?.title || stat.code,
        isBillable: fullCode?.isBillable || true,
        chapter: fullCode?.chapter || '',
        synonyms: fullCode?.synonyms || []
      };
    }));

    res.json({
      success: true,
      data: enrichedTopCodes
    });
  } catch (error) {
    console.error('ICD-10 top codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der häufigsten Codes'
    });
  }
});

// GET /api/icd10/recent - Kürzlich verwendete Codes
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const { 
      scope = 'user', 
      scopeId = '', 
      year = new Date().getFullYear(), 
      limit = 10 
    } = req.query;

    let actualScopeId = scopeId;
    
    if (scope === 'user') {
      actualScopeId = req.user?._id?.toString() || 'anonymous';
    } else if (scope === 'location' && req.user?.locationId) {
      actualScopeId = req.user.locationId.toString();
    } else if (scope === 'global') {
      actualScopeId = null;
    }

    const options = {
      catalogYear: parseInt(year),
      limit: parseInt(limit)
    };

    const recentCodes = await DiagnosisUsageStats.getRecentlyUsed(scope, actualScopeId, options);

    // Enrich with full ICD-10 data
    const enrichedRecentCodes = await Promise.all(recentCodes.map(async (stat) => {
      const fullCode = await Icd10Catalog.findOne({ 
        code: stat.code, 
        releaseYear: stat.catalogYear 
      });
      return {
        ...stat.toObject(),
        title: fullCode?.title || stat.code,
        longTitle: fullCode?.longTitle || fullCode?.title || stat.code,
        isBillable: fullCode?.isBillable || true,
        chapter: fullCode?.chapter || '',
        synonyms: fullCode?.synonyms || []
      };
    }));

    res.json({
      success: true,
      data: enrichedRecentCodes
    });
  } catch (error) {
    console.error('ICD-10 recent codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der kürzlich verwendeten Codes'
    });
  }
});

// GET /api/icd10/code/:code - Einzelnen Code abrufen
router.get('/code/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const icdCode = await Icd10Catalog.findByCode(code, parseInt(year));

    if (!icdCode) {
      return res.status(404).json({
        success: false,
        message: 'ICD-10 Code nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: icdCode
    });
  } catch (error) {
    console.error('ICD-10 code fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des ICD-10 Codes'
    });
  }
});

// GET /api/icd10/chapters - Verfügbare Kapitel
router.get('/chapters', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const chapters = await Icd10Catalog.aggregate([
      { $match: { releaseYear: parseInt(year), isActive: true } },
      { $group: { _id: '$chapter', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: chapters
    });
  } catch (error) {
    console.error('ICD-10 chapters error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kapitel'
    });
  }
});

// POST /api/icd10/usage - Nutzungsstatistik aktualisieren
router.post('/usage', optionalAuth, async (req, res) => {
  try {
    const { code, catalogYear, context = null } = req.body;
    const { scope = 'user', scopeId = '' } = req.query;

    let actualScopeId = scopeId;
    
    if (scope === 'user') {
      actualScopeId = req.user?._id?.toString() || 'anonymous';
    } else if (scope === 'location' && req.user?.locationId) {
      actualScopeId = req.user.locationId.toString();
    } else if (scope === 'global') {
      actualScopeId = null;
    }

    await DiagnosisUsageStats.incrementUsage(scope, actualScopeId, code, parseInt(catalogYear), context);

    res.json({
      success: true,
      message: 'Nutzungsstatistik aktualisiert'
    });
  } catch (error) {
    console.error('ICD-10 usage update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Nutzungsstatistik'
    });
  }
});

// GET /api/icd10/analytics - Nutzungsanalysen
router.get('/analytics', auth, async (req, res) => {
  try {
    const { 
      scope = 'user', 
      scopeId = '', 
      year = new Date().getFullYear(),
      timeRange = 'month'
    } = req.query;

    let actualScopeId = scopeId;
    
    if (scope === 'user') {
      actualScopeId = req.user._id.toString();
    } else if (scope === 'location' && req.user.locationId) {
      actualScopeId = req.user.locationId.toString();
    } else if (scope === 'global') {
      actualScopeId = null;
    }

    const options = {
      catalogYear: parseInt(year),
      timeRange
    };

    const analytics = await DiagnosisUsageStats.getUsageAnalytics(scope, actualScopeId, options);

    res.json({
      success: true,
      data: analytics[0] || {
        totalCodes: 0,
        totalUsage: 0,
        averageUsage: 0,
        mostUsedCode: null,
        mostUsedCount: 0
      }
    });
  } catch (error) {
    console.error('ICD-10 analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Analysen'
    });
  }
});

// Hierarchie-Endpunkte

// GET /api/icd10/hierarchy - Vollständige Hierarchie
router.get('/hierarchy', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const parsedYear = parseInt(year);

    console.log('Loading hierarchy for year:', parsedYear);

    // Einfache Implementierung: Lade alle Codes und gruppiere nach Kapitel
    const allCodes = await Icd10Catalog.find({
      releaseYear: parsedYear,
      isActive: true
    })
    .lean()
    .sort({ code: 1 })
    .limit(1000); // Begrenze für Performance

    console.log('Found codes:', allCodes.length);

    // Gruppiere nach Kapitel
    const chapterMap = new Map();
    
    allCodes.forEach(code => {
      const chapter = code.chapter || code.code.charAt(0);
      if (!chapterMap.has(chapter)) {
        chapterMap.set(chapter, []);
      }
      chapterMap.get(chapter).push({
        _id: code._id,
        code: code.code,
        title: code.title,
        longTitle: code.longTitle,
        isBillable: code.isBillable,
        parentCode: code.parentCode,
        synonyms: code.synonyms,
        level: code.code.split('.').length - 1
      });
    });

    // Konvertiere zu Array
    const hierarchy = Array.from(chapterMap.entries())
      .map(([chapter, codes]) => ({
        _id: chapter,
        codes: codes
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

    console.log('Hierarchy chapters:', hierarchy.length);

    // Cache setzen
    ICD10Cache.setHierarchy(parsedYear, hierarchy);

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.chapters',
        description: 'ICD-10 Hierarchie abgerufen',
        details: { year: parsedYear, chapterCount: hierarchy.length }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('ICD-10 hierarchy error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Hierarchie: ' + error.message
    });
  }
});

// GET /api/icd10/children/:parentCode - Child-Codes
router.get('/children/:parentCode', auth, async (req, res) => {
  try {
    const { parentCode } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const parsedYear = parseInt(year);

    const children = await Icd10Catalog.getChildren(parentCode, parsedYear);

    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('ICD-10 children error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Child-Codes'
    });
  }
});

// GET /api/icd10/parent/:code - Parent-Code
router.get('/parent/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const parsedYear = parseInt(year);

    const parent = await Icd10Catalog.getParent(code, parsedYear);

    res.json({
      success: true,
      data: parent
    });
  } catch (error) {
    console.error('ICD-10 parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Parent-Codes'
    });
  }
});

// GET /api/icd10/siblings/:code - Sibling-Codes
router.get('/siblings/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const parsedYear = parseInt(year);

    const siblings = await Icd10Catalog.getSiblings(code, parsedYear);

    res.json({
      success: true,
      data: siblings
    });
  } catch (error) {
    console.error('ICD-10 siblings error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Sibling-Codes'
    });
  }
});

// GET /api/icd10/related/:code - Verwandte Codes
router.get('/related/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { year = new Date().getFullYear(), limit = 10 } = req.query;
    const parsedYear = parseInt(year);
    const parsedLimit = parseInt(limit);

    const related = await Icd10Catalog.getRelatedCodes(code, parsedYear, parsedLimit);

    res.json({
      success: true,
      data: related
    });
  } catch (error) {
    console.error('ICD-10 related error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der verwandten Codes'
    });
  }
});

// POST /api/icd10/validate - Erweiterte Code-Validierung
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, options = {} } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code ist erforderlich'
      });
    }

    const validationResult = Icd10Catalog.validateCode(code, options);

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.validate',
        description: 'ICD-10 Code validiert',
        details: { 
          code, 
          isValid: validationResult.isValid,
          confidence: validationResult.confidence,
          options 
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('ICD-10 validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Code-Validierung: ' + error.message
    });
  }
});

// POST /api/icd10/autocorrect - Auto-Korrektur
router.post('/autocorrect', auth, async (req, res) => {
  try {
    const { code, options = {} } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code ist erforderlich'
      });
    }

    const validationResult = Icd10Catalog.validateCode(code, { ...options, suggestCorrections: true });
    const correctedCode = validationResult.isValid ? validationResult.correctedCode : 
                         (validationResult.suggestions && validationResult.suggestions.length > 0 ? 
                          validationResult.suggestions[0] : code);

    // Audit-Log (optional - nur wenn AuditLog verfügbar)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'icd10.autocorrect',
        description: 'ICD-10 Code auto-korrigiert',
        details: { 
          originalCode: code,
          correctedCode,
          confidence: validationResult.confidence,
          options 
        }
      });
    } catch (auditError) {
      console.warn('AuditLog error (non-critical):', auditError.message);
    }

    res.json({
      success: true,
      data: {
        originalCode: code,
        correctedCode,
        confidence: validationResult.confidence,
        suggestions: validationResult.suggestions || []
      }
    });
  } catch (error) {
    console.error('ICD-10 autocorrect error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Auto-Korrektur: ' + error.message
    });
  }
});

// GET /api/icd10/breadcrumb/:code - Breadcrumb-Navigation
router.get('/breadcrumb/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const parsedYear = parseInt(year);

    const breadcrumb = await Icd10Catalog.getBreadcrumb(code, parsedYear);

    res.json({
      success: true,
      data: breadcrumb
    });
  } catch (error) {
    console.error('ICD-10 breadcrumb error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Breadcrumb-Navigation'
    });
  }
});

module.exports = router;
