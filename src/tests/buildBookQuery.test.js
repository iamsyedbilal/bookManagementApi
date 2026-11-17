import { describe, it, expect } from 'vitest'; // If using Jest, swap 'vitest' with '@jest/globals'
import { buildBookQuery } from '../utils/bookQuery.js'; // Update path to your file
import ApiError from '../utils/ApiError.js';

describe('buildBookQuery', () => {
    // 1. Default pagination
    describe('1. Default pagination', () => {
        it('returns default pagination, empty filter, and default sort when query is empty', () => {
            const result = buildBookQuery({});

            expect(result).toEqual({
                filter: {},
                options: {
                    sort: { createdAt: -1, _id: -1 },
                    skip: 0,
                    limit: 10,
                    lean: true,
                },
                page: 1,
            });
        });
    });

    // 2. Custom page and limit
    describe('2. Custom page and limit', () => {
        it('calculates skip and limit accurately for valid page and limit strings', () => {
            const result = buildBookQuery({ page: '3', limit: '25' });

            expect(result.page).toBe(3);
            expect(result.options.limit).toBe(25);
            expect(result.options.skip).toBe(50);
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

    // 7. Sorting ascending and descending
    describe('7. Sorting ascending and descending', () => {
        it('defaults to ascending when sortBy is provided without order', () => {
            const result = buildBookQuery({ sortBy: 'title' });
            expect(result.options.sort).toEqual({ title: 1, _id: 1 });
        });

        it('sorts ascending and descending using sortBy and sortOrder/order', () => {
            const ascResult = buildBookQuery({ sortBy: 'author', sortOrder: 'ASC' });
            const descResult = buildBookQuery({ sortBy: 'genre', order: 'desc' });

            expect(ascResult.options.sort).toEqual({ author: 1, _id: 1 });
            expect(descResult.options.sort).toEqual({ genre: -1, _id: -1 });
        });

        it('sorts ascending and descending using +/- shorthand prefixes', () => {
            const ascResult = buildBookQuery({ sort: '+title' });
            const descResult = buildBookQuery({ sort: '-updatedAt' });

            expect(ascResult.options.sort).toEqual({ title: 1, _id: 1 });
            expect(descResult.options.sort).toEqual({ updatedAt: -1, _id: -1 });
        });
    });

    // 8. Invalid query parameters
    describe('8. Invalid query parameters', () => {
        const invalidCases = [
            // Pagination errors
            { query: { page: '0' }, message: 'page must be a positive integer' },
            { query: { page: '-2' }, message: 'page must be a positive integer' },
            { query: { page: '1.5' }, message: 'page must be a positive integer' },
            { query: { page: 'abc' }, message: 'page must be a positive integer' },
            { query: { page: 2 }, message: 'page must be a positive integer' },
            { query: { page: '99999999999999999999' }, message: 'page is out of range' },
            { query: { limit: '0' }, message: 'limit must be a positive integer' },
            { query: { limit: '101' }, message: 'limit is out of range' },

            // Filter & Search errors
            { query: { genre: '   ' }, message: 'genre must be a non-empty string' },
            { query: { genre: 123 }, message: 'genre must be a non-empty string' },
            { query: { author: '' }, message: 'author must be a non-empty string' },
            { query: { search: '   ' }, message: 'search must be a non-empty string' },

            // Availability errors
            { query: { availability: 'yes' }, message: 'availability must be true or false' },
            { query: { availability: true }, message: 'availability must be true or false' },

            // Sorting errors
            { query: { sortBy: 'password' }, message: 'Invalid sortBy field' },
            { query: { sort: '-unknownField' }, message: 'Invalid sortBy field' },
            { query: { sortBy: 'title', sortOrder: 'up' }, message: 'sort order must be asc or desc' },
        ];

        it.each(invalidCases)('throws ApiError(400) for $query', ({ query, message }) => {
            expect(() => buildBookQuery(query)).toThrow(ApiError);
            expect(() => buildBookQuery(query)).toThrow(message);

            try {
                buildBookQuery(query);
            } catch (err) {
                expect(err.statusCode).toBe(400);
            }
        });
    });
});
