import { z } from 'zod';

export const registerUserSchema = z.strictObject({
    name: z
        .string({ error: 'Name  is required' })
        .trim()
        .min(1, 'Name is required')
        .min(2, 'Name  must be at least 2 characters long'),
    email: z
        .string({ error: 'Email is required' })
        .trim()
        .toLowerCase()
        .pipe(z.email({ error: 'Please enter a valid email' })),
    password: z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
});
