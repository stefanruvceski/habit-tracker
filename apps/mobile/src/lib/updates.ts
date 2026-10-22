/**
 * Self-update for the sideloaded Android build.
 *
 * Every push to main builds a signed APK in GitHub Actions and publishes it as
 * a GitHub Release tagged `android-b<N>` (N = Android versionCode). The app
 * asks GitHub for the newest such release; if its N is higher than the
 * installed build, it can download the APK and hand it to Android's installer.
 */
import { Platform } from "react-native";

export const RELEASES_URL =
  "https://api.github.com/repos/stefanruvceski/habit-tracker/releases?per_page=15";
const TAG_PREFIX = "android-b";

export interface ReleaseInfo {
  build: number;
  tag: string;
  apkUrl: string;
  notes: string;
  publishedAt: string;
}

interface GhAsset {
  name: string;
  browser_download_url: string;
}
interface GhRelease {
  tag_name: string;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  assets?: GhAsset[];
}

/** Build number from a tag like `android-b42`, or null. */
export function buildFromTag(tag: string): number | null {
  if (!tag.startsWith(TAG_PREFIX)) return null;
  const n = Number(tag.slice(TAG_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The newest published Android release that has an APK attached. */
export function pickLatest(releases: GhRelease[]): ReleaseInfo | null {
  let best: ReleaseInfo | null = null;
  for (const r of releases) {
    if (r.draft) continue;
    const build = buildFromTag(r.tag_name);
    const apk = r.assets?.find((a) => a.name.endsWith(".apk"));
    if (build == null || !apk) continue;
    if (!best || build > best.build) {
      best = {
        build,
        tag: r.tag_name,
        apkUrl: apk.browser_download_url,
        notes: (r.body ?? "").trim(),
        publishedAt: r.published_at ?? "",
      };
    }
  }
  return best;
}

/** The installed build number (Android versionCode), or 0 when unknown. */
export function installedBuild(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const app = require("expo-application") as typeof import("expo-application");
    return Number(app.nativeBuildVersion) || 0;
  } catch {
    return 0;
  }
}

/** Ask GitHub for the newest release; null if offline or none newer. */
export async function checkForUpdate(current = installedBuild()): Promise<ReleaseInfo | null> {
  // The dev build gets its JS live from Metro; only the real app self-updates.
  if (Platform.OS !== "android" || process.env.EXPO_PUBLIC_APP_VARIANT === "dev") return null;
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const latest = pickLatest((await res.json()) as GhRelease[]);
    return latest && latest.build > current ? latest : null;
  } catch {
    return null;
  }
}

/**
 * Download the APK and open Android's package installer. The first time,
 * Android asks to allow "Install unknown apps" for this app.
 */
export async function downloadAndInstall(
  release: ReleaseInfo,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const FileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
  const IntentLauncher = require("expo-intent-launcher") as typeof import("expo-intent-launcher");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const target = `${FileSystem.cacheDirectory}streakli-${release.build}.apk`;
  const task = FileSystem.createDownloadResumable(release.apkUrl, target, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) {
      onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });
  const result = await task.downloadAsync();
  if (!result || result.status !== 200) throw new Error("Download failed");
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: "application/vnd.android.package-archive",
  });
}
