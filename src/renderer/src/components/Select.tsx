import { ComponentProps } from "react";
import { Dropdown } from "primereact/dropdown";
import WarningIcon from "~/assets/icons/warning-circle.svg?react";
import { Stack } from "./Stack";
import { Label } from "./TextInput";

type Item = {
  name: string;
  value: string;
};

type Group = {
  label: string;
  value: string;
  items: Item[];
};

interface Props {
  className?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[] | Item[] | Group[];
  error?: string;
  label?: string;
  labelProps?: ComponentProps<typeof Label>;
  placeholder?: string;
  showFilter?: boolean;
  showClear?: boolean;
}

export function Select(props: Props) {
  const isGrouped = Boolean(props.options[0] ? props.options[0]["items"] : null);

  const isSimple = props.options[0] && typeof props.options[0] === "string";
  const options = isSimple
    ? (props.options as string[]).map((value) => ({ name: value, value }))
    : props.options;

  return (
    <Stack direction="col" className={`gap-1 ${props.className}`}>
      <Stack direction="row" align="center" className="gap-2.5">
        {props.label && <Label {...props.labelProps}>{props.label}</Label>}
        {props.error && (
          <WarningIcon width={20} className="fill-warning animate-in slide-in-from-left" />
        )}
      </Stack>
      <Dropdown
        className={props.className}
        value={props.value}
        onChange={(event) => props.onChange(event.value)}
        filter={props.showFilter}
        showClear={props.showClear}
        options={options}
        placeholder={props.placeholder}
        {...(isGrouped && { optionGroupLabel: "label", optionGroupChildren: "items" })}
        {...(!isGrouped && { optionLabel: "name", optionValue: "value" })}
        pt={{
          input: {
            className: props.value ? "text-on-component" : "text-on-surface"
          }
        }}
      />
    </Stack>
  );
}
