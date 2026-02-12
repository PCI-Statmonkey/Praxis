import { describe, expect, test, vi } from "vitest";

describe("runtimeComposition no-side-effects", () => {
  test("import does not start timers, write files, or log diagnostics", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const logSpy = vi.spyOn(console, "log");
    const warnSpy = vi.spyOn(console, "warn");
    const errorSpy = vi.spyOn(console, "error");
    const fs = await import("fs");
    const mkdirSpy = vi.spyOn(fs.promises, "mkdir");
    const writeFileSpy = vi.spyOn(fs.promises, "writeFile");
    const appendFileSpy = vi.spyOn(fs.promises, "appendFile");

    try {
      await import("./runtimeComposition");
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(mkdirSpy).not.toHaveBeenCalled();
      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(appendFileSpy).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      setIntervalSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
      appendFileSpy.mockRestore();
    }
  });
});
