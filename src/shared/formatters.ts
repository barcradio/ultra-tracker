export function formatEventDatabaseName(slug: string): string {
  const duplicateMatch = slug.match(/^(.*)-(\d+)$/);
  const duplicateNumber = duplicateMatch?.[2];
  const isYear = duplicateNumber != null && /^(19|20)\d{2}$/.test(duplicateNumber);
  const eventSlug = duplicateMatch && !isYear ? duplicateMatch[1] : slug;
  const duplicateLabel = duplicateMatch && !isYear ? ` #${duplicateNumber}` : "";

  return (
    eventSlug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") + duplicateLabel
  );
}
