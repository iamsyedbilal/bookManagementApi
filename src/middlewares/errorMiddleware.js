import ApiError from '../utils/ApiError.js';

export const errorHandlerMiddleware = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((error) => error.message);
        return res.status(400).json({ success: false, statusCode: 400, message: errors.join(', ') });
    }

    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        return res.status(400).json({ success: false, statusCode: 400, message: 'Invalid ID format' });
    }

    if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0];
        const message =
            duplicateField === 'ISBN'
                ? 'ISBN already exists'
                : duplicateField === 'email'
                  ? 'Email is already registered'
                  : 'A record with the provided unique value already exists';

        return res.status(409).json({
            success: false,
            statusCode: 409,
            message,
        });
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ success: false, statusCode: err.statusCode, message: err.message });
    }

    console.error(err);
    return res.status(500).json({ success: false, statusCode: 500, message: 'Internal server error' });
};
