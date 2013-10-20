/*
Copyright (c) <2013>, <Zizon Qiu zzdtsv@gmail.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.
3. All advertising materials mentioning features or use of this software
must display the following acknowledgement:
This product includes software developed by the <organization>.
4. Neither the name of the <organization> nor the
names of its contributors may be used to endorse or promote products
derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY <COPYRIGHT HOLDER> ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
"use strict";

var switchyd = {
    config:{
        servers:[
            {
                type:"SOCKS5",
                ip:"127.0.0.1",
                port:10086
            }
        ],
        
        tracers:{
            proxy:{},
            do_not_track:{}
        },
    },
    
    sync:{
        load:function(){
            console.log("load config");
            var config = localStorage.getItem("switchyd.config");
            if( config ){
                switchyd.config = JSON.parse(config);
            }            
        },            

        save:function(){
            console.log("save config");
            localStorage.setItem("switchyd.config",JSON.stringify(switchyd.config));    
        }
    },
    
    tracer:(function(){
        var tracking = {};
        return function(name){
            if( name in tracking ){
                return tracking[name];
            }
            
            // not present yet,create one
            return tracking[name] = {
                urls:{},
                
                track:function(url){
                    url in this.urls ? 0 : this.urls[url]=0;
                    return this;
                },
            };
        };
    })(),
    
    compile:function(tracer){
        var compiled = {};
        
        var transform = function(final,part){
            return part in final ? final[part] : final[part] = {};
        };
        
        // loop each node
        for(var url in tracer.urls){
            url.split(".").reduceRight(transform,compiled);
        }
        
        return compiled;
    },
    
    optimize:(function(){
        var no_children = function(node){
            for(var child in node){
                if( child !== "*" ){
                    return false;
                }
            }
            
            return true;
        };
        
        return function(compiled,depth){
            // ensure default value
            depth = typeof depth == "undefined" ? 1 : depth;
            
            // leaf
            if( no_children(compiled) ){
                return compiled;
            }
            
            var mergable = true;
            var number_of_children = 0;

            // none leaf
            for(var part in compiled){
                number_of_children++;
                // recrusive optimize
                mergable = mergable && no_children(compiled[part] = this.optimize(compiled[part],depth+1) );
            }
            
            // see if mergable
            if( mergable && number_of_children > 1 ){
                if( depth > 2 ){
                    for(var child in compiled){
                        delete compiled[child];
                    }
                
                    // add fuzzy mark
                    compiled["*"]={};
                }
            }
            
            return compiled;
        };
    })(),
    
    match:function(compiled,url){
        return url.split(".").reduceRight(function(context,part){
            return context ? 
                    context === true ?
                        true : part in context ?
                            context[part] : "*" in context ?
                                true : false 
                    : false;
        },compiled) !== false;
    },
    
    link:function(compiled){
        var shuffle = function(arrays){
            switch(arrays.length){
                case 0:case 1:
                    return [arrays];
                case 2:
                    return [
                        [arrays[0],arrays[1]],
                        [arrays[1],arrays[0]]
                    ];
            }
            
            return shuffle(arrays.slice(1)).reduce(function(shuffled,candidate,index,paritial){
                for( var i=0; i<candidate.length; i++ ){
                    shuffled.push([].concat(candidate.slice(0,i),arrays[0],candidate.slice(i)));
                }
                shuffled.push([].concat(candidate,arrays[0]));
                return shuffled;
            },[]);
        };
        
        // make server load balance
        var load_balance = shuffle(this.config.servers).map(function(servers){
            return [].concat(servers.map(function(server){
               return [server.type," " , server.ip,":",server.port].join(""); 
            }),"DIRECT").join(";");
        });
        
        var search = this.match;
        var template = function(_,host){
            if( search(compiled,host) ){
                return load_balance[Date.now()%load_balance.length];
            }
            
            return "DIRECT;";
        };
        
        var script ="var load_balance = " + JSON.stringify(load_balance) + ";\n"
                    + "var compiled = " + JSON.stringify(compiled) + ";\n"
                    + "var search = " + search.toString() + ";\n"
                    + "var FindProxyForURL = " + template.toString() + ";";
        chrome.proxy.settings.set(
            {
                "value":{
                    "mode":"pac_script",
                    "pacScript":{
                        "mandatory":true,
                        "data":script
                    }
                }
            },

            function(){
                console.log("setting apply,sciprt:\n"+script);
            }
        );
        
        return script;
    },
    
    plug:function(){
        this.sync.load();
        var self = this;

        var merge = function(from,to){
            for( var key in from ){
                merge(from[key],key in to ? to[key] : to[key]={});
            }
        };
 
        var optimize = function(){
            merge(self.optimize(self.compile(self.tracer("do_not_track"))),self.config.tracers.do_not_track);
            merge(self.optimize(self.compile(self.tracer("proxy"))),self.config.tracers.proxy);
            self.sync.save();
        };

        // preiod optimize
        chrome.alarms.create("optimize",{"periodInMinutes":5});
        chrome.alarms.onAlarm.addListener(function( alarm ){
            switch(alarm.name){
                case "optimize":
                    optimize();
                    self.sync.save();
                    break;
            }
        });

        chrome.proxy.onProxyError.addListener(function(details){
            console.error("proxy error:" + details);
        });
        
        // network diagnose
        chrome.webRequest.onErrorOccurred.addListener(function(details){
            console.error(details);
            
            // inspect potential reset request
            switch(details.error){
                case "net::ERR_CONNECTION_RESET":
                case "net::ERR_CONNECTION_TIMED_OUT":
                case "net::ERR_SSL_PROTOCOL_ERROR":
                    var start = details.url.indexOf("://") + 3;
                    var url = details.url.substr(start,details.url.indexOf("/",start) - start);
                    if( !self.match(self.config.tracers.do_not_track,url) ){
                        self.tracer("proxy").track(url);
                        optimize();
                        self.link(self.config.tracers.proxy);
                    }
                    break;
            }
        },{"urls":["<all_urls>"]});
        
        this.link(this.config.tracers.proxy);
    }
};

switchyd.plug();
