export class SwitchydServer {
    
    constructor() {
        this._names = new Map();
        ['listen','accepts','denys']
            .forEach((name)=>{
                this._names.set(name,new Set());
            });
    }
    
    _shorhand(name,value) {
        if(value === undefined) {
            return this._names.get(name);
        }

        this._names.get(name).add(value);
        return this;
    }

    bind(server) {
        this._server = server;
        return this;
    }
    
    server() {
        return this._server;
    }

    listen(event) {
        return this._shorhand('listen',event);
    }
    
    accept(host) {
        return this._shorhand('accepts',host);
    }

    deny(host) {
        return this._shorhand('denys',host); 
    }

    clear() {
        this._server = undefined;
        Array.from(this._names.values())
            .forEach((set)=>set.clear());
    }
}

export class Optimizer {
    
    constructor() {
    }
    
    optimize(items) {
        const container = new Map();
        
        items.map((x)=>{
            return x.split('.').reverse();
        }).forEach((x)=>{
            this._trie(x,container);
        });
        
        this._jumpLevel([container],2)
            .forEach((x)=>x.clear());
        
        const untired = [];
        this._untrie(container,untired,[]);
        
        return untired;
    }

    _trie(list,container=new Map()) {
        list.reduce((accu,current)=>{
            if(!accu.has(current)){
                accu.set(current,new Map());
            }

            return accu.get(current);
        },container);
    }
    
    _untrie(map,items=[],context=[]) {
        for(let kv of map){
            const key = kv[0];
            const value = kv[1];
            
            context.push(key);
            this._untrie(value,items,context);
            
            if(value.size === 0){
                items.push(context.reverse().join('.'));
                context.reverse();
            }
            context.pop();
        }
    }

    _jumpLevel(containers,level=2) {
        if(level===0) {
            return containers;
        }

        const children = containers.map((container)=>{
            return Array.from(container.values());
        }).reduce((accu,current)=>{
            return accu.concat(current);
        },[]);
        
        return this._jumpLevel(children,level-1);
    }
}

export class Compiler {
    
    constructro() {
    }
    
    compile(severs) {
        const compiled = severs.map((server)=>this._compile(server))
            .map((server)=>{
                return Array.from(server.keys())
                    .reduce((accu,current)=>{
                        accu[current] = server.get(current);
                        return accu;
                    },{})
            });
        
        function genre(compiled) {
            compiled.forEach((server)=>{
                ['accepts','denys'].forEach((name)=>{
                    const values = server[name]
                        .filter((x)=>x.trim().length > 0)
                        .join('|');
                    if(values.length > 0) {
                        server[name]=new RegExp(values);
                    }else{
                        server[name]=undefined;
                    }
                });
            });
            return compiled;
        }
        
        function code_template(_,host,compileds) {
            for(let compiled of compileds){
                const accept = compiled['accepts'];
                if(accept === undefined) {
                    continue;
                }else if(!accept.test(host)) {
                    continue;
                }else{
                    const deny = compiled['denys'];
                    if(deny !== undefined && deny.test(host)){
                        continue;
                    }

                    return server.server+';DIRECT;';
                }
            }
            
            return 'DIRECT';
        }

        const template = genre.toString()+ '\n\n'
                    + code_template.toString() + '\n\n'
                    + 'var compiled = genre('+ JSON.stringify(compiled) + ');\n'
                    + 'var FindProxyForURL = function(_,host){\n'
                    + '     return code_template(_,host,compiled);\n'
                    + '}\n';
        return template;
    }
    

    _compile(server) {
        const code = ['listen','accepts','denys'].map((name)=>{
            const container = server._shorhand(name);
            const optimized = new Optimizer().optimize(Array.from(container.values()));
            container.clear();
            
            optimized.forEach((x)=>{
                container.add(x);
            });

            return [name,Array.from(container.values())];
        }).reduce((accu,current)=>{
            accu.set(current[0], current[1]);
            return accu;
        },new Map());
        
        code.set('server',server.server());
        return code;
    }
}

function test1() {
    const untired = new Optimizer().optimize([
        'www.google.com',
        'www.facebook.com',
        'toplevel.dot.google.com',
    ]);
} 

function test2() {
    const raw = ['www.google.com',
        'www.facebook.com',
        'toplevel.dot.google.com',
    ];
    const server = new SwitchydServer().bind('SOCKS5 127.0.0.1:10086');
    raw.forEach((x)=>{
        ['listen','accepts','denys'].forEach((name)=>{
            server._shorhand(name,x);
        });
    });
    const code = new Compiler().compile([server]);
    console.log(code);
}

test2();

