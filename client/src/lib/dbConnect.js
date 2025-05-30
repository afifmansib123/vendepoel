// src/lib/dbConnect.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    console.log("DBUtil: Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    console.log("DBUtil: Creating new MongoDB connection promise");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("DBUtil: New MongoDB connection established");
      return mongooseInstance;
    }).catch(error => {
        console.error("DBUtil: MongoDB connection error during initial connection:", error);
        cached.promise = null; // Reset promise on error
        throw error;
    });
  }

  try {
    console.log("DBUtil: Awaiting MongoDB connection promise");
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("DBUtil: Error resolving MongoDB connection promise:", e);
    throw e;
  }
  
  return cached.conn;
}

export default dbConnect;