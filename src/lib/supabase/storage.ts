export const BUCKETS = {
  cvs: "cvs",
  companyLogos: "company-logos",
  listingPhotos: "listing-photos",
  chatAttachments: "chat-attachments",
} as const;

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Employers get CV links that stop working after 10 minutes (CLAUDE.md §4).
export const CV_SIGNED_URL_SECONDS = 600;

// URL of a file in a public bucket.
export function publicFileUrl(bucket: string, path: string): string {
  // Read here (not via lib/env) so importing the constants never throws when env vars are absent, e.g. in unit tests.
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function companyLogoUrl(logoPath: string | null | undefined): string | null {
  return logoPath ? publicFileUrl(BUCKETS.companyLogos, logoPath) : null;
}

// Flat listing photos (public bucket, D-019) and chat images (private bucket, signed URLs only).
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const LISTING_MAX_PHOTOS = 10;
// Chat images are shown through links that stop working after 10 minutes.
export const CHAT_SIGNED_URL_SECONDS = 600;

export function listingPhotoUrl(storagePath: string | null | undefined): string | null {
  return storagePath ? publicFileUrl(BUCKETS.listingPhotos, storagePath) : null;
}
