import path from "path";
import { describe, expect, it } from "vitest";
import {
  arePathsEquivalentForPlatform,
  normalizeLineEndingsForCrossPlatformMatching,
  normalizePathForCrossPlatformMatching,
  toPlatformPathFromPosix,
  unsupportedPlatformCodeSigningStrategy,
  unsupportedPlatformPermissionModel,
  unsupportedPlatformSerialDeviceNaming,
  unsupportedPlatformShellInvocation
} from "./environment";

describe("environment helpers", () => {
  it("normalizes path separators for cross-platform matching", () => {
    expect(normalizePathForCrossPlatformMatching("\\tmp\\documents\\ultra-tracker")).toBe(
      "/tmp/documents/ultra-tracker"
    );
  });

  it("normalizes line endings for cross-platform matching", () => {
    expect(normalizeLineEndingsForCrossPlatformMatching("first\r\nsecond\r\n")).toBe(
      "first\nsecond\n"
    );
  });

  it("converts a posix-style fixture path into the host platform format", () => {
    expect(toPlatformPathFromPosix("/tmp/documents/ultra-tracker")).toBe(
      path.join(path.sep, "tmp", "documents", "ultra-tracker")
    );
  });

  it("compares paths case-insensitively on windows", () => {
    expect(arePathsEquivalentForPlatform("C:\\Temp\\Log.TXT", "c:/temp/log.txt", "win32")).toBe(
      true
    );
  });

  it("compares paths case-sensitively on linux", () => {
    expect(arePathsEquivalentForPlatform("/tmp/Log.txt", "/tmp/log.txt", "linux")).toBe(false);
  });

  it.each([
    unsupportedPlatformSerialDeviceNaming,
    unsupportedPlatformPermissionModel,
    unsupportedPlatformCodeSigningStrategy,
    unsupportedPlatformShellInvocation
  ])("marks deferred platform behavior as not implemented", (fn) => {
    expect(() => fn()).toThrow(/Not implemented/);
  });
});
