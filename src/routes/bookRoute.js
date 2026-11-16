import express from 'express';
import validateMiddleware from '../middlewares/validateMiddleware.js';
import { createBookSchema, updateBookSchema } from '../validations/bookValidation.js';
import {
    createBookController,
    deleteBookController,
    fetchAllBooks,
    fetchBookById,
    updateBookController,
} from '../controllers/bookController.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

router.route('/').get(verifyJWT, fetchAllBooks);
router.route('/:id').get(verifyJWT, fetchBookById);
router.route('/create').post(verifyJWT, validateMiddleware(createBookSchema), createBookController);
router.route('/:id').patch(verifyJWT, validateMiddleware(updateBookSchema), updateBookController);
router.route('/:id').delete(verifyJWT, deleteBookController);

export default router;
