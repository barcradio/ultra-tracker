import { useAthletes } from "~/hooks/useAthletes";

export function SearchPage() {
  const { data } = useAthletes();
  return <p>Search</p>;
}
