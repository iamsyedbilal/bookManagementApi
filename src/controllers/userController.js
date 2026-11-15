import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';

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
