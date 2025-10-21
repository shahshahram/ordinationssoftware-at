const checkPermission = (permission) => {
  return (req, res, next) => {
    // Admin hat alle Berechtigungen
    if (req.user.role === 'admin') {
      return next();
    }

    // Prüfen ob Benutzer die erforderliche Berechtigung hat
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    next();
  };
};

module.exports = checkPermission;
