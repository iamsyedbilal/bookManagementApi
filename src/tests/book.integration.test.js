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
    let adminId;

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

        adminId = admin._id;
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
                addedBy: adminId,
            }));

            return Book.insertMany(books);
        };

        it('returns the first 10 books and a cursor when more results are available', async () => {
            await seedBooks(15);

            const response = await authorizedRequest('get', '/api/books');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(10);
            expect(response.body.pagination).toEqual({
                limit: 10,
                hasNextPage: true,
                nextCursor: expect.any(String),
            });
        });

        it('continues from the cursor without repeating books', async () => {
            await seedBooks(12);

            const firstPage = await authorizedRequest('get', '/api/books?limit=5');
            const secondPage = await authorizedRequest(
                'get',
                `/api/books?limit=5&cursor=${encodeURIComponent(firstPage.body.pagination.nextCursor)}`
            );
            const thirdPage = await authorizedRequest(
                'get',
                `/api/books?limit=5&cursor=${encodeURIComponent(secondPage.body.pagination.nextCursor)}`
            );

            expect(firstPage.status).toBe(200);
            expect(firstPage.body.data).toHaveLength(5);
            expect(secondPage.status).toBe(200);
            expect(secondPage.body.data).toHaveLength(5);
            expect(secondPage.body.pagination).toEqual({
                limit: 5,
                hasNextPage: true,
                nextCursor: expect.any(String),
            });
            expect(thirdPage.status).toBe(200);
            expect(thirdPage.body.data).toHaveLength(2);
            expect(thirdPage.body.pagination).toEqual({
                limit: 5,
                hasNextPage: false,
                nextCursor: null,
            });
            const allIds = [
                ...firstPage.body.data,
                ...secondPage.body.data,
                ...thirdPage.body.data,
            ].map((book) => book._id);
            expect(new Set(allIds).size).toBe(12);
        });

        it('returns 400 when the cursor is invalid', async () => {
            const response = await authorizedRequest('get', '/api/books?cursor=invalid');

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

        it('returns no next cursor when the database is empty', async () => {
            const response = await authorizedRequest('get', '/api/books');

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                limit: 10,
                hasNextPage: false,
                nextCursor: null,
            });
        });

        it('returns no next cursor when the final result fits on one page', async () => {
            await seedBooks(3);

            const response = await authorizedRequest('get', '/api/books?limit=10');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.pagination).toEqual({
                limit: 10,
                hasNextPage: false,
                nextCursor: null,
            });
        });
    });

    it('returns an empty data array when there are no books', async () => {
        const response = await authorizedRequest('get', '/api/books');

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([]);
        expect(response.body.pagination).toEqual({
            limit: 10,
            hasNextPage: false,
            nextCursor: null,
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
