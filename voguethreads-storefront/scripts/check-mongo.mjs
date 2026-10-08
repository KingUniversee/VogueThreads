import mongoose from "mongoose";
import fs from "fs";

let uri = "mongodb://127.0.0.1:27017/fashion_commerce_admin";
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match && match[1]) {
    uri = match[1];
  }
} catch (e) {
  // fallback to default uri
}

async function main() {
  console.log("Connecting to MongoDB URI:", uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("✅ MongoDB Connection Successful!");

  const db = mongoose.connection.db;
  console.log("Database Name:", db.databaseName);

  const collections = await db.listCollections().toArray();
  console.log("\nFound " + collections.length + " Collections in " + db.databaseName + ":");

  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(` - ${col.name}: ${count} documents`);
  }

  await mongoose.disconnect();
  console.log("\nMongoDB verification completed successfully.");
}

main().catch((err) => {
  console.error("❌ MongoDB Connection Failed:", err.message);
  process.exit(1);
});
