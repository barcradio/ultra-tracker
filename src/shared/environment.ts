export function normalizePathForCrossPlatformMatching(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}
