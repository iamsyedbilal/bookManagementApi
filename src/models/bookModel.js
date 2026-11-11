import mongoose from 'mongoose';

// Title
// Author
// ISBN
// Description
// Publication year
// Genre
// Availability

const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Book title is required'],
            trim: true,
        },
        author: {
            type: String,
            required: [true, 'Author name is required'],
            trim: true,
        },
        ISBN: {
            type: String,
            required: [true, 'ISBN is required'],
            trim: true,
        },
        description: {
            type: String,
            minlength: [100, 'Minimum 100 words is required'],
            maxlength: [500, 'Maximum 500 words is allowed'],
            required: [true, 'Description is required'],
        },
        publicationYear: {
            type: Number,
            required: [true, 'Publication year is required'],
            min: [1900, 'Publication year must be after 1900'],
            max: [new Date().getFullYear(), 'Publication year cannot be in the future'],
        },
        genre: {
            type: String,
            enum: [
                'Fiction',
                'Non-Fiction',
                'Science Fiction',
                'Fantasy',
                'Mystery',
                'Romance',
                'Biography',
                'History',
                'Self-Help',
            ],
            required: [true, 'Genre is required'],
        },
        availability: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const Book = mongoose.model('Book', bookSchema);

export default Book;
