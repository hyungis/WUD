import api from "../api/axios";

type PresignRequest = {
  fileName: string;
  contentType: string;
  contentLength?: number;
  folder?: string;
};

type PresignResponse = {
  url: string;
  method?: "PUT" | "POST";
  fields?: Record<string, string>;
  fileKey: string;
  publicUrl?: string;
  expiresAt?: string;
};

type UploadResult = {
  fileKey: string;
  publicUrl?: string;
};

export async function requestPresignedUrl(payload: PresignRequest) {
  const response = await api.post<PresignResponse>("/uploads/presign", payload);
  return response.data;
}

export async function uploadToS3(presign: PresignResponse, file: Blob) {
  if (presign.method === "POST" && presign.fields) {
    const form = new FormData();
    Object.entries(presign.fields).forEach(([key, value]) => form.append(key, value));
    form.append("file", file);
    const postResponse = await fetch(presign.url, { method: "POST", body: form });
    if (!postResponse.ok) {
      throw new Error("S3 upload failed");
    }
    return { fileKey: presign.fileKey, publicUrl: presign.publicUrl } as UploadResult;
  }

  const putResponse = await fetch(presign.url, {
    method: "PUT",
    body: file,
    headers: presign.method === "PUT" ? { "Content-Type": file.type || "application/octet-stream" } : undefined,
  });
  if (!putResponse.ok) {
    throw new Error("S3 upload failed");
  }
  return { fileKey: presign.fileKey, publicUrl: presign.publicUrl } as UploadResult;
}

export function dataUrlToBlob(dataUrl: string) {
  const parts = dataUrl.split(",");
  const header = parts[0] ?? "";
  const data = parts[1] ?? "";
  const match = header.match(/data:(.*?);base64/);
  const contentType = match ? match[1] : "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

export function fileNameWithTimestamp(prefix: string, ext: string) {
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `${prefix}-${Date.now()}${safeExt}`;
}

export async function uploadDataUrlImage(options: {
  dataUrl: string;
  folder?: string;
  filePrefix: string;
}) {
  const blob = dataUrlToBlob(options.dataUrl);
  const fileName = fileNameWithTimestamp(options.filePrefix, "png");
  const presign = await requestPresignedUrl({
    fileName,
    contentType: blob.type || "image/png",
    contentLength: blob.size,
    folder: options.folder,
  });
  return uploadToS3(presign, blob);
}
