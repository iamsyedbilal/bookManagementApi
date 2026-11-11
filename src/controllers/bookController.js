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
