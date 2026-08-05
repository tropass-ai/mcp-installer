import fs from "node:fs";

const DIST_DIRECTORY = "dist";

fs.rmSync(DIST_DIRECTORY, {recursive: true, force: true});
fs.mkdirSync(DIST_DIRECTORY, {recursive: true});
fs.cpSync("skills", `${DIST_DIRECTORY}/skills`, {recursive: true});
fs.cpSync("tools", `${DIST_DIRECTORY}/tools`, {recursive: true});
