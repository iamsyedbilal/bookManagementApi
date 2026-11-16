import express from 'express';
import { register, login, refresh, logout } from '../controllers/authController.js';
import validateMiddleware from '../middlewares/validateMiddleware.js';
import { registerUserSchema, loginUserSchema } from '../validations/userValidation.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

router.route('/register').post(validateMiddleware(registerUserSchema), register);
router.route('/login').post(validateMiddleware(loginUserSchema), login);
router.route('/refresh').post(refresh);
router.route('/logout').post(verifyJWT, logout);

export default router;
