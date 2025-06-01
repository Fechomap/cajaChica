// src/config/environment.js
require('dotenv').config();
process.env.TZ = 'America/Mexico_City';

const environment = {
  telegram: {
    token: process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN
  },
  database: {
    url: process.env.DATABASE_URL
  },
  server: {
    port: process.env.PORT || 3000,
    isProduction: process.env.NODE_ENV === 'production' || 
                   process.env.RAILWAY_ENVIRONMENT_NAME || 
                   process.env.RAILWAY_PROJECT_ID
  },
  webhook: {},
  supervisors: {
    authorized: process.env.SUPERVISORES_IDS 
      ? process.env.SUPERVISORES_IDS.split(',').map(id => parseInt(id.trim().split('#')[0].split('//')[0]))
      : []
  }
};

function getWebhookUrl(token) {
  let rawUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
            || process.env.RAILWAY_STATIC_URL 
            || process.env.APP_URL;
  
  if (!rawUrl) {
    if (environment.server.isProduction) {
      console.error('Error: No se pudo determinar la URL del webhook. Revisa variables de entorno.');
      process.exit(1);
    }
    return null;
  }
  
  rawUrl = rawUrl.replace(/\/$/, '');
  
  if (process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL) {
    if (!/^https?:\/\//.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }
  }
  
  return `${rawUrl}/bot${token}`;
}

// Asignar la URL del webhook DESPUÉS de definir el objeto
environment.webhook.url = getWebhookUrl(environment.telegram.token);

module.exports = environment;