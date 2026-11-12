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

// Create Book Validation Schema
export const createBookSchema = z.object({
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
});

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
