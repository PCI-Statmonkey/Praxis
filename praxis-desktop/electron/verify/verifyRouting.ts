export const handleVerifyFlag = async (
  argv: string[],
  options: {
    runVerify: (opts: { json?: boolean }) => Promise<number>;
    exit: (code: number) => void;
    logError?: (message: string) => void;
  }
) => {
  const verifyIndex = argv.indexOf("--verify");
  if (verifyIndex === -1) return false;
  const json = argv.includes("--json");
  try {
    const exitCode = await options.runVerify({ json });
    options.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logError?.(`Verify failed: ${message}`);
    options.exit(2);
  }
  return true;
};
