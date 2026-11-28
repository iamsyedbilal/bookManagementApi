import mongoose from 'mongoose';
import ApiError from './ApiError.js';

const SORTABLE_FIELDS = ['title', 'author', 'genre', 'availability', 'createdAt', 'updatedAt'];
const DATE_SORT_FIELDS = ['createdAt', 'updatedAt'];

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

// Decode and validate a cursor for the requested sort.
const decodeCursor = (value, sortBy, sortOrder) => {
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        const isDateSort = DATE_SORT_FIELDS.includes(sortBy);
        const validSortValue = isDateSort
            ? typeof decoded.value === 'string' &&
              !Number.isNaN(Date.parse(decoded.value)) &&
              new Date(decoded.value).toISOString() === decoded.value
            : sortBy === 'availability'
              ? typeof decoded.value === 'boolean'
              : typeof decoded.value === 'string' && decoded.value.length > 0;

        if (
            decoded.sortBy !== sortBy ||
            decoded.sortOrder !== sortOrder ||
            !validSortValue ||
            typeof decoded.id !== 'string' ||
            !mongoose.Types.ObjectId.isValid(decoded.id)
        ) {
            throw new Error();
        }

        return {
            value: isDateSort ? new Date(decoded.value) : decoded.value,
            id: new mongoose.Types.ObjectId(decoded.id),
        };
    } catch {
        throw new ApiError(400, 'Invalid cursor');
    }
};

const parseSort = (query) => {
    if (query.sort !== undefined || query.order !== undefined) {
        throw new ApiError(400, 'Use sortBy and sortOrder query parameters');
    }

    const sortBy = query.sortBy ?? 'createdAt';

    if (typeof sortBy !== 'string' || !SORTABLE_FIELDS.includes(sortBy)) {
        throw new ApiError(400, 'Invalid sortBy field');
    }

    if (query.sortOrder !== undefined && query.sortBy === undefined) {
        throw new ApiError(400, 'sortOrder requires sortBy');
    }

    let sortOrder = query.sortOrder ?? (query.sortBy === undefined ? 'desc' : 'asc');

    if (typeof sortOrder !== 'string' || !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
        throw new ApiError(400, 'sortOrder must be asc or desc');
    }

    sortOrder = sortOrder.toLowerCase();
    const direction = sortOrder === 'asc' ? 1 : -1;

    return {
        sortBy,
        sortOrder,
        sort: { [sortBy]: direction, _id: direction },
    };
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
const addCursorFilter = (filter, cursor, sortBy, sortOrder) => {
    const comparison = sortOrder === 'asc' ? '$gt' : '$lt';

    filter.$and = [
        ...(filter.$and ?? []),
        {
            $or: [
                { [sortBy]: { [comparison]: cursor.value } },
                {
                    [sortBy]: cursor.value,
                    _id: { [comparison]: cursor.id },
                },
            ],
        },
    ];
};

// Build the complete book query.
export const buildBookQuery = (query) => {
    const { sortBy, sortOrder, sort } = parseSort(query);
    const limit = parseQueryInteger(query.limit, 'limit', 10);

    const filter = buildBookFilter(query);

    // Decode cursor only when the client provides one.
    if (query.cursor !== undefined) {
        if (typeof query.cursor !== 'string' || !query.cursor.trim()) {
            throw new ApiError(400, 'Invalid cursor');
        }

        const cursor = decodeCursor(query.cursor, sortBy, sortOrder);

        addCursorFilter(filter, cursor, sortBy, sortOrder);
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
