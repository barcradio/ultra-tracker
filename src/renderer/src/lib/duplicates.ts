/** A duplicate carries the same bib with `.2` appended; the affix marks an imposter, not a count. */
export function findSiblingSequences<T extends { bibId: number; sequence: number }>(
  rows: T[],
  index: number
): number[] {
  const row = rows[index];
  if (!row) return [];

  const bib = Math.trunc(row.bibId);

  return rows.reduce<number[]>((siblings, candidate, candidateIndex) => {
    if (candidateIndex !== index && Math.trunc(candidate.bibId) === bib) {
      siblings.push(candidate.sequence);
    }

    return siblings;
  }, []);
}

export function findRowIndexBySequence<T extends { sequence: number }>(
  rows: T[],
  sequence: number
): number {
  return rows.findIndex((row) => row.sequence === sequence);
}
