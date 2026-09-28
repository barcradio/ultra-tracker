type KeyPress = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">;

export function shouldFocusBibOnKey(event: KeyPress, isTypingElsewhere: boolean) {
  if (isTypingElsewhere) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return /^\d$/.test(event.key);
}
