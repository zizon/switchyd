'use strict';

module.exports = function(grunt) {
    grunt.initConfig({
        vulcanize: {
            default : {
                options : {
                    csp : true
                },

                files : {
                    "option.html":"polymer_option.html"
                }
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-vulcanize');
    grunt.registerTask('default', ['vulcanize']); 
}
