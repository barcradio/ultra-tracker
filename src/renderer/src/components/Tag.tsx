import { MouseEventHandler, ReactNode } from "react";
import { VariantProps } from "class-variance-authority";
import { classed } from "~/lib/classed";

type TagVariants = VariantProps<typeof TagWrapper>;
export type TagColor = TagVariants["color"];

// TODO: Support icons in tag component
interface TagProps {
  color?: TagVariants["color"];
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const TagWrapper = classed.button(
  "px-2 text-sm font-medium uppercase rounded-3xl border align-center",
  {
    variants: {
      color: {
        turquoise: "bg-[#175151] text-[#00FFF0] border-[#00FFF0]",
        purple: "bg-[#572C7B] text-[#B8B8FF] border-[#B8B8FF]",
        red: "bg-[#672023] text-[#FFA8A8] border-[#FFA8A8]",
        gray: "bg-[#555555] text-[#CFDEE5] border-[#CFDEE5]",
        orange: "bg-[#FB780033] text-[#FFAA5C] border-[#FFAA5C]",
        blue: "bg-[#152833] text-[#64C6FF] border-[#64C6FF]",
        lightgray: "bg-[#55555566] text-[#CFDEE5CC] border-[#CFDEE5CC]",
        yellow: "bg-[#604B00] text-[#FBBE00] border-[#FBBE00]"
      }
    },
    defaultVariants: {
      color: "turquoise"
    }
  }
);

export function Tag(props: TagProps) {
  if (props.children == null) return null;

  return (
    <TagWrapper disabled={!props.onClick} color={props.color} onClick={props.onClick}>
      {props.children}
    </TagWrapper>
  );
}
