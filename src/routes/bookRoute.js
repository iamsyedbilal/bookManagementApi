import express from 'express';
import validateMiddleware from '../middlewares/validateMiddleware.js';
import { createBookSchema } from '../validations/bookValidation.js';
import { createBookController, fetchAllBooks } from '../controllers/bookController.js';

const router = express.Router();

router.route('/').get(fetchAllBooks);
router.route('/create').post(validateMiddleware(createBookSchema), createBookController);

export default router;
