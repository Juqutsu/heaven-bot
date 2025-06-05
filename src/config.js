const dotenv = require('dotenv');
dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

module.exports = {
  TOKEN: requireEnv('TOKEN'),
  CLIENT_ID: requireEnv('CLIENT_ID'),
  SERVER_ID: requireEnv('SERVER_ID'),
  get BUGS_CHANNEL_ID() {
    return process.env.BUGS_CHANNEL_ID;
  }
};
