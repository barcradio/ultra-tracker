import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetWebContents, reloadMainWindow } from "../webContents";

const webContents = vi.hoisted(() => ({ reload: vi.fn() }));
const fromId = vi.hoisted(() => vi.fn());

vi.mock("electron", () => ({ BrowserWindow: { fromId } }));

describe("webContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the main window's web contents", () => {
    fromId.mockReturnValue({ webContents });

    expect(GetWebContents()).toBe(webContents);
    expect(fromId).toHaveBeenCalledWith(1);
  });

  it("returns nothing when there is no main window", () => {
    fromId.mockReturnValue(undefined);

    expect(GetWebContents()).toBeUndefined();
  });

  it("reloads the main window", () => {
    fromId.mockReturnValue({ webContents });

    reloadMainWindow();

    expect(webContents.reload).toHaveBeenCalled();
  });

  it("does nothing when reloading with no main window", () => {
    fromId.mockReturnValue(undefined);

    expect(() => reloadMainWindow()).not.toThrow();
  });
});
