import mongoose from 'mongoose';
import Book from '../models/bookModel.js';
import ApiError from '../utils/ApiError.js';
import { buildBookQuery } from '../utils/bookQuery.js';

// Fetch All Books

export const fetchAllBooks = async (req, res) => {
    const { filter, projection, options, limit } = buildBookQuery(req.query);

    // Build the aggregation pipeline.
    const pipeline = [
        { $match: filter },
        { $sort: options.sort },
        { $limit: options.limit },
    ];

    // Apply projection while preserving fields needed for cursor pagination.
    if (projection) {
        const aggregateProjection =
            typeof projection === 'string'
                ? Object.fromEntries(
                      projection
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((field) => {
                              const excluded = field.startsWith('-');

                              return [
                                  excluded ? field.slice(1) : field,
                                  excluded ? 0 : 1,
                              ];
                          })
                  )
                : { ...projection };

        // Cursor generation requires these fields.
        aggregateProjection._id = 1;
        aggregateProjection.createdAt = 1;

        pipeline.push({ $project: aggregateProjection });
    }

    const books = await Book.aggregate(pipeline);

    // An extra document tells us whether another page exists.
    const hasNextPage = books.length > limit;

    if (hasNextPage) {
        books.pop();
    }

    const lastBook = books[books.length - 1];

    // Generate cursor from the last returned document.
    const nextCursor =
        hasNextPage && lastBook
            ? Buffer.from(
                  JSON.stringify({
                      createdAt: lastBook.createdAt.toISOString(),
                      id: lastBook._id.toString(),
                  })
              ).toString('base64url')
            : null;

    // Remove the internal field from the public response.
    const responseBooks = books.map(({ createdAt, ...book }) => book);

    return res.status(200).json({
        success: true,
        data: responseBooks,
         pagination: {
            totalRecords: total,
            totalPages,
            currentPage: page,
            limit,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
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


// GET BOOK GENRE STATS
export const getBookGenreStats = async (req, res) => {
    const stats = await Book.aggregate([
        {
            $group: {
                _id: "$genre",
                totalBooks: { $sum: 1 },
                averagePublicationYear: {
                    $avg: "$publicationYear",
                },
            },
        },
        {
            $sort: {
                totalBooks: -1,
            },
        },
        {
            $project: {
                _id: 0,
                genre: "$_id",
                totalBooks: 1,
                averagePublicationYear: 1,
            },
        },
    ]);

    return res.status(200).json({
        success: true,
        message: "Book genre statistics fetched successfully",
        data: stats,
    });
};


// GET Book With User Details
export const getBooksWithUserDetails = async (req, res) => {
    const books = await Book.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "addedBy",
                foreignField: "_id",
                as: "userDetails",
            },
        },
        {
            $unwind: "$userDetails",
        },
        {
            $project: {
                title: 1,
                author: 1,
                ISBN: 1,
                genre: 1,
                publicationYear: 1,
                availability: 1,
                addedBy: {
                    _id: "$userDetails._id",
                    name: "$userDetails.name",
                    email: "$userDetails.email",
                },
            },
        },
    ]);

    return res.status(200).json({
        success: true,
        message: "Books with user details fetched successfully",
        data: books,
    });
};

