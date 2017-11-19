import {Command, flags} from 'cli-engine-heroku'

export default class HelloWorld extends Command {
  static topic = 'charge:nested'
  static command = 'world'
  static flags = {
    name: flags.string({description: 'name to say hello to'})
  }

  async run () {
    let name = this.flags.name || 'world'
    this.out.log(`hello ${name}!`)
  }
}
