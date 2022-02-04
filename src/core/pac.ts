import { URLTier } from './trie.js'

export class Group {
    protected bypass : URLTier
    protected proxy : URLTier
    protected servers :string[]

    constructor (servers : string[]) {
      this.bypass = new URLTier()
      this.proxy = new URLTier()
      if (servers) {
        this.servers = servers
      } else {
        this.servers = []
      }
    }

    public proxyFor (url :string): void {
      this.proxy.add(url)
      this.proxy.compact()
    }

    public bypassFor (url :string): void {
      this.bypass.add(url)
      this.bypass.compact()
    }

    public compile ():string {
      const proxy = CompileList(this.proxy.unroll())
      const bypass = CompileList(this.bypass.unroll())
      return `
        {
            "proxy" : new RegExp(${proxy}),
            "bypass" : new RegExp(${bypass}),
            "servers" : "${this.serverString()}"
        }
        `
    }

    protected serverString () : string {
      if (this.servers.length > 0) {
        return this.servers.join(';').replace(/DIRECT/gi, '') + ';DIRECT;'
      }
      return 'DIRECT'
    }
}

export class Generator {
    protected groups : Group[]

    constructor (groups : Group[]) {
      if (groups) {
        this.groups = groups
      } else {
        this.groups = []
      }
    }

    public compile ():string {
      return `
      "use strict";
      var groups = [
          ${this.groups.map((g) => g.compile()).join(',\n')}
      ];
      function FindProxyForURL(url, host) {
          for (var i=0; i<groups.length; i++) {
                if ( !groups[i].bypass.test(host) 
                    && groups[i].proxy.test(host) ) {
                    return groups[i].servers
                }
          }
          
          return "DIRECT";
      }
      `
    }
}

export const CompileList = (list:string[]):RegExp => {
  let expr = list.filter((x) => x.trim().length > 0)
    .map((x) => x.replace(/(\*|\$| )/g, ''))
    .map((x) => `(${x}$)`)
    .join('|')
  if (expr.length === 0) {
    expr = '$^'
  }
  return new RegExp(expr)
}
