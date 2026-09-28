import { spawn } from "node:child_process";

process.env.ANALYZE = "true";

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(cmd, ["next", "build"], {
  stdio: "inherit",
  env: { ...process.env, ANALYZE: "true" },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
