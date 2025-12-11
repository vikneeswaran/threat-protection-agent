// Production configuration for Kuamini Threat Protection Agent
export const config = {
  // Production domain
  productionDomain: "https://kuaminisystems.com",

  // Application paths
  basePath: "/securityAgent",

  // API endpoints (relative to basePath)
  api: {
    agent: {
      register: "/api/agent/register",
      heartbeat: "/api/agent/heartbeat",
      threat: "/api/agent/threat",
    },
  },

  // Get the full API URL based on environment
  getApiBaseUrl: () => {
    // Prefer explicit environment variable for API base (used by both client & server).
    // Fallback to the production domain if not set. No localhost fallback kept in repository.
    return process.env.NEXT_PUBLIC_API_BASE_URL || `${config.productionDomain}/api/agent`
  },

  // Agent configuration
  agent: {
    heartbeatInterval: 60, // seconds
    scanInterval: 3600, // seconds (1 hour)
    version: "1.0.0",
  },
}
