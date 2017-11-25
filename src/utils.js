import path from "path";
import fs from "fs";
import util from "util";

const readFileAsync = util.promisify(fs.readFile);

export async function getPackageDirectories() {
  const currentDir = process.cwd();
  const projectConfigPath = path.join(currentDir, "sfdx-project.json");

  const configContent = await readFileAsync(projectConfigPath, "utf8");
  const config = JSON.parse(configContent);

  if (
    !config.hasOwnProperty("packageDirectories") ||
    !Array.isArray(config.packageDirectories) ||
    config.packageDirectories.length === 0
  ) {
    throw new Error("No package directory found");
  }
  return config.packageDirectories;
}
