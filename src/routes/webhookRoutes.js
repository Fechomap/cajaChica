// src/routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const bot = require('../config/bot');
const environment = require('../config/environment');

// Ruta de salud
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ruta del webhook
router.post(`/bot${environment.telegram.token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

module.exports = router;