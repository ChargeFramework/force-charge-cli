import path from 'path'
import bluebird from 'bluebird'
import Rx from 'rxjs/Rx'
import watch from 'node-watch'

import {Command, flags} from 'cli-engine-heroku'

const fs = bluebird.promisifyAll(require('fs'))

export default class SyncCommand extends Command {
  static topic = 'charge:source'
  static command = 'watch'
  static description = 'Automatically push source code when changes are detected'
  static flags = {
    forceoverwrite: flags.boolean({char: 'f', description: 'ignore conflict warnings and overwrite changes to scratch org'}),
    ignorewarnings: flags.boolean({char: 'g', description: 'deploy changes even if warnings are generated'}),
    targetusername: flags.string({char: 'u', description: 'username or alias for the target org; overrides default target org'}),
    wait: flags.number({char: 'w', description: 'wait time for command to finish in minutes (default: 33) (default:33, min:1)'}),
    json: flags.boolean({description: 'format output as json'}),
    loglevel: flags.string({description: 'logging level for this command invocation (error*,trace,debug,info,warn,fatal'})
  }

  async run () {
    const currentDir = process.cwd()
    const projectConfigPath = path.join(currentDir, 'sfdx-project.json')

    try {
      const configContent = await fs.readFileAsync(projectConfigPath, 'utf8')
      const config = JSON.parse(configContent)

      if (!config.packageDirectories || config.packageDirectories.length === 0) {
        throw new Error('No package directory found')
      }

      const events$ = Rx.Observable.create((observer) => {
        watch(
          config.packageDirectories.map(dir => path.join(currentDir, dir.path)),
          { recursive: true },
          (...args) => {
            observer.next(args)
          }
        )
      })
      events$
        .throttleTime(1000)
        .subscribe((evt) => {
          this.out.log(evt)
          this.out.log('Pushing')
        })
      return events$.toPromise()
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('sfdx-project.json not found. Are you in an SFDX project?')
      } else {
        throw e
      }
    }
  }
}
