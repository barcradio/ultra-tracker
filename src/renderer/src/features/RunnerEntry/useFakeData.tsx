export interface Runner {
  id: number;
  sequence: number;
  runner: number;
  in: Date;
  out: Date;
  notes: string;
  name: string;
}

const FakeData: Runner[] = [
  {
    id: 1,
    sequence: 1,
    runner: 101,
    in: new Date("2023-07-01T08:00:00"),
    out: new Date("2023-07-01T08:30:00"),
    notes: "Good start, steady pace.",
    name: "Alice Johnson"
  },
  {
    id: 2,
    sequence: 2,
    runner: 102,
    in: new Date("2023-07-01T08:30:00"),
    out: new Date("2023-07-01T09:00:00"),
    notes: "Maintained speed, no issues.",
    name: "Bob Smith"
  },
  {
    id: 3,
    sequence: 3,
    runner: 103,
    in: new Date("2023-07-01T09:00:00"),
    out: new Date("2023-07-01T09:30:00"),
    notes: "Slightly slowed down.",
    name: "Charlie Brown"
  },
  {
    id: 4,
    sequence: 4,
    runner: 104,
    in: new Date("2023-07-01T09:30:00"),
    out: new Date("2023-07-01T10:00:00"),
    notes: "Picked up speed towards the end.",
    name: "Diana Prince"
  },
  {
    id: 5,
    sequence: 5,
    runner: 105,
    in: new Date("2023-07-01T10:00:00"),
    out: new Date("2023-07-01T10:30:00"),
    notes: "Consistent pace.",
    name: "Edward Elric"
  },
  {
    id: 6,
    sequence: 6,
    runner: 106,
    in: new Date("2023-07-01T10:30:00"),
    out: new Date("2023-07-01T11:00:00"),
    notes: "Felt a bit tired halfway.",
    name: "Fiona Gallagher"
  },
  {
    id: 7,
    sequence: 7,
    runner: 107,
    in: new Date("2023-07-01T11:00:00"),
    out: new Date("2023-07-01T11:30:00"),
    notes: "Great stamina, run. smooth",
    name: "George Weasley"
  },
  {
    id: 8,
    sequence: 8,
    runner: 108,
    in: new Date("2023-07-01T11:30:00"),
    out: new Date("2023-07-01T12:00:00"),
    notes: "Strong finish, good speed.",
    name: "Hannah Abbott"
  },
  {
    id: 9,
    sequence: 9,
    runner: 109,
    in: new Date("2023-07-01T12:00:00"),
    out: new Date("2023-07-01T12:30:00"),
    notes: "Maintained steady pace.",
    name: "Isaac Newton"
  },
  {
    id: 10,
    sequence: 10,
    runner: 110,
    in: new Date("2023-07-01T12:30:00"),
    out: new Date("2023-07-01T13:00:00"),
    notes: "Good form, consistent speed.",
    name: "Jackie Chan"
  }
];

export function useFakeData() {
  return FakeData;
}
