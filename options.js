'use strict';
chrome.runtime.getBackgroundPage(function(app){
    var switchyd = app.switchyd;
    var injector = angular.injector(['ng']);
    injector.get("$animate").enabled(true);
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
            loaded:false,
            sync:angular.noop
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
                    
                    array.splice(index+1,0,item);
                };
               
                scope.remove = function(index,array){
                    if( array.length > 1 ){
                        array.splice(index,1);
                    } 
                };

                switch(navi.name){
                    case "servers":
                    case "rules":
                        var build_rules = function(){
                            var result = [];
                            for(var key in scope.switchyd.config.rules){
                                result.push({
                                    rule:{
                                        name:key,
                                        count:scope.switchyd.config.rules[key]
                                    }
                                });
                            }
                            
                            if(result.length < 1){
                                result.push({rule:{name:"NONE",count:0}});
                            }
                            return result;
                        };
                        
                        scope.rules = build_rules();

                        navi.sync = function(){
                            scope.switchyd.config.rules = {};
                            scope.rules.forEach(function(rule){
                                if( rule.rule.name != "NONE" ){
                                    scope.switchyd.config.rules[rule.rule.name] = rule.rule.count;
                                }
                            });
                        };
                        break;
                    case "proxy-list":
                        scope.tracer = "proxy";
                    case "white-list":
                        if(!("tracer" in scope)){
                            scope.tracer = "do_not_track";
                        }
                        
                        var build_urls = function(){
                            var urls = scope.switchyd.expand(scope.switchyd.config.tracers[scope.tracer]);
                            if( urls.length === 0 ){
                                urls.push("NONE");
                            }else{
                                urls = urls.filter(function(url){return url != "NONE"});
                            }

                            return urls.map(function(url){ return {url:url}});
                        };
                        scope.urls = build_urls();

                        navi.sync = function(){        
                            scope.switchyd.config.tracers[scope.tracer] = switchyd.optimize(scope.switchyd.compile(
                                    scope.urls.reduce(function(tracer,url){
                                        if( url.url != "NONE"){
                                            tracer.track(url.url);
                                        }
                                        return tracer;
                                    },scope.switchyd.tracer(scope.tracer))
                            ));
                            
                            scope.urls = build_urls(); 
                        };

                        break; 
                }
                            
                navi.loaded = true;
                injector.get("$compile")(document.querySelector("#"+navi.name))(scope);
                scope.$apply();
            }
            
             navi.scope.active = navi.active;
        });
    });
    
    scope.navis[0].active = true;
    scope.sync = function(){
        scope.navis.forEach(function(navi){
            navi.sync();
        });
        
        switchyd.async.enqueue();
        scope.message = "sync...";
        injector.get("$timeout")(function(){
            scope.message = '';
        },2000);
    };
    
    scope.$emit("active-changed");
    
    injector.get("$compile")(document.querySelector("#navigation"))(scope);
    scope.$apply();
});
