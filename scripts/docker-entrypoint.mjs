import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const children = new Set();
let stopping = false;

const launch = (label, entry, extraEnv = {}) => {
  const child = spawn(process.execPath, [join(root, entry)], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: false,
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (stopping) return;
    console.error(`${label} exited unexpectedly (${signal ?? code ?? "unknown"})`);
    void shutdown("SIGTERM", code && code > 0 ? code : 1);
  });
  return child;
};

const shutdown = async (signal, exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolve) => {
          const timer = setTimeout(() => {
            child.kill("SIGKILL");
            resolve();
          }, 8_000);
          child.once("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        }),
    ),
  );
  process.exit(exitCode);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

launch("harness", "dist-server/index.js", {
  OMB_STATIC_DIR: join(root, "dist"),
  OMB_SKILLS_DIR: join(root, "skills"),
});
launch("companion", "dist-companion/index.js", {
  OMB_PWA_DIR: join(root, "dist"),
});
