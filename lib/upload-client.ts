export type CloudinaryUploadResult = {
  url: string;
  resourceType: "image" | "video";
  width?: number;
  height?: number;
  publicId?: string;
};

const MAX_BYTES = 25 * 1024 * 1024;

type SignatureResponse = { signature: string; timestamp: number; folder: string; apiKey: string; cloudName: string };

async function getUploadSignature(): Promise<SignatureResponse> {
  const res = await fetch("/api/media/upload", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Could not start the upload.");
  }
  return res.json();
}

/** Requests a short-lived signed upload from our server (no file bytes sent
 *  there), then uploads the file straight to Cloudinary — the server never
 *  proxies the file itself. `onProgress` receives 0-100 from the upload's
 *  real progress, same as any multipart POST tracked via XHR. */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) throw new Error("Only images and videos are supported.");
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 25MB).");

  const { signature, timestamp, folder, apiKey, cloudName } = await getUploadSignature();
  const resourceType = isVideo ? "video" : "image";

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Upload failed. Try again."));
        return;
      }
      try {
        const result = JSON.parse(xhr.responseText);
        resolve({
          url: result.secure_url,
          resourceType,
          width: result.width,
          height: result.height,
          publicId: result.public_id,
        });
      } catch {
        reject(new Error("Upload failed. Try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
    xhr.send(formData);
  });
}
