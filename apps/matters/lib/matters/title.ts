export function suggestShortTitle(clientName: string, opponentName: string) {
  const client = clientName.trim();
  const opponent = opponentName.trim();
  if (client && opponent) return `${client} ./. ${opponent}`;
  return client || opponent;
}

export function formatFileNumber(seq: number, year: number) {
  return `${seq}/${year}`;
}
