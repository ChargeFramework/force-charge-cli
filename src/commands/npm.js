import path from "path";

import { Command } from "cli-engine-heroku";

import { execFile } from "../utils";

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
    try {
      const stdout = await execFile("node", [yarnPath, ...args], {
        silent,
      });
      this.out.log(stdout);
    } catch (e) {
      this.out.log(e);
    }
  }
}
