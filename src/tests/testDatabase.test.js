import mongoose from 'mongoose';
import { describe, it, expect } from 'vitest';
import { clearDatabase } from './helpers/testDatabase.js';

describe('clearDatabase', () => {
    it('completes without throwing when Mongoose is disconnected', async () => {
        await mongoose.disconnect();

        await expect(clearDatabase()).resolves.toBeUndefined();
    });
});
