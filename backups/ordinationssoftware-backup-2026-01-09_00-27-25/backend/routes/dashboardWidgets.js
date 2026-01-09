const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DashboardWidget = require('../models/DashboardWidget');

// @route   GET /api/dashboard-widgets
// @desc    Get all widgets for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const widgets = await DashboardWidget.find({ userId: req.user._id })
      .sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      data: widgets
    });
  } catch (error) {
    console.error('Error fetching dashboard widgets:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Widgets'
    });
  }
});

// @route   POST /api/dashboard-widgets
// @desc    Create or update a widget
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      widgetId,
      widgetType,
      title,
      position,
      config,
      isVisible,
      order
    } = req.body;

    if (!widgetId || !widgetType || !title) {
      return res.status(400).json({
        success: false,
        message: 'widgetId, widgetType und title sind erforderlich'
      });
    }

    // Prüfe ob Widget bereits existiert
    let widget = await DashboardWidget.findOne({
      userId: req.user._id,
      widgetId
    });

    if (widget) {
      // Update existing widget
      widget.widgetType = widgetType;
      widget.title = title;
      if (position) widget.position = position;
      if (config !== undefined) widget.config = config;
      if (isVisible !== undefined) widget.isVisible = isVisible;
      if (order !== undefined) widget.order = order;
    } else {
      // Create new widget
      widget = new DashboardWidget({
        userId: req.user._id,
        widgetId,
        widgetType,
        title,
        position: position || { x: 0, y: 0, w: 4, h: 3 },
        config: config || {},
        isVisible: isVisible !== undefined ? isVisible : true,
        order: order || 0
      });
    }

    await widget.save();

    res.json({
      success: true,
      data: widget,
      message: 'Widget erfolgreich gespeichert'
    });
  } catch (error) {
    console.error('Error saving dashboard widget:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern des Widgets',
      error: error.message
    });
  }
});

// @route   PUT /api/dashboard-widgets/:id
// @desc    Update a widget
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget nicht gefunden'
      });
    }

    const { title, position, config, isVisible, order } = req.body;

    if (title !== undefined) widget.title = title;
    if (position !== undefined) widget.position = position;
    if (config !== undefined) widget.config = config;
    if (isVisible !== undefined) widget.isVisible = isVisible;
    if (order !== undefined) widget.order = order;

    await widget.save();

    res.json({
      success: true,
      data: widget,
      message: 'Widget erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating dashboard widget:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Widgets',
      error: error.message
    });
  }
});

// @route   DELETE /api/dashboard-widgets/:id
// @desc    Delete a widget
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget nicht gefunden'
      });
    }

    await widget.deleteOne();

    res.json({
      success: true,
      message: 'Widget erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting dashboard widget:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Widgets',
      error: error.message
    });
  }
});

// @route   POST /api/dashboard-widgets/reorder
// @desc    Reorder widgets (update positions and order)
// @access  Private
router.post('/reorder', auth, async (req, res) => {
  try {
    const { widgets } = req.body; // Array of { id, position, order }

    if (!Array.isArray(widgets)) {
      return res.status(400).json({
        success: false,
        message: 'widgets muss ein Array sein'
      });
    }

    const updatePromises = widgets.map(({ id, position, order }) => {
      return DashboardWidget.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { position, order },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Widget-Reihenfolge erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error reordering dashboard widgets:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Widget-Reihenfolge',
      error: error.message
    });
  }
});

module.exports = router;



