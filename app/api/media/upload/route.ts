import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getRequestIdentity } from "@/lib/api-auth";
import { canWriteEntries } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";

// This endpoint no longer receives the file itself — it only issues a
// short-lived signed set of upload params, and the client then POSTs the
// file straight to Cloudinary. Proxying the whole file through this Next
// server doubled bandwidth (client -> server -> Cloudinary) and held a
// serverless function open for the entire upload duration; direct upload
// means our server's involvement is a single small JSON round trip.
//
// Tradeoff: the file's real size/type is no longer checked server-side
// (Cloudinary never tells us; we never see the bytes). The client still
// checks both before starting the upload, same limits as before, but that's
// bypassable by a modified client. The actual backstops are: this signature
// is single-use (timestamp-bound, `checkRateLimit` caps how often one can be
// issued) and scoped to the caller's own org folder — not open size/type
// enforcement. Acceptable at this app's scale; revisit with an upload
// preset (which Cloudinary can enforce server-side) if abuse ever shows up.
export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteEntries(identity.role)) {
    return NextResponse.json({ error: "View-only access" }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(`upload:${identity.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: rateLimit.error }, { status: 429 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    console.error("Cloudinary env vars are not configured.");
    return NextResponse.json({ error: "Upload isn't configured. Try again later." }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Namespaced per-org — a flat shared folder had no tenant isolation
  // (nothing stopped one workspace's assets from colliding with, or being
  // enumerable alongside, another's under the same folder).
  const folder = `helm-canvas/${identity.organizationId}`;

  // Every param the client sends alongside the file (other than file/
  // api_key/cloud_name/signature itself) must be included here in the exact
  // same form, or Cloudinary rejects the signature.
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);

  return NextResponse.json({ signature, timestamp, folder, apiKey, cloudName });
}
