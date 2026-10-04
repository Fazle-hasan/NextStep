import type { Enums } from "@/types/database";

type Intent = Enums<"onboarding_intent">;

// User-facing strings for onboarding (kept in one place for later Urdu/Hindi translation).
export const onboardingStrings = {
  title: "Set up your profile",
  titleUpdate: "Update what you're here for",
  stepLabel: (step: number, total: number) => `Step ${step} of ${total}`,
  steps: ["About you", "What brings you here", "Next steps"],
  fullName: "Full name",
  gender: "Gender",
  genderHint: "Used for flatmate and buddy matching. It can't be changed later without contacting support.",
  genderLocked: "Gender is set and can't be changed here.",
  male: "Male",
  female: "Female",
  city: "City you live in",
  cityPlaceholder: "Choose a city",
  phone: "Mobile number",
  phoneHint: "Kept private. Never shown on your profile.",
  intentsHint: "Choose all that apply. You can add more later.",
  verificationNote: "Tell our team about yourself",
  verificationNoteHint: "Your experience, where you work, or how you help newcomers. Admins read this when verifying you.",
  back: "Back",
  next: "Continue",
  finish: "Finish",
  saving: "Saving…",
  done: "You're all set",
  pendingVerification: "Pending verification",
  errors: {
    fullName: "Enter your name (up to 120 characters).",
    gender: "Choose your gender.",
    city: "Choose your city.",
    intents: "Choose at least one option.",
    phone_required: "Add your mobile number to continue.",
    invalid_phone: "Enter a valid 10-digit Indian mobile number.",
    invalid_city: "Choose a city from the list.",
    invalid_full_name: "Enter your name (up to 120 characters).",
    intents_required: "Choose at least one option.",
    account_suspended: "Your account is suspended. Contact support.",
    generic: "We couldn't save your profile. Please try again.",
  },
} as const;

export const intentStrings: Record<Intent, { title: string; description: string; nextStep: string; needsVerification: boolean }> = {
  find_job: {
    title: "Find a job or refer someone",
    description: "Search and apply to jobs from trusted employers, or refer a person to a job in your organisation.",
    nextStep: "Build your job profile and upload your CV in Community Job Portal. You can also refer people to open jobs where you work.",
    needsVerification: false,
  },
  hire: {
    title: "Hire",
    description: "Post jobs and manage applicants.",
    nextStep: "Create your company profile. Your jobs go live after an admin verifies the company.",
    needsVerification: false,
  },
  mentor: {
    title: "Mentor others",
    description: "Offer career guidance, CV reviews and mock interviews.",
    nextStep: "An admin will verify you before you appear in the mentor list.",
    needsVerification: true,
  },
  relocate: {
    title: "Relocating to a new city",
    description: "Get help with flats, flatmates and finding community.",
    nextStep: "Create a relocation request in Relocation Support so local buddies can help.",
    needsVerification: false,
  },
  help_newcomers: {
    title: "Help newcomers in my city",
    description: "Become a Settle-In Buddy for people moving to your city.",
    nextStep: "An admin will verify you before you can see relocation requests.",
    needsVerification: true,
  },
  list_flat: {
    title: "List a flat or room",
    description: "Offer a flat, room or PG to community members.",
    nextStep: "You can post listings with your verified phone. An ID badge is optional.",
    needsVerification: false,
  },
};
