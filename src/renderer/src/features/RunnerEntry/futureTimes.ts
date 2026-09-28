type Times = { in: Date | null; out: Date | null };

export function getFutureTimeLabels(times: Times, now: Date) {
  const labels: string[] = [];
  if (times.in && times.in > now) labels.push("In");
  if (times.out && times.out > now) labels.push("Out");
  return labels;
}
