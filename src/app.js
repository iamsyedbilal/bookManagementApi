import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandlerMiddleware } from './middlewares/errorMiddleware.js';
import { notFoundMiddleware } from './middlewares/notFoundMiddleware.js';
// Routes Imports
import healthRoute from './routes/healthRoute.js';
import bookRoute from './routes/bookRoute.js';
import userRoute from './routes/authRoute.js';
import swaggerRoute from './docs/swagger.js';
import { config } from './config/config.js';

const app = express();

app.disable('x-powered-by');
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                'upgrade-insecure-requests': config.env === 'production' ? [] : null,
            },
        },
    })
);
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || config.corsOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        credentials: true,
    })
);
app.use(
    express.json({
        limit: '1mb',
    })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Routes
app.use('/api/health', healthRoute);
app.use('/api/books', bookRoute);
app.use('/api/auth', userRoute);
app.use('/api-docs', swaggerRoute);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
