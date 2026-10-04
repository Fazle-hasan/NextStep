import type { Enums, Tables } from "@/types/database";

export type Listing = Tables<"flat_listings">;
export type ListingPhoto = Pick<Tables<"flat_listing_photos">, "id" | "storage_path" | "position">;
export type ContactRequestStatus = Enums<"offer_status">;

// What a search card needs (one row of search_flats(), with the nullable columns typed as such).
export type FlatCardData = {
  id: string;
  title: string;
  listing_type: Enums<"listing_type">;
  city_id: string;
  neighbourhood_id: string | null;
  rent: number;
  furnishing: Enums<"furnishing">;
  available_from: string;
  bedrooms: number | null;
  bathrooms: number | null;
  tenant_gender_pref: Enums<"tenant_gender_pref">;
  cover_photo_path: string | null;
};

// Exact address. Only ever loaded for the lister or a requester the lister accepted (RLS decides).
export type ListingAddress = { addressLine: string; landmark: string | null; lat: number; lng: number };

export type MyContactRequest = { id: string; status: ContactRequestStatus; conversationId: string | null };

export type FlatDetail = {
  listing: Listing;
  photos: ListingPhoto[];
  cityName: string | null;
  neighbourhoodName: string | null;
  listerName: string | null;
  isOwner: boolean;
  // The viewer's most recent contact request for this listing, if any.
  myRequest: MyContactRequest | null;
  // Present only for the lister and for an accepted requester.
  address: ListingAddress | null;
};

export type IncomingRequest = {
  id: string;
  requesterId: string;
  requesterName: string | null;
  intro: string;
  status: ContactRequestStatus;
  createdAt: string;
  conversationId: string | null;
};

export type MyListing = {
  listing: Listing;
  coverPhotoPath: string | null;
  cityName: string | null;
  neighbourhoodName: string | null;
  hasAddress: boolean;
  // Past expires_at (even if the hourly job has not marked it yet), and whole days left otherwise.
  expired: boolean;
  daysLeft: number;
  requests: IncomingRequest[];
};

export type ListingForEdit = {
  listing: Listing;
  photos: ListingPhoto[];
  address: ListingAddress | null;
};
