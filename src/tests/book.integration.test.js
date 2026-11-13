import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { connect, clearDatabase, disconnect } from './helpers/testDatabase.js';
import Book from '../models/bookModel.js';
import request from 'supertest';
import app from '../app.js';

// Valid book data
const validBook = {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    ISBN: '978-0743273565',
    description: 'A'.repeat(150),
    publicationYear: 1925,
    genre: 'Fiction',
    availability: true,
};

describe('Book API integration', () => {
    beforeAll(async () => {
        await connect();
    }, 600_000);

    beforeEach(async () => {
        await clearDatabase();
    });

    afterAll(async () => {
        await disconnect();
    });

    it('creates a book successfully', async () => {
        // 1. Send POST request
        const response = await request(app).post('/api/books/create').send(validBook);

        // 2. Check HTTP response
        expect(response.status).toBe(201);

        // 3. Check response data
        expect(response.body.title).toBe(validBook.title);
        expect(response.body.author).toBe(validBook.author);
        expect(response.body._id).toBeDefined();

        // 4. Check that book actually exists in MongoDB
        const savedBook = await Book.findById(response.body._id);

        expect(savedBook).not.toBeNull();
        expect(savedBook.title).toBe(validBook.title);
    });
});
