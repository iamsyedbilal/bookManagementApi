import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import User from '../models/userModel.js';
import { config } from '../config/config.js';

export const verifyJWT = async (req, _res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new ApiError(401, 'Unauthorized request');
        }

        const decoded = jwt.verify(token, config.accessToken);

        const user = await User.findById(decoded?._id);

        if (!user) {
            throw new ApiError(401, 'Invalid Access Token');
        }

        req.user = user;

        next();
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }

        if (error instanceof jwt.TokenExpiredError) {
            return next(new ApiError(401, 'Access token expired'));
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return next(new ApiError(401, 'Invalid Access Token'));
        }

        return next(new ApiError(500, 'Internal Server Error'));
    }
};
