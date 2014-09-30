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
                files: ['{,*/}*.js'],
                tasks: ['jsbeautifier', 'jshint', 'docco'],
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
        }
    });

    grunt.registerTask('default', function() {
        return grunt.task.run([
            'connect:livereload',
            'watch'
        ]);
    });

    grunt.registerTask('docs', ['docco']);
    grunt.registerTask('test', ['mochaTest']);
};
