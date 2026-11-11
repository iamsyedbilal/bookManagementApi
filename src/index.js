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
        console.log(`Error while connecting to the database & server ${err}`);
        process.exit(1);
    });
