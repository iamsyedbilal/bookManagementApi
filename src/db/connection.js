import mongoose from 'mongoose';
import { config } from '../config/config.js';

// export async function connectDB() {
//     try {
//         const connectionInstance = await mongoose.connect(`${config.databaseUrl}/${config.dbName}`);
//         console.log(
//             `Mongodb connected with the ${connectionInstance.connection.host}:${connectionInstance.connection.port}`
//         );
//     } catch (err) {
//         console.log(`Error while connecting to the database ${err}`);
//         process.exit(1);
//     }
// }

export async function connectDB() {
    const connectionInstance = await mongoose.connect(`${config.databaseUrl}/${config.dbName}`, {
        autoIndex: config.env === 'development',
    });

    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
}
