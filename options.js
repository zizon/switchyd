document.addEventListener("DOMContentLoaded",function(){
    'use strict'
    var foreach_dom = function(expr,callback){
        var candidates = document.querySelectorAll(expr);
        for( var i=0; i<candidates.length; i++ ){
            callback(candidates[i]);
        }
    }
    
    var button_effect = function(dom){
        dom.addEventListener("mouseover",function(event){
            event.target.style.borderColor = "hsl(222,38%,61%)";
        });
        
        dom.addEventListener("mouseout",function(event){
            event.target.style.borderColor = ""
        });
        
        dom.addEventListener("click",function(event){
            event.target.style.borderColor = "hsl(222,84%,61%)";
            event.target.style.borderWidth = "1px";
            
            // delay effect clear
            window.setTimeout(function(){
                    event.target.style.borderColor = "hsl(222,38%,61%)";
                    event.target.style.borderWidth = "";
                },
                300
            );
        });
    }
    
    var notify = (function(){
        var message = document.querySelector("#message");
        return function(content){
            message.textContent = content;
            message.style.display="block";

            window.setTimeout(function(){
                    message.style.display=""
                },
                2000
            );
        }
    })();
    
    // restore config
    chrome.runtime.getBackgroundPage(function(app){
            var row_template = document.querySelector("div#config div.template");
            var root = document.querySelector("#config");
            
            //get configs
            app.config["servers"].split(";").reduce(function( previous, current, index, array ){
                    if( (current = current.trim()).length <= 0 ){
                        return previous;
                    }

                    var tuples = current.split(" ").reduce(function( previous, current, index, array ){
                            if( (current = current.trim()).length > 0 ){
                                previous.push(current);
                            }
                            
                            return previous;
                        },
                        []
                    );
                    
                    var server = tuples[1].split(":");
                    previous.push({
                        "protocol":tuples[0],
                        "server":server[0],
                        "port":server[1]
                    });
                    
                    return previous;
                },
                []
            ).map(function(proxy){
                var new_row = row_template.cloneNode(true);

                new_row.querySelector("select").value = proxy["protocol"];
                new_row.querySelector("input[name='server']").value = proxy["server"];
                new_row.querySelector("input[name='port']").value =proxy["port"];
                
                new_row.classList.remove("template");
                
                var remove = function(event){
                    if(document.querySelectorAll(".remove").length > 1){
                        event.target.parentNode.remove();
                    }
                }
                
                var add = function(event){
                    var row = document.querySelector("#config").appendChild(event.target.parentNode.cloneNode(true));
                    row.querySelector(".add").addEventListener("click",add);
                    row.querySelector(".remove").addEventListener("click",remove);
                }
                
                var element = root.appendChild(new_row);
                element.querySelector(".add").addEventListener("click",add);
                element.querySelector(".remove").addEventListener("click",remove);
            });
    });
    
    // attach save
    {
        var save = document.querySelector("#save");
        button_effect(save);
        
        save.addEventListener("click",function(event){
            // build server list
            var servers=[]
            var rows = document.querySelector("#config").children;
            for( var i=0; i<rows.length; i++ ){
                var row = rows[i];
                // ignore template
                if(row.classList.contains("template")){
                    continue;
                }
                
                servers.push(row.querySelector("select").value 
                    + " " + row.querySelector("input[name='server']").value 
                    + ":" + row.querySelector("input[name='port']").value
                );
            }
            
            chrome.runtime.getBackgroundPage(function(app){
                app.config["servers"] = servers.join(";");
                app.syncProxyConfig();
                app.hints.codegen();
            })
            
            notify("SETTING APPLY");
        });
    }
    
    // prepare tab
    {
        var bind_tab_effect = function(tab,content){
            tab.addEventListener("mouseover",function(event){
                if(! event.target.classList.contains("tab-active")){
                    event.target.classList.add("tab-semi-active");
                }
            });
            
            tab.addEventListener("mouseout",function(event){
                if(! event.target.classList.contains("tab-active")){
                    event.target.classList.remove("tab-semi-active");
                }
            });
            
            tab.addEventListener("click",function(event){
                event.target.classList.remove("tab-semi-active");
                
                // clear old
                foreach_dom("#navigate .tab-active",function(dom){
                    dom.classList.remove("tab-active");
                });
       
                event.target.classList.add("tab-active");
            });
            
            tab.addEventListener("click",function(event){
                foreach_dom(".tab-content",function(dom){
                    dom.classList.add("hidden");
                });
                
                content.classList.remove("hidden");
            });
        };
        
        bind_tab_effect(
            document.querySelector("#navigate-config"),
            document.querySelector("#config-tab")
        );
      
        bind_tab_effect(
            document.querySelector("#navigate-sites"),
            document.querySelector("#sites-tab")
        );
    }
    
    // build sites list
    {
        var sync_hosts = document.querySelector("#sync-hosts");
        button_effect(sync_hosts);
        sync_hosts.addEventListener("click",function(event){
             chrome.runtime.getBackgroundPage(function(app){
                var hosts = {};
                foreach_dom(".host",function(dom){
                    var host = dom.querySelector("input.input-slot").name;
                    if( host in app.hints.marks ){
                        hosts[host] = app.hints.marks[host];
                    }
                });
                
                app.hints.marks = hosts;
                app.hints.codegen();
                notify("UPDATE PROXY DONE");
             });
        });
        
        document.querySelector("#navigate-sites").addEventListener("click",function(event){
            // clear old
            foreach_dom(".host",function(dom){
                dom.remove();
            });
        
            // build new
            chrome.runtime.getBackgroundPage(function(app){
                // a chance to compact
                app.hints.compact();
                
                var host_template = document.querySelector("div#sites-tab div.template");
                var root = document.querySelector("div#sites-tab");
                
                var rows = [];
                for( var host in app.hints.marks ){
                        var row = host_template.cloneNode(true);
                        row.querySelector(".remove").addEventListener("click",function(event){
                            event.target.parentNode.remove();
                        });
                        
                        row.querySelector("input.input-slot").value = host + " ( ~" + app.hints.marks[host] + " times ) ";
                        row.querySelector("input.input-slot").name = host
                        row.classList.remove("template");
                        row.classList.add("host");
                        
                        rows.push({
                            "count":app.hints.marks[host],
                            "row":row
                        });
                }
                
                // sort for easier access
                rows.sort(function(left,right){
                    return left.count - right.count;
                });
                
                // append
                rows.map(function(row){
                    root.appendChild(row.row);
                });
            });
        });
    }
});