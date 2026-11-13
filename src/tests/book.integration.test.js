import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Types } from 'mongoose';
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

    it('fetches all books successfully', async () => {
        await Book.insertMany([
            { ...validBook, title: 'Book One', ISBN: '978-0743273565' },
            {
                ...validBook,
                title: 'Book Two',
                ISBN: '978-0451524935',
                author: 'George Orwell',
                publicationYear: 1949,
                genre: 'Fiction',
            },
        ]);

        const response = await request(app).get('/api/books');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(2);
        expect(response.body.map((book) => book.title)).toEqual(expect.arrayContaining(['Book One', 'Book Two']));
    });

    it('returns an empty array when there are no books', async () => {
        const response = await request(app).get('/api/books');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it('fetches a single book successfully', async () => {
        const createdBook = await Book.create(validBook);

        const response = await request(app).get(`/api/books/${createdBook._id}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe(createdBook.title);
        expect(response.body.author).toBe(createdBook.author);
        expect(response.body._id).toBe(createdBook._id.toString());
    });

    it('returns 404 when the book does not exist', async () => {
        const nonExistingId = new Types.ObjectId();

        const response = await request(app).get(`/api/books/${nonExistingId}`);

        expect(response.status).toBe(404);
    });

    it('returns 404 when fetching a book after it has been deleted', async () => {
        const createdBook = await Book.create(validBook);
        await Book.findByIdAndDelete(createdBook._id);

        const response = await request(app).get(`/api/books/${createdBook._id}`);

        expect(response.status).toBe(404);
    });

    it('returns 400 when the book ID is invalid', async () => {
        const response = await request(app).get('/api/books/invalid-id');

        expect(response.status).toBe(400);
    });
});
