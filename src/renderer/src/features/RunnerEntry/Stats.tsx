import { ColumnDef, DataGrid } from "../DataGrid";

function useFakeStats() {
  return [
    {
      id: "Runners Registered",
      value: 350
    },
    {
      id: "Total DNS",
      value: 2
    },
    {
      id: "Current Total DNF",
      value: 37
    },
    {
      id: "Finished Race",
      value: 0
    },
    {
      id: "Pending Arrivals",
      value: 311
    },
    {
      id: "Currently In Aid Station",
      value: 1
    },
    {
      id: "Through Aid Station",
      value: 3
    },
    {
      id: "Warnings",
      value: 1
    },
    {
      id: "Errors",
      value: 1
    }
  ];
}

interface Stat {
  id: string;
  value: number;
}

export function Stats() {
  const stats = useFakeStats();

  const Columns: ColumnDef<Stat> = [
    {
      field: "id",
      name: "Stats",
      sortable: false
    },
    {
      field: "value",
      name: "",
      sortable: false,
      align: "right",
      render: (value) => <span className="font-medium text-primary">{value}</span>
    }
  ];

  return <DataGrid data={stats} columns={Columns} headerClassName="text-primary" />;
}
