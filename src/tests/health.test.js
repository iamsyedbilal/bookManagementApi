import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Health API', () => {
    it('should return status 200', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Book Management API is running');
        expect(response.headers['content-type']).toMatch(/json/);
    });
});
