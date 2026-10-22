// Extends app.json with values injected at build time.
//   APP_BUILD_NUMBER → Android versionCode (must grow for in-place updates).
//     Each release build is GitHub Release `android-b<N>`; the app compares its
//     own versionCode against the newest one to offer updates.
//   APP_VARIANT=dev  → "Streakli Dev": a development build (expo-dev-client)
//     that installs NEXT TO the real app and loads JS live from Metro on the Mac.
module.exports = ({ config }) => {
  const build = Number(process.env.APP_BUILD_NUMBER || 1);
  const dev = process.env.APP_VARIANT === "dev";
  return {
    ...config,
    name: dev ? "Streakli Dev" : config.name,
    scheme: dev ? "streakli-dev" : config.scheme,
    android: {
      ...config.android,
      package: dev ? `${config.android.package}.dev` : config.android.package,
      versionCode: build,
    },
    plugins: dev ? [...(config.plugins ?? []), "expo-dev-client"] : config.plugins,
    extra: { ...config.extra, buildNumber: build, variant: dev ? "dev" : "release" },
  };
};
