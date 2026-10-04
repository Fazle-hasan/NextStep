// Browser-only. Re-encodes an image through a canvas before upload, which drops EXIF metadata
// (including GPS coordinates) so a photo cannot leak a location (D-019). Also caps the size.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export async function reencodeImage(file: File, maxDimension: number = MAX_DIMENSION): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))), "image/jpeg", JPEG_QUALITY);
    });
  } finally {
    bitmap.close();
  }
}
