import ApiError from './ApiError.js';
import mongoose from 'mongoose';

// Validate and parse pagination numbers
const parseQueryInteger = (value, name, defaultValue, max = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined) return defaultValue;

    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        throw new ApiError(400, `${name} must be a positive integer`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed > max) {
        throw new ApiError(400, `${name} is out of range`);
    }

    return parsed;
};

// Escape special regex characters
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Decode and validate cursor
const decodeCursor = (cursor) => {
    try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));

        if (
            typeof decoded.createdAt !== 'string' ||
            Number.isNaN(Date.parse(decoded.createdAt)) ||
            typeof decoded.id !== 'string' ||
            !mongoose.Types.ObjectId.isValid(decoded.id)
        ) {
            throw new Error('Invalid cursor');
        }

        return {
            createdAt: new Date(decoded.createdAt),
            id: new mongoose.Types.ObjectId(decoded.id),
        };
    } catch {
        throw new ApiError(400, 'Invalid cursor');
    }
};

// Build the complete book query
export const buildBookQuery = (query) => {
    const limit = parseQueryInteger(query.limit, 'limit', 10, 100);

    const isCursorMode = query.cursor !== undefined;

    if (isCursorMode && query.page !== undefined) {
        throw new ApiError(400, 'page and cursor cannot be used together');
    }

    // Filtering
    const filter = {};

    for (const field of ['genre', 'author']) {
        const value = query[field];

        if (value !== undefined) {
            if (typeof value !== 'string' || value.trim() === '') {
                throw new ApiError(400, `${field} must be a non-empty string`);
            }

            filter[field] = {
                $regex: `^${escapeRegex(value.trim())}$`,
                $options: 'i',
            };
        }
    }

    // Searching
    if (query.search !== undefined) {
        if (typeof query.search !== 'string' || query.search.trim() === '') {
            throw new ApiError(400, 'search must be a non-empty string');
        }

        const searchRegex = escapeRegex(query.search.trim());

        filter.$or = [
            { title: { $regex: searchRegex, $options: 'i' } },
            { author: { $regex: searchRegex, $options: 'i' } },
        ];
    }

    // Availability filtering
    if (query.availability !== undefined) {
        if (query.availability !== 'true' && query.availability !== 'false') {
            throw new ApiError(400, 'availability must be true or false');
        }

        filter.availability = query.availability === 'true';
    }

    // Sorting
    const allowedSortFields = new Set(['title', 'author', 'genre', 'availability', 'createdAt', 'updatedAt']);

    const sortBy = query.sortBy ?? (typeof query.sort === 'string' ? query.sort.replace(/^[-+]/, '') : undefined);

    const rawSortOrder = query.sortOrder ?? query.order;

    let sort;

    if (sortBy === undefined) {
        sort = { createdAt: -1, _id: -1 };
    } else {
        if (typeof sortBy !== 'string' || !allowedSortFields.has(sortBy)) {
            throw new ApiError(400, 'Invalid sortBy field');
        }

        let direction;

        if (typeof query.sort === 'string' && /^[-+]/.test(query.sort)) {
            direction = query.sort.startsWith('-') ? 'desc' : 'asc';
        } else if (rawSortOrder !== undefined) {
            direction = typeof rawSortOrder === 'string' ? rawSortOrder.toLowerCase() : '';
        } else {
            direction = 'asc';
        }

        if (direction !== 'asc' && direction !== 'desc') {
            throw new ApiError(400, 'sort order must be asc or desc');
        }

        const sortDirection = direction === 'asc' ? 1 : -1;

        sort = {
            [sortBy]: sortDirection,
            _id: sortDirection,
        };
    }

    // Cursor pagination supports the default latest-first sorting only
    if (isCursorMode && sortBy !== undefined) {
        throw new ApiError(400, 'Cursor pagination currently supports default sorting only');
    }

    // Cursor filter: createdAt descending, then _id descending
    if (isCursorMode) {
        if (typeof query.cursor !== 'string' || query.cursor.trim() === '') {
            throw new ApiError(400, 'Invalid cursor');
        }

        const cursor = decodeCursor(query.cursor);

        const cursorCondition = {
            $or: [
                { createdAt: { $lt: cursor.createdAt } },
                {
                    createdAt: cursor.createdAt,
                    _id: { $lt: cursor.id },
                },
            ],
        };

        // Keep cursor conditions separate from search's $or
        filter.$and = [...(filter.$and ?? []), cursorCondition];
    }

    // Cursor mode
    if (isCursorMode || query.page === undefined) {
        return {
            filter,
            mode: 'cursor',
            options: {
                sort: { createdAt: -1, _id: -1 },
                limit: limit + 1,
                lean: true,
            },
            limit,
        };
    }

    // Existing offset pagination
    const page = parseQueryInteger(query.page, 'page', 1);

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
        throw new ApiError(400, 'page is out of range');
    }

    return {
        filter,
        mode: 'offset',
        options: {
            sort,
            skip,
            limit,
            lean: true,
        },
        page,
        limit,
    };
};
