import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

let syncQueue = Promise.resolve();

function normalizeRepoPath(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function runGit(args) {
  return execFileAsync("git", args, { cwd: REPO_ROOT });
}

async function getCurrentBranch() {
  const { stdout } = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

async function hasStagedChanges() {
  try {
    await runGit(["diff", "--cached", "--quiet"]);
    return false;
  } catch (error) {
    return true;
  }
}

async function syncFilesInternal(filePaths, message) {
  const repoPaths = [...new Set(filePaths.map(normalizeRepoPath))];

  await runGit(["add", "--", ...repoPaths]);

  if (!(await hasStagedChanges())) {
    return { committed: false, pushed: false };
  }

  await runGit(["commit", "-m", message]);

  const branch = await getCurrentBranch();
  await runGit(["push", "origin", branch]);

  return { committed: true, pushed: true, branch };
}

export function syncRepoFiles(filePaths, message) {
  const run = syncQueue.then(() => syncFilesInternal(filePaths, message));
  syncQueue = run.catch(() => {});
  return run;
}
