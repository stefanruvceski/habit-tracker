// Test-only module resolver: lets the source's extensionless relative imports
// (e.g. `import ... from "./date"`) resolve under Node's ESM test runner by
// trying a ".ts" extension first. Keeps the source untouched (bundlers add the
// extension themselves) while keeping native type-stripping — so coverage line
// numbers stay accurate.
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.\w+$/.test(specifier)
  ) {
    try {
      return await nextResolve(specifier + ".ts", context);
    } catch {
      // fall through to default resolution
    }
  }
  return nextResolve(specifier, context);
}
