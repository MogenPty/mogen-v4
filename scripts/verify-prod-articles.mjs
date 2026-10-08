/**
 * Production-build regression test for the MDX article index (§17).
 *
 * Starts `next start` (production runtime), then asserts:
 *   1. /articles lists published articles (no "No articles yet").
 *   2. /articles/<slug> renders the known article.
 *   3. /sitemap.xml contains the known article URL.
 *
 * Usage:
 *   node scripts/verify-prod-articles.mjs [port]
 *
 * To simulate serverless runtime (loose articles/*.mdx absent from the
 * function filesystem), temporarily rename the articles/ directory AFTER
 * `next build` and BEFORE `next start` — all three checks must still pass
 * because metadata comes from the bundled generated index.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";

const port = Number(process.argv[2] ?? 3100);
const base = `http://127.0.0.1:${port}`;
const KNOWN_SLUG = "web-development-in-the-brits-area";

/** Fail fast if something already answers on the port (stale server). */
async function assertPortFree() {
  try {
    await fetch(`${base}/`, { redirect: "manual" });
  } catch {
    return; // connection refused: port is free
  }
  throw new Error(
    `port ${port} is already occupied — refusing to test a stale server`,
  );
}

async function waitForServer(server, deadlineMs) {
  const start = Date.now();
  for (;;) {
    if (server.exitCode !== null) {
      throw new Error(
        `next start exited during startup (code ${server.exitCode}) — readiness cannot belong to this run`,
      );
    }
    try {
      const res = await fetch(`${base}/articles`, { redirect: "manual" });
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > deadlineMs) {
      throw new Error(`server did not become ready within ${deadlineMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function main() {
  await assertPortFree();
  // Spawn the Next binary directly (no intermediary shell, no PATH lookup):
  // with shell:true, args are concatenated, not escaped (DEP0190).
  const server = spawn(
    process.execPath,
    [join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    { stdio: "ignore" },
  );
  const failures = [];
  try {
    await waitForServer(server, 90000);

    const index = await (await fetch(`${base}/articles`)).text();
    if (index.includes("No articles yet")) {
      failures.push("FAIL /articles shows 'No articles yet'");
    } else {
      console.log("PASS /articles does not show the empty state");
    }
    if (index.includes("Web Development in the Brits Area")) {
      console.log("PASS /articles lists the known article");
    } else {
      failures.push("FAIL /articles missing the known article title");
    }

    const slugRes = await fetch(`${base}/articles/${KNOWN_SLUG}`);
    const slugHtml = await slugRes.text();
    if (
      slugRes.status === 200 &&
      slugHtml.includes("Web Development in the Brits Area")
    ) {
      console.log(`PASS /articles/${KNOWN_SLUG} renders (200)`);
    } else {
      failures.push(
        `FAIL /articles/${KNOWN_SLUG} status=${slugRes.status}`,
      );
    }

    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    if (sitemap.includes(`/articles/${KNOWN_SLUG}`)) {
      console.log("PASS /sitemap.xml contains the known article URL");
    } else {
      failures.push("FAIL /sitemap.xml missing the known article URL");
    }
  } catch (error) {
    failures.push(`FAIL harness error: ${error.message}`);
  } finally {
    server.kill();
    // Wait for the spawned process to actually exit (bounded, so a wedged
    // child cannot hang the harness forever).
    await Promise.race([
      once(server, "exit").then(() => undefined),
      new Promise((r) => setTimeout(r, 10000)),
    ]);
  }
  if (failures.length > 0) {
    for (const f of failures) console.error(f);
    process.exit(1);
  }
  console.log("verify-prod-articles: all checks passed");
}

await main();
