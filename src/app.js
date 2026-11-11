import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorHandlerMiddleware } from './middlewares/errorMiddleware.js';
import { notFoundMiddleware } from './middlewares/notFoundMiddleware.js';
// Routes Imports
import healthRoute from './routes/healthRoute.js';
import bookRoute from './routes/bookRoute.js';

const app = express();

app.use(
    cors({
        allowedHeaders: ['Content-Type', 'Authorization'],
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
