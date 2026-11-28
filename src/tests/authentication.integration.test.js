import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import { config } from '../config/config.js';
import Book from '../models/bookModel.js';
import User from '../models/userModel.js';
import { clearDatabase, connect, disconnect } from './helpers/testDatabase.js';

const validBook = {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    ISBN: '978-0743273565',
    description: 'A'.repeat(150),
    publicationYear: 1925,
    genre: 'Fiction',
    availability: true,
};

describe('Book API authentication integration', () => {
    let adminId;

    beforeAll(async () => {
        await connect();
    }, 600_000);

    beforeEach(async () => {
        await clearDatabase();

        const admin = await User.create({
            name: 'Test Admin',
            email: 'admin@test.com',
            password: 'Password123',
            role: 'admin',
        });

        adminId = admin._id;
    });

    afterAll(async () => {
        await disconnect();
    });

    const createBook = (book = validBook) => Book.create({ ...book, addedBy: adminId });

    describe('authentication', () => {
        const protectedRoutes = [
            { method: 'get', path: '/api/books' },
            { method: 'get', path: '/api/books/stats/genres' },
            { method: 'get', path: '/api/books/with-user-details' },
            { method: 'get', path: '/api/books/with-age' },
            { method: 'get', path: '/api/books/getBookAnalytics' },
            { method: 'post', path: '/api/books/create', body: validBook },
            { method: 'get', path: `/api/books/${new Types.ObjectId()}` },
            { method: 'patch', path: `/api/books/${new Types.ObjectId()}`, body: { title: 'Updated title' } },
            { method: 'delete', path: `/api/books/${new Types.ObjectId()}` },
        ];

        it.each(protectedRoutes)('rejects unauthenticated $method $path requests', async ({ method, path, body }) => {
            let apiRequest = request(app)[method](path);
            if (body) apiRequest = apiRequest.send(body);

            const response = await apiRequest;

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Unauthorized request');
        });

        it('rejects an invalid access token', async () => {
            const response = await request(app).get('/api/books').set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid Access Token');
        });

        it('rejects an expired access token', async () => {
            const expiredToken = jwt.sign({ _id: adminId }, config.accessToken, { expiresIn: '-1s' });
            const response = await request(app).get('/api/books').set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Access token expired');
        });
    });

    describe('role authorization', () => {
        it('allows an authenticated regular user to browse books', async () => {
            const book = await createBook();
            const reader = await User.create({
                name: 'Test Reader',
                email: 'reader@test.com',
                password: 'Password123',
                role: 'user',
            });

            const response = await request(app)
                .get('/api/books')
                .set('Authorization', `Bearer ${reader.generateAccessToken()}`);

            expect(response.status).toBe(200);
            expect(response.body.data.map(({ _id }) => _id)).toContain(book._id.toString());
        });

        it.each([
            { method: 'post', path: '/api/books/create', body: validBook },
            { method: 'patch', path: '/api/books/:id', body: { title: 'Updated title' } },
            { method: 'delete', path: '/api/books/:id' },
        ])('denies regular users from performing $method requests', async ({ method, path, body }) => {
            const book = await createBook();
            const reader = await User.create({
                name: 'Test Reader',
                email: 'reader@test.com',
                password: 'Password123',
                role: 'user',
            });
            const target = path.replace(':id', book._id.toString());
            let apiRequest = request(app)
                [method](target)
                .set('Authorization', `Bearer ${reader.generateAccessToken()}`);
            if (body) apiRequest = apiRequest.send(body);

            const response = await apiRequest;

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You do not have permission to perform this action');
        });
    });
});
