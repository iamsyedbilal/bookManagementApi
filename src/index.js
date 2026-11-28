import { config } from './config/config.js';
import { connectDB } from './db/connection.js';
import app from './app.js';

connectDB()
    .then(() => {
        app.listen(config.port, () => {
            console.log(`Server is running on port ${config.port}`);
        });
    })
    .catch((err) => {
        console.error('Database connection failed; server was not started.', err instanceof Error ? err.name : 'Unknown error');
        process.exit(1);
    });
