'use strict';

module.exports = function(grunt) {

    //load all npm tasks automagically
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        paths: {
            build: 'build'
        },
        watch: {
            js: {
                //files: ['{,*/}*.js'],
                files: ['src/scripts/*.js'],
                tasks: ['jsbeautifier', 'docco', 'build'],
                options: {
                    livereload: true
                }
            },
            gruntfile: {
                files: ['Gruntfile.js'],
                tasks: ['jsbeautifier']
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: ['{,*/}*.js', '{,*/}*.html', '{,*/}*.css']
            }

        },
        jshint: {
            files: ['{,*/}*.js'],
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            }
        },
        jsbeautifier: {
            files: ['{,*/}*.js'],
            options: {
                js: {
                    braceStyle: 'collapse',
                    breakChainedMethods: false,
                    e4x: false,
                    evalCode: false,
                    indentChar: ' ',
                    indentLevel: 0,
                    indentSize: 4,
                    indentWithTabs: false,
                    jslintHappy: false,
                    keepArrayIndentation: false,
                    keepFunctionIndentation: false,
                    maxPreserveNewlines: 10,
                    preserveNewlines: true,
                    spaceBeforeConditional: true,
                    spaceInParen: false,
                    unescapeStrings: false,
                    wrapLineLength: 0
                }
            }
        },
        prettify: {
            options: {
                'indent': 4,
                'indent_char': ' ',
                'indent_scripts': 'normal',
                'wrap_line_length': 0,
                'brace_style': 'collapse',
                'preserve_newlines': true,
                'max_preserve_newlines': 1,
                'unformatted': [
                    'a',
                    'code',
                    'pre',
                    'span'
                ]
            },
            rootViews: {
                expand: true,
                cwd: 'examples/dev/',
                ext: '.html',
                src: ['*.html'],
                dest: 'examples/dev/'
            }
        },
        connect: {
            options: {
                port: 9000,
                // Change this to '0.0.0.0' to access the server from outside.
                hostname: '0.0.0.0',
                livereload: 35729
            },
            livereload: {}
        },
        docco: {
            debug: {
                src: ['{,*/}*.js'],
                options: {
                    output: 'docs/'
                }
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['tests/{,*/}*.js']
            }
        },
        jst: {
            compile: {
                options: {
                    namespace: 'OPENGRID',
                    processName: function(filepath) {
                        var fChop = filepath.lastIndexOf('/') + 1;
                        var lChop = filepath.length - 5;
                        var name = filepath.substring(fChop, lChop);
                        return name;
                    }
                },
                files: {
                    'src/scripts/templates.js': ['src/templates/{,*/}*.html']
                }
            }
        },
        replace: {
            jstfix: {
                src: ['src/scripts/templates.js'],
                overwrite: true, // overwrite matched source files
                replacements: [{
                    from: 'this["OPENGRID"]',
                    to: 'module.exports'
                }]
            }
        },
        browserify: {
            dist: {
                files: {
                    'build/scripts/scrollbar.js': ['src/scripts/*.js']
                }
                // ,
                // options: {
                //     transform: ['debowerify']
                // }
            }
        }
    });


    grunt.registerTask('templates', ['jst', 'replace:jstfix', 'browserify:dist']);

    grunt.registerTask('default', function() {
        return grunt.task.run([
            'build',
            'connect:livereload',
            'watch'
        ]);
    });


    grunt.registerTask('templates', ['jst', 'replace:jstfix']);

    grunt.registerTask('docs', ['docco']);
    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask('build', ['templates', 'browserify']);

};
