import { z } from 'zod';

const GENRES = [
    'Fiction',
    'Non-Fiction',
    'Science Fiction',
    'Fantasy',
    'Mystery',
    'Romance',
    'Biography',
    'History',
    'Self-Help',
];

const SORTABLE_BOOK_FIELDS = ['title', 'author', 'genre', 'availability', 'createdAt', 'updatedAt'];

const decodeBookCursor = (cursor, sortBy, sortOrder) => {
    try {
        if (!/^[A-Za-z0-9_-]+$/.test(cursor) || Buffer.from(cursor, 'base64url').toString('base64url') !== cursor) {
            return null;
        }

        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        const isDateSort = ['createdAt', 'updatedAt'].includes(sortBy);
        const validValue = isDateSort
            ? typeof decoded.value === 'string' &&
              !Number.isNaN(Date.parse(decoded.value)) &&
              new Date(decoded.value).toISOString() === decoded.value
            : sortBy === 'availability'
              ? typeof decoded.value === 'boolean'
              : typeof decoded.value === 'string' && decoded.value.length > 0;

        if (
            !decoded ||
            typeof decoded !== 'object' ||
            Array.isArray(decoded) ||
            decoded.sortBy !== sortBy ||
            decoded.sortOrder !== sortOrder ||
            !validValue ||
            typeof decoded.id !== 'string' ||
            !/^[a-f\d]{24}$/i.test(decoded.id)
        ) {
            return null;
        }

        return {
            value: isDateSort ? new Date(decoded.value) : decoded.value,
            id: decoded.id,
        };
    } catch {
        return null;
    }
};

const bookQueryInputSchema = z
    .object({
        search: z
            .string({ error: 'search must be a non-empty string' })
            .trim()
            .min(1, 'search must be a non-empty string')
            .optional(),
        genre: z
            .string({ error: 'genre must be a non-empty string' })
            .trim()
            .min(1, 'genre must be a non-empty string')
            .optional(),
        author: z
            .string({ error: 'author must be a non-empty string' })
            .trim()
            .min(1, 'author must be a non-empty string')
            .optional(),
        availability: z.enum(['true', 'false'], { error: 'availability must be true or false' }).optional(),
        sortBy: z.enum(SORTABLE_BOOK_FIELDS, { error: 'Invalid sortBy field' }).optional(),
        sortOrder: z
            .string({ error: 'sortOrder must be asc or desc' })
            .transform((value) => value.toLowerCase())
            .pipe(z.enum(['asc', 'desc'], { error: 'sortOrder must be asc or desc' }))
            .optional(),
        limit: z
            .string({ error: 'limit must be a positive integer' })
            .regex(/^[1-9]\d*$/, 'limit must be a positive integer')
            .transform(Number)
            .refine(Number.isSafeInteger, 'limit is out of range')
            .refine((value) => value <= 100, 'limit is out of range')
            .optional(),
        cursor: z.string({ error: 'Invalid cursor' }).trim().min(1, 'Invalid cursor').optional(),
    })
    .strict()
    .superRefine((query, context) => {
        if (query.sortOrder !== undefined && query.sortBy === undefined) {
            context.addIssue({
                code: 'custom',
                path: ['sortOrder'],
                message: 'sortOrder requires sortBy',
            });
        }
    });

export const bookQuerySchema = bookQueryInputSchema.transform((query, context) => {
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? (query.sortBy === undefined ? 'desc' : 'asc');
    let cursor;

    if (query.cursor !== undefined) {
        cursor = decodeBookCursor(query.cursor, sortBy, sortOrder);

        if (!cursor) {
            context.addIssue({
                code: 'custom',
                path: ['cursor'],
                message: 'Invalid cursor',
            });
        }
    }

    return {
        ...query,
        sortBy,
        sortOrder,
        limit: query.limit ?? 10,
        cursor,
    };
});

// Create Book Validation Schema
export const createBookSchema = z
    .object({
        title: z
            .string({ error: 'Book title is required' })
            .trim()
            .min(1, 'Book title is required')
            .min(3, 'Book title must be at least 3 characters long'),
        author: z
            .string({ error: 'Author name is required' })
            .trim()
            .min(1, 'Author name is required')
            .min(3, 'Author name must be at least 3 characters long'),
        ISBN: z.string({ error: 'ISBN is required' }).trim().min(1, 'ISBN is required'),
        description: z
            .string({ error: 'Description is required' })
            .trim()
            .min(1, 'Description is required')
            .min(100, 'Description must be at least 100 characters')
            .max(500, 'Description cannot exceed 500 characters'),
        publicationYear: z
            .number({ error: 'Publication year is required' })
            .min(1900, 'Invalid publication year')
            .max(new Date().getFullYear(), 'Publication year cannot be in the future'),
        genre: z.enum(GENRES, { error: 'Genre is required' }),
        availability: z.boolean().default(true),
    })
    .strict();

// Update Book Validation Schema
export const updateBookSchema = createBookSchema
    .omit({ availability: true })
    .extend({
        availability: z.boolean(),
    })
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update',
    });
