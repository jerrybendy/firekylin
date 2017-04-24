/**
* db config
* @type {Object}
*/
export default {
  type: 'mysql',
  log_sql: true,
  log_connect: true,
  adapter: {
    mysql: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || '3306',
      database: process.env.DB_NAME || 'firekylin',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      prefix: process.env.DB_PREFIX || 'fk_',
      encoding: process.env.DB_ENCODING || 'utf8'
    },
  }
};
