import { StatLine } from "./StatLine";

export function Stats() {
  return (
    <div className="mr-8 w-24 font-display">
      <h1 className="text-xl font-bold uppercase text-yellow-400 underline ">Stats</h1>

      <StatLine label="Total In" value={0} />
      <StatLine label="Total Out" value={0} />
      <StatLine label="Errors" value={0} />
    </div>
  );
}
