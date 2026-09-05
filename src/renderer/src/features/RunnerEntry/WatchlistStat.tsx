import { Tooltip } from "primereact/tooltip";
import { AthleteStatusDB } from "$shared/models";

interface Props {
  athletes: AthleteStatusDB[];
  value: number | string;
  tooltipId: string;
}

export function WatchlistStat({ athletes, value, tooltipId }: Props) {
  return (
    <>
      <Tooltip target={`.${tooltipId}`} position="left">
        <ul className="m-0 list-none p-0">
          {athletes.map((athlete) => (
            <li key={athlete.bibId}>
              {athlete.bibId} - {athlete.firstName} {athlete.lastName}
            </li>
          ))}
        </ul>
      </Tooltip>
      <span className="font-medium text-primary">{value}</span>
    </>
  );
}
