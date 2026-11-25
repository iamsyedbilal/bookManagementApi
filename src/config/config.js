import { config as conf } from 'dotenv';

conf();

const _config = {
    port: process.env.PORT,
    databaseUrl: process.env.MONGO_CONNECTION_STRING,
    dbName: process.env.DB_NAME,
    env: process.env.NODE_ENV,
    accessToken: process.env.ACCESS_TOKEN_SECRET,
    refreshToken: process.env.REFRESH_TOKEN_SECRET,
    adminName: process.env.ADMIN_NAME,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    corsOrigins: process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [],
};

export const config = Object.freeze(_config);
