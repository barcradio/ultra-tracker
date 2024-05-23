import electronLogo from "~/assets/electron.svg";

export function Logo() {
  return (
    <img
      alt="logo"
      className="mb-5 h-32 w-32 drag-none hover:drop-shadow-[0_0_1.2em_#6988e6aa] transition-all duration-300 will-change=-[filter]"
      src={electronLogo}
    />
  );
}

