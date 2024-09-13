import { useStations } from "~/hooks/data/useStations";

export function StationsPage() {
  const { data } = useStations();

  console.log(data);

  return (
    <div>
      <h1>
        <b>Stations Page</b>
      </h1>
    </div>
  );
}
