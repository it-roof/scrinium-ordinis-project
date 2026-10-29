function normalize(value: string) {
  return value.toLocaleLowerCase("de");
}

export function filterChats<T extends { title: string }>(
  chats: T[],
  query: string
): T[] {
  const needle = query.trim().toLocaleLowerCase("de");
  if (!needle) return chats;
  return chats.filter((chat) => normalize(chat.title).includes(needle));
}

export function filterMatters<
  T extends {
    title: string;
    clientName: string;
    reference: string;
    fileNumber?: string;
    subject?: string;
  },
>(matters: T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase("de");
  if (!needle) return matters;
  return matters.filter((matter) => {
    return (
      normalize(matter.title).includes(needle) ||
      normalize(matter.clientName).includes(needle) ||
      normalize(matter.reference).includes(needle) ||
      normalize(matter.fileNumber ?? "").includes(needle) ||
      normalize(matter.subject ?? "").includes(needle)
    );
  });
}
