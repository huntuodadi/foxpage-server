const mongoConfig = process.env.MONGO_CONFIG;

export default {
  jwtKey: 'mock', // Generate jwt key text
  ignoreTokenPath: [
    '/swagger/swagger.json',
    '/swagger/swagger',
    '/users/login',
    '/users/register',
    '/healthcheck',
  ], // Skip to verify the interface of the token
  mongodb: mongoConfig || '', // Database connection string
  locale: 'en', // Current language
  plugins: [],
  allLocales: ['en-US', 'zh-HK', 'en-HK', 'ko-KA', 'ja-JP'], // Supported locales
  storageConfig: {},
};
