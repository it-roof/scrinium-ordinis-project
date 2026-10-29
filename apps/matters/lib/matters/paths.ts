export const AKTEN_PATH = "/akten";

export function matterPath(matterId: string) {
  return `${AKTEN_PATH}/${matterId}`;
}

export function clientAktenPath(clientId: string) {
  return `${AKTEN_PATH}?client=${encodeURIComponent(clientId)}`;
}
