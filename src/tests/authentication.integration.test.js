import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import { config } from '../config/config.js';
import Book from '../models/bookModel.js';
import RefreshToken from '../models/refreshTokenModel.js';
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
    const adminCredentials = { email: 'admin@test.com', password: 'Password123' };

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

    describe('auth endpoints', () => {
        const getRefreshCookie = (response) =>
            response.headers['set-cookie']?.find((cookie) => cookie.startsWith('refreshToken='))?.split(';')[0];

        it('registers a regular user without exposing their password', async () => {
            const response = await request(app).post('/api/auth/register').send({
                name: 'New Reader',
                email: 'reader@test.com',
                password: 'Password123',
            });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.user).toMatchObject({
                name: 'New Reader',
                email: 'reader@test.com',
                role: 'user',
            });
            expect(response.body.user.password).toBeUndefined();
        });

        it('rejects registration with a duplicate email', async () => {
            const response = await request(app).post('/api/auth/register').send({
                name: 'Duplicate Reader',
                email: adminCredentials.email,
                password: adminCredentials.password,
            });

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Email is already registered');
        });

        it('rejects attempts to register with the admin role', async () => {
            const response = await request(app).post('/api/auth/register').send({
                name: 'Public Admin',
                email: 'public-admin@test.com',
                password: 'Password123',
                role: 'admin',
            });

            expect(response.status).toBe(400);
            expect(await User.findOne({ email: 'public-admin@test.com' })).toBeNull();
        });

        it('logs in with valid credentials and issues access and refresh tokens', async () => {
            const response = await request(app).post('/api/auth/login').send(adminCredentials);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.accessToken).toEqual(expect.any(String));
            expect(response.body.user.email).toBe(adminCredentials.email);
            expect(response.body.user.password).toBeUndefined();
            expect(getRefreshCookie(response)).toEqual(expect.stringMatching(/^refreshToken=.+/));
            expect(await RefreshToken.countDocuments({ user: adminId, revokedAt: null })).toBe(1);
        });

        it.each([
            { email: adminCredentials.email, password: 'WrongPassword123' },
            { email: 'missing@test.com', password: adminCredentials.password },
        ])('rejects incorrect credentials', async (credentials) => {
            const response = await request(app).post('/api/auth/login').send(credentials);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Incorrect email or password');
            expect(getRefreshCookie(response)).toBeUndefined();
        });

        it('rotates a refresh token and rejects reuse of the old token', async () => {
            const loginResponse = await request(app).post('/api/auth/login').send(adminCredentials);
            const oldCookie = getRefreshCookie(loginResponse);

            const refreshResponse = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
            const newCookie = getRefreshCookie(refreshResponse);

            expect(refreshResponse.status).toBe(200);
            expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
            expect(newCookie).toEqual(expect.stringMatching(/^refreshToken=.+/));
            expect(newCookie).not.toBe(oldCookie);

            const reuseResponse = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);

            expect(reuseResponse.status).toBe(401);
            expect(reuseResponse.body.message).toBe('Invalid or expired refresh token');
            expect(await RefreshToken.countDocuments({ user: adminId, revokedAt: null })).toBe(1);
        });

        it('revokes the refresh token on logout', async () => {
            const loginResponse = await request(app).post('/api/auth/login').send(adminCredentials);
            const refreshCookie = getRefreshCookie(loginResponse);
            const logoutResponse = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
                .set('Cookie', refreshCookie);

            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.success).toBe(true);
            expect(logoutResponse.headers['set-cookie']?.[0]).toMatch(/^refreshToken=;/);
            expect(await RefreshToken.countDocuments({ user: adminId, revokedAt: null })).toBe(0);

            const refreshResponse = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

            expect(refreshResponse.status).toBe(401);
            expect(refreshResponse.body.message).toBe('Invalid or expired refresh token');
        });
    });

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
