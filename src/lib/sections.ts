import type { Enums } from "@/types/database";

// The three user-facing sections (D-021). Section names and nav labels live here so they can be translated later.

export type AppRole = Enums<"app_role">;

export type SectionId = "community-portal" | "career-development" | "location-gathering";

export type NavItem = {
  label: string;
  href: string;
  // Shown only to users holding one of these roles. Omitted = everyone who is signed in.
  roles?: AppRole[];
  // False until the feature ships; rendered as "Soon" instead of a link.
  available: boolean;
};

export type Section = {
  id: SectionId;
  name: string;
  tagline: string;
  description: string;
  modules: string[];
  items: NavItem[];
};

export const SECTIONS: Section[] = [
  {
    id: "community-portal",
    name: "Community Portal",
    tagline: "Earn",
    description: "Find jobs with trusted employers, apply in a few taps, and hire from the community.",
    modules: ["jobs"],
    items: [
      { label: "Find jobs", href: "/jobs", available: true },
      { label: "My job profile & CV", href: "/profile", roles: ["job_seeker"], available: true },
      { label: "My applications", href: "/applications", roles: ["job_seeker"], available: true },
      { label: "Saved jobs & searches", href: "/saved", roles: ["job_seeker"], available: true },
      { label: "Refer someone", href: "/referrals", available: true },
      { label: "Employer dashboard", href: "/employer", roles: ["employer"], available: true },
    ],
  },
  {
    id: "career-development",
    name: "Career Development",
    tagline: "Learn",
    description: "Join LEAP programs, earn badges, and book sessions with experienced mentors.",
    modules: ["leap", "mentorship"],
    items: [
      { label: "LEAP programs", href: "/leap", available: true },
      { label: "Find a mentor", href: "/mentors", available: true },
      { label: "My sessions", href: "/sessions", available: true },
      { label: "Mentor dashboard", href: "/mentor", roles: ["mentor"], available: true },
    ],
  },
  {
    id: "location-gathering",
    name: "Location Gathering",
    tagline: "Grow",
    description: "Moving for work? Find flats, flatmates, local buddies, and masjids and imambargahs nearby.",
    modules: ["settle-in", "places"],
    items: [
      { label: "Settle In", href: "/settle-in", available: true },
      { label: "Flats & rooms", href: "/flats", available: true },
      { label: "Flatmates", href: "/flatmates", available: true },
      { label: "Masjids & places", href: "/places", available: true },
      { label: "Map", href: "/map", available: true },
      { label: "Area guides", href: "/areas", available: true },
      { label: "Buddy dashboard", href: "/buddy", roles: ["buddy"], available: true },
      { label: "My listings", href: "/flats/mine", roles: ["flat_lister"], available: true },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { label: "Messages", href: "/messages", available: true },
  { label: "Notifications", href: "/notifications", available: true },
  { label: "Admin", href: "/admin", roles: ["admin"], available: true },
];

function visibleTo(item: NavItem, roles: readonly AppRole[]): boolean {
  return !item.roles || item.roles.some((r) => roles.includes(r));
}

// Sections with only the entries this user's roles unlock. Role-specific entries are listed first.
export function sectionsForRoles(roles: readonly AppRole[]): Section[] {
  return SECTIONS.map((section) => {
    const items = section.items.filter((item) => visibleTo(item, roles));
    return {
      ...section,
      items: [...items.filter((i) => i.roles), ...items.filter((i) => !i.roles)],
    };
  });
}

export function accountNavForRoles(roles: readonly AppRole[]): NavItem[] {
  return ACCOUNT_NAV.filter((item) => visibleTo(item, roles));
}

export const ROLE_LABELS: Record<AppRole, string> = {
  job_seeker: "Job seeker",
  employer: "Employer",
  mentor: "Mentor",
  buddy: "Settle-In Buddy",
  flat_lister: "Flat lister",
  admin: "Admin",
};
