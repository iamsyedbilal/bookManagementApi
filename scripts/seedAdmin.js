import { config } from '../src/config/config.js';
import User from '../src/models/userModel.js';
import { connectDB } from '../src/db/connection.js';
import mongoose from 'mongoose';

const seedAdmin = async () => {
    try {
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
        console.error('Error seeding admin:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
};

seedAdmin();
