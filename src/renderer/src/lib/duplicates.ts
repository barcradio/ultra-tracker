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

// Unused while a duplicate click filters to the bib; kept in case we go back to jumping.
export function findRowIndexBySequence<T extends { sequence: number }>(
  rows: T[],
  sequence: number
): number {
  return rows.findIndex((row) => row.sequence === sequence);
}

// Unused while a duplicate click filters to the bib; kept in case we go back to jumping.
export function findNextSiblingSequence<T extends { bibId: number; sequence: number }>(
  rows: T[],
  index: number
): number | null {
  const row = rows[index];
  if (!row) return null;

  const bib = Math.trunc(row.bibId);
  const siblings = rows.reduce<number[]>((found, candidate, candidateIndex) => {
    if (candidateIndex !== index && Math.trunc(candidate.bibId) === bib) found.push(candidateIndex);

    return found;
  }, []);

  if (siblings.length === 0) return null;

  const below = siblings.find((candidateIndex) => candidateIndex > index);

  return rows[below ?? siblings[0]].sequence;
}

export function findOriginalSequence<T extends { bibId: number; sequence: number }>(
  rows: T[],
  index: number
): number | null {
  const row = rows[index];
  if (!row || Number.isInteger(row.bibId)) return null;

  const original = rows.find((candidate) => candidate.bibId === Math.trunc(row.bibId));

  return original?.sequence ?? null;
}

export function duplicatedBibs<T extends { bibId: number }>(rows: T[]): Set<number> {
  return rows.reduce<Set<number>>((bibs, row) => {
    if (!Number.isInteger(row.bibId)) bibs.add(Math.trunc(row.bibId));

    return bibs;
  }, new Set());
}
