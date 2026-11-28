import mongoose from 'mongoose';
import ApiError from './ApiError.js';
import { bookQuerySchema } from '../validations/bookValidation.js';

// Escape special regex characters in user input.
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Build search and filtering conditions.
const buildBookFilter = (query) => {
    const filter = {};

    // Filter by genre and author.
    for (const field of ['genre', 'author']) {
        const value = query[field];

        if (value === undefined) continue;

        if (typeof value !== 'string' || !value.trim()) {
            throw new ApiError(400, `${field} must be a non-empty string`);
        }

        filter[field] = {
            $regex: `^${escapeRegex(value.trim())}$`,
            $options: 'i',
        };
    }

    // Search by title or author.
    if (query.search !== undefined) {
        if (typeof query.search !== 'string' || !query.search.trim()) {
            throw new ApiError(400, 'search must be a non-empty string');
        }

        const search = escapeRegex(query.search.trim());

        filter.$or = [{ title: { $regex: search, $options: 'i' } }, { author: { $regex: search, $options: 'i' } }];
    }

    if (query.availability !== undefined) {
        filter.availability = query.availability === 'true';
    }

    return filter;
};

// Add cursor conditions while preserving existing filters.
const addCursorFilter = (filter, cursor, sortBy, sortOrder) => {
    const comparison = sortOrder === 'asc' ? '$gt' : '$lt';
    const cursorId = new mongoose.Types.ObjectId(cursor.id);

    filter.$and = [
        ...(filter.$and ?? []),
        {
            $or: [
                { [sortBy]: { [comparison]: cursor.value } },
                {
                    [sortBy]: cursor.value,
                    _id: { [comparison]: cursorId },
                },
            ],
        },
    ];
};

// Build the complete book query.
export const buildBookQuery = (query) => {
    const result = bookQuerySchema.safeParse(query);

    if (!result.success) {
        throw new ApiError(400, result.error.issues[0].message);
    }

    const validatedQuery = result.data;
    const { sortBy, sortOrder, limit } = validatedQuery;
    const direction = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: direction, _id: direction };
    const filter = buildBookFilter(validatedQuery);

    // Decode cursor only when the client provides one.
    if (validatedQuery.cursor !== undefined) {
        addCursorFilter(filter, validatedQuery.cursor, sortBy, sortOrder);
    }

    return {
        filter,

        // Fields returned to the client.
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
            sort,
            limit: limit + 1,
        },

        limit,
        sortBy,
        sortOrder,
    };
};
