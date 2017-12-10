import path from "path";
import fs from "fs";
import util from "util";

import { Command } from "cli-engine-heroku";
import NpmCommand from "./npm";

const readFileAsync = util.promisify(fs.readFile);

export default class BuildCommand extends Command {
  static topic = "charge:project";
  static command = "build";
  static description = "build the project";
  static variableArgs = true;

  async run() {
    const npm = new NpmCommand();
    this.out.log("Installing dependencies ...");
    await npm.invokeNpmCommand(["install"]);
    this.out.log("Deduping dependencies...");
    await npm.invokeNpmCommand(["dedupe"]);

    try {
      const packageJson = await this.getPackageJsonContent();
      if (!packageJson.charge) {
        throw new Error(
          "package.json file does not contain charge framework configuration!",
        );
      }
      const packageTreeContent = await npm.invokeNpmCommand(["ls", "--json"], {
        silent: true,
      });
      const packageTree = JSON.parse(packageTreeContent);
      this.out.log(JSON.stringify(packageTree, null, 2));
    } catch (e) {
      if (e.code === "ENOENT") {
        throw new Error(
          "package.json not found. Are you in a Charge project directory?",
        );
      } else {
        throw e;
      }
    }
  }

  async getPackageJsonContent() {
    const currentDir = process.cwd();
    const projectConfigPath = path.join(currentDir, "package.json");

    const configContent = await readFileAsync(projectConfigPath, "utf8");
    return JSON.parse(configContent);
  }
}
