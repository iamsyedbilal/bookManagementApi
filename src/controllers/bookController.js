import mongoose from 'mongoose';
import Book from '../models/bookModel.js';

// Fetch All Books
export const fetchAllBooks = async (req, res) => {
    try {
        const books = await Book.find();

        return res.status(200).json(books);
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create Book Controller
export const createBookController = async (req, res) => {
    try {
        const newBook = await Book.create(req.body);

        return res.status(201).json(newBook);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation failed', details: error.message });
        }

        console.error('Error creating book:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Fetch Single Book By ID
export const fetchBookById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid book ID' });
        }

        const book = await Book.findById(id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        return res.status(200).json(book);
    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update Book Controller
export const updateBookController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid Book ID' });
        }

        const updatedBook = await Book.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

        if (!updatedBook) {
            return res.status(404).json({ message: 'No book found' });
        }

        return res.status(200).json(updatedBook);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation failed', details: error.message });
        }

        console.error('Error updating book:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete Book Controller
export const deleteBookController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid Book ID' });
        }

        const deletedBook = await Book.findByIdAndDelete(id);

        if (!deletedBook) {
            return res.status(404).json({ message: 'No book found' });
        }

        return res.status(200).json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
