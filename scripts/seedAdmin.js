import { config } from '../src/config/config.js';
import User from '../src/models/userModel.js';
import { connectDB } from '../src/db/connection.js';
import mongoose from 'mongoose';

const seedAdmin = async () => {
    try {
        if (!config.adminName || !config.adminEmail || !config.adminPassword) {
            throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before running the admin seed script.');
        }

        await connectDB();

        const adminEmail = config.adminEmail;
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin already exists');
            return;
        }

        const adminUser = await User.create({
            name: config.adminName,
            email: adminEmail,
            password: config.adminPassword,
            role: 'admin',
        });

        console.log(`Admin created successfully: ${adminUser.email}`);
    } catch (error) {
        const message =
            error instanceof Error && error.message.startsWith('Set ADMIN_NAME')
                ? error.message
                : `Admin seeding failed (${error instanceof Error ? error.name : 'Unknown error'}). Check database connectivity and admin settings.`;
        console.error(message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('Database connection closed.');
        }
    }
};

seedAdmin();
