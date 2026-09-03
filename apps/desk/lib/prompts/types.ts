export type PromptTag = {
  id: string;
  name: string;
};

export type PromptTagWithCount = PromptTag & {
  promptCount: number;
};

export type Prompt = {
  id: string;
  title: string;
  content: string;
  tags: PromptTag[];
  createdAt: string;
  updatedAt: string;
};

export type PromptInput = {
  title: string;
  content: string;
  tags: string[];
};
