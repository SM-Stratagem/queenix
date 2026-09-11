import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

const files = [
  [".env.example", ".env"],
  ["apps/web/.env.example", "apps/web/.env.local"],
  ["apps/mobile/.env.example", "apps/mobile/.env"],
]

for (const [src, dst] of files) {
  if (existsSync(dst)) continue
  if (!existsSync(src)) continue
  mkdirSync(dirname(dst), { recursive: true })
  copyFileSync(src, dst)
  console.log(`created ${dst}`)
}
