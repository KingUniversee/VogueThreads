import { NextResponse } from "next/server";
import { connectToDatabase, getDatabaseStatus } from "@/lib/mongoose";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = getDatabaseStatus();

  try {
    await connectToDatabase();
    dbStatus = getDatabaseStatus();
  } catch (error) {
    dbStatus = {
      isConnected: false,
      readyState: 0,
      stateLabel: "Connection Failed",
      error: error.message,
    };
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus.isConnected ? "healthy" : "degraded",
    system: "VogueThreads Commerce OS - Admin Panel",
    timestamp: new Date().toISOString(),
    responseTimeMs,
    stack: {
      framework: "Next.js 15 (App Router)",
      language: "Plain JavaScript (ES2024+)",
      database: "MongoDB Atlas + Mongoose 8",
      styling: "Tailwind CSS",
    },
    database: dbStatus,
  });
}
