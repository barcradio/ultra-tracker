import { AthleteProgress, DropReason } from "$shared/enums";
import { Tag, TagColor } from "./Tag";

interface Props {
  dropReason?: DropReason;
  AthleteProgress?: AthleteProgress;
  duplicate?: boolean;
}

type TagInfo = { color: TagColor; text: string };

const dropReasonMap: Record<DropReason, TagInfo | null> = {
  [DropReason.DidNotStart]: { color: "blue", text: "DNS" },
  [DropReason.Withdrew]: { color: "turquoise", text: "Withdrew" },
  [DropReason.Timeout]: { color: "purple", text: "Timeout" },
  [DropReason.Medical]: { color: "red", text: "Medical" },
  [DropReason.Unknown]: { color: "gray", text: "Unknown" },
  [DropReason.None]: null
};

const AthleteProgressMap: Record<AthleteProgress, TagInfo | null> = {
  [AthleteProgress.Present]: { color: "orange", text: "➠ In" },
  [AthleteProgress.Outgoing]: { color: "lightgray", text: "Out ➠" },
  [AthleteProgress.Incoming]: null
};

function getTagInfo(props: Props): TagInfo | null {
  if (props.duplicate) {
    return { color: "yellow", text: "Duplicate" };
  } else if (props.dropReason && props.dropReason != DropReason.None) {
    return dropReasonMap[props.dropReason];
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
