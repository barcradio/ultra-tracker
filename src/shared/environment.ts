export function normalizePathForCrossPlatformMatching(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

export function normalizeLineEndingsForCrossPlatformMatching(content: string): string {
  return content.replaceAll("\r\n", "\n");
}

export function toPlatformPathFromPosix(posixPath: string): string {
  if (posixPath === "/") return posixPath;
  const segments = posixPath.split("/").filter(Boolean);
  return `${pathPrefixForCurrentPlatform()}${segments.join(pathSeparatorForCurrentPlatform())}`;
}

export function arePathsEquivalentForPlatform(
  leftPath: string,
  rightPath: string,
  platform: "darwin" | "linux" | "win32"
): boolean {
  const normalizedLeft = normalizePathForCrossPlatformMatching(leftPath);
  const normalizedRight = normalizePathForCrossPlatformMatching(rightPath);
  if (platform === "win32") return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
  return normalizedLeft === normalizedRight;
}

export function unsupportedPlatformSerialDeviceNaming(): never {
  throw new Error("Not implemented: platform-specific serial device naming");
}

export function unsupportedPlatformPermissionModel(): never {
  throw new Error("Not implemented: platform-specific permission model");
}

export function unsupportedPlatformCodeSigningStrategy(): never {
  throw new Error("Not implemented: platform-specific code-signing strategy");
}

export function unsupportedPlatformShellInvocation(): never {
  throw new Error("Not implemented: platform-specific shell invocation");
}

function pathSeparatorForCurrentPlatform(): string {
  return process.platform === "win32" ? "\\" : "/";
}

function pathPrefixForCurrentPlatform(): string {
  return process.platform === "win32" ? "\\" : "/";
}
