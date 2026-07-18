import fs from "fs";
import path from "path";
import packageInfo from "../../package.json";

export type AppVersionInfo = {
  name: string;
  version: string;
  commit: string | null;
  shortCommit: string | null;
  buildTime: string | null;
  releaseId: string;
};

function resolveGitDir(): string | null {
  const gitPath = path.join(process.cwd(), ".git");

  try {
    const stat = fs.statSync(gitPath);
    if (stat.isDirectory()) return gitPath;
  } catch {
    // Continue below for worktree git files.
  }

  try {
    const content = fs.readFileSync(gitPath, "utf8").trim();
    if (content.startsWith("gitdir:")) {
      return path.resolve(process.cwd(), content.slice("gitdir:".length).trim());
    }
  } catch {
    return null;
  }

  return null;
}

function readGitCommit(): string | null {
  const gitDir = resolveGitDir();
  if (!gitDir) return null;

  try {
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref:")) return head;

    const ref = head.slice("ref:".length).trim();
    const refPath = path.join(gitDir, ref);
    if (fs.existsSync(refPath)) {
      return fs.readFileSync(refPath, "utf8").trim();
    }

    const packedRefsPath = path.join(gitDir, "packed-refs");
    if (fs.existsSync(packedRefsPath)) {
      const packedRefs = fs.readFileSync(packedRefsPath, "utf8").split(/\r?\n/);
      const match = packedRefs.find((line) => line.endsWith(` ${ref}`));
      return match ? match.split(" ")[0] : null;
    }
  } catch {
    return null;
  }

  return null;
}

function firstDefined(...values: Array<string | undefined | null>): string | null {
  const value = values.find((item) => item && item.trim());
  return value ? value.trim() : null;
}

export function getAppVersionInfo(): AppVersionInfo {
  const version = firstDefined(process.env.NEXT_PUBLIC_APP_VERSION, process.env.APP_VERSION, packageInfo.version) || packageInfo.version;
  const commit = firstDefined(
    process.env.NEXT_PUBLIC_APP_COMMIT,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.GIT_COMMIT,
    readGitCommit()
  );
  const shortCommit = commit ? commit.slice(0, 12) : null;
  const buildTime = firstDefined(process.env.NEXT_PUBLIC_BUILD_TIME, process.env.BUILD_TIME);
  const releaseId = [version, shortCommit || buildTime || "local"].join("+");

  return {
    name: packageInfo.name,
    version,
    commit,
    shortCommit,
    buildTime,
    releaseId,
  };
}
