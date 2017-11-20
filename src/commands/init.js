import {Command} from 'cli-engine-heroku'

import {getPackageDirectories} from '../utils'

export default class ProjectInitCommand extends Command {
  static topic = 'charge:project'
  static command = 'init'
  static description = 'Initialize a Charge project'

  async run () {
    try {
      const packageDirectories = await getPackageDirectories()

    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('sfdx-project.json not found. Are you in an SFDX project?')
      } else {
        throw e
      }
    }
  }
}
