document.addEventListener("DOMContentLoaded",function(){
        // attach click events
        var add = document.querySelectorAll(".add");
        var add_function = function(event){
            var element = document.querySelector("#config")
                    .appendChild(event.target.parentNode.cloneNode(true));
            element.querySelector(".add").addEventListener("click",add_function);
            element.querySelector(".remove").addEventListener("click",remove_function);
        }
        for( var i=0; i<add.length; i++){
            add[i].addEventListener("click",add_function);
        }
        
        var remove = document.querySelectorAll(".remove");
        var remove_function = function(event){
            if(document.querySelectorAll(".remove").length > 1){
                event.target.parentNode.remove();
            }
        }
        for( var i=0; i<remove.length; i++){
            remove[i].addEventListener("click",remove_function);
        }
        
        // restore config
        chrome.runtime.getBackgroundPage(function(app){
                //get configs
                var servers = app.config["servers"].split(";").reduce(function( previous, current, index, array ){
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
                );
                
                {
                    // need only one, delete other
                    var rows = document.querySelectorAll("div.row");
                    for( var i=1; i<rows.length; i++ ){
                        rows[i].remove();
                    }
                }
                
                var row = document.querySelector("div.row");
                servers.map(function(proxy){
                    var new_row = row.cloneNode(true);
                    new_row.querySelector("select").value = proxy["protocol"];
                    new_row.querySelector("input[name='server']").value = proxy["server"];
                    new_row.querySelector("input[name='port']").value =proxy["port"];
                    
                    var element = document.querySelector("#config").appendChild(new_row);
                    element.querySelector(".add").addEventListener("click",add_function);
                    element.querySelector(".remove").addEventListener("click",remove_function);
                });
                
                if( document.querySelectorAll("div.row").length > 1){
                    row.remove();
                }
        })
           
        // attach save
        document.querySelector("#save").addEventListener("mouseover",function(event){
            event.target.style.borderColor = "hsl(222,38%,61%)";
        });
        
        document.querySelector("#save").addEventListener("mouseout",function(event){
            event.target.style.borderColor = ""
        });
        
        document.querySelector("#save").addEventListener("click",function(event){
            // build server list
            var servers=[]
            var rows = document.querySelector("#config").children;
            for( var i=0; i<rows.length; i++ ){
                var row = rows[i];
                servers.push(row.querySelector("select").value 
                    + " " + row.querySelector("input[name='server']").value 
                    + ":" + row.querySelector("input[name='port']").value
                );
            }
            
            chrome.runtime.getBackgroundPage(function(app){
                app.config = servers.join(";");
                app.syncProxyConfig();
                app.hints.codegen();
            })
            
            // start button effect
            event.target.style.borderColor = "hsl(222,84%,61%)";
            event.target.style.borderWidth = "1px";
            
            var message = document.querySelector("#message")
            message.style.display="block";
            
            // delay effect clear
            window.setTimeout(function(){
                    event.target.style.borderColor = "hsl(222,38%,61%)";
                    event.target.style.borderWidth = "";
                },
                300
            );
            
            window.setTimeout(function(){
                    message.style.display=""
                },
                2000
            );
        });
    });