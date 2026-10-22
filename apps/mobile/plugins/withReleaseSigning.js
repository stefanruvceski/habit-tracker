// Expo config plugin: sign `release` builds with our own keystore when the
// STREAKLI_* signing values are provided (GitHub Actions secrets), so every
// build installs as an in-place update over the previous one. Without them
// (local dev), release falls back to the debug key as before.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARK = "// streakli-release-signing";

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;

    // 1) A `release` signing config read from env vars.
    gradle = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARK}
        release {
            def ks = System.getenv("STREAKLI_KEYSTORE_PATH")
            if (ks) {
                storeFile file(ks)
                storePassword System.getenv("STREAKLI_KEYSTORE_PASSWORD")
                keyAlias System.getenv("STREAKLI_KEY_ALIAS")
                keyPassword System.getenv("STREAKLI_KEY_PASSWORD")
            }
        }`,
    );

    // 2) Use it for the release build type when a keystore is present.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig System.getenv("STREAKLI_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
