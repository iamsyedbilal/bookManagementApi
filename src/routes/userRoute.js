import express from 'express';
import { register } from '../controllers/userController.js';
import validateMiddleware from '../middlewares/validateMiddleware.js';
import { registerUserSchema } from '../validations/userValidation.js';

const router = express.Router();

router.route('/register').post(validateMiddleware(registerUserSchema), register);

export default router;
