import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

// Label + control + hint + error, used by onboarding steps.
export function Field({ id, label, hint, error, children }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
