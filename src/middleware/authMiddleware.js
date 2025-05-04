// src/middleware/authMiddleware.js
const environment = require('../config/environment');

const authMiddleware = {
  isSupervisor: (userId) => {
    return environment.supervisors.authorized.includes(userId);
  }
};

module.exports = authMiddleware;