"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import { saveNotificationPreferences } from "../actions";
import { NOTIFICATION_GROUPS, NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPES, type NotificationType } from "../labels";
import { notificationStrings } from "../strings";
import type { NotificationPreferences } from "../types";

const s = notificationStrings.settings;

function isKnownType(type: string): type is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type);
}

// Email on/off, per-type email switches and the WhatsApp opt-in.
export function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [muted, setMuted] = useState<NotificationType[]>(initial.mutedTypes.filter(isKnownType));
  const [whatsappOptIn, setWhatsappOptIn] = useState(initial.whatsappOptIn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleType(type: NotificationType, on: boolean) {
    setMuted((current) => (on ? current.filter((t) => t !== type) : [...current.filter((t) => t !== type), type]));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveNotificationPreferences({ emailEnabled, mutedTypes: muted, whatsappOptIn });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.saved);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.emailHeading}</CardTitle>
          <CardDescription>{s.emailNeedsAddress}</CardDescription>
        </CardHeader>
        <CardContent>
          <SwitchRow
            id="email-enabled"
            label={s.emailEnabled}
            hint={s.emailEnabledHint}
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
        </CardContent>
      </Card>

      {emailEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{s.typesHeading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {NOTIFICATION_GROUPS.map((group) => (
              <fieldset key={group.id} className="space-y-2">
                <legend className="text-sm font-semibold">{group.title}</legend>
                {group.types.map((type) => (
                  <SwitchRow
                    key={type}
                    id={`email-${type}`}
                    label={NOTIFICATION_TYPE_LABELS[type]}
                    checked={!muted.includes(type)}
                    onCheckedChange={(on) => toggleType(type, on)}
                  />
                ))}
              </fieldset>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.whatsappHeading}</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchRow
            id="whatsapp-opt-in"
            label={s.whatsappOptIn}
            hint={s.whatsappHint}
            checked={whatsappOptIn}
            onCheckedChange={setWhatsappOptIn}
          />
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? s.saving : s.save}
      </Button>
    </form>
  );
}
