'use strict';

module.exports = function(grunt) {
    grunt.initConfig({
        vulcanize: {
            default : {
                options : {
                    csp : "polymer_option.js"
                },

                files : {
                    "option.html":"polymer_option.html"
                }
            }
        },

        watch :{
            default : {
                files : [
                    'polymer_option.html',
                    'polymer/*.html',    
                ],
                tasks : ['vulcanize'],
                options : {
                    event : ['changed']
                }
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-vulcanize');
    grunt.registerTask('default', ['vulcanize']); 
}
