const express = require('express');
const router = express.Router();
const chatbotService = require('../services/chatbotService');
const authenticate = require('../middleware/auth');

/**
 * POST /api/chatbot/chat
 * Sendet eine Nachricht an den Chatbot und erhält eine Antwort
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, context, history } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Nachricht ist erforderlich und muss ein nicht-leerer String sein' 
      });
    }

    // Kontext erweitern mit Benutzerinformationen
    const enhancedContext = {
      ...context,
      userId: userId,
      userRole: req.user.role,
      timestamp: new Date().toISOString(),
    };

    // Chatbot-Service aufrufen
    let response;
    try {
      response = await chatbotService.getResponse(
        message,
        enhancedContext,
        history || []
      );
    } catch (serviceError) {
      console.error('Chatbot service error:', serviceError);
      // Auch bei Service-Fehler eine Antwort zurückgeben
      response = 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder nutzen Sie die Hilfe-Dialoge auf den einzelnen Seiten (❓ Symbol).';
    }

    // Sicherstellen, dass response ein String ist
    if (typeof response !== 'string') {
      response = 'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut.';
    }

    res.json({
      response: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chatbot route error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Verarbeiten der Chatbot-Anfrage',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chatbot/status
 * Prüft den Status des Chatbots
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await chatbotService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Chatbot status error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Abrufen des Chatbot-Status' 
    });
  }
});

/**
 * GET /api/chatbot/features
 * Gibt alle verfügbaren Features zurück
 */
router.get('/features', authenticate, async (req, res) => {
  try {
    const knowledgeBase = require('../services/chatbotKnowledgeBase');
    const featureDiscovery = require('../services/chatbotFeatureDiscovery');
    
    // Aktualisiere Features
    await knowledgeBase.discoverModules();
    
    const allFeatures = knowledgeBase.getKnowledgeBase().features;
    const categorized = featureDiscovery.categorizeFeatures(allFeatures);
    
    res.json({
      success: true,
      totalFeatures: allFeatures.length,
      categories: Object.keys(categorized).map(category => ({
        name: category,
        count: categorized[category].length,
        features: categorized[category].map(f => ({
          category: f.category,
          description: f.description,
          keywords: f.keywords.slice(0, 5) // Nur erste 5 Keywords
        }))
      })),
      allFeatures: allFeatures.map(f => ({
        category: f.category,
        description: f.description,
        keywords: f.keywords.slice(0, 5)
      }))
    });
  } catch (error) {
    console.error('Chatbot features error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Abrufen der Features',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
