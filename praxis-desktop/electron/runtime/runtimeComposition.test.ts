import { describe, expect, test, vi } from "vitest";

describe("runtimeComposition no-side-effects", () => {
  test("import does not start timers or write files", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const fs = await import("fs");
    const mkdirSpy = vi.spyOn(fs.promises, "mkdir");
    const writeFileSpy = vi.spyOn(fs.promises, "writeFile");
    const appendFileSpy = vi.spyOn(fs.promises, "appendFile");

    try {
      await import("./runtimeComposition");
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(mkdirSpy).not.toHaveBeenCalled();
      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(appendFileSpy).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      setIntervalSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
      appendFileSpy.mockRestore();
    }
  });
});
