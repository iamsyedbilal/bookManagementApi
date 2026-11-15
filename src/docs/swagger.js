import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '../config/config.js';

const router = express.Router();

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Book Management API',
            version: '1.0.0',
            description: 'A RESTful API for managing a book catalog, supporting CRUD operations.',
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};
