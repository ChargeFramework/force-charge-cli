import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { Command } from "cli-engine-heroku";
import Rx from "rxjs/Rx";

import NpmCommand from "./npm";

const writeFileAsync = promisify(fs.writeFile);

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
      const dependencyPaths = await this.getDependencyPaths();

      const chargePackagePaths$ = this.getChargePackages$(
        process.cwd(),
        dependencyPaths,
      );
      const packageDirectories$ = this.getPackageDirectories$(
        chargePackagePaths$,
      );
      const sfdxProjectJsonPath = path.join(process.cwd(), "sfdx-project.json");
      const sfdxProject = await this.getJsonContent(sfdxProjectJsonPath);
      packageDirectories$
        .toArray()
        .map(packageDirectories => {
          sfdxProject.packageDirectories = sfdxProject.packageDirectories.concat(
            packageDirectories,
          );
          return sfdxProject;
        })
        .do(sfdxProjectConfigs =>
          Rx.Observable.fromPromise(
            this.writeJsonFile(sfdxProjectJsonPath, sfdxProjectConfigs),
          ),
        )
        .subscribe();
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

  getChargePackages$(cwd, dependencyPaths) {
    const dependencies$ = Rx.Observable.of(cwd).expand(cwd => {
      return Rx.Observable.fromPromise(this.getPackageJsonContent(cwd)).flatMap(
        packageJson => {
          if (!packageJson.charge || !packageJson.charge.packages) {
            return Rx.Observable.empty();
          }
          return Rx.Observable.from(packageJson.charge.packages).flatMap(
            chargePackage => {
              const packagePaths = dependencyPaths.filter(path =>
                path.endsWith(chargePackage),
              );
              if (packagePaths.length > 1) {
                this.out.warn(
                  `Multiple versions of ${
                    chargePackage
                  } found. Using the first one!`,
                );
              }
              return Rx.Observable.of(packagePaths[0]);
            },
          );
        },
      );
    });
    return dependencies$.skip(1); // Since the first one is always the "self" project
  }

  getPackageDirectories$(chargePackagePaths$) {
    const cwd = process.cwd();
    return chargePackagePaths$
      .flatMap(packagePath =>
        Rx.Observable.fromPromise(
          this.getJsonContent(path.join(packagePath, "sfdx-project.json")),
        )
          .flatMap(projectConfig =>
            Rx.Observable.from(projectConfig.packageDirectories),
          )
          .map(packageDirectoryPath =>
            path.resolve(packagePath, packageDirectoryPath.path),
          ),
      )
      .map(packagePath => path.relative(cwd, packagePath))
      .map(packagePath => ({ path: packagePath }));
  }

  async getDependencyPaths() {
    const npm = new NpmCommand();
    const packageTreeContent = await npm.invokeNpmCommand(
      ["ls", "--parseable"],
      {
        silent: true,
      },
    );
    const packages = packageTreeContent.split(os.EOL);
    packages.shift(); // since the first element is the package itself
    return packages;
  }

  async getPackageJsonContent(cwd) {
    const projectConfigPath = path.join(cwd, "package.json");
    return require(projectConfigPath);
  }

  async getJsonContent(filePath) {
    return require(filePath);
  }

  async writeJsonFile(filePath, jsonContent) {
    await writeFileAsync(filePath, JSON.stringify(jsonContent, null, 2));
  }
}
