import { RowContext } from "~/features/DataGrid/types";
import { findSiblingRowNumbers } from "~/lib/duplicates";
import { RunnerEx } from "../../hooks/data/useRunnerData";

interface Props {
  context: RowContext<RunnerEx>;
}

/** Shows which other rows carry this bib and jumps to one when clicked, so a duplicate can be
 *  compared against the record it clashes with instead of being hunted for. */
export function SiblingRowLinks(props: Props) {
  const siblings = findSiblingRowNumbers(props.context.rows, props.context.index);

  if (siblings.length === 0) return null;

  return (
    <span className="ml-1 whitespace-nowrap text-xs text-on-component">
      {siblings.map((rowNumber, position) => (
        <span key={rowNumber}>
          {position > 0 && ", "}
          <button
            type="button"
            className="underline hover:text-primary"
            title={`Go to row ${rowNumber}`}
            onClick={() => props.context.scrollToIndex(rowNumber - 1)}
          >
            {rowNumber}
          </button>
        </span>
      ))}
    </span>
  );
}
