import mongoose from 'mongoose';
import ApiError from './ApiError.js';

// Validate positive integers from query parameters.
const parseQueryInteger = (value, name, defaultValue, max = 100) => {
    if (value === undefined) return defaultValue;

    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        throw new ApiError(400, `${name} must be a positive integer`);
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number > max) {
        throw new ApiError(400, `${name} is out of range`);
    }

    return number;
};

// Escape special regex characters in user input.
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Decode and validate the cursor.
const decodeCursor = (value) => {
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

        if (
            typeof decoded.createdAt !== 'string' ||
            Number.isNaN(Date.parse(decoded.createdAt)) ||
            typeof decoded.id !== 'string' ||
            !mongoose.Types.ObjectId.isValid(decoded.id)
        ) {
            throw new Error();
        }

        return {
            createdAt: new Date(decoded.createdAt),
            id: new mongoose.Types.ObjectId(decoded.id),
        };
    } catch {
        throw new ApiError(400, 'Invalid cursor');
    }
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

    // Filter by availability.
    if (query.availability !== undefined) {
        if (!['true', 'false'].includes(query.availability)) {
            throw new ApiError(400, 'availability must be true or false');
        }

        filter.availability = query.availability === 'true';
    }

    return filter;
};

// Add cursor conditions while preserving existing filters.
const addCursorFilter = (filter, cursor) => {
    filter.$and = [
        ...(filter.$and ?? []),
        {
            $or: [
                { createdAt: { $lt: cursor.createdAt } },
                {
                    createdAt: cursor.createdAt,
                    _id: { $lt: cursor.id },
                },
            ],
        },
    ];
};

// Build the complete book query.
export const buildBookQuery = (query) => {
    const limit = parseQueryInteger(query.limit, 'limit', 10);

    const filter = buildBookFilter(query);

    // Decode cursor only when the client provides one.
    if (query.cursor !== undefined) {
        if (typeof query.cursor !== 'string' || !query.cursor.trim()) {
            throw new ApiError(400, 'Invalid cursor');
        }

        const cursor = decodeCursor(query.cursor);

        addCursorFilter(filter, cursor);
    }

    return {
        filter,

        // Fields returned to the client.
        projection: {
            _id: 1,
            title: 1,
            author: 1,
            ISBN: 1,
            publicationYear: 1,
            genre: 1,
            availability: 1,
            createdAt: 1,
        },

        // Fixed sorting ensures consistent cursor pagination.
        options: {
            sort: { createdAt: -1, _id: -1 },
            limit: limit + 1,
        },

        limit,
    };
};
