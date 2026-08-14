import { NextResponse } from "next/server";
import { sweepPendingCloudinaryCleanup } from "@/lib/cloudinary-cleanup";

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// once CRON_SECRET is set as an env var — this is what actually stops
// anyone else from triggering the sweep by guessing the URL.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await sweepPendingCloudinaryCleanup();
  return NextResponse.json(result);
}
