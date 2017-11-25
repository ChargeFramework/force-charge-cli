import childProcess from "child_process";
import path from "path";

import { Command, flags } from "cli-engine-heroku";
import Rx from "rxjs/Rx";
import watch from "node-watch";

import { getPackageDirectories } from "../utils";

export default class SyncCommand extends Command {
  static topic = "charge:source";
  static command = "watch";
  static description = "Automatically push source code when changes are detected";
  static flags = {
    forceoverwrite: flags.boolean({
      char: "f",
      description:
        "ignore conflict warnings and overwrite changes to scratch org",
    }),
    ignorewarnings: flags.boolean({
      char: "g",
      description: "deploy changes even if warnings are generated",
    }),
    targetusername: flags.string({
      char: "u",
      description:
        "username or alias for the target org; overrides default target org",
    }),
    wait: flags.number({
      char: "w",
      description:
        "wait time for command to finish in minutes (default: 33) (default:33, min:1)",
    }),
    json: flags.boolean({ description: "format output as json" }),
    loglevel: flags.string({
      description:
        "logging level for this command invocation (error*,trace,debug,info,warn,fatal",
    }),
    debounce: flags.number({
      char: "d",
      description:
        "number of milliseconds to debounce file change events (default: 1000)",
    }),
  };

  async run() {
    const debounce =
      this.flags.debounce === undefined ? 1000 : this.flags.debounce;
    const currentDir = process.cwd();

    try {
      const packageDirectories = await getPackageDirectories();

      const events$ = Rx.Observable.create(observer => {
        // Push immediately when the command is first run
        observer.next({ initial: true });

        watch(
          packageDirectories.map(dir => path.join(currentDir, dir.path)),
          { recursive: true },
          (...args) => {
            observer.next({ initial: false, change: args });
          },
        );
      });
      this.out.log("Watching for file changes");
      events$
        .debounceTime(debounce)
        .do(evt => {
          if (evt.initial) {
            this.out.log("Initial push to scratch org...");
          } else {
            this.out.log("File structure updated. Pushing to scratch org...");
          }
        })
        .switchMap(val =>
          this.getPushObservable$(
            this.flags.targetusername,
            this.flags.forceoverwrite,
            this.flags.ignorewarnings,
            this.flags.wait,
            this.flags.json,
            this.flags.loglevel,
          ),
        )
        .subscribe(outputs => {
          this.out.log(outputs.stdout);
          if (outputs.stderr) {
            this.out.log(outputs.stderr);
          }
        });
      return events$.toPromise();
    } catch (e) {
      if (e.code === "ENOENT") {
        throw new Error(
          "sfdx-project.json not found. Are you in an SFDX project?",
        );
      } else {
        throw e;
      }
    }
  }

  getPushObservable$(
    username,
    forceOverwrite,
    ignoreWarnings,
    wait,
    json,
    logLevel,
  ) {
    const args = ["force:source:push"];
    if (username) {
      args.push("--targetusername", username);
    }
    if (forceOverwrite) {
      args.push("--forceoverwrite");
    }
    if (ignoreWarnings) {
      args.push("--ignorewarnings");
    }
    if (wait) {
      args.push("--wait", wait);
    }
    if (json) {
      args.push("--json");
    }
    if (logLevel) {
      args.push("--loglevel", logLevel);
    }
    return Rx.Observable.create(observer => {
      const sfdxProcess = childProcess.execFile(
        "sfdx",
        args,
        (error, stdout, stderr) => {
          if (error) {
            this.out.log(error);
          }
          observer.next({ stdout, stderr });
        },
      );
      return () => {
        this.out.log("Cancelling previous push command");
        sfdxProcess.kill();
      };
    });
  }
}
