export type LetterRecord = {
  id: string;
  title: string;
  kind: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  matterId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LetterDraftInput = {
  title: string;
  salutation: string;
  body: string;
  closing: string;
};

export type MatterLetterListItem = {
  id: string;
  title: string;
  updatedAt: string;
  chatId: string | null;
};
