// Extends app.json with values injected at build time (GitHub Actions):
//   APP_BUILD_NUMBER → Android versionCode (must grow for in-place updates)
// Each build is published as GitHub Release `android-b<N>`; the app compares
// its own versionCode against the newest one to offer updates.
module.exports = ({ config }) => {
  const build = Number(process.env.APP_BUILD_NUMBER || 1);
  return {
    ...config,
    android: { ...config.android, versionCode: build },
    extra: { ...config.extra, buildNumber: build },
  };
};
