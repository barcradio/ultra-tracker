import { ComponentProps, forwardRef } from "react";
import { FieldError } from "react-hook-form";
import WarningIcon from "~/assets/icons/warning-circle.svg?react";
import { classed } from "~/lib/classed";
import { Stack } from "./Stack";

export const InputBaseStyles =
  "p-2 w-full font-medium rounded-md border-2 outline-none bg-surface-secondary font-display light:placeholder:text-on-surface-hover border-component dark:placeholder:text-component-strong";

const Input = classed.input({
  base: InputBaseStyles,
  variants: {
    hasError: {
      true: "border-warning",
      false: "border-component"
    },
    isDisabled: {
      true: "text-on-surface",
      false: "text-on-component"
    },
    resize: {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x"
    }
  },
  defaultVariants: {
    hasError: false,
    resize: "none"
  }
});

export const Label = classed.label({
  base: "text-xl font-bold uppercase font-display text-on-component"
});

type InputProps = ComponentProps<typeof Input>;
type LabelProps = Omit<ComponentProps<typeof Label>, "for">;

export interface TextInputProps extends InputProps {
  label?: string;
  labelProps?: LabelProps;
  wrapperClassName?: string;
  error?: FieldError;
}

export interface TextAreaProps extends TextInputProps {
  rows?: number;
  resize?: "none" | "vertical" | "horizontal";
  maxlength?: number;
}

type Props = TextInputProps | TextAreaProps;

export const TextInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { label, error, labelProps, wrapperClassName, ...rest } = props;

  const isTextArea = "rows" in props || "resize" in props;

  return (
    <Stack direction="col" className={`gap-1 ${wrapperClassName}`}>
      <Stack direction="row" align="center" className="gap-2.5">
        {label && <Label {...labelProps}>{label}</Label>}
        {error && <WarningIcon width={20} className="fill-warning animate-in slide-in-from-left" />}
      </Stack>
      <Input
        {...rest}
        as={(isTextArea ? "textarea" : "input") as "input"} // weird ts error
        ref={ref}
        hasError={Boolean(props.error)}
        isDisabled={Boolean(props.disabled)}
      />
    </Stack>
  );
});

TextInput.displayName = "TextInput";
