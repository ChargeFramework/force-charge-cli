import childProcess from "child_process";
import path from "path";
import fs from "fs";
import util from "util";

const readFileAsync = util.promisify(fs.readFile);
const execFileAsync = util.promisify(childProcess.execFile);

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

export async function execFile(path, args) {
  const { stdout } = await execFileAsync(path, args);
  return stdout;
}

export function execFile$(path, args) {
  return Rx.Observable.create(observer => {
    const spawnedProcess = childProcess.execFile(
      path,
      args,
      (error, stdout, stderr) => {
        observer.next({ stdout, stderr, error });
      },
    );
    return () => {
      console.log("Cancelling previous command");
      spawnedProcess.kill();
    };
  });
}
