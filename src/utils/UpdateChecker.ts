/**
 * VibeCoin Update Checker
 *
 * Checks for updates from GitHub and helps users update their installation.
 * Works for both git-cloned repos and future npm installations.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execSync, spawn } from 'child_process';

// GitHub repository info
const GITHUB_OWNER = 'IOSBLKSTUDIO';
const GITHUB_REPO = 'VibeCoin';

// Cache file for update checks (don't spam GitHub)
const UPDATE_CACHE_DIR = path.join(require('os').homedir(), '.vibecoin');
const UPDATE_CACHE_FILE = path.join(UPDATE_CACHE_DIR, 'update-cache.json');

// Check at most once every 6 hours
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  releaseNotes?: string;
  checkedAt: number;
}

interface CacheData {
  lastCheck: number;
  latestVersion: string;
  releaseUrl?: string;
  releaseNotes?: string;
}

/**
 * Get the current installed version from package.json
 */
export function getCurrentVersion(): string {
  try {
    // Try to find package.json relative to the script
    const possiblePaths = [
      path.join(__dirname, '../../package.json'),
      path.join(__dirname, '../../../package.json'),
      path.join(process.cwd(), 'package.json'),
    ];

    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
      }
    }
    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Fetch latest release info from GitHub API
 */
async function fetchLatestRelease(): Promise<{ version: string; url: string; notes: string } | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'VibeCoin-CLI',
        'Accept': 'application/vnd.github.v3+json',
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const release = JSON.parse(data);
            const version = release.tag_name?.replace(/^v/, '') || '0.0.0';
            resolve({
              version,
              url: release.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
              notes: release.body?.substring(0, 200) || '',
            });
          } else {
            // No releases yet, try to get latest tag or commit
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Fetch latest package.json from GitHub to check version
 */
async function fetchLatestPackageVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'raw.githubusercontent.com',
      path: `/${GITHUB_OWNER}/${GITHUB_REPO}/master/package.json`,
      method: 'GET',
      headers: {
        'User-Agent': 'VibeCoin-CLI',
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const pkg = JSON.parse(data);
            resolve(pkg.version || null);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Load cached update info
 */
function loadCache(): CacheData | null {
  try {
    if (fs.existsSync(UPDATE_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(UPDATE_CACHE_FILE, 'utf8'));
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Save update info to cache
 */
function saveCache(data: CacheData): void {
  try {
    if (!fs.existsSync(UPDATE_CACHE_DIR)) {
      fs.mkdirSync(UPDATE_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(UPDATE_CACHE_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Compare version strings (semver-like)
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Check for updates (with caching)
 */
export async function checkForUpdates(forceCheck = false): Promise<UpdateInfo> {
  const currentVersion = getCurrentVersion();
  const now = Date.now();

  // Check cache first (unless forced)
  if (!forceCheck) {
    const cache = loadCache();
    if (cache && (now - cache.lastCheck) < CHECK_INTERVAL_MS) {
      return {
        currentVersion,
        latestVersion: cache.latestVersion,
        updateAvailable: compareVersions(cache.latestVersion, currentVersion) > 0,
        releaseUrl: cache.releaseUrl,
        releaseNotes: cache.releaseNotes,
        checkedAt: cache.lastCheck,
      };
    }
  }

  // Try to get latest release first
  let latestVersion = currentVersion;
  let releaseUrl: string | undefined;
  let releaseNotes: string | undefined;

  const release = await fetchLatestRelease();
  if (release) {
    latestVersion = release.version;
    releaseUrl = release.url;
    releaseNotes = release.notes;
  } else {
    // Fallback to checking package.json directly
    const pkgVersion = await fetchLatestPackageVersion();
    if (pkgVersion) {
      latestVersion = pkgVersion;
      releaseUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
    }
  }

  // Save to cache
  saveCache({
    lastCheck: now,
    latestVersion,
    releaseUrl,
    releaseNotes,
  });

  return {
    currentVersion,
    latestVersion,
    updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
    releaseUrl,
    releaseNotes,
    checkedAt: now,
  };
}

/**
 * Check if we're in a git repository
 */
export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore', cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git remote URL
 */
export function getGitRemote(): string | null {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8', cwd: process.cwd() }).trim();
    return remote;
  } catch {
    return null;
  }
}

/**
 * Check if there are local changes that would be overwritten
 */
export function hasLocalChanges(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: process.cwd() });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Perform git pull to update
 */
export async function performGitUpdate(): Promise<{ success: boolean; message: string }> {
  if (!isGitRepo()) {
    return {
      success: false,
      message: 'Not a git repository. Please update manually or re-clone the project.',
    };
  }

  if (hasLocalChanges()) {
    return {
      success: false,
      message: 'You have local changes. Please commit or stash them first:\n  git stash\n  Then run the update again.',
    };
  }

  try {
    // Fetch latest
    console.log('Fetching updates...');
    execSync('git fetch origin', { stdio: 'inherit', cwd: process.cwd() });

    // Pull changes
    console.log('Pulling changes...');
    execSync('git pull origin master', { stdio: 'inherit', cwd: process.cwd() });

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: process.cwd() });

    // Rebuild
    console.log('Building project...');
    execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });

    return {
      success: true,
      message: 'Update completed successfully!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Update failed: ${error.message}`,
    };
  }
}

/**
 * Display update notification if available
 */
export function displayUpdateNotification(info: UpdateInfo): void {
  if (!info.updateAvailable) return;

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    UPDATE AVAILABLE / MISE A JOUR                  ║
╚═══════════════════════════════════════════════════════════════════╝

  Current version:  v${info.currentVersion}
  Latest version:   v${info.latestVersion}

  Run this command to update:
    node dist/cli.js --update

  Or manually:
    git pull && npm install && npm run build

`);
}

/**
 * Display compact update notification (for startup)
 */
export function displayCompactUpdateNotification(info: UpdateInfo): void {
  if (!info.updateAvailable) return;

  console.log(`
  ⬆️  Update available: v${info.currentVersion} → v${info.latestVersion}
      Run 'node dist/cli.js --update' to update
`);
}
