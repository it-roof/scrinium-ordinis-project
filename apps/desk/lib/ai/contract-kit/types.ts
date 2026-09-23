/**
 * Shared types for contract workspace — safe for client + server (no "use server").
 */

export type ContractWorkspaceMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ContractWorkspaceFilePayload = {
  name: string;
  mimeType: string;
  /** Raw file bytes as base64 (no data: URL prefix). */
  base64: string;
};

export type ContractWorkspaceTurnResult =
  | {
      success: true;
      reply: string;
      userDisplay: string;
    }
  | { success: false; error: string; code: string };

export type ExportContractDocxResult =
  | {
      success: true;
      filename: string;
      base64: string;
    }
  | { success: false; error: string; code: string };
