import { Stack, Button, TextInput } from "~/components";

export function BibForm() {
  return (
    <Stack align="stretch">
      <TextInput className="m-1.5 w-32" type="number" placeholder="Bib #" size="lg" outline />
      <Stack direction="col">
        <Button className="min-w-24 m-1.5 mb-0" color="success" size="lg">
          In
        </Button>
        <Button className="min-w-24 m-1.5" color="error" size="lg">
          Out
        </Button>
      </Stack>
    </Stack>
  );
}
