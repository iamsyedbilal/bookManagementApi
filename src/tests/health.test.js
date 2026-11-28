import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { config } from '../config/config.js';

describe('Health API', () => {
    it('should return status 200', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Book Management API is running');
        expect(response.headers['content-type']).toMatch(/json/);
    });

    it('sets baseline security headers and hides the Express signature', async () => {
        const response = await request(app).get('/api/health');

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['content-security-policy']).toContain("script-src 'self'");
        expect(response.headers['content-security-policy']).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    });

    it('serves Swagger UI while applying security headers', async () => {
        const response = await request(app).get('/api-docs/');

        expect(response.status).toBe(200);
        expect(response.text).toContain('swagger-ui-bundle.js');
        expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('does not grant CORS access to untrusted origins', async () => {
        const response = await request(app).get('/api/health').set('Origin', 'https://untrusted.example');

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('allows configured origins with credentialed CORS when configured', async () => {
        if (config.corsOrigins.length === 0) return;

        const origin = config.corsOrigins[0];
        const response = await request(app).get('/api/health').set('Origin', origin);

        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });
});
