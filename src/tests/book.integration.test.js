import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { connect, clearDatabase, disconnect } from './helpers/testDatabase.js';
import Book from '../models/bookModel.js';
import User from '../models/userModel.js';
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
    let accessToken;

    beforeAll(async () => {
        await connect();
    }, 600_000);

    beforeEach(async () => {
        await clearDatabase();

        // Create an admin user for authenticated requests
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

    // Reusable helper for authenticated requests
    const authorizedRequest = (method, path) => {
        return request(app)[method](path).set('Authorization', `Bearer ${accessToken}`);
    };

    it('creates a book successfully', async () => {
        const response = await authorizedRequest('post', '/api/books/create').send(validBook);

        expect(response.status).toBe(201);
        expect(response.body.title).toBe(validBook.title);
        expect(response.body.author).toBe(validBook.author);
        expect(response.body._id).toBeDefined();

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

        const response = await authorizedRequest('get', '/api/books');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.map((book) => book.title)).toEqual(expect.arrayContaining(['Book One', 'Book Two']));
    });

    describe('GET /api/books (pagination)', () => {
        // Helper to seed N unique books quickly
        const seedBooks = async (count) => {
            const books = Array.from({ length: count }, (_, index) => ({
                ...validBook,
                title: `Book ${index + 1}`,
                ISBN: `978-074327${String(index + 1).padStart(4, '0')}`,
            }));

            return Book.insertMany(books);
        };

        it('defaults to page 1 and limit 10 when no query parameters are provided', async () => {
            await seedBooks(15);

            const response = await authorizedRequest('get', '/api/books');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(10);
            expect(response.body.pagination).toEqual({
                totalRecords: 15,
                totalPages: 2,
                currentPage: 1,
                limit: 10,
            });
        });

        it('returns the correct second page when page=2 and limit=5', async () => {
            await seedBooks(12);

            const response = await authorizedRequest('get', '/api/books?page=2&limit=5');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(5);
            expect(response.body.pagination).toEqual({
                totalRecords: 12,
                totalPages: 3,
                currentPage: 2,
                limit: 5,
            });
        });

        it('returns 400 when page is not a valid number (page=abc)', async () => {
            const response = await authorizedRequest('get', '/api/books?page=abc');

            expect(response.status).toBe(400);
        });

        it('returns 400 when page is negative (page=-1)', async () => {
            const response = await authorizedRequest('get', '/api/books?page=-1');

            expect(response.status).toBe(400);
        });

        it('returns 400 when limit exceeds maximum allowed (limit=101)', async () => {
            const response = await authorizedRequest('get', '/api/books?limit=101');

            expect(response.status).toBe(400);
        });

        it('returns 400 when limit is zero (limit=0)', async () => {
            const response = await authorizedRequest('get', '/api/books?limit=0');

            expect(response.status).toBe(400);
        });

        it('returns empty data and zero total pages when the database is empty', async () => {
            const response = await authorizedRequest('get', '/api/books');

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                totalRecords: 0,
                totalPages: 0,
                currentPage: 1,
                limit: 10,
            });
        });

        it('returns an empty data array when requesting a page beyond available records', async () => {
            await seedBooks(43);

            const response = await authorizedRequest('get', '/api/books?page=100&limit=10');

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                totalRecords: 43,
                totalPages: 5,
                currentPage: 100,
                limit: 10,
            });
        });
    });

    it('returns an empty data array when there are no books', async () => {
        const response = await authorizedRequest('get', '/api/books');

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([]);
        expect(response.body.pagination).toEqual({
            totalRecords: 0,
            totalPages: 0,
            currentPage: 1,
            limit: 10,
        });
    });

    it('fetches a single book successfully', async () => {
        const createdBook = await Book.create(validBook);

        const response = await authorizedRequest('get', `/api/books/${createdBook._id}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe(createdBook.title);
        expect(response.body.author).toBe(createdBook.author);
        expect(response.body._id).toBe(createdBook._id.toString());
    });

    it('returns 404 when the book does not exist', async () => {
        const nonExistingId = new Types.ObjectId();

        const response = await authorizedRequest('get', `/api/books/${nonExistingId}`);

        expect(response.status).toBe(404);
    });

    it('returns 404 when fetching a book after it has been deleted', async () => {
        const createdBook = await Book.create(validBook);

        await Book.findByIdAndDelete(createdBook._id);

        const response = await authorizedRequest('get', `/api/books/${createdBook._id}`);

        expect(response.status).toBe(404);
    });

    it('returns 400 when the book ID is invalid', async () => {
        const response = await authorizedRequest('get', '/api/books/invalid-id');

        expect(response.status).toBe(400);
    });

    it('updates a book successfully with PATCH', async () => {
        const createdBook = await Book.create(validBook);
        const updatedTitle = 'The Great Gatsby — Updated';

        const response = await authorizedRequest('patch', `/api/books/${createdBook._id}`).send({
            title: updatedTitle,
        });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe(updatedTitle);
        expect(response.body.author).toBe(validBook.author);

        const savedBook = await Book.findById(createdBook._id);

        expect(savedBook.title).toBe(updatedTitle);
        expect(savedBook.author).toBe(validBook.author);
    });

    it('returns 404 when PATCHing a book that does not exist', async () => {
        const nonExistingId = new Types.ObjectId();

        const response = await authorizedRequest('patch', `/api/books/${nonExistingId}`).send({
            title: 'Updated title',
        });

        expect(response.status).toBe(404);
    });

    it('returns 400 when PATCHing with an invalid book ID', async () => {
        const response = await authorizedRequest('patch', '/api/books/invalid-id').send({ title: 'Updated title' });

        expect(response.status).toBe(400);
    });

    it('returns 400 when PATCHing with an empty update', async () => {
        const createdBook = await Book.create(validBook);

        const response = await authorizedRequest('patch', `/api/books/${createdBook._id}`).send({});

        expect(response.status).toBe(400);
    });

    it('deletes a book successfully', async () => {
        const createdBook = await Book.create(validBook);

        const response = await authorizedRequest('delete', `/api/books/${createdBook._id}`);

        expect(response.status).toBe(200);
        expect(await Book.findById(createdBook._id)).toBeNull();
    });

    it('returns 404 when deleting a book that does not exist', async () => {
        const nonExistingId = new Types.ObjectId();

        const response = await authorizedRequest('delete', `/api/books/${nonExistingId}`);

        expect(response.status).toBe(404);
    });

    it('returns 400 when deleting with an invalid book ID', async () => {
        const response = await authorizedRequest('delete', '/api/books/invalid-id');

        expect(response.status).toBe(400);
    });
});
