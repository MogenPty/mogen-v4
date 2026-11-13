import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DATABASE_TARGET_HOSTS } from "./database-targets.mjs";

const TARGET_FILES = {
  development: ".env.development.local",
  production: ".env.production.migration.local",
};

function requestedTarget(defaultTarget) {
  const argument = process.argv.find((value) => value.startsWith("--target="));
  return argument ? argument.slice("--target=".length) : defaultTarget;
}

function fail(message) {
  throw new Error(`[database-safety] ${message}`);
}

export function loadDatabaseEnvironment({
  operation,
  allowedTargets = ["development", "production"],
  defaultTarget = "development",
} = {}) {
  const target = requestedTarget(defaultTarget);
  if (!Object.hasOwn(TARGET_FILES, target)) {
    fail(`Unknown target "${target}". Use --target=development or --target=production.`);
  }
  if (!allowedTargets.includes(target)) {
    fail(`${operation ?? "This operation"} is not allowed against ${target}.`);
  }

  const fileName = TARGET_FILES[target];
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    fail(`${fileName} is missing. Refusing to select a database implicitly.`);
  }

  const loaded = config({ path: filePath, override: true, quiet: true });
  if (loaded.error) {
    fail(`Could not load ${fileName}: ${loaded.error.message}`);
  }

  const configuredTarget = process.env.MOGEN_DATABASE_ENV?.trim();
  if (configuredTarget !== target) {
    fail(`${fileName} declares MOGEN_DATABASE_ENV=${configuredTarget || "<missing>"}; expected ${target}.`);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const expectedHost = DATABASE_TARGET_HOSTS[target];
  if (!databaseUrl) fail(`${fileName} does not define DATABASE_URL.`);
  if (!expectedHost) fail(`No approved database host is configured for ${target}.`);

  let actualHost;
  try {
    actualHost = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    fail(`${fileName} contains an invalid DATABASE_URL.`);
  }
  if (actualHost !== expectedHost) {
    fail(`DATABASE_URL host ${actualHost} does not match the approved ${target} host ${expectedHost}.`);
  }

  return { target, fileName, databaseUrl, host: actualHost };
}
