import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Linking } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Polls a tiny version manifest hosted on GitHub raw to detect when a newer
 * TestFlight / App Store build is available, and exposes the state so the
 * UI can show a banner.
 *
 * Why not OTA? `expo-updates` only handles JS-bundle updates within the same
 * `runtimeVersion` — native version bumps (1.0.1 → 1.0.2) require a brand
 * new TestFlight install, which the JS layer can never trigger itself.
 * This hook is the bridge: detect the gap, nudge the user toward TestFlight.
 *
 * Behaviour:
 * - Fetches the manifest on mount and every time the app foregrounds.
 * - Compares the installed app version (from `expo-constants`) against
 *   `latest`. When installed < latest → `updateAvailable = true`.
 * - When installed < `minimum` → `forceUpdate = true` so the UI can hide
 *   the dismiss button (a hard-required upgrade).
 * - Remembers which `latest` the user dismissed so a soft banner doesn't
 *   nag on every launch — once dismissed for 1.0.2 it stays quiet until
 *   1.0.3 ships.
 */

// Public raw URL of the manifest in the project repo. Bump `latest` in
// version.json on `main` whenever you submit a new TestFlight build.
const MANIFEST_URL =
  "https://raw.githubusercontent.com/Optimisedigi/kens-ios-app/main/version.json";

const DISMISSED_KEY = "newBuild:dismissedVersion";

interface VersionManifest {
  latest: string;
  minimum?: string;
  releaseNotes?: string;
}

/** Compare two semver-ish strings ("1.0.2" vs "1.0.10"). Returns -1/0/1. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

export interface NewBuildState {
  /** A newer non-mandatory build is available and the user hasn't dismissed it. */
  updateAvailable: boolean;
  /** A newer build is mandatory (installed < manifest.minimum). Always shown. */
  forceUpdate: boolean;
  /** The latest version string from the manifest, or null until first fetch. */
  latestVersion: string | null;
  releaseNotes: string | null;
  /** Open TestFlight (or App Store fallback) so the user can grab the new build. */
  openTestFlight: () => Promise<void>;
  /** Dismiss the soft banner for the current `latestVersion`. */
  dismiss: () => Promise<void>;
}

export function useNewBuildCheck(): NewBuildState {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const fetching = useRef(false);

  // Installed app version, e.g. "1.0.1". `expoConfig.version` is the value
  // we set in app.json and is what EAS bakes into the build.
  const installedVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.0.0";

  const checkManifest = async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      // Cache-bust so a freshly pushed manifest is picked up immediately
      // instead of waiting on GitHub's CDN edge cache.
      const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
      if (!res.ok) return;
      const data = (await res.json()) as VersionManifest;
      if (!data?.latest) return;
      setLatestVersion(data.latest);
      setReleaseNotes(data.releaseNotes ?? null);
      if (data.minimum) {
        setForceUpdate(compareVersions(installedVersion, data.minimum) < 0);
      } else {
        setForceUpdate(false);
      }
    } catch {
      // Offline, GitHub down, malformed JSON — no banner, no error UI.
      // The check will retry on next foreground.
    } finally {
      fetching.current = false;
    }
  };

  // Load whatever version the user previously dismissed; cheap and only
  // runs once at mount.
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((v) => setDismissedVersion(v))
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkManifest();
    const sub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") checkManifest();
      }
    );
    return () => sub.remove();
    // installedVersion is read inside checkManifest but it's a constant
    // for the lifetime of the JS bundle, so the empty dep array is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNewer =
    latestVersion !== null &&
    compareVersions(installedVersion, latestVersion) < 0;
  const dismissedThisVersion =
    dismissedVersion !== null && dismissedVersion === latestVersion;

  // Soft banner: newer build exists, user hasn't already silenced this version.
  // Force banner: always shown, ignores dismissedVersion.
  const updateAvailable = isNewer && !dismissedThisVersion && !forceUpdate;

  const openTestFlight = async () => {
    // TestFlight's URL scheme. If TestFlight isn't installed (rare for
    // beta testers, but possible), fall back to the App Store listing.
    const testflightUrl = "itms-beta://";
    const appStoreFallback = "https://apps.apple.com/app/id6764674773";
    try {
      const supported = await Linking.canOpenURL(testflightUrl);
      await Linking.openURL(supported ? testflightUrl : appStoreFallback);
    } catch {
      try {
        await Linking.openURL(appStoreFallback);
      } catch {
        // Nothing else we can do — Linking failed entirely.
      }
    }
  };

  const dismiss = async () => {
    if (!latestVersion) return;
    setDismissedVersion(latestVersion);
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, latestVersion);
    } catch {
      // If persistence fails the in-memory state still hides the banner
      // for this session — acceptable.
    }
  };

  return {
    updateAvailable: updateAvailable || forceUpdate,
    forceUpdate,
    latestVersion,
    releaseNotes,
    openTestFlight,
    dismiss,
  };
}
