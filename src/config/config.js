import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const optionalEnv = z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().min(1).optional());

const isMongoConnectionString = (value) => {
    try {
        const url = new URL(value);
        return ['mongodb:', 'mongodb+srv:'].includes(url.protocol) && Boolean(url.hostname);
    } catch {
        return false;
    }
};

const corsOriginSchema = z
    .string()
    .trim()
    .refine((value) => {
        try {
            const url = new URL(value);
            return (
                ['http:', 'https:'].includes(url.protocol) &&
                !url.username &&
                !url.password &&
                url.pathname === '/' &&
                !url.search &&
                !url.hash
            );
        } catch {
            return false;
        }
    }, 'must be an HTTP(S) origin without a path, query, or fragment')
    .transform((value) => new URL(value).origin);

const environmentSchema = z
    .object({
        PORT: z
            .string()
            .regex(/^\d+$/, 'must be a valid port')
            .transform(Number)
            .pipe(z.number().int().min(1).max(65535)),
        MONGO_CONNECTION_STRING: z.string().trim().refine(isMongoConnectionString, 'must be a valid MongoDB URI'),
        DB_NAME: z
            .string()
            .trim()
            .min(1, 'is required')
            .refine(
                (value) => !/[./\\ "$*<>:|?]/.test(value),
                'contains characters not allowed in a MongoDB database name'
            ),
        NODE_ENV: z.enum(['development', 'test', 'production']),
        ACCESS_TOKEN_SECRET: z.string().min(32, 'must contain at least 32 characters'),
        REFRESH_TOKEN_SECRET: z.string().min(32, 'must contain at least 32 characters'),
        ADMIN_NAME: optionalEnv,
        ADMIN_EMAIL: optionalEnv.pipe(z.string().email().optional()),
        ADMIN_PASSWORD: optionalEnv.pipe(z.string().min(8).optional()),
        CORS_ORIGINS: z
            .string()
            .default('')
            .transform((value) =>
                value
                    .split(',')
                    .map((origin) => origin.trim())
                    .filter(Boolean)
            )
            .pipe(z.array(corsOriginSchema))
            .transform((origins) => [...new Set(origins)]),
    })
    .superRefine((environment, context) => {
        if (environment.ACCESS_TOKEN_SECRET === environment.REFRESH_TOKEN_SECRET) {
            context.addIssue({
                code: 'custom',
                path: ['REFRESH_TOKEN_SECRET'],
                message: 'must differ from ACCESS_TOKEN_SECRET',
            });
        }

        const adminValues = [environment.ADMIN_NAME, environment.ADMIN_EMAIL, environment.ADMIN_PASSWORD];
        if (adminValues.some(Boolean) && !adminValues.every(Boolean)) {
            context.addIssue({
                code: 'custom',
                path: ['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'],
                message: 'ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be configured together',
            });
        }
    });

export const loadConfig = (environment = process.env) => {
    const result = environmentSchema.safeParse(environment);

    if (!result.success) {
        const details = result.error.issues
            .map(({ path, message }) => `${path.join('.') || 'environment'}: ${message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${details}`);
    }

    const values = result.data;
    return Object.freeze({
        port: values.PORT,
        databaseUrl: values.MONGO_CONNECTION_STRING,
        dbName: values.DB_NAME,
        env: values.NODE_ENV,
        accessToken: values.ACCESS_TOKEN_SECRET,
        refreshToken: values.REFRESH_TOKEN_SECRET,
        adminName: values.ADMIN_NAME,
        adminEmail: values.ADMIN_EMAIL,
        adminPassword: values.ADMIN_PASSWORD,
        corsOrigins: values.CORS_ORIGINS,
    });
};

export const config = loadConfig();
