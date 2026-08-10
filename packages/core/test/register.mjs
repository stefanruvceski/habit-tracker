// Preloaded via `node --import` to install the .ts extension resolver hook
// before any test module is loaded.
import { register } from "node:module";
register("./ts-ext-resolve.mjs", import.meta.url);
