"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS, LOGO_MAX_BYTES, LOGO_MIME_TYPES, companyLogoUrl } from "@/lib/supabase/storage";

import { saveCompanyLogo } from "../actions";
import { employerStrings } from "../strings";

const s = employerStrings.logo;
const EXTENSIONS: Record<(typeof LOGO_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isLogoType(type: string): type is (typeof LOGO_MIME_TYPES)[number] {
  return (LOGO_MIME_TYPES as readonly string[]).includes(type);
}

type Props = { companyId: string; companyName: string; logoPath: string | null };

// Uploads straight to the public company-logos bucket (storage policies check membership),
// then a server action records the path and removes the previous file.
export function LogoUpload({ companyId, companyName, logoPath }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(logoPath);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = companyLogoUrl(path);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!isLogoType(file.type)) {
      setError(s.wrongType);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(s.tooLarge);
      return;
    }

    startTransition(async () => {
      const newPath = `${companyId}/${crypto.randomUUID()}.${EXTENSIONS[file.type as keyof typeof EXTENSIONS]}`;
      const { error: uploadError } = await createClient()
        .storage.from(BUCKETS.companyLogos)
        .upload(newPath, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) {
        setError(s.failed);
        return;
      }
      const result = await saveCompanyLogo({ companyId, path: newPath });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPath(result.data.logoPath);
      toast.success(s.saved);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- small logo served from Supabase Storage
            <img src={url} alt={s.alt(companyName)} className="size-full object-contain" />
          ) : (
            <Building2 className="size-7 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            id="company-logo"
            type="file"
            accept={LOGO_MIME_TYPES.join(",")}
            className="sr-only"
            aria-label={url ? s.replace : s.choose}
            aria-describedby="company-logo-hint"
            onChange={onFile}
            disabled={pending}
            tabIndex={-1}
          />
          <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? s.uploading : url ? s.replace : s.choose}
          </Button>
          <p id="company-logo-hint" className="text-sm text-muted-foreground">
            {s.hint}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
