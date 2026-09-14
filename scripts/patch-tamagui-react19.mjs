#!/usr/bin/env node
/**
 * Patch @tamagui/web's createStyledContext.mjs for React 19 + Next.js compat.
 *
 * The original file uses the tree-shakeable-constant pattern:
 *
 *   const createReactContext = React[Math.random(), "createContext"];
 *
 * That relies on a bundler (esbuild/swc) stripping Math.random() to a
 * deterministic literal, then JS evaluates it as React["createContext"].
 * When loaded as an ES module via Next.js RSC, no such rewrite happens,
 * so Math.random() resolves to a non-zero number and React[…] is undefined.
 *
 * Fix: replace the pattern with the direct call React.createContext.
 * Idempotent — if the file already has the patch, it's a no-op.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const TARGETS = [
  "node_modules/@tamagui/web/dist/esm/helpers/createStyledContext.mjs",
]

let patched = 0
let alreadyPatched = 0
let missing = 0

for (const rel of TARGETS) {
  const full = path.join(ROOT, rel)
  if (!existsSync(full)) {
    missing++
    continue
  }
  const original = readFileSync(full, "utf8")
  if (original.includes("// @queenix-patch: react19-createContext")) {
    alreadyPatched++
    continue
  }
  const replaced = original.replace(
    /const\s+createReactContext\s*=\s*React\[Math\.random\(\),\s*"createContext"\];?/,
    '// @queenix-patch: react19-createContext\nconst createReactContext = React.createContext;',
  )
  if (replaced === original) {
    // pattern not matched — nothing to do
    missing++
    continue
  }
  writeFileSync(full, replaced)
  patched++
}

console.log(`patched=${patched} already=${alreadyPatched} skipped(missing/no-pattern)=${missing}`)
