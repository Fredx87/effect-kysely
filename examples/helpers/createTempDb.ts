import * as fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function createTempDb() {
  const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), "foo-"));
  const destPath = path.join(tmpPath, "example.sqlite");
  fs.copyFileSync(
    new URL("../db/example.sqlite", import.meta.url).pathname,
    destPath,
  );
  return destPath;
}
