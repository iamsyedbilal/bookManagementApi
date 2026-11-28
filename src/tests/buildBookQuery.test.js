import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { buildBookQuery } from '../utils/bookQuery.js';
import ApiError from '../utils/ApiError.js';

describe('buildBookQuery', () => {
    // 1. Cursor pagination
    describe('1. Cursor pagination', () => {
        it('returns the default limit, projection, and stable sort when query is empty', () => {
            const result = buildBookQuery({});

            expect(result).toEqual({
                filter: {},
                projection: {
                    _id: 1,
                    title: 1,
                    author: 1,
                    ISBN: 1,
                    description: 1,
                    publicationYear: 1,
                    genre: 1,
                    availability: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
                options: {
                    sort: { createdAt: -1, _id: -1 },
                    limit: 11,
                },
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc',
            });
        });

        it('requests one extra record to determine whether another page exists', () => {
            const result = buildBookQuery({ limit: '25' });

            expect(result.limit).toBe(25);
            expect(result.options.limit).toBe(26);
        });

        it('adds a cursor filter using createdAt and _id for stable continuation', () => {
            const cursor = Buffer.from(
                JSON.stringify({
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
                    value: '2024-01-02T03:04:05.000Z',
                    id: '507f1f77bcf86cd799439011',
                })
            ).toString('base64url');
            const result = buildBookQuery({ cursor });

            expect(result.filter.$and).toEqual([
                {
                    $or: [
                        { createdAt: { $lt: new Date('2024-01-02T03:04:05.000Z') } },
                        {
                            createdAt: new Date('2024-01-02T03:04:05.000Z'),
                            _id: { $lt: expect.any(Object) },
                        },
                    ],
                },
            ]);
            expect(result.filter.$and[0].$or[1]._id.$lt).toEqual(
                new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
            );
        });

        it('adds a cursor filter using the requested sort field and direction', () => {
            const cursor = Buffer.from(
                JSON.stringify({
                    sortBy: 'title',
                    sortOrder: 'asc',
                    value: 'Alpha',
                    id: '507f1f77bcf86cd799439011',
                })
            ).toString('base64url');
            const result = buildBookQuery({ cursor, sortBy: 'title', sortOrder: 'asc' });

            expect(result.filter.$and[0]).toEqual({
                $or: [
                    { title: { $gt: 'Alpha' } },
                    {
                        title: 'Alpha',
                        _id: { $gt: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') },
                    },
                ],
            });
        });
    });

    // 3. Genre and author filtering
    describe('3. Genre and author filtering', () => {
        it('builds case-insensitive exact match regexes and escapes special characters', () => {
            const result = buildBookQuery({
                genre: '  Sci-Fi (Classic)  ',
                author: 'J.R.R. Tolkien',
            });

            expect(result.filter).toEqual({
                genre: { $regex: '^Sci-Fi \\(Classic\\)$', $options: 'i' },
                author: { $regex: '^J\\.R\\.R\\. Tolkien$', $options: 'i' },
            });
        });
    });

    // 4. Searching by title and author
    describe('4. Searching by title and author', () => {
        it('builds an $or query matching partial title or author safely', () => {
            const result = buildBookQuery({ search: '  C++ [Guide] ' });

            expect(result.filter).toEqual({
                $or: [
                    { title: { $regex: 'C\\+\\+ \\[Guide\\]', $options: 'i' } },
                    { author: { $regex: 'C\\+\\+ \\[Guide\\]', $options: 'i' } },
                ],
            });
        });

        it('escapes special characters in a search term', () => {
            const result = buildBookQuery({ search: 'C++' });

            expect(result.filter).toEqual({
                $or: [
                    { title: { $regex: 'C\\+\\+', $options: 'i' } },
                    { author: { $regex: 'C\\+\\+', $options: 'i' } },
                ],
            });
        });
    });

    // 5. Combining search with filters
    describe('5. Combining search with filters', () => {
        it('combines search $or conditions with exact field filters', () => {
            const result = buildBookQuery({
                genre: 'Fantasy',
                availability: 'true',
                search: 'Ring',
            });

            expect(result.filter).toEqual({
                genre: { $regex: '^Fantasy$', $options: 'i' },
                availability: true,
                $or: [{ title: { $regex: 'Ring', $options: 'i' } }, { author: { $regex: 'Ring', $options: 'i' } }],
            });
        });
    });

    // 6. Availability filtering
    describe('6. Availability filtering', () => {
        it('parses "true" and "false" strings into boolean values', () => {
            const availableResult = buildBookQuery({ availability: 'true' });
            const unavailableResult = buildBookQuery({ availability: 'false' });

            expect(availableResult.filter.availability).toBe(true);
            expect(unavailableResult.filter.availability).toBe(false);
        });
    });

    // 7. Stable sorting
    describe('7. Stable sorting', () => {
        it.each(['title', 'author', 'genre', 'availability', 'createdAt', 'updatedAt'])(
            'sorts by %s ascending with an _id tie-breaker',
            (sortBy) => {
                const result = buildBookQuery({ sortBy });

                expect(result.options.sort).toEqual({ [sortBy]: 1, _id: 1 });
                expect(result.sortBy).toBe(sortBy);
                expect(result.sortOrder).toBe('asc');
            }
        );

        it('supports descending order', () => {
            const result = buildBookQuery({ sortBy: 'author', sortOrder: 'DESC' });

            expect(result.options.sort).toEqual({ author: -1, _id: -1 });
            expect(result.sortOrder).toBe('desc');
        });
    });

    // 8. Invalid query parameters
    describe('8. Invalid query parameters', () => {
        const invalidCases = [
            // Pagination errors
            { query: { limit: '0' }, message: 'limit must be a positive integer' },
            { query: { limit: '101' }, message: 'limit is out of range' },
            { query: { cursor: '' }, message: 'Invalid cursor' },
            { query: { cursor: 'not-a-cursor' }, message: 'Invalid cursor' },
            { query: { cursor: Buffer.from('{invalid json').toString('base64url') }, message: 'Invalid cursor' },
            {
                query: {
                    cursor: Buffer.from(
                        JSON.stringify({
                            sortBy: 'createdAt',
                            sortOrder: 'desc',
                            value: 'not-a-date',
                            id: '507f1f77bcf86cd799439011',
                        })
                    ).toString('base64url'),
                },
                message: 'Invalid cursor',
            },
            { query: { cursor: 123 }, message: 'Invalid cursor' },
            { query: { sortBy: 'unknown' }, message: 'Invalid sortBy field' },
            { query: { sortOrder: 'asc' }, message: 'sortOrder requires sortBy' },
            { query: { sortBy: 'title', sortOrder: 'up' }, message: 'sortOrder must be asc or desc' },

            // Filter & Search errors
            { query: { genre: '   ' }, message: 'genre must be a non-empty string' },
            { query: { genre: 123 }, message: 'genre must be a non-empty string' },
            { query: { author: '' }, message: 'author must be a non-empty string' },
            { query: { search: '   ' }, message: 'search must be a non-empty string' },

            // Availability errors
            { query: { availability: 'yes' }, message: 'availability must be true or false' },
            { query: { availability: true }, message: 'availability must be true or false' },

        ];

        it.each(invalidCases)('rejects invalid input: %o', ({ query, message }) => {
            let error;
            try {
                buildBookQuery(query);
            } catch (err) {
                error = err;
            }

            expect(error).toBeInstanceOf(ApiError);
            expect(error.message).toContain(message);
            expect(error.statusCode).toBe(400);
        });
    });
});
