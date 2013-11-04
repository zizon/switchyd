'use strict';
(function(){
    var script = document.createElement("script");
    script.async = 'async';
    script.src = "angular.js";
    script.type = "text/javascript";
    document.querySelector("script").insertBefore(script);
    
    script.addEventListener("load",function(event){
        var injector = angular.injector(['ng']);
        window.injector = injector;
        var scope = injector.get("$rootScope").$new(true);
        scope.navis =[1,2,3];
        injector.get("$compile")(document.querySelector("ul"))(scope);
        scope.$apply();
        
        var id = window.setTimeout(function(){
            scope.navis[0] = 9;
            scope.$apply();
            //scope.$digest();
            window.clearTimeout(id);
        },2000);
    });
})();
