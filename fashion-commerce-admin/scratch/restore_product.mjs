import mongoose from "mongoose";

await mongoose.connect("mongodb://127.0.0.1:27017/fashion_commerce_admin");
const res = await mongoose.connection.db.collection("products").updateOne(
  { title: "Supima Cotton Heavyweight Tee" },
  {
    $set: { isDeleted: false, status: "ACTIVE" },
    $unset: { deletedAt: "" },
  }
);
console.log("Updated product result:", res);
await mongoose.disconnect();
