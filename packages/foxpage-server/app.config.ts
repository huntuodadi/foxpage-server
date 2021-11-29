import fs from 'fs';

import configProfile from './config/environments';

enum EnvType {
  Dev = 'development',
  Prod = 'development',
  Test = 'test',
}

let env: EnvType = EnvType.Dev;
let port: number = 50000;

if (process.env.NODE_ENV) {
  env = process.env.NODE_ENV as EnvType;
}

if (process.env.PORT) {
  port = Number(process.env.PORT);
}

let config: { [key: string]: any } = configProfile[env as EnvType] || configProfile['development'];

config.env = env;
config.port = port;

// Load multilingual files
const langBuffer = fs.readFileSync('./config/lang/' + config.locale + '.json');
const lang = JSON.parse(langBuffer.toString());

export { config, lang as i18n };
