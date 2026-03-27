import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ALLOWED_FILE_PATTERNS = [
  /^feeds\/weekly-summary\.xml$/,
  /^feeds\/weekly-summary\.json$/,
  /^events\/data\/index\.json$/,
  /^events\/data\/\d{4}\/\d{2}\/[^/]+\.json$/
];

let syncQueue = Promise.resolve();

function normalizeRepoPath(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function assertAllowedRepoPaths(repoPaths) {
  const forbiddenPaths = repoPaths.filter(repoPath =>
    !ALLOWED_FILE_PATTERNS.some(pattern => pattern.test(repoPath))
  );

  if (forbiddenPaths.length > 0) {
    const error = new Error(`Nicht erlaubte Sync-Ziele: ${forbiddenPaths.join(", ")}`);
    error.code = "SYNC_PATH_FORBIDDEN";
    throw error;
  }
}

async function runGit(args) {
  return execFileAsync("git", args, { cwd: REPO_ROOT });
}

async function getCurrentBranch() {
  const { stdout } = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

async function hasStagedChanges(repoPaths) {
  try {
    await runGit(["diff", "--cached", "--quiet", "--", ...repoPaths]);
    return false;
  } catch (error) {
    return true;
  }
}

async function syncFilesInternal(filePaths, message) {
  const repoPaths = [...new Set(filePaths.map(normalizeRepoPath))];
  assertAllowedRepoPaths(repoPaths);

  await runGit(["add", "--", ...repoPaths]);

  if (!(await hasStagedChanges(repoPaths))) {
    return { committed: false, pushed: false };
  }

  await runGit(["commit", "-m", message, "--", ...repoPaths]);

  const branch = await getCurrentBranch();
  await runGit(["push", "origin", branch]);

  return { committed: true, pushed: true, branch };
}

export function syncRepoFiles(filePaths, message) {
  const run = syncQueue.then(() => syncFilesInternal(filePaths, message));
  syncQueue = run.catch(() => {});
  return run;
}
