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

var config = {
    "servers":"SOCKS5 127.0.0.1:10086;"
}

var engine = {
    "shuffle" : function(more){
        switch(more.length){
            case 0:
            case 1:
                return [more];
            case 2:return [
                [more[0],more[1]],
                [more[1],more[0]]
            ];
        }

        return this.shuffle(more.slice(1)).reduce(
            function(shuffled,unit){
                // for each shuffled unit
                unit.forEach(function(item,index){
                    // patch single to current unit at position index
                    shuffled.push([].concat(unit.slice(0,index),more[0],unit.slice(index)));
                });

                // create new instead of reuse unit.
                // aim to cut reference to local reference.
                shuffled.push([].concat(unit,more[0]));
                return shuffled;
            },
            []
        );
    },

    "gen":function(hints){
        // build lookup
        var lookup = hints.genLookup();
        var marks = hints.marks;

        // backward compatible
        var candidates = config["servers"].split(";").reduce(
            function(concated,item){
                item = item.trim();
                if(item.indexOf("HTTPS") == 0){
                    concated.push("PROXY " + item.substr(5));
                }else if(item.indexOf("HTTP") == 0){
                    concated.push("PROXY " + item.substr(4));
                }else if(item.length > 0){
                    concated.push(item);
                }

                return concated;
            },
            []
        );
        config["servers"] = candidates.join(";");

        // shuffle servers,aim to randomize proxy load
        var servers = this.shuffle(candidates).map(function(i){
            return i.join(";") + ";DIRECT;";
        });

        // dereference.
        // Note: hints.match should not contain any 'this' use.
        var matchFuzzy = hints.match;

        //gen template
        var template = function(url,host){
            if( host in marks ){
                return servers[Date.now()%servers.length];
            }

            return matchFuzzy(host,lookup,false)["hit"] ? servers[Date.now()%servers.length] : "DIRECT;";
        }

        return "var lookup = " + JSON.stringify(lookup) + ";\n"
            +   "var marks = " + JSON.stringify(marks) + ";\n"
            +   "var servers = " + JSON.stringify(servers) + ";\n"
            +   "var matchFuzzy = " + matchFuzzy.toString() + ";\n"
            +   "var FindProxyForURL = " + template.toString() + ";"; 
    }
}

function syncProxyConfig(){
    localStorage.setItem("proxy.config",JSON.stringify(config));
}

function restoreProxyConfig(){
    var stored = localStorage.getItem("proxy.config");
    if( stored != null ){
        config = JSON.parse(stored);
    }
}

var hints ={
    "marks":{},

    "complete":{},

    "candidate":{},

    "genLookup":function(){
        var lookup = {};
        var marks = this.marks;
        for(var key in marks){
            if( marks[key] <= 0 ){
                delete marks[key];
                continue;
            }

            // gen lookup table in reverse/postfix manner.
            // for example, 'www.google.com' will be transform to 
            //	{
            //		"com":{
            //			"google":{
            //				"www":{}
            //			}
            //		}
            //	}
            key.split(".").reduceRight(
                function( previous, current, index, array ){
                    return current in previous ? previous[current] : previous[current] = {};
                },
                lookup
            );
        }

        return lookup;
    },

    "match":function(host,lookup,create_when_miss){
        return host.split(".").reduceRight(
            function( previous, current, index, array ){
                // directive ignore
                if( previous["stop"] ){
                    return previous;
                }

                var ctx_lookup = previous["lookup"];

                // see if current context has fuzzy
                if( "*" in ctx_lookup || current == "*" ){
                    // set up stop flag
                    previous["stop"] = true;
                    
                    // indicate a fuzzy match
                    previous["fuzzy"] = true;

                    // modiry current representation.
                    // it is a fuzzy match
                    previous["context"].push("*");
                }else if( current in ctx_lookup ){
                    // match , drill down
                    previous["lookup"] = ctx_lookup[current];
                    previous["context"].push(current);
                }else if( create_when_miss ){
                    // not match,and directive to create new
                    previous["lookup"] = ctx_lookup[current] = {};
                    previous["context"].push(current);
                }else{
                    // not match,and directive *NOT* to create new
                    previous["stop"] = true;
                    previous["hit"] = false;
                }

                return previous;
            },
            {
                "lookup":lookup,
                "fuzzy":false,
                "stop":false,
                "context":[],
                "hit":true
            }
        );
    },

    "compact":function(){
        // easy job
        if( "*" in this.marks ){
            this.marks = {"*":2};
            return true;
        }

        // lookup table
        var lookup = this.genLookup();
        var gen = false;

        var sweep = function(fuzzy_key,siblings,parent){
            var counting = function(siblings,parent){
                var counter = 0;
                for( var child in siblings ){
                    parent.push(child);
                    counter += counting(siblings[child],parent);
                    parent.pop();
                    delete siblings[child];
                }

                // count parent
                var key = parent.reverse().join(".");
                if( key in hints.marks ){
                    counter += hints.marks[key];
                    delete hints.marks[key];
                }
                parent.reverse();
                

                return counter;
            }

            // counting
            var old_counter = fuzzy_key in hints.marks ?  hints.marks[fuzzy_key] : 0;
            var counter = counting(siblings,parent);

            // update track context
            siblings["*"] = {};
            hints.marks[fuzzy_key] = counter;

            return old_counter != counter;
        }

        for( var key in this.marks ){
            var match = this.match(key,lookup,false);

            // parent
            var parent = key.split(".").reverse();
            parent.pop();

            // sibling lookup
            var siblings = parent.reduce(
                function( parent, child, index, array ){
                    return parent[child];
                },
                lookup
            );
            
            if( match["fuzzy"] ){				
                // do sweep,directive code generation
                gen = sweep(match["context"].reverse().join("."),siblings,parent) || gen;
                continue;
            }

            // concrete match
            var mergable = true;
            var num_of_siblings = 0;
            
            out:
            for( var sibling in siblings ){
                // if lower level has its children,mark it not mergable
                for( var child in siblings[sibling] ){
                    mergable = false;
                    break out;
                }
            }     
            
            if( mergable ){
                if( parent.length > 1 ){
                    gen = true;
                    parent.push("*");
                    var fuzzy_key = parent.reverse().join(".");
                    parent.reverse().pop(); 
                    sweep(fuzzy_key,siblings,parent);
                }
            }
        }

        return gen;
    },

    "markOK":function(host){
        if( host in this.complete ){
            if( this.complete[host] < Number.MAX_VALUE ){
                this.complete[host] += 1;
            }
        }else{
            this.complete[host] = 1;
        }
    },

    "codegen":function(){
        chrome.proxy.settings.set(
            {
                "value":{
                    "mode":"pac_script",
                    "pacScript":{
                        "mandatory":true,
                        "data":engine.gen(hints)
                    }
                }
            },

            function(){
                console.log("setting apply");
            }
        );
    },

    "markFail":function(host){
        // if host is in proxy.
        // update marks
        if( host in this.marks ){
            if( --this.marks[host] <= 0 ){
                // proxy fail much,remove from proxy
                console.log("drop proxy:" + host);
                delete this.marks[host];
                this.codegen();
                localStorage.setItem("hints.marks",JSON.stringify(this.marks));
            }
        }else{
            // not in proxy yet,add it
            this.marks[host] = 2;
            this.codegen();
        }
    }
}

function resoreHints(){
    console.log("restore hints");
    var cache = localStorage.getItem("hints.marks");
    if( cache == null ){
        return;
    }

    cache = JSON.parse(cache);
    for( var key in cache ){
        hints.marks[key] = cache[key];
    }

    hints.compact();
    hints.codegen();
}

function extractHost(url){
    var start = url.indexOf("://") + 3;
    return url.substr(start,url.indexOf("/",start) - start);
}

function handInRequest(){
    console.log("handin request");

    chrome.proxy.onProxyError.addListener(function(details){
        console.error("proxy error:" + details);
    });

    chrome.webRequest.onErrorOccurred.addListener(
        function(details){
            console.error(details);

            // inspect potential reset request
            switch(details.error){
                case "net::ERR_CONNECTION_RESET":
                case "net::ERR_CONNECTION_TIMED_OUT":
                    hints.markFail(extractHost(details.url));
                    break;
                    /*
                case "net::ERR_CONNECTION_ABORTED":
                    hints.mayFail(extractHost(details.url));
                    break;
                    */
            }
        },
        {
            "urls":["<all_urls>"]
        }
    );

    chrome.webRequest.onCompleted.addListener(
        function(details){
            // ignore cache
            if(details.fromCache){
                return;
            }

            // mark host ok
            hints.markOK(extractHost(details.url));
        },
        {
            "urls":["<all_urls>"]
        },
        []
    );
}

function schedule(){
    console.log("schedule");

    chrome.alarms.create(
        "sweep-hints-marks",
        {
            "periodInMinutes":5
        }
    );

    chrome.alarms.onAlarm.addListener(function( alarm ){
        console.log("fire alarm:" + alarm.name);
        switch(alarm.name){
            case "sweep-hints-marks":
            // clear candidate
            hints.candidate = {};

            // compact first,make it shorter
            if( hints.compact() ){
                hints.codegen();
            }

            // loop hints.complete list,
            // update counter in marks.
            var lookup = hints.genLookup();
            for( var key in hints.complete ){
                if( key in hints.marks ){
                    hints.marks[key] += hints.complete[key];
                    continue;
                }

                var match = hints.match(key,lookup,false);
                if( match["fuzzy"] ){
                    hints.marks[match["context"].reverse().join(".")] += hints.complete[key];
                }
            }

            // clear
            hints.complete = {};
            console.log("sync-local-cache");
            localStorage.setItem("hints.marks",JSON.stringify(hints.marks));
            break;
        }
    });
}

function handIn(){
    restoreProxyConfig();
    resoreHints();
    handInRequest();
    schedule();
}

(function(){
    handIn();
})();