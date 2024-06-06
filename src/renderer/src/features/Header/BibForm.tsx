import { Button } from "~/common/components/Button";

export function BibForm() {
  return (
    <div className="flex flex-row">
      <input
        className="m-1.5 w-32 rounded-md border border-gray-400 p-2 text-3xl text-slate-800"
        type="number"
        placeholder="Bib"
      />

      <div className="flex flex-col">
        <Button onClick={() => console.log("In")} className="m-1.5 mb-0 bg-green-600">
          In
        </Button>
        <Button onClick={() => console.log("Out")} className="m-1.5 bg-red-600">
          Out
        </Button>
      </div>
    </div>
  );
}
