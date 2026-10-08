import mongoose from "mongoose";

const DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null, isConnected: false };
}

/**
 * Global cached MongoDB connection for Next.js App Router (Fast Refresh / Serverless safe)
 */
export async function connectToDatabase() {
  if (!DATABASE_URL) {
    console.warn("⚠️ [MongoDB] DATABASE_URL is not set.");
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(DATABASE_URL, opts)
      .then((mongooseInstance) => {
        cached.isConnected = true;
        return mongooseInstance.connection;
      })
      .catch((err) => {
        console.error("❌ [MongoDB] Failed to connect to database:", err.message);
        cached.promise = null;
        cached.isConnected = false;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export function getDatabaseStatus() {
  return {
    isConnected: cached.isConnected,
    readyState: mongoose.connection.readyState,
  };
}
