const PUT_ATTEMPTS = 3;
const PUT_TIMEOUT_MS = 120_000;

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function putFileToSignedUrl(
  uploadUrl: string,
  file: File,
  mimeType: string
): Promise<void> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < PUT_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: file,
        signal: AbortSignal.timeout(PUT_TIMEOUT_MS),
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`Upload HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < PUT_ATTEMPTS - 1) {
      await wait(400 * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Upload fehlgeschlagen.");
}
