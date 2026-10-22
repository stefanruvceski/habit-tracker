import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../lib/theme";
import { checkForUpdate, downloadAndInstall, type ReleaseInfo } from "../lib/updates";

/**
 * Slim banner above the screen when a newer build is on GitHub. Checks on
 * launch and whenever the app returns to the foreground. One tap downloads the
 * APK and opens Android's installer; data stays (same signing key).
 */
export function UpdateBanner() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const r = await checkForUpdate();
    setRelease(r);
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => sub.remove();
  }, [check]);

  if (!release) return null;

  async function install() {
    if (!release || progress != null) return;
    setError(null);
    setProgress(0);
    try {
      await downloadAndInstall(release, setProgress);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Pressable onPress={install} style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {progress != null
            ? `Downloading update… ${Math.round(progress * 100)}%`
            : `Update available · build ${release.build}`}
        </Text>
        {error ? (
          <Text style={[styles.sub, { color: C.danger }]}>{error} — tap to retry</Text>
        ) : release.notes && progress == null ? (
          <Text style={styles.sub} numberOfLines={1}>
            {release.notes}
          </Text>
        ) : null}
      </View>
      {progress == null && <Text style={styles.cta}>Install</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent + "55",
    backgroundColor: C.accent + "1a",
  },
  title: { color: C.text, fontSize: 13, fontWeight: "700" },
  sub: { color: C.dim, fontSize: 12, marginTop: 2 },
  cta: { color: C.accent, fontSize: 14, fontWeight: "800" },
});
