import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

const validBook = {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    ISBN: '978-0743273565',
    description: 'A'.repeat(150), // Valid length between 100 and 500 characters
    publicationYear: 1925,
    genre: 'Fiction',
    availability: true,
};

describe('Invalid Input Validation', () => {
    it('should return 400 when required fields are missing', async () => {
        const response = await request(app).post('/api/books/create').send({});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Book title is required');
    });

    it('should return 400 if title is shorter than 3 characters', async () => {
        const response = await request(app)
            .post('/api/books/create')
            .send({
                ...validBook,
                title: 'Ab',
            });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Book title must be at least 3 characters long');
    });
});
