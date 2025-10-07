module.exports = {
  PORT: process.env.PORT || 3003,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-this',
  SALT_ROUNDS: 10,
  DATABASE_URL: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`
};
