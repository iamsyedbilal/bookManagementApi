import express from 'express';
import validateMiddleware from '../middlewares/validateMiddleware.js';
import { createBookSchema, updateBookSchema } from '../validations/bookValidation.js';
import {
    createBookController,
    fetchAllBooks,
    fetchBookById,
    updateBookController,
} from '../controllers/bookController.js';

const router = express.Router();

router.route('/').get(fetchAllBooks);
router.route('/:id').get(fetchBookById);
router.route('/create').post(validateMiddleware(createBookSchema), createBookController);
router.route('/:id').patch(validateMiddleware(updateBookSchema), updateBookController);

export default router;
