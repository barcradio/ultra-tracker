/** A duplicate is logged under the same bib with a fraction appended, so 130 and 130.2 are the
 *  same runner. A bib logged a third time gets another 130.2 rather than a 130.3, so rows can
 *  share a bib outright and the row number is the only thing telling them apart.
 *
 *  Row numbers are positions in the grid as it is currently sorted and filtered, which is what
 *  the operator is actually looking at. */
export function findSiblingRowNumbers<T extends { bibId: number }>(
  rows: T[],
  index: number
): number[] {
  const row = rows[index];
  if (!row) return [];

  const bib = Math.trunc(row.bibId);

  return rows.reduce<number[]>((siblings, candidate, candidateIndex) => {
    if (candidateIndex !== index && Math.trunc(candidate.bibId) === bib) {
      siblings.push(candidateIndex + 1);
    }

    return siblings;
  }, []);
}
