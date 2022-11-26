export class URLTier {
   protected lookup :Map<string, URLTier>

   constructor () {
     this.lookup = new Map<string, URLTier>()
   }

   public add (url:string) :void {
     let lookup = this.lookup
     for (const key of url.split('.').reverse()) {
       let next = lookup.get(key)
       if (next) {
         lookup = next.lookup
         continue
       }

       // build new trie
       lookup.set(key, next = new URLTier())
       lookup = next.lookup
       continue
     }
   }

   public compact (): void {
     this.compactWithLevel(0)
   }

   public unroll ():string[] {
     return Array.from(this.unrollWithContext([]))
   }

   protected unrollWithContext (ctx:string[]):Set<string> {
     const collect = new Set<string>()

     // nothing left,just build it
     if (this.lookup.size === 0) {
       collect.add(ctx.reverse().join('.'))
       ctx.reverse()
       return collect
     }

     for (const [key, child] of this.lookup.entries()) {
       ctx.push(key)
       child.unrollWithContext(ctx).forEach(collect.add.bind(collect))
       ctx.pop()
     }

     return collect
   }

   protected compactWithLevel (level:number): void {
     // reduce at least 3 url component,
     // or just keep it
     if (level < 2) {
       for (const child of this.lookup.values()) {
         child.compactWithLevel(level + 1)
       }
       return
     }

     // reduce this tree
     if (this.lookup.size >= 2) {
       this.lookup.keys()
       this.lookup.clear()
       this.lookup.set('*', new URLTier())
     }
   }
}
