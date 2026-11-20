import mongoose from 'mongoose';
import Book from '../models/bookModel.js';
import ApiError from '../utils/ApiError.js';
import { buildBookQuery } from '../utils/bookQuery.js';

// Fetch All Books

export const fetchAllBooks = async (req, res) => {
    const { filter, projection, options, limit } = buildBookQuery(req.query);

    // Fetch one extra book to check whether another page exists.
    const books = await Book.find(filter, projection).sort(options.sort).limit(options.limit).lean();

    const hasNextPage = books.length > limit;

    // Remove the extra book because it is only used for checking.
    if (hasNextPage) {
        books.pop();
    }

    const lastBook = books[books.length - 1];

    // Generate the next cursor using the last returned book.
    const nextCursor = hasNextPage
        ? Buffer.from(
              JSON.stringify({
                  createdAt: lastBook.createdAt.toISOString(),
                  id: lastBook._id.toString(),
              })
          ).toString('base64url')
        : null;

    return res.status(200).json({
        success: true,
        data: books,
        pagination: {
            limit,
            hasNextPage,
            nextCursor,
        },
    });
};

// Create Book Controller
export const createBookController = async (req, res) => {
    const newBook = await Book.create(req.body);

    return res.status(201).json(newBook);
};

// Fetch Single Book By ID
export const fetchBookById = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid book ID');
    }

    const book = await Book.findById(id).lean();

    if (!book) {
        throw new ApiError(404, 'Book not found');
    }

    return res.status(200).json(book);
};

// Update Book Controller
export const updateBookController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid Book ID');
    }

    const updatedBook = await Book.findByIdAndUpdate(id, req.body, { returnDocument: 'after', runValidators: true });

    if (!updatedBook) {
        throw new ApiError(404, 'Book not found');
    }

    return res.status(200).json(updatedBook);
};

// Delete Book Controller
export const deleteBookController = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid Book ID');
    }

    const deletedBook = await Book.findByIdAndDelete(id);

    if (!deletedBook) {
        throw new ApiError(404, 'Book not found');
    }

    return res.status(200).json({ message: 'Book deleted successfully' });
};
