import fs from "node:fs";
import path from "node:path";

const DIST_DIRECTORY = "dist";
const INSTRUCTIONS_DIRECTORY = "instructions";
const DIST_INSTRUCTIONS_DIRECTORY = path.join(DIST_DIRECTORY, INSTRUCTIONS_DIRECTORY);

fs.rmSync(DIST_DIRECTORY, {recursive: true, force: true});
fs.mkdirSync(DIST_INSTRUCTIONS_DIRECTORY, {recursive: true});

for (const fileName of fs.readdirSync(INSTRUCTIONS_DIRECTORY)) {
  if (!fileName.endsWith(".md")) {
    continue;
  }

  fs.copyFileSync(
    path.join(INSTRUCTIONS_DIRECTORY, fileName),
    path.join(DIST_INSTRUCTIONS_DIRECTORY, fileName),
  );
}
