import childProcess from "child_process";
import path from "path";
import util from "util";

import { Command } from "cli-engine-heroku";

const execFile = util.promisify(childProcess.execFile);

export default class NpmCommand extends Command {
  static topic = "charge:tools";
  static command = "npm";
  static description = "run command using embedded npm";
  static variableArgs = true;

  async run() {
    await this.invokeNpmCommand(this.argv);
  }

  async invokeNpmCommand(args, { silent = false } = {}) {
    const yarnPath = path.resolve(
      __dirname,
      "..",
      "..",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );
    return await this.spawnCommand("node", [yarnPath, ...args], { silent });
  }

  async spawnCommand(path, args, { silent = false } = {}) {
    try {
      const { stdout } = await execFile(path, args);
      if (!silent) {
        this.out.log(stdout);
      }
      return stdout;
    } catch (e) {
      this.out.log(e);
    }
  }
}
