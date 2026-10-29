export function titleFromMessage(text: string) {
  const line = text.split("\n").find((part) => part.trim()) ?? "Neuer Chat";
  return line.trim().slice(0, 48);
}
