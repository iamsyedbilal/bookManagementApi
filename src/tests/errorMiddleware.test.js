import mongoose from 'mongoose';
import { errorHandlerMiddleware } from '../middlewares/errorMiddleware';
import { describe, expect, it, vi } from 'vitest';

const createResponse = () => {
    const res = { statusCode: undefined, body: undefined };
    res.status = vi.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
    });
    res.json = vi.fn((body) => {
        res.body = body;
        return res;
    });
    return res;
};

describe('errorHandlerMiddleware', () => {
    it('returns 400 with the Mongoose validation error message', () => {
        const error = new mongoose.Error.ValidationError();
        error.addError(
            'title',
            new mongoose.Error.ValidatorError({
                message: 'Title is required',
                path: 'title',
                value: '',
            })
        );
        const res = createResponse();

        errorHandlerMiddleware(error, {}, res, vi.fn());

        expect(res.statusCode).toBe(400);
        expect(JSON.stringify(res.body)).toContain('Title is required');
    });

    it('returns 400 for a Mongoose ObjectId CastError', () => {
        const error = new mongoose.Error.CastError('ObjectId', 'invalid-id', '_id');
        const res = createResponse();

        errorHandlerMiddleware(error, {}, res, vi.fn());

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(expect.objectContaining({ message: 'Invalid ID format' }));
    });

    it('returns 500 for an unexpected error', () => {
        const error = new Error('Something broke');
        const res = createResponse();

        errorHandlerMiddleware(error, {}, res, vi.fn());

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual(expect.objectContaining({ message: 'Internal server error' }));
    });
});
