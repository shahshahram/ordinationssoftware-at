const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unzureichende Berechtigung für diese Aktion'
      });
    }

    next();
  };
};

module.exports = {
  requireRole
};
