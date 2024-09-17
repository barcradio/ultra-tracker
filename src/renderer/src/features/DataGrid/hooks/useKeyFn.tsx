type GetKey<T extends object> = (row: T) => string | number;

export function useKeyFn<T extends object>(getKey?: GetKey<T>) {
  if (getKey) return getKey;

  const useRowId = (row: T): string | number => {
    if (row["id"] && (typeof row["id"] === "string" || typeof row["id"] === "number")) {
      return row["id"];
    }

    throw new Error(
      "DataGrid: no id field with type string or number found in row. either add one or provide a getKey function"
    );
  };

  return useRowId;
}
