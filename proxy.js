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
            
            key.split(".").reduce(function( previous, current, index, array ){
                        return current in previous ? previous[current] : previous[current] = {};
                },
                lookup
            );
        }
        
        var servers = config["servers"] + ";DIRECT;";
        
        //gen template
        var template = function(url,host){
            var need_proxy = host.split(".").reduce(function( previous, current, index, array){
                    // skip not match
                    if( ! previous["match"] ){
                        return previous;
                    }
                    
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
                    "match":true
                }
            );
            
            return need_proxy["match"] ? servers : "DIRECT ;";
        }
        
        return "var lookup = " + JSON.stringify(lookup) + ";\n"
            +   "var servers = '" + servers + "'\n"
            +   "var FindProxyForURL = " + template.toString(); 
    }
}

var hints ={
    "marks":{
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