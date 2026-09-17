/** A duplicate is logged under the same bib with `.2` appended. The affix is not a count: it
 *  marks the record as an imposter of the real one, so a bib logged again always reads `130.2`
 *  however many times it happens, and several rows can carry the same one.
 *
 *  Records are referred to by sequence, which is fixed for the life of a record, rather than by
 *  position in the grid, which changes with every sort and filter. */
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

/** Where a sequence currently sits in the grid, so a record can be brought into view. */
export function findRowIndexBySequence<T extends { sequence: number }>(
  rows: T[],
  sequence: number
): number {
  return rows.findIndex((row) => row.sequence === sequence);
}
