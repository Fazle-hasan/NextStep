"use server";

import { revalidatePath } from "next/cache";

import { getViewer } from "@/features/auth/queries";
import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/supabase/storage";

import {
  MAX_LOCATIONS,
  affiliationSchema,
  companyCreateSchema,
  companyUpdateSchema,
  locationRemoveSchema,
  locationSchema,
  logoSchema,
  verificationRequestSchema,
} from "./schemas";
import { employerStrings } from "./strings";

// Company server actions. Job actions are in job-actions.ts.

const { errors, dbErrors } = employerStrings;

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message || errors.generic;
}

function revalidateCompany(companyId: string, slug?: string | null) {
  revalidatePath("/employer");
  revalidatePath(`/employer/company/${companyId}/edit`);
  if (slug) revalidatePath(`/companies/${slug}`);
}

export async function createCompany(input: unknown): Promise<ActionResult<{ companyId: string }>> {
  const parsed = companyCreateSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const v = parsed.data;

  const supabase = await createClient();
  const { data: companyId, error } = await supabase.rpc("create_company", {
    p_name: v.name,
    p_industry: v.industry,
    p_size: v.size,
    p_website: v.website,
    p_description: v.description,
    p_is_community_owned: v.isCommunityOwned,
    p_leap_friendly: v.leapFriendly,
    p_verification_note: v.verificationNote,
  });
  if (error || !companyId) return fail(dbErrorMessage(error, dbErrors, errors.generic));

  // The creator now holds the employer role, which changes the navigation.
  revalidatePath("/", "layout");
  return ok({ companyId });
}

export async function updateCompany(input: unknown): Promise<ActionResult> {
  const parsed = companyUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update({
      name: v.name,
      industry: v.industry ?? null,
      size: v.size ?? null,
      website: v.website ?? null,
      description: v.description ?? null,
      is_community_owned: v.isCommunityOwned,
      leap_friendly: v.leapFriendly,
    })
    .eq("id", v.companyId)
    .select("slug")
    .maybeSingle();
  if (error) return fail(errors.generic);
  if (!data) return fail(errors.notFound);

  revalidateCompany(v.companyId, data.slug);
  return ok();
}

// Called after the browser uploaded the file to '{companyId}/{uuid}.{ext}' in the company-logos bucket.
export async function saveCompanyLogo(input: unknown): Promise<ActionResult<{ logoPath: string }>> {
  const parsed = logoSchema.safeParse(input);
  if (!parsed.success) return fail(employerStrings.logo.failed);
  const { companyId, path } = parsed.data;

  const supabase = await createClient();
  const { data: before } = await supabase.from("companies").select("logo_path, slug").eq("id", companyId).maybeSingle();
  const { data, error } = await supabase
    .from("companies")
    .update({ logo_path: path })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    // Not a member (or the update failed): do not leave the uploaded file behind.
    await supabase.storage.from(BUCKETS.companyLogos).remove([path]);
    return fail(error ? employerStrings.logo.failed : errors.notFound);
  }

  if (before?.logo_path && before.logo_path !== path) {
    await supabase.storage.from(BUCKETS.companyLogos).remove([before.logo_path]);
  }
  revalidateCompany(companyId, before?.slug);
  return ok({ logoPath: path });
}

export async function addCompanyLocation(input: unknown): Promise<ActionResult> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { companyId, cityId, address } = parsed.data;

  const supabase = await createClient();
  const { count } = await supabase
    .from("company_locations")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if ((count ?? 0) >= MAX_LOCATIONS) return fail(errors.locationLimit);

  const { error } = await supabase
    .from("company_locations")
    .insert({ company_id: companyId, city_id: cityId, address: address ?? null });
  if (error) return fail(error.code === "42501" ? dbErrors.not_company_member : errors.generic);

  revalidateCompany(companyId);
  return ok();
}

export async function removeCompanyLocation(input: unknown): Promise<ActionResult> {
  const parsed = locationRemoveSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { companyId, locationId } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("company_locations").delete().eq("id", locationId).eq("company_id", companyId);
  if (error) return fail(errors.generic);

  revalidateCompany(companyId);
  return ok();
}

export async function requestCompanyVerification(input: unknown): Promise<ActionResult> {
  const parsed = verificationRequestSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_company_verification", {
    p_company_id: parsed.data.companyId,
    p_note: parsed.data.note,
  });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));

  revalidatePath("/employer");
  return ok();
}

export async function confirmAffiliation(input: unknown): Promise<ActionResult> {
  const parsed = affiliationSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  if (!(await getViewer())) return fail(errors.notSignedIn);

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_affiliation", {
    p_affiliation_id: parsed.data.affiliationId,
    p_confirm: parsed.data.confirm,
  });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));

  revalidatePath("/employer");
  return ok();
}
