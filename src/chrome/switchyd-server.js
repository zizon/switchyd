import { switchyd } from './switchyd-v1.js';

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

                    return compiled.server+';DIRECT;';
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

export class Persistor {
    
    constructor() {
    }

    persist(servers) {
        const store_objects = servers.map((server)=>{
            const store_object = ['listen','accepts','denys'].reduce((container,name)=>{
                const values = Array.from(server._shorhand(name).values());
                container[name] = values;
                return container;
            },{});

            store_object.server = server.server();
            return store_object;
        });

        localStorage.setItem('switchyd.config',JSON.stringify({
            'servers' : store_objects,
            'version' : 3,
        }));

        return this;
    }

    unpersist() {
        return JSON.parse(localStorage.getItem('switchyd.config'))
            .servers.map((server)=>{
                const switchyd_server = new SwitchydServer().bind(server.server);
                ['listen','accepts','denys'].forEach((name)=>{
                    server[name].forEach((value)=>{
                        switchyd_server._shorhand(name,value);
                    });
                })
                
                return switchyd_server;
            });
    }
}

export class Migrate {
    
    constructor() {
    }

    migrate() {
        switchyd.config.reload();    
        const loaded = JSON.parse(localStorage.getItem('switchyd.config'));
        if(loaded.version !== 2){
            return;
        }
        
        const switchyd_server = new SwitchydServer();

        // server
        for(let server in loaded['tracer-servers']){
            switchyd_server.bind(server);
        }
        
        // listen
        for(let inspect in loaded['tracer-inspect-error']){
            switchyd_server.listen(inspect);
        }

        const items = [];
        this._untrie(loaded['group-proxy'],items,[]);
        items.forEach((item)=>{
            item = item.replace(/\*/g,'');
            switchyd_server.accept(item);
        });
        
        items.splice(0,items.length);
        this._untrie(loaded['group-whitelist'],items,[]);
        items.forEach((item)=>{
            item = item.replace(/\*/g,'');
            switchyd_server.deny(item);
        });

        new Persistor().persist([switchyd_server]);
    }

    _untrie(map,items=[],context=[]) {
        for(let kv in map){
            const key = kv;
            const value = map[kv];
            
            context.push(key);
            this._untrie(value,items,context);
            
            let empty = true;
            for(let child in value){
                empty = false;
            }

            if(empty){
                items.push(context.reverse().join('.'));
                context.reverse();
            }
            context.pop();
        }
    }
}

export class Injector {
    
    constructor() {
    }
    
    inject() {
        new Migrate().migrate();
        
        function attach() {
            const servers = new Persistor().unpersist();
            const script = new Compiler().compile(servers);

            if( chrome !== undefined && chrome.proxy !== undefined ) {
                // apply proxy
                chrome.proxy.settings.set(
                    {
                        "value":{
                            "mode":"pac_script",
                            "pacScript":{
                                "mandatory":false,
                                "data":script
                            }
                        }
                    },

                    function(){
                        console.log("setting apply,script:\n"+script);
                    }
                );
            }

            return servers;
        }

        const leak = { 
            ref :  attach(),
        };

        if( chrome === undefined || chrome.proxy === undefined ){
            console.warn('no chrome proxy found');
            return;
        }

        // hook
        chrome.proxy.onProxyError.addListener(function(details){
            console.error("proxy error:" + details.details);
        });
        
        // network diagnose
        chrome.webRequest.onErrorOccurred.addListener(function(details){
                if( details.error == 'net::ERR_NETWORK_CHANGED' ){
                    console.log('network changed,regen PAC script');
                    leak.ref = attach();
                    return;
                }
                
                const start = details.url.indexOf("://") + 3;
                const url = details.url.substr(start,details.url.indexOf("/",start) - start);
                for(let server of leak.ref) {
                    console.log(server); 
                    if( !server._shorhand('listen').has(details.error) ){
                        continue;
                    }
                    
                    const denys = Array.from(server._shorhand('denys').values());
                    if(denys.length > 0 && new RegExp(denys.join('|')).test(url)) {
                        console.log(`pass ${url}`)
                        continue;
                    }
                    
                    console.log(`add ${url} to ${server.server()}`)
                    server.accept(url);
                    
                    new Persistor().persist(leak.ref);
                    leak.ref = attach();
                
                }

                console.warn(details);
            },
            {
                "urls":[
                    "http://*/*",
                    "https://*/*"
                ]
            }
        );
    }
}

