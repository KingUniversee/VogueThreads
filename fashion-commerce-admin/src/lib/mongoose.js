import mongoose from "mongoose";
import "../models/index.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null, isConnected: false };
}

/**
 * Global cached MongoDB connection for Next.js (Fast Refresh / Serverless safe)
 */
export async function connectToDatabase() {
  if (!DATABASE_URL) {
    console.warn("⚠️ [MongoDB] DATABASE_URL is not set. Database operations will be mocked or skipped.");
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
        console.log("✅ [MongoDB] Connected to database successfully.");
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
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    stateLabel: ["Disconnected", "Connected", "Connecting", "Disconnecting"][
      mongoose.connection.readyState
    ] || "Unknown",
  };
}
