import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Not Found API', () => {
    it('Should return status 404', async () => {
        const response = await request(app).get('/api/unknown');
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(404);
        expect(response.body.message).toBe('Route not found');
    });
});
