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
        scope.navis =[
            {
                name:"servers"
            },
            {
                name:"proxy-list"
            },
            {
                name:"white-list"
            }
        ];
        injector.get("$compile")(document.querySelector("div.navi-item"))(scope);
        scope.$apply();
    });
})();
