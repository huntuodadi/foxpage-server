const mongoConfig = process.env.MONGO_CONFIG;

export default {
  jwtKey: 'test',
  ignoreTokenPath: [
    '/swagger/swagger.json',
    '/swagger/swagger',
    '/users/login',
    '/users/register',
    '/healthcheck',
  ],
  mongodb: mongoConfig || '',
  locale: 'en',
  plugins: [],
};
