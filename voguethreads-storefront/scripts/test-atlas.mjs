import mongoose from "mongoose";

const rawUri = "mongodb+srv://<db_username>:zK3riq4nJL7RzEUP@cluster0.bkxrnkc.mongodb.net/?appName=Cluster0";

async function test(username) {
  const uri = rawUri.replace("<db_username>", encodeURIComponent(username));
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`\n🎉 MATCH FOUND! Username is: '${username}'`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    process.stdout.write(`.` );
  }
}

async function run() {
  const candidates = [
    "deepgupta3581",
    "deepgupta",
    "deep",
    "deep_gupta",
    "voidmain",
    "void_main",
    "void",
    "vogue",
    "voguethreads",
    "voguethreads_admin",
    "admin123",
    "clusterUser",
    "atlasAdmin",
    "dbUser",
    "main",
  ];

  console.log("Testing candidate usernames...");
  for (const c of candidates) {
    await test(c);
  }
  console.log("\nDone testing batch.");
}

run();
