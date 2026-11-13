import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
};

export const disconnect = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
};

export const clearDatabase = async () => {
    if (mongoose.connection.readyState !== 1) {
        return;
    }

    const { collections } = mongoose.connection;

    await Promise.all(
        Object.keys(collections).map((collectionName) => mongoose.connection.collection(collectionName).deleteMany({}))
    );
};

export default {
    connect,
    disconnect,
    clearDatabase,
};
