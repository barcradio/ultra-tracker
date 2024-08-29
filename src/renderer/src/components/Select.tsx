import { Dropdown } from "primereact/dropdown";

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
  value: string | null;
  onChange: (value: string | null) => void;
  options: Item[] | Group[];
  placeholder?: string;
  showFilter?: boolean;
  showClear?: boolean;
}

export function Select(props: Props) {
  return (
    <Dropdown
      value={props.value}
      onChange={(event) => props.onChange(event.value)}
      filter={props.showFilter}
      showClear={props.showClear}
      options={props.options}
      placeholder={props.placeholder}
      optionLabel="name"
      optionGroupLabel="label"
      optionGroupChildren="items"
      optionValue="value"
    />
  );
}
