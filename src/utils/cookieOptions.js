import { config } from '../config/config.js';

export const refreshCookieOptions = {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
