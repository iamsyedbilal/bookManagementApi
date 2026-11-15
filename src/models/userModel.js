import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/config.js';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
            required: [true, 'Name is required'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: function (value) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                },
                message: 'Please enter a valid email',
            },
        },
        password: {
            type: String,
            select: false,
            minlength: [8, 'Password must be at least 8 characters long'],
            required: [true, 'Password is required'],
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
    },
    { timestamps: true }
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({ _id: this._id, role: this.role }, config.accessToken, { expiresIn: '15m' });
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ _id: this._id, jti: randomUUID() }, config.refreshToken, { expiresIn: '7d' });
};

const User = mongoose.model('User', userSchema);

export default User;
