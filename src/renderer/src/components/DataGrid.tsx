import { classed } from "~/lib/classed";

export type WithId = { id: string | number };

export type ColumnDef<T extends WithId> = Column<T>[];

export interface Column<T extends WithId> {
  field: keyof T;
  name: string;
  width?: number;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends WithId> {
  data: T[];
  columns: Column<T>[];
}

const Table = classed.table("w-full font-display", {});

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

const Row = classed.tr("hover:bg-surface-highest", {
  variants: {
    even: {
      true: "bg-surface",
      false: "bg-surface-high"
    },
    last: {
      true: "rounded"
    }
  }
});

const Cell = classed.td("py-0.5 text-sm font-medium text-end", {
  variants: {
    number: {
      true: "pr-8 text-right",
      false: "text-left"
    }
  }
});

export function DataGrid<T extends WithId>(props: Props<T>) {
  return (
    <Table>
      <Row>
        {props.columns.map((column) => {
          const number = typeof props.data[0][column.field] === "number";

          return (
            <Header key={column.name} number={number}>
              {column.name}
            </Header>
          );
        })}
      </Row>
      {props.data.map((row, rowIndex) => {
        const even = rowIndex % 2 === 0;
        const last = rowIndex === props.data.length - 1;

        return (
          <Row key={row.id} even={even} last={last}>
            {props.columns.map((column) => {
              const number = typeof row[column.field] === "number";

              return (
                <Cell key={column.name} number={number}>
                  {column.render ? column.render(row) : String(row[column.field])}
                </Cell>
              );
            })}
          </Row>
        );
      })}
    </Table>
  );
}
