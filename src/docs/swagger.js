import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '../config/config.js';
import swaggerUI from 'swagger-ui-express';

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
    apis: ['./src/docs/*Docs.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

router.get('/json', (req, res) => {
    res.json(swaggerSpec);
});

router.use('/', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

export default router;
