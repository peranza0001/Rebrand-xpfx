import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

function commandOutput(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const sourceCommit = process.env.VERCEL_GIT_COMMIT_SHA || commandOutput("git", ["rev-parse", "HEAD"]);
const sourceBranch = process.env.VERCEL_GIT_COMMIT_REF || commandOutput("git", ["branch", "--show-current"]);
const sourceRepository = process.env.VERCEL_GIT_REPO_SLUG
  ? `${process.env.VERCEL_GIT_REPO_OWNER ?? "unknown"}/${process.env.VERCEL_GIT_REPO_SLUG}`
  : "unknown";

execFileSync("npm", ["run", "build", "--workspace=lib/api-client-react"], { stdio: "inherit" });
execFileSync("npm", ["run", "build", "--workspace=artifacts/nextrade"], { stdio: "inherit" });

const outputDirectory = "artifacts/nextrade/dist/public";
await mkdir(outputDirectory, { recursive: true });
await writeFile(`${outputDirectory}/build-info.json`, `${JSON.stringify({
  sourceCommit,
  sourceBranch,
  sourceRepository,
  builtAt: new Date().toISOString(),
  platform: "vercel",
}, null, 2)}\n`);

console.log(`Vercel build completed from ${sourceCommit} (${sourceBranch})`);