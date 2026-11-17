import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

import request from 'supertest';
import app from '../app.js';
import User from '../models/userModel.js';
import { connect, clearDatabase, disconnect } from './helpers/testDatabase.js';

const validBook = {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    ISBN: '978-0743273565',
    description: 'A'.repeat(150),
    publicationYear: 1925,
    genre: 'Fiction',
    availability: true,
};

let accessToken;

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

    accessToken = admin.generateAccessToken();
});

afterAll(async () => {
    await disconnect();
});

const authenticatedRequest = (method, path) => {
    return request(app)[method](path).set('Authorization', `Bearer ${accessToken}`);
};

describe('Invalid Input Validation', () => {
    it('should return 400 when required fields are missing', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Book title is required');
    });

    it('should return 400 if title is shorter than 3 characters', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            title: 'Ab',
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Book title must be at least 3 characters long');
    });

    it('should return 400 when genre is not in the allowed enum', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            genre: 'Technology',
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Genre is required');
    });

    it('should return 400 if description is under 100 characters', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            description: 'Too short description',
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Description must be at least 100 characters');
    });

    it('should return 400 if description exceeds 500 characters', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            description: 'A'.repeat(501),
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Description cannot exceed 500 characters');
    });

    it('should return 400 if publicationYear is before 1900', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            publicationYear: 1899,
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid publication year');
    });

    it('should return 400 if publicationYear is in the future', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            publicationYear: new Date().getFullYear() + 1,
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Publication year cannot be in the future');
    });

    it('should return 400 if number types receive invalid strings', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            publicationYear: '1925',
        });

        expect(response.status).toBe(400);
    });

    it('should return 400 if boolean types receive invalid strings', async () => {
        const response = await authenticatedRequest('post', '/api/books/create').send({
            ...validBook,
            availability: 'true',
        });

        expect(response.status).toBe(400);
    });
});
