import childProcess from "child_process";
import path from "path";
import util from "util";

import { Command } from "cli-engine-heroku";

const execFile = util.promisify(childProcess.execFile);

export default class NpmCommand extends Command {
  static topic = "charge:tools";
  static command = "yarn";
  static description = "run command using embedded yarn";
  static variableArgs = true;

  async run() {
    const yarnPath = path.resolve(
      __dirname,
      "..",
      "..",
      "node_modules",
      "yarn",
      "bin",
      "yarn.js",
    );
    await this.spawnCommand("node", [yarnPath, ...this.argv]);
  }

  async spawnCommand(path, args) {
    try {
      const { stdout } = await execFile(path, args);
      this.out.log(stdout);
    } catch (e) {
      this.out.log(e);
    }
  }
}
