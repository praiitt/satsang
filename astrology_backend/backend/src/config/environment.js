// Environment Configuration - Environment variable based
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = process.env.HOSTNAME === 'localhost' || process.env.HOSTNAME === '127.0.0.1';

// Backend URLs - from environment variables
const BACKEND_URLS = {
  development: process.env.BACKEND_DEV_URL || 'http://localhost:3000',
  production: process.env.BACKEND_PROD_URL || 'http://localhost:3000'
};

// Frontend URLs - from environment variables
const FRONTEND_URLS = {
  development: process.env.FRONTEND_DEV_URL || 'http://localhost:5173',
  production: process.env.FRONTEND_PROD_URL || 'http://localhost:3000'
};

// Determine which URLs to use
const getBackendUrl = () => {
  if (isDevelopment || isLocalhost) {
    return BACKEND_URLS.development;
  }
  return BACKEND_URLS.production;
};

const getFrontendUrl = () => {
  if (isDevelopment || isLocalhost) {
    return FRONTEND_URLS.development;
  }
  return FRONTEND_URLS.production;
};

// CORS Configuration
const getCorsOrigin = () => {
  if (isDevelopment || isLocalhost) {
    return `${FRONTEND_URLS.development},${FRONTEND_URLS.production}`;
  }
  return FRONTEND_URLS.production;
};

// API Base URLs
const API_BASE_URL = getBackendUrl();
const API_BASE_URL_WITH_VERSION = `${getBackendUrl()}/api`;
const FRONTEND_BASE_URL = getFrontendUrl();

// Health check URL
const HEALTH_CHECK_URL = `${getBackendUrl()}/health`;

// Log the configuration for debugging
console.log('🌐 Backend Environment Configuration:', {
  environment: process.env.NODE_ENV,
  isDevelopment,
  isLocalhost,
  backendUrl: getBackendUrl(),
  frontendUrl: getFrontendUrl(),
  apiBaseUrl: API_BASE_URL_WITH_VERSION,
  corsOrigin: getCorsOrigin()
});

export {
  // URL getters
  getBackendUrl,
  getFrontendUrl,
  getCorsOrigin,
  
  // Pre-computed URLs
  API_BASE_URL,
  API_BASE_URL_WITH_VERSION,
  FRONTEND_BASE_URL,
  HEALTH_CHECK_URL,
  
  // Environment flags
  isDevelopment,
  isLocalhost,
  
  // URL constants
  BACKEND_URLS,
  FRONTEND_URLS
};
