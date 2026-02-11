import { expect, expectTypeOf, test } from "vitest";
import {
  IpcFailure,
  IpcResult,
  IpcSuccess,
  RuntimePingResponse,
} from "./runtimeTypes";
import { RUNTIME_PING } from "./runtimeChannels";

test("runtime channel naming", () => {
  expect(RUNTIME_PING).toBe("praxis:runtime:ping");
});

test("ipc result type shape", () => {
  expectTypeOf<IpcResult<RuntimePingResponse>>().toEqualTypeOf<
    IpcSuccess<RuntimePingResponse> | IpcFailure
  >();

  const ok: IpcSuccess<RuntimePingResponse> = {
    ok: true,
    data: { version: "0.0.0" },
  };
  const err: IpcFailure = {
    ok: false,
    error: { code: "unknown_error", message: "boom" },
  };

  expect(ok.ok).toBe(true);
  expect(err.ok).toBe(false);
});
