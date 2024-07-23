import { ComponentProps, forwardRef } from "react";
import { classed } from "~/lib/classed";
import { Stack } from "./Stack";

const Input = classed.input({
  base: "p-2 w-full rounded-md border-2 outline-none bg-surface-secondary border-on-component text-on-component font-display placeholder:text-component-strong border-component"
});

const Label = classed.label({
  base: "text-xl font-bold uppercase font-display text-on-component"
});

type InputProps = ComponentProps<typeof Input>;
type LabelProps = Omit<ComponentProps<typeof Label>, "for">;

interface TextInputProps extends InputProps {
  label?: string;
  labelProps?: LabelProps;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>((props, ref) => {
  const { label, labelProps, ...inputProps } = props;

  return (
    <Stack direction="col" className="gap-1 w-full">
      <Label {...labelProps}>{label}</Label>
      <Input {...inputProps} ref={ref} />
    </Stack>
  );
});

TextInput.displayName = "TextInput";
