import { describe, it, expect } from 'vitest';
import { createBookSchema, updateBookSchema } from '../validations/bookValidation.js';

const validBook = {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    ISBN: '978-0743273565',
    description: 'A'.repeat(150),
    publicationYear: 1925,
    genre: 'Fiction',
    availability: true,
};

describe('createBookSchema - Boundary & Behavior Tests', () => {
    // 1 & 2: Title boundaries
    it('1. passes when title has exactly 3 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            title: 'Abc',
        });
        expect(result.success).toBe(true);
    });

    it('2. fails when title has 2 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            title: 'Ab',
        });
        expect(result.success).toBe(false);
    });

    // 3 & 4: Author boundaries
    it('3. passes when author has exactly 3 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            author: 'Joe',
        });
        expect(result.success).toBe(true);
    });

    it('4. fails when author has 2 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            author: 'Jo',
        });
        expect(result.success).toBe(false);
    });

    // 5, 6, 7 & 8: Description boundaries
    it('5. passes when description has exactly 100 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            description: 'A'.repeat(100),
        });
        expect(result.success).toBe(true);
    });

    it('6. fails when description has 99 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            description: 'A'.repeat(99),
        });
        expect(result.success).toBe(false);
    });

    it('7. passes when description has exactly 500 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            description: 'A'.repeat(500),
        });
        expect(result.success).toBe(true);
    });

    it('8. fails when description has 501 characters', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            description: 'A'.repeat(501),
        });
        expect(result.success).toBe(false);
    });

    // 9, 10, 11 & 12: Publication year boundaries
    it('9. passes when publicationYear is 1900', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            publicationYear: 1900,
        });
        expect(result.success).toBe(true);
    });

    it('10. fails when publicationYear is 1899', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            publicationYear: 1899,
        });
        expect(result.success).toBe(false);
    });

    it('11. passes when publicationYear is the current year', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            publicationYear: new Date().getFullYear(),
        });
        expect(result.success).toBe(true);
    });

    it('12. fails when publicationYear is next year', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            publicationYear: new Date().getFullYear() + 1,
        });
        expect(result.success).toBe(false);
    });

    // 13 & 14: Availability boolean values
    it('13. passes when availability is true', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            availability: true,
        });
        expect(result.success).toBe(true);
    });

    it('14. passes when availability is false', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            availability: false,
        });
        expect(result.success).toBe(true);
    });

    // 15 & 16: Genre enum checks
    const allowedGenres = [
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

    it.each(allowedGenres)('15. passes for allowed genre: %s', (genre) => {
        const result = createBookSchema.safeParse({
            ...validBook,
            genre,
        });
        expect(result.success).toBe(true);
    });

    it('16. fails for an invalid genre', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            genre: 'Comics',
        });
        expect(result.success).toBe(false);
    });

    // 17 - 21: Additional schema behaviors
    it('17. passes and defaults availability to true when omitted', () => {
        const { availability, ...bookWithoutAvailability } = validBook;
        const result = createBookSchema.safeParse(bookWithoutAvailability);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.availability).toBe(true);
        }
    });

    it('18. passes and trims surrounding spaces from title', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            title: '   Clean Title   ',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe('Clean Title');
        }
    });

    it('19. fails when description contains only spaces', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            description: ' '.repeat(150),
        });
        expect(result.success).toBe(false);
    });

    it('20. fails when publicationYear is supplied as a string', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            publicationYear: '1925',
        });
        expect(result.success).toBe(false);
    });

    it('21. fails when availability is supplied as a string', () => {
        const result = createBookSchema.safeParse({
            ...validBook,
            availability: 'true',
        });
        expect(result.success).toBe(false);
    });
});

describe('updateBookSchema', () => {
    it('Update only title', () => {
        const result = updateBookSchema.safeParse({
            title: 'ABC',
        });
        expect(result.success).toBe(true);
    });

    it('Update only availability to false', () => {
        const result = updateBookSchema.safeParse({
            availability: false,
        });
        expect(result.success).toBe(true);
    });

    it('Update multiple fields', () => {
        const result = updateBookSchema.safeParse({
            title: 'ABC',
            author: 'John Fitzgerald',
        });
        expect(result.success).toBe(true);
    });

    it('Empty object', () => {
        const result = updateBookSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('Invalid title', () => {
        const result = updateBookSchema.safeParse({
            title: 'Ab',
        });
        expect(result.success).toBe(false);
    });

    it('Unknown field such as price', () => {
        const result = updateBookSchema.safeParse({
            price: 56,
        });
        expect(result.success).toBe(false);
    });

    it('Publication year as string', () => {
        const result = updateBookSchema.safeParse({
            publicationYear: '1988',
        });
        expect(result.success).toBe(false);
    });

    it('Description with 99 characters', () => {
        const result = updateBookSchema.safeParse({
            description: 'A'.repeat(99),
        });
        expect(result.success).toBe(false);
    });

    it('Description with 100 characters', () => {
        const result = updateBookSchema.safeParse({
            description: 'A'.repeat(100),
        });
        expect(result.success).toBe(true);
    });
});
