import mongoose from 'mongoose';
import Book from '../models/bookModel.js';
import ApiError from '../utils/ApiError.js';

// Fetch All Books
export const fetchAllBooks = async (req, res) => {
    const parseQueryInteger = (value, name, defaultValue, max = Number.MAX_SAFE_INTEGER) => {
        if (value === undefined) return defaultValue;
        if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
            throw new ApiError(400, `${name} must be a positive integer`);
        }

        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed > max) {
            throw new ApiError(400, `${name} is out of range`);
        }
        return parsed;
    };

    const page = parseQueryInteger(req.query.page, 'page', 1);
    const limit = parseQueryInteger(req.query.limit, 'limit', 10, 100);

    if (!Number.isSafeInteger((page - 1) * limit)) {
        throw new ApiError(400, 'page is out of range');
    }
    const filter = {};

    const escapeRegex = (value) => {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    for (const field of ['genre', 'author']) {
        const value = req.query[field];
        if (value !== undefined) {
            if (typeof value !== 'string' || value.trim() === '') {
                throw new ApiError(400, `${field} must be a non-empty string`);
            }
            filter[field] = {
                $regex: `^${escapeRegex(value.trim())}$`,
                $options: 'i',
            };
        }
    }

    if (req.query.search !== undefined) {
        if (typeof req.query.search !== 'string' || req.query.search.trim() === '') {
            throw new ApiError(400, 'search must be a non-empty string');
        }

        const searchRegex = escapeRegex(req.query.search.trim());
        filter.$or = [
            { title: { $regex: searchRegex, $options: 'i' } },
            { author: { $regex: searchRegex, $options: 'i' } },
        ];
    }

    if (req.query.availability !== undefined) {
        if (req.query.availability !== 'true' && req.query.availability !== 'false') {
            throw new ApiError(400, 'availability must be true or false');
        }
        filter.availability = req.query.availability === 'true';
    }

    const options = {
        sort: { createdAt: -1, _id: -1 }, // Required by findAndCount()
        skip: (page - 1) * limit,
        limit,
        lean: true, // Optional: returns plain JS objects for faster reads
    };

    const [books, total] = await Book.findAndCount(filter, null, options);

    return res.status(200).json({
        success: true,
        data: books,
        pagination: {
            totalRecords: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit,
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
