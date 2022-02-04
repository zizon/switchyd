import { CompileList, Generator, Group } from './pac.js'
import { URLTier } from './trie.js'

export type ProxyGroup = {
  accepts :string[],
  denys :string[],
  listen:string[],
  server: string,
}

export interface RawConfig {
    version :number
    servers :ProxyGroup[]
}

export type RawConfigSyncer = (config:RawConfig) => Promise<void>

export class Config {
    protected raw : RawConfig
    protected sync: RawConfigSyncer

    constructor (raw :RawConfig, sync:RawConfigSyncer) {
      this.raw = raw
      this.sync = sync
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

    public assignProxyFor (error:string, url:string) : Promise<boolean> {
      for (const group of this.raw.servers) {
        if (group.listen.find((x) => x === error)) {
          if (CompileList(group.denys).test(url)) {
            return Promise.resolve(false)
          } else if (CompileList(group.accepts).test(url)) {
            // already proxy
            return Promise.resolve(false)
          }
          continue
        }
      }

      // no existing rule associate with such url, try add
      let changed:boolean = false
      for (const group of this.raw.servers) {
        if (group.listen.find((x) => x === error)) {
          group.accepts.push(url)
          changed = true
        }
      }

      if (changed) {
        console.log(`change for assignProxyFor(${error},${url})`)
        return this.sync(this.compact()).then((_:void) => true)
      }

      console.log(`no change for assignProxyFor(${error},${url})`)
      return Promise.resolve(false)
    }

    protected compact ():RawConfig {
      this.raw.servers.forEach((server) => {
        [server.accepts, server.denys].forEach((list:string[]):void => {
          const tire = new URLTier()
          list.forEach(tire.add.bind(tire))
          tire.compact()
          list.splice(0, list.length, ...tire.unroll())
        })
      })

      return this.raw
    }
}
