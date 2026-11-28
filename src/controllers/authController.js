import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
import RefreshToken from '../models/refreshTokenModel.js';
import hashToken from '../utils/hashToken.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { refreshCookieOptions } from '../utils/cookieOptions.js';
import { randomUUID } from 'crypto';

const revokeRefreshTokenFamily = async (familyId, revokedAt) => {
    await RefreshToken.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt } });
};

const revokeFamilyOnReplay = async (tokenHash, revokedAt) => {
    const replayedToken = await RefreshToken.findOne({
        tokenHash,
        revokedAt: { $ne: null },
        expiresAt: { $gt: revokedAt },
    });

    if (replayedToken?.familyId) {
        await revokeRefreshTokenFamily(replayedToken.familyId, revokedAt);
    }
};

// Register User
export const register = async (req, res) => {
    const validatedData = req.body;

    const existingUser = await User.findOne({ email: validatedData.email });

    if (existingUser) {
        throw new ApiError(409, 'Email is already registered');
    }

    const user = await User.create(validatedData);

    const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };

    return res.status(201).json({
        success: true,
        user: userResponse,
    });
};

// Login User

export const login = async (req, res) => {
    const validatedData = req.body;

    const existingUser = await User.findOne({
        email: validatedData.email,
    }).select('+password');

    if (!existingUser) {
        throw new ApiError(401, 'Incorrect email or password');
    }

    const isPasswordValid = await existingUser.isPasswordCorrect(validatedData.password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Incorrect email or password');
    }

    // Generate tokens
    const accessToken = existingUser.generateAccessToken();
    const refreshToken = existingUser.generateRefreshToken();

    // Hash refresh token before storing it
    const tokenHash = hashToken(refreshToken);

    // Store refresh token session in MongoDB
    await RefreshToken.create({
        user: existingUser._id,
        tokenHash,
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send refresh token through an HttpOnly cookie
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return res.status(200).json({
        success: true,
        accessToken,
        user: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            createdAt: existingUser.createdAt,
            updatedAt: existingUser.updatedAt,
        },
    });
};

// Refresh access and refresh tokens
export const refresh = async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        throw new ApiError(401, 'Refresh token is required');
    }

    let payload;
    try {
        payload = jwt.verify(token, config.refreshToken);
    } catch {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const tokenHash = hashToken(token);
    const now = new Date();
    const tokenRecord = await RefreshToken.findOne({
        tokenHash,
        expiresAt: { $gt: now },
        revokedAt: null,
    });

    if (!tokenRecord) {
        await revokeFamilyOnReplay(tokenHash, now);
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await User.findById(tokenRecord.user);
    const tokenUserId = payload._id ?? payload.id ?? payload.sub;
    if (!user || !tokenUserId || tokenUserId.toString() !== user._id.toString()) {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const familyId = tokenRecord.familyId ?? randomUUID();
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    const nextTokenRecord = await RefreshToken.create({
        user: user._id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Persist the successor before consuming the token so concurrent replays can revoke it too.
    const revokedToken = await RefreshToken.findOneAndUpdate(
        {
            _id: tokenRecord._id,
            tokenHash,
            expiresAt: { $gt: now },
            revokedAt: null,
        },
        {
            $set: { revokedAt: now, familyId },
        },
        { returnDocument: 'after' }
    );

    if (!revokedToken) {
        await RefreshToken.updateOne({ _id: nextTokenRecord._id, revokedAt: null }, { $set: { revokedAt: now } });
        await revokeFamilyOnReplay(tokenHash, now);
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return res.status(200).json({ success: true, accessToken });
};

// Logout
export const logout = async (req, res) => {
    // 1. Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;
    // 2. If token exists:
    //    - Hash the token
    //    - Find and update the matching active session
    //    - Match both the token hash and req.user._id
    if (refreshToken) {
        await RefreshToken.findOneAndUpdate(
            {
                tokenHash: hashToken(refreshToken),
                user: req.user._id,
                expiresAt: { $gt: new Date() },
                revokedAt: null,
            },
            { $set: { revokedAt: new Date() } }
        );
    }

    // 3. Clear the refreshToken cookie
    //    Use the same path and compatible options as login.
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        path: '/api/auth',
    });

    // 4. Return a success response
    return res.status(200).json({ success: true });
};
