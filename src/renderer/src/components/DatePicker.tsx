import { RefObject, useRef } from "react";
import { Calendar, CalendarProps } from "primereact/calendar";
import { Control, Controller, ControllerProps, FieldValues, Path } from "react-hook-form";
import WarningIcon from "~/assets/icons/warning-circle.svg?react";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { formatDate } from "~/lib/datetimes";
import { Button } from "./Button";
import { Stack } from "./Stack";
import { Label, TextInputProps } from "./TextInput";

type CustomCalendarProps = CalendarProps;
type CustomInputProps = TextInputProps;
type ExtendsProps = CustomInputProps & CustomCalendarProps;

type Props<T extends FieldValues> = Omit<ExtendsProps, "value" | "onChange" | "ref" | "error"> & {
  control: Control<T>;
  name: Path<T>;
  ref?: RefObject<Calendar>;
  rules?: ControllerProps<T>["rules"];
};

export function DatePicker<T extends FieldValues>(props: Props<T>) {
  const portalRoot = usePortalRoot();
  const ref = useRef<Calendar>(null);

  return (
    <Controller
      control={props.control}
      rules={props.rules}
      name={props.name}
      render={({ field, fieldState }) => (
        <Stack direction="col" className="gap-1 w-full">
          <Stack direction="row" align="center" className="gap-2.5">
            {props.label && <Label {...props.labelProps}>{props.label}</Label>}
            {fieldState.error && (
              <WarningIcon width={20} className="fill-warning animate-in slide-in-from-left" />
            )}
          </Stack>
          <Calendar
            showIcon
            appendTo={portalRoot.current}
            hourFormat="24"
            value={field.value}
            onChange={(event) => field.onChange(event.value!)}
            formatDateTime={(date) => formatDate(date)}
            showTime
            showSeconds
            ref={ref}
            pt={{
              root: { className: fieldState.error ? "border-warning" : "border-component" }
            }}
            footerTemplate={() => (
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="border-t-2 border-component-strong bg-surface-tertiary"
              >
                <Button color="neutral" variant="ghost" onClick={() => field.onChange(new Date())}>
                  Now
                </Button>
                <span>
                  <Button
                    color="danger"
                    variant="ghost"
                    onClick={() => {
                      ref.current?.hide();
                      field.onChange(null);
                    }}
                  >
                    Clear
                  </Button>
                  <Button color="primary" variant="ghost" onClick={() => ref.current?.hide()}>
                    Apply
                  </Button>
                </span>
              </Stack>
            )}
          />
        </Stack>
      )}
    />
  );
}
