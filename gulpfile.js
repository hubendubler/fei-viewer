/*jshint node: true, bitwise:true, curly:true, forin:true, noarg:true, noempty:true, nonew:true, undef:true, strict:true, browser:true, node:true, asi:false, es5: true, evil: true, nomen: true */
"use strict";
var gulp = require('gulp');  
var sass = require('gulp-sass');  
var browserSync = require('browser-sync');

gulp.task('sass', function () {  
    gulp.src('src/scss/styles.scss')
        .pipe(sass({includePaths: ['scss']}))
        .pipe(gulp.dest('src/css'));
    browserSync.reload();
});

gulp.task('browser-sync', function() {  
    browserSync.init(["src/css/*.css", "src/js/*.js"], {
        server: {
            baseDir: "./src"
        }
    });

    gulp.watch("**/*.html").on('change', browserSync.reload);
    //gulp.watch("**/*.js").on('change', browserSync.reload);
});

gulp.task('default', ['sass', 'browser-sync'], function () {  
    gulp.watch("src/scss/*.scss", ['sass']);
});