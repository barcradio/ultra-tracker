import { ComponentProps, forwardRef } from "react";
import { FieldError } from "react-hook-form";
import WarningIcon from "~/assets/icons/warning-circle.svg?react";
import { classed } from "~/lib/classed";
import { Stack } from "./Stack";

const Input = classed.input({
  base: "p-2 w-full rounded-md border-2 outline-none bg-surface-secondary text-on-component font-display placeholder:text-component-strong border-component",
  variants: {
    hasError: {
      true: "border-warning",
      false: "border-component"
    }
  },
  defaultVariants: {
    hasError: false
  }
});

const Label = classed.label({
  base: "text-xl font-bold uppercase font-display text-on-component"
});

type InputProps = ComponentProps<typeof Input>;
type LabelProps = Omit<ComponentProps<typeof Label>, "for">;

interface TextInputProps extends InputProps {
  label?: string;
  labelProps?: LabelProps;
  error?: FieldError;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>((props, ref) => {
  return (
    <Stack direction="col" className="gap-1 w-full">
      <Stack direction="row" align="center" className="gap-2.5">
        {props.label && <Label {...props.labelProps}>{props.label}</Label>}
        {props.error && (
          <WarningIcon width={20} className="fill-warning animate-in slide-in-from-left" />
        )}
      </Stack>
      <Input {...props} ref={ref} hasError={Boolean(props.error)} />
    </Stack>
  );
});

TextInput.displayName = "TextInput";