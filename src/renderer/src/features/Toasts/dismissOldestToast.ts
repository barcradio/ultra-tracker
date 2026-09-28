export function dismissOldestToast<T extends { key?: string; epoch: Date }>(
  toasts: T[],
  key: string
) {
  const matches = toasts.filter((toast) => toast.key === key);
  if (matches.length === 0) return toasts;

  const oldest = matches.reduce((a, b) => (b.epoch < a.epoch ? b : a));
  return toasts.filter((toast) => toast !== oldest);
}
