import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

const fileName = ".env.development.local";
const loaded = config({ path: resolve(process.cwd(), fileName), override: true, quiet: true });
if (loaded.error) {
  console.error(`Could not load ${fileName}: ${loaded.error.message}`);
  process.exit(1);
}
if (process.env.MOGEN_DATABASE_ENV !== "development") {
  console.error(`${fileName} must declare MOGEN_DATABASE_ENV=development.`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [resolve(process.cwd(), "node_modules/next/dist/bin/next"), "build"],
  {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
