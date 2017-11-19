import childProcess from 'child_process'
import path from 'path'
import util from 'util'

import {Command, flags} from 'cli-engine-heroku'
import Rx from 'rxjs/Rx'
import watch from 'node-watch'

import {getPackageDirectories} from '../utils'

const execFile = util.promisify(childProcess.execFile)

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
    loglevel: flags.string({description: 'logging level for this command invocation (error*,trace,debug,info,warn,fatal'}),
    debounce: flags.number({char: 'd', description: 'number of milliseconds to debounce file change events (default: 1000)'})
  }

  async run () {
    const debounce = (this.flags.debounce === undefined ? 1000 : this.flags.debounce)
    const currentDir = process.cwd()

    try {
      const packageDirectories = await getPackageDirectories()

      const events$ = Rx.Observable.create((observer) => {
        // Push immediately when the command is first run
        observer.next({})

        watch(
          packageDirectories.map(dir => path.join(currentDir, dir.path)),
          { recursive: true },
          (...args) => {
            observer.next(args)
          }
        )
      })
      this.out.log('Watching for file changes')
      events$
        .debounceTime(debounce)
        .do(() => this.out.log('File structure updated. Pushing to scratch org...'))
        .do(() => this.spawnPushCommand(this.flags.targetusername, this.flags.forceoverwrite, this.flags.ignorewarnings, this.flags.wait, this.flags.json, this.flags.loglevel))
        .subscribe()
      return events$.toPromise()
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('sfdx-project.json not found. Are you in an SFDX project?')
      } else {
        throw e
      }
    }
  }

  async spawnPushCommand (username, forceOverwrite, ignoreWarnings, wait, json, logLevel) {
    const args = ['force:source:push']
    if (username) {
      args.push('--targetusername', username)
    }
    if (forceOverwrite) {
      args.push('--forceoverwrite')
    }
    if (ignoreWarnings) {
      args.push('--ignorewarnings')
    }
    if (wait) {
      args.push('--wait', wait)
    }
    if (json) {
      args.push('--json')
    }
    if (logLevel) {
      args.push('--loglevel', logLevel)
    }
    try {
      const {stdout} = await execFile('sfdx', args)
      this.out.log(stdout)
    } catch (e) {
      this.out.error(e)
    }
  }
}
