import mongoose from "mongoose";

const uri = "mongodb+srv://deepgupta3581_db_user:zK3riq4nJL7RzEUP@cluster0.bkxrnkc.mongodb.net/fashion_commerce_admin?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log("🎉 SUCCESS! Connected to MongoDB Atlas Cloud Cluster!");

  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log("Databases in Cluster:", dbs.databases.map(d => d.name));

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections in fashion_commerce_admin:", collections.map(c => c.name));

  await mongoose.disconnect();
}

testConnection().catch((err) => {
  console.error("❌ Connection failed:", err);
  process.exit(1);
});
