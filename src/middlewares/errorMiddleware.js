import ApiError from '../utils/ApiError.js';

export const errorHandlerMiddleware = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ success: false, statusCode: err.statusCode, error: err.message });
    }
    console.error(err);
    return res.status(500).json({ success: false, statusCode: 500, error: 'Internal server error' });
};
