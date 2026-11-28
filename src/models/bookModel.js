import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Book title is required'],
            minlength: [3, 'Book title must be at least 3 characters long'],
            trim: true,
        },
        author: {
            type: String,
            required: [true, 'Author name is required'],
            minlength: [3, 'Author name must be at least 3 characters long'],
            trim: true,
        },
        ISBN: {
            type: String,
            required: [true, 'ISBN is required'],
            trim: true,
            unique: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            minlength: [100, 'Description must be at least 100 characters'],
            maxlength: [500, 'Description cannot exceed 500 characters'],
            trim: true,
        },
        publicationYear: {
            type: Number,
            required: [true, 'Publication year is required'],
            min: [1900, 'Invalid publication year'],
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
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Single-field index for exact title searches
bookSchema.index({ title: 1 });

// Compound index for genre and author filtering
bookSchema.index({ genre: 1, author: 1 });

// Single-field index for author-only searches
bookSchema.index({ author: 1 });
bookSchema.index({ createdAt: -1, _id: -1 });

const Book = mongoose.model('Book', bookSchema);

export default Book;
