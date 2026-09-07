export function formatEventDatabaseName(slug: string, eventName?: string): string {
  const duplicateMatch = slug.match(/^(.*)-(\d+)$/);
  const duplicateNumber = duplicateMatch?.[2];
  const isYear = duplicateNumber != null && /^(19|20)\d{2}$/.test(duplicateNumber);
  const eventSlug = duplicateMatch && !isYear ? duplicateMatch[1] : slug;
  const hasDuplicateSuffix =
    duplicateMatch && !isYear && eventName && slugifyEventName(eventName) === eventSlug;
  const duplicateLabel = hasDuplicateSuffix ? ` #${duplicateNumber}` : "";
  const displayName = eventName && !hasDuplicateSuffix ? eventName : null;

  return (
    (displayName || eventSlug)
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") + duplicateLabel
  );
}

function slugifyEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
