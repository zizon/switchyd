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
    "gen":function(rank_host){
        // build lookup
        var lookup = {};
        for(var key in rank_host){
            if( rank_host[key] <= 0 ){
                delete rank_host[key];
                continue;
            }
            
            key.split(".").reduceRight(function( previous, current, index, array ){
                        return current in previous ? previous[current] : previous[current] = {};
                },
                lookup
            );
        }
        
        var servers = config["servers"] + ";DIRECT;";
        
        //gen template
        var template = function(url,host){
            if( host in rank_host ){
                return servers;
            }
            
            var need_proxy = host.split(".").reduceRight(function( previous, current, index, array){
                    // fuzzy proxy,ignore remains
                    if( previous["fuzzy"] ){
                        return previous;
                    }
                    
                    // skip not match
                    if( ! previous["match"] ){
                        return previous;
                    }
                    
                    // fall-back to exact host match
                    var context = previous["context"];
  
                    // update context
                    if( current in context ){
                        previous["context"] = context[current];
                    }else{
                        previous["match"] = false;
                    }
                    
                    return previous;
                },
                {
                    "context":lookup,
                    "match":true,
                    "fuzzy":false
                }
            );
            
            return need_proxy["fuzzy"] || need_proxy["match"] ? servers : "DIRECT ;";
        }
        
        return "var lookup = " + JSON.stringify(lookup) + ";\n"
            +   "var rank_host = " + JSON.stringify(rank_host) + ";\n"
            +   "var servers = '" + servers + "'\n"
            +   "var FindProxyForURL = " + template.toString(); 
    }
}

var hints ={
    "marks":{
    },
    
    "compact":function(){
        // easy job
        if( "*" in this.marks ){
            this.marks = {"*":2};
            return;
        }
        
        var lookup = {};
        for( var key in this.marks ){
            if( this.marks[key] <= 0 ){
                delete this.marks[key];
                continue;
            }
            
            if("*.blogspot.com" == key){
                console.log(key);
            }
            
            // no fuzzy match,easy job
            if( key.indexOf("*") == -1 ){
                if( key.split(".").reduceRight(function( previous, current, index, array ){
                                if( previous["ignore"] ){
                                    return previous;
                                }
                                
                                var context = previous["context"];
                                if( "*" in context ){
                                        previous["ignore"] = true;
                                        return previous;
                                }
                                
                                if( !(current in context) ){
                                    context[current] = {}
                                }
                                
                                previous["context"] = context[current];
                                return previous;
                        },
                        {
                            "context":lookup,
                            "ignore":false
                        }
                    )["ignore"] 
                ){
                    // meet a fuzzy match,drop it
                    delete this.marks[key];
                }
                
                continue;
            }
            
            // 1.filter fuzzy part
            var context = key.split(".").reduceRight(function( previous, current, index, array ){
                    if( previous["meet"] ){
                        return previous;
                    }else if( current == "*" ){
                        previous["meet"] = true;
                        return previous;
                    }else{
                        previous["stack"].push(current);
                        
                        var context = previous["current"];
                        if( !(current in context) ){
                            context[current] = {}
                        }
                        previous["current"] = context[current];
                        return previous;
                    }
                },
                {
                    "meet":false,
                    "stack":[],
                    "current":lookup
                }
            );
            
            // 2.clean old if needed
            var _this = this;
            var eliminate = function( stack, current){
                var empty = true;
                for( var key in current ){
                    empty = false;
                    if( key == "*" ){
                        continue;
                    }
                    
                    stack.push(key);
                    eliminate(stack,current[key]);
                    stack.pop();
                }
                
                // it is the leaf
                if( empty ){
                    delete _this.marks[stack.reverse().join(".")];
                    stack.reverse();
                }
            }
            
            var stack = context["stack"];
            var current = context["current"];
            for( var key in current ){
                if( key != "*" ){
                    stack.push(key);
                    eliminate(stack,current[key]);
                    stack.pop();
                }
            }
            
            // 3. add fuzzy
            stack.push("*")
            this.marks[stack.reverse().join(".")] = 2;
            
            // 4. update lookup
            current["*"] = {};
        }
    },
    
    "markOK":function(host){
        if( host in this.marks ){
            if( this.marks[host] < Number.MAX_VALUE ){
                this.marks[host]++;
            }
        }
    },
    
    "codegen":function(){
        chrome.proxy.settings.clear({});

        chrome.proxy.onProxyError.addListener(function(details){
            console.error("proxy error:" + details);
        });

        chrome.proxy.settings.set(
            {
                "value":{
                    "mode":"pac_script",
                    "pacScript":{
                        "mandatory":true,
                        "data":engine.gen(this.marks)
                    }
                }
            },
            function(){
                console.log("setting apply");
            }
        );
    },
    
    "markFail":function(host){
            // if host not mark yet,mark it and gen proxy
            // or that host already in proxy mode.
            // decrease counter untile zero so it may recover from an
            // init & clean state.(it may not require a proxy any more)
            if( host in this.marks ){
                if( --this.marks[host] <= 0 ){
                    delete this.marks[host];
                    this.codegen();
                }
            }else{
                this.marks[host] = 2;
                this.codegen();
            }
    }
}

function syncFromCloud(){
    console.log("sync from cloud");
    chrome.storage.sync.get(null,function(items){
        console.log(items);
        var marks = hints.marks;
        for(var key in items){
            marks[key] = items[key];
        }
    });
}

function resoreHints(){
    console.log("restore hints");
    var cache = localStorage.getItem("hints.marks");
    if( cache == null ){
        return;
    }
    
    cache = JSON.parse(cache);
    for( key in cache ){
        hints.marks[key] = cache[key];
    }
    
    hints.codegen();
}

function extractHost(url){
    var start = url.indexOf("://") + 3;
    return url.substr(start,url.indexOf("/",start) - start);
}

function handInRequest(){
    console.log("handin request");
    chrome.webRequest.onErrorOccurred.addListener(
        function(details){
            console.error(details);
            
            // inspect potential reset request
            switch(details.error){
                default:
                    return;
                case "net::ERR_CONNECTION_RESET":
                case "net::ERR_CONNECTION_ABORTED":
                case "net::ERR_CONNECTION_TIMED_OUT":
                    break;
            }
            
            // mark it to direct proxy code gen
            hints.markFail(extractHost(details.url));
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
        "sync-local-cache",
        {
            "periodInMinutes":10
        }
    );
    
    chrome.alarms.create(
        "sync-to-cloud",
        {
            "periodInMinutes":30
        }
    );
    
    chrome.alarms.create(
        "sweep-hints-marks",
        {
            "periodInMinutes":5
        }
    );
    
    chrome.alarms.onAlarm.addListener(function( alarm ){
        console.log("fire alarm:" + alarm.name);
        switch(alarm.name){
            case "sync-local-cache":
                localStorage.setItem("hints.marks",JSON.stringify(hints.marks));
                break;
            case "sync-to-cloud":
                chrome.storage.sync.set(hints["marks"],function(){
                    console.log("sync to cloud");
                });
                break
            case "sweep-hints-marks":
                var sweep = false;
                for( var key in hints.marks ){
                    if( hints.marks[key] <= 0 ){
                        delete hints.marks[key];
                        sweep = true;
                    }
                }
                
                if(sweep){
                    hints.codegen();
                }
                break;
        }
    });
}

function handIn(){
    syncFromCloud();
    resoreHints();
    handInRequest();
    schedule();
}

chrome.runtime.onInstalled.addListener(function(details){
    console.log("install..");
    switch(details.reason){
        case "install":
        case "update":
        case "chrome_update":
            console.log(details.reason);
            break;
    }
    
   handIn();
});

chrome.runtime.onStartup.addListener(function(){
    console.log("starup");
    handIn();
});