/** ~8 MB raw file — data URLs are larger once base64-encoded. */
export const MAX_GIF_UPLOAD_BYTES = 8 * 1024 * 1024;

export function isGifUploadFile(file) {
  if (!file || typeof file !== "object") return false;
  const type = String(file.type || "").toLowerCase();
  if (type === "image/gif") return true;
  return /\.gif$/i.test(String(file.name || ""));
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid read result"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
