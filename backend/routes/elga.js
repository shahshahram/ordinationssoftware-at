const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, (req, res) => {
  res.json({ success: true, message: 'ELGA endpoint - Coming soon', data: [] });
});

module.exports = router;
