import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/*
 * Environment must be assigned at module scope, not inside beforeAll.
 * Vitest evaluates setupFiles before it imports the test file, and several
 * application modules read process.env when they are first imported
 * (auth.controllers.js computes `frontendBase` and the cookie `secure` flag at
 * load time). Setting these in a hook would be too late.
 *
 * These are throwaway values for a throwaway in-memory database. No real secret
 * ever appears in the repository.
 */
process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = "test-access-token-secret";
process.env.ACCESS_TOKEN_EXPIRY = "15m";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-token-secret";
process.env.REFRESH_TOKEN_EXPIRY = "10d";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.METRICS_ENABLED = "false";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

// Truncate rather than drop: dropping removes the indexes that enforce the
// unique-username constraint we assert on.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer?.stop();
});
