import { ReactNode } from "react";
import { classed } from "~/lib/classed";

const Header = classed.thead("sticky top-0 z-10");
const Footer = classed.tfoot("sticky bottom-0 z-10");

interface Props {
  children: ReactNode;
  type: "header" | "footer";
}

export function Section(props: Props) {
  switch (props.type) {
    case "header":
      return <Header>{props.children}</Header>;
    case "footer":
      return <Footer>{props.children}</Footer>;
  }
}
