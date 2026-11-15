import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
import RefreshToken from '../models/refreshTokenModel.js';
import hashToken from '../utils/hashToken.js';

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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send refresh token through an HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });

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
