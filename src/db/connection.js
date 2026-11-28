import mongoose from 'mongoose';
import { config } from '../config/config.js';

export async function connectDB() {
    const connectionInstance = await mongoose.connect(config.databaseUrl, {
        dbName: config.dbName,
        autoIndex: config.env === 'development',
    });

    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
}
