// Configuration constants

export const getConfig = (env) => ({
  // API Keys from env
  GOOGLE_API_KEY: env.GOOGLE_API_KEY,
  GOOGLE_CSE_ID: env.GOOGLE_CSE_ID,
  BRAVE_API_KEY: env.BRAVE_API_KEY,
  YANDEX_API_KEY: env.YANDEX_API_KEY,
  YANDEX_USER: env.YANDEX_USER,
  ADULTMEDIA_API_KEY: env.ADULTMEDIA_API_KEY,

  // Host lists
  ALLOWED_HOSTS: env.ALLOWED_HOSTS ? JSON.parse(env.ALLOWED_HOSTS) : [
    'www.google.com',
    'search.brave.com',
    'yandex.com',
    'adultdatalink.p.rapidapi.com',
    'reddit.com'
  ],

  BLOCKED_HOSTS: env.BLOCKED_HOSTS ? JSON.parse(env.BLOCKED_HOSTS) : [],

  // Search settings
  DEFAULT_LIMIT: parseInt(env.DEFAULT_LIMIT) || 10,
  MAX_LIMIT: parseInt(env.MAX_LIMIT) || 20,
  MIN_LIMIT: parseInt(env.MIN_LIMIT) || 3,

  // Cache settings
  CACHE_TTL: parseInt(env.CACHE_TTL) || 3600,

  // Feature flags
  FOLLOW_LINKS: env.FOLLOW_LINKS === 'true',
  INCLUDE_REDDIT: env.INCLUDE_REDDIT === 'true',

  // Other constants
  USER_AGENT: env.USER_AGENT || 'Jack-Portal/2.0.0',
  FETCH_TIMEOUT_MS: parseInt(env.FETCH_TIMEOUT_MS) || 10000
})
