import mongoose from "mongoose";

const LOCAL_URI = "mongodb://127.0.0.1:27017/fashion_commerce_admin";
const ATLAS_URI = "mongodb+srv://deepgupta3581_db_user:zK3riq4nJL7RzEUP@cluster0.bkxrnkc.mongodb.net/fashion_commerce_admin?retryWrites=true&w=majority&appName=Cluster0";

async function migrateData() {
  console.log("1. Connecting to Local MongoDB...");
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  const localDb = localConn.db;

  console.log("2. Connecting to MongoDB Atlas Cloud...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const atlasDb = atlasConn.db;

  const collections = await localDb.listCollections().toArray();
  console.log(`\nFound ${collections.length} collections to sync to Atlas:\n`);

  for (const col of collections) {
    const colName = col.name;
    const docs = await localDb.collection(colName).find({}).toArray();

    if (docs.length > 0) {
      console.log(`Copying ${docs.length} documents for '${colName}'...`);
      // Clean target collection first
      await atlasDb.collection(colName).deleteMany({});
      await atlasDb.collection(colName).insertMany(docs);
      console.log(`  ✓ Successfully migrated '${colName}' (${docs.length} records)`);
    } else {
      console.log(`Skipping empty collection '${colName}' (0 records)`);
    }
  }

  console.log("\n3. Verifying Atlas Collections after sync:");
  const atlasCols = await atlasDb.listCollections().toArray();
  for (const c of atlasCols) {
    const count = await atlasDb.collection(c.name).countDocuments();
    console.log(` - Atlas: ${c.name} -> ${count} documents`);
  }

  await localConn.close();
  await atlasConn.close();
  console.log("\n🎉 ALL LOCAL DATA FULLY MIGRATED TO MONGODB ATLAS CLOUD SUCCESSFULLY!");
}

migrateData().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
