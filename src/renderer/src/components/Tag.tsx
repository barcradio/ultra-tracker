import { MouseEventHandler, ReactNode } from "react";
import { VariantProps } from "class-variance-authority";
import { classed } from "~/lib/classed";

type TagVariants = VariantProps<typeof TagWrapper>;

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
        gray: "bg-[#555555] text[#CFDEE5] border[#CFDEE5]",
        blue: "bg-[#3386CC] text[#68A3FA] border[#68A3FA]",
        lightgray: "bg-[#555555] text[#CCCCCC] border[#CCCCCC]",
        lightgreen: "bg-[#175151] text[#CCCCCC] border[#CCCCCC]",
        lightorange: "bg-[#996600] text[#CCCCCC] border[#CCCCCC]"
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
