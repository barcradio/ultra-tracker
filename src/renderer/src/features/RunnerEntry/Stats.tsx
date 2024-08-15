import { ColumnDef, DataGrid } from "../DataGrid";

function useFakeStats() {
  return [
    {
      id: "Registered Athletes",
      value: 350
    },
    {
      id: "Pending Arrivals",
      value: 311
    },
    {
      id: "In Station",
      value: 1
    },
    {
      id: "Through Station",
      value: 3
    },
    {
      id: "Finished Race",
      value: 0
    },
    {
      id: "Total DNS",
      value: 2
    },
    {
      id: "Station DNF",
      value: 12
    },
    {
      id: "Total DNF",
      value: 37
    },
    {
      id: "Warnings",
      value: 1
    },
    {
      id: "Errors",
      value: 3
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
