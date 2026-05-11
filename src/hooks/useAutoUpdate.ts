import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * Auto-update hook with a toast UX.
 *
 * - Polls for an EAS Update on mount and every time the app foregrounds.
 * - When a new update is downloaded, sets `updateReady` to true so a UI
 *   toast can show. The caller is responsible for calling `applyUpdate()`
 *   after a brief delay (so the user actually sees the toast before the JS
 *   bundle reloads in place).
 * - No-ops in __DEV__ — `Updates.checkForUpdateAsync()` throws when running
 *   under Metro / Expo Go.
 */
export function useAutoUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const checking = useRef(false);

  const checkForUpdate = async () => {
    if (!Updates.isEnabled || __DEV__) return;
    if (checking.current) return;
    checking.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setUpdateReady(true);
      }
    } catch {
      // Silent — offline, no update server, no new version, etc.
    } finally {
      checking.current = false;
    }
  };

  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") checkForUpdate();
      }
    );
    return () => sub.remove();
  }, []);

  const applyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Reload failed — next cold launch will pick up the downloaded
      // bundle anyway, so this isn't fatal.
    }
  };

  return { updateReady, applyUpdate };
}
