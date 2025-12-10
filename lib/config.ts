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
    if (typeof window !== "undefined") {
      // Client-side: use current origin
      return `${window.location.origin}/api/agent`
    }
    // Server-side: use production URL or env variable
    return process.env.NEXT_PUBLIC_API_BASE_URL || "https://kuaminisystems.com/api/agent"
  },

  // Agent configuration
  agent: {
    heartbeatInterval: 60, // seconds
    scanInterval: 3600, // seconds (1 hour)
    version: "1.0.0",
  },
}
