import express from 'express';
import { register, login } from '../controllers/userController.js';
import validateMiddleware from '../middlewares/validateMiddleware.js';
import { registerUserSchema, loginUserSchema } from '../validations/userValidation.js';

const router = express.Router();

router.route('/register').post(validateMiddleware(registerUserSchema), register);
router.route('/login').post(validateMiddleware(loginUserSchema), login);

export default router;
