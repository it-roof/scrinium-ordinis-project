const ASSET_ID_PATTERN =
  /\/api\/docs\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export function extractAssetIdsFromMarkdown(content: string): string[] {
  const ids = new Set<string>();

  for (const match of content.matchAll(ASSET_ID_PATTERN)) {
    ids.add(match[1]);
  }

  return [...ids];
}

export function removeAssetFromMarkdown(content: string, assetId: string): string {
  const escapedId = assetId.replace(/-/g, "\\-");
  const imagePattern = new RegExp(
    `!\\[[^\\]]*\\]\\(/api/docs/files/${escapedId}\\)\\n?`,
    "g"
  );
  const linkPattern = new RegExp(
    `\\[[^\\]]*\\]\\(/api/docs/files/${escapedId}\\)\\n?`,
    "g"
  );

  return content
    .replace(imagePattern, "")
    .replace(linkPattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
