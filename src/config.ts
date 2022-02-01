import { CompileList, Generator, Group } from './pac'

interface RawConfig {
    version :number
    servers :{
        accepts :string[],
        denys :string[],
        listen:string[],
        server: string,
    }[],
}

export class Config {
    protected raw : RawConfig

    constructor (json :string|null) {
      try {
        this.raw = JSON.parse(json || '') as RawConfig
      } catch (error) {
      // not parsable
        console.error(error)
        this.raw = {
          version: 3,
          servers: [{
            accepts: [],
            denys: [],
            listen: [
              'net::ERR_CONNECTION_RESET',
              'net::ERR_CONNECTION_TIMED_OUT',
              'net::ERR_SSL_PROTOCOL_ERROR',
              'net::ERR_TIMED_OUT'
            ],
            server: 'DIRECT'
          }]
        }
      }
    }

    public createGeneartor () :Generator {
      // recover config
      const generatorGroups :Group[] = []
      for (const group of this.raw.servers) {
        const genGroup = new Group([group.server])
        group.accepts.map((x) => x.replace(/\$/g, '')).forEach(genGroup.proxyFor.bind(genGroup))
        group.denys.map((x) => x.replace(/\$/g, '')).forEach(genGroup.bypassFor.bind(genGroup))
        generatorGroups.push(genGroup)
      }

      return new Generator(generatorGroups)
    }

    public jsonify ():string {
      return JSON.stringify(this.raw)
    }

    public assignProxyFor (error:string, url:string) : void {
      for (const group of this.raw.servers) {
        if (group.listen.find((x) => x === error)) {
          if (CompileList(group.denys).test(url)) {
            return
          } else if (CompileList(group.accepts).test(url)) {
            // already proxy
            return
          }
          continue
        }
      }

      // no existing rule associate with such url, try add
      for (const group of this.raw.servers) {
        if (group.listen.find((x) => x === error)) {
          group.accepts.push(url)
        }
      }
    }
}
