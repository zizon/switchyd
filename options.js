'use strict';
(function(){
    var script = document.createElement("script");
    script.async = 'async';
    script.src = "angular.js";
    script.type = "text/javascript";
    document.querySelector("script").insertBefore(script);
    
    script.addEventListener("load",function(event){
        chrome.runtime.getBackgroundPage(function(app){
            var switchyd = app.switchyd;
            var injector = angular.injector(['ng']);
            
            var scope = injector.get("$rootScope").$new(true);
            scope.activate = function(index){
                scope.navis.forEach(function(navi,i){
                    navi.active = i == index ? true: false;
                });
                
                scope.$emit("active-changed");
            };
            scope.navis =["servers","proxy-list","white-list","rules"].map(function(name){
                return {
                    name:name,
                    active:false,
                    loaded:false
                }
            });
            
            scope.$on("active-changed",function(event){
                scope.navis.forEach(function(navi){
                    if(!navi.loaded){
                        var scope = navi.scope = injector.get("$rootScope").$new(true);
                        scope.switchyd = switchyd;
                        scope.active = navi.active;
                        scope.insert = function(item,index,array){
                            if( !angular.isString(item) && "$$hashKey" in item ){
                                item = angular.copy(item);
                                delete item["$$hashKey"];
                            }
                            
                            array.splice(index,array[index],item);
                        };                   
                        
                        switch(navi.name){
                            case "rules":
                                scope.remove = function(name){
                                    delete scope.switchyd.config.rules[name];
                                }
                                break;
                            case "proxy-list":
                                scope.tracer = "proxy";
                            case "white-list":
                                if(!("tracer" in scope)){
                                    scope.tracer = "do_not_track";
                                }
                                
                                scope.urls = [];
                                scope.expand = function(){
                                    if( scope.urls.length !== 0 ){
                                        return scope.urls;
                                    }
                                    
                                    var expand =  function(source){
                                        var result = [];
                                        for(var key in source){
                                            var child = expand(source[key]);
                                            if( child.length === 0 ){
                                                result.push([key]);
                                                continue;
                                            }
                        
                                            child.forEach(function(item){
                                                result.push([].concat(key,item));
                                            });
                                        }
                                        return result;
                                    };
                                    
                                    scope.urls = expand(scope.switchyd.config.tracers[scope.tracer]).map(function(item){
                                        item.reverse();
                                        return item.join(".")
                                    });
                                    
                                    if( scope.urls.length === 0 ){
                                        scope.urls.push("NONE");
                                        return scope.urls;
                                    }
                                    return scope.urls = scope.urls.filter(function(url){ return url !== "NONE" });
                                }
                                break; 
                        }
                                    
                        navi.loaded = true;
                        injector.get("$compile")(document.querySelector("#"+navi.name))(scope);
                    }
                    
                     navi.scope.active = navi.active;
                });
            });
            
            scope.navis[0].active = true;
            scope.$emit("active-changed");
            
            injector.get("$compile")(document.querySelector("#navigation"))(scope);            
            
            scope.$apply();
        });
    });
})();
