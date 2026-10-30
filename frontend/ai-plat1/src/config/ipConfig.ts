// Local defaults; configure each service for your own development environment.
export const IP_CONFIG = {
  API_IP: process.env.UMI_APP_LEGACY_API_URL || 'http://127.0.0.1:8001',
  API_IP2: process.env.UMI_APP_API_URL || 'http://127.0.0.1:8001',
  API_IP3: process.env.UMI_APP_API_URL || 'http://127.0.0.1:8001',
};
