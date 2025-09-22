import { AthleteProgress, DNFType } from "$shared/enums";
import { Tag, TagColor } from "./Tag";

interface Props {
  dnfType?: DNFType;
  dns?: boolean;
  AthleteProgress?: AthleteProgress;
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

const AthleteProgressMap: Record<AthleteProgress, TagInfo | null> = {
  [AthleteProgress.Present]: { color: "orange", text: "➠ In" },
  [AthleteProgress.Outgoing]: { color: "lightgray", text: "Out ➠" },
  [AthleteProgress.Incoming]: null
};

function getTagInfo(props: Props): TagInfo | null {
  if (props.duplicate) {
    return { color: "yellow", text: "Duplicate" };
  } else if (props.dnfType && props.dnfType != DNFType.None) {
    return dnfTypeMap[props.dnfType];
  } else if (props.dns) {
    return { color: "blue", text: "DNS" };
  } else if (props.AthleteProgress) {
    return AthleteProgressMap[props.AthleteProgress];
  } else {
    return null;
  }
}

export function StatusTag(props: Props) {
  const tagInfo = getTagInfo(props);
  if (!tagInfo) return null;
  return <Tag color={tagInfo.color}>{tagInfo.text}</Tag>;
}
