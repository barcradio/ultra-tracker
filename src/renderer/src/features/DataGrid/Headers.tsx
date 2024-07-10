import { classed } from "~/lib/classed";
import { Row } from "./Row";
import { Column, WithId } from "./types";

const Header = classed.th(
  "py-2.5 text-xl font-bold text-left uppercase bg-surface-higher rounded-s",
  {
    variants: {
      number: {
        true: "pr-8 text-right",
        false: "text-left"
      }
    }
  }
);

interface Props<T extends WithId> {
  data: T[];
  columns: Column<T>[];
}

export function Headers<T extends WithId>(props: Props<T>) {
  const isNumber = (key: keyof T) => typeof props.data[0][key] === "number";

  return (
    <Row>
      {props.columns.map((column) => (
        <Header key={column.name} number={isNumber(column.field)}>
          {column.name}
        </Header>
      ))}
    </Row>
  );
}
