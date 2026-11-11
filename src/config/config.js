import { config as conf } from 'dotenv';

conf();

const _config = {
    port: process.env.PORT,
    databaseUrl: process.env.MONGO_CONNECTION_STRING,
    dbName: process.env.DB_NAME,
    env: process.env.NODE_ENV,
};

export const config = Object.freeze(_config);
