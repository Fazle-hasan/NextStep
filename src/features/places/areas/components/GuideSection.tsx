type Props = { id: string; title: string; text: string | null };

// One plain-text section of an area guide. Renders nothing when the section is empty.
export function GuideSection({ id, title, text }: Props) {
  if (!text?.trim()) return null;

  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="break-words whitespace-pre-line text-muted-foreground">{text}</p>
    </section>
  );
}
