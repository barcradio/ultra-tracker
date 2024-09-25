import { AthleteStatus, DNFType } from "$shared/enums";
import { Tag, TagColor } from "./Tag";

interface Props {
  dnfType?: DNFType;
  dns?: boolean;
  athleteStatus?: AthleteStatus;
  duplicate?: boolean;
}

type TagInfo = { color: TagColor; text: string };

const dnfTypeMap: Record<DNFType, TagInfo | null> = {
  [DNFType.Withdrew]: { color: "turquoise", text: "Withdrew" },
  [DNFType.Timeout]: { color: "purple", text: "Timeout" },
  [DNFType.Medical]: { color: "red", text: "Medical" },
  [DNFType.Unknown]: { color: "gray", text: "Unknown" },
  [DNFType.None]: null
};

const athleteStatusMap: Record<AthleteStatus, TagInfo | null> = {
  [AthleteStatus.Present]: { color: "orange", text: "➠ In" },
  [AthleteStatus.Outgoing]: { color: "lightgray", text: "Out ➠" },
  [AthleteStatus.Incoming]: null
};

function getTagInfo(props: Props): TagInfo | null {
  if (props.duplicate) {
    return { color: "yellow", text: "Duplicate" };
  } else if (props.dnfType && props.dnfType != DNFType.None) {
    return dnfTypeMap[props.dnfType];
  } else if (props.dns) {
    return { color: "blue", text: "DNS" };
  } else if (props.athleteStatus) {
    return athleteStatusMap[props.athleteStatus];
  } else {
    return null;
  }
}

export function StatusTag(props: Props) {
  const tagInfo = getTagInfo(props);
  if (!tagInfo) return null;
  return <Tag color={tagInfo.color}>{tagInfo.text}</Tag>;
}
