import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/config.js';

const validEnvironment = {
    PORT: '3000',
    MONGO_CONNECTION_STRING: 'mongodb://127.0.0.1:27017',
    DB_NAME: 'book_management',
    NODE_ENV: 'test',
    ACCESS_TOKEN_SECRET: 'a'.repeat(48),
    REFRESH_TOKEN_SECRET: 'b'.repeat(48),
    CORS_ORIGINS: 'http://localhost:5173, https://books.example.com',
};

describe('loadConfig', () => {
    it('parses valid environment values and normalizes trusted origins', () => {
        const config = loadConfig(validEnvironment);

        expect(config.port).toBe(3000);
        expect(config.env).toBe('test');
        expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://books.example.com']);
    });

    it.each([
        { environment: { ...validEnvironment, PORT: '70000' }, expectedKey: 'PORT' },
        {
            environment: { ...validEnvironment, MONGO_CONNECTION_STRING: 'not-a-mongodb-uri' },
            expectedKey: 'MONGO_CONNECTION_STRING',
        },
        { environment: { ...validEnvironment, ACCESS_TOKEN_SECRET: 'too-short' }, expectedKey: 'ACCESS_TOKEN_SECRET' },
        {
            environment: { ...validEnvironment, CORS_ORIGINS: 'https://books.example.com/api' },
            expectedKey: 'CORS_ORIGINS',
        },
        { environment: { ...validEnvironment, NODE_ENV: undefined }, expectedKey: 'NODE_ENV' },
    ])('rejects invalid configuration for $expectedKey', ({ environment, expectedKey }) => {
        expect(() => loadConfig(environment)).toThrow(expectedKey);
    });

    it('requires distinct access and refresh token secrets without echoing their values', () => {
        const secret = 'same-secret-value-that-is-long-enough-123456';
        let error;

        try {
            loadConfig({
                ...validEnvironment,
                ACCESS_TOKEN_SECRET: secret,
                REFRESH_TOKEN_SECRET: secret,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        expect(error.message).toMatch(/REFRESH_TOKEN_SECRET/);
        expect(error.message).not.toContain(secret);
    });

    it('requires administrator seed values to be configured together', () => {
        expect(() =>
            loadConfig({
                ...validEnvironment,
                ADMIN_EMAIL: 'admin@example.com',
            })
        ).toThrow(/ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD/);
    });
});
