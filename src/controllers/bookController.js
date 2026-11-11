import mongoose from 'mongoose';
import Book from '../models/bookModel.js';
import ApiError from '../utils/ApiError.js';

// Fetch All Books
export const fetchAllBooks = async (req, res) => {
    const books = await Book.find();

    return res.status(200).json(books);
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

    const book = await Book.findById(id);

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

    const updatedBook = await Book.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

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
