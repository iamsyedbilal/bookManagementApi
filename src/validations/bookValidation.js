import { z } from 'zod';

export const createBookSchema = z.object({
    title: z.string().trim().min(3, 'Book title is required'),
    author: z.string().trim().min(3, 'Author name is required'),
    ISBN: z.string().trim().min(1, 'ISBN is required'),
    description: z
        .string()
        .trim()
        .min(100, 'Description must be at least 100 characters')
        .max(500, 'Description cannot exceed 500 characters'),
    publicationYear: z
        .number()
        .min(1900, 'Invalid publication year')
        .max(new Date().getFullYear(), 'Publication year cannot be in the future'),
    genre: z.enum([
        'Fiction',
        'Non-Fiction',
        'Science Fiction',
        'Fantasy',
        'Mystery',
        'Romance',
        'Biography',
        'History',
        'Self-Help',
    ]),
    availability: z.boolean().default(true),
});
