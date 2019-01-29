get = function(obj, key) {
    return key.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, obj);
};

function searchObj (obj, query) {
    for (var key in obj) {
        var value = obj[key];
        if (typeof value === 'object') {
            return searchObj(value, query);
        }
        if (value === query) {
            return obj;
        }
    }
}

var app = new Vue({
    el: '#app',
    data: {
        showInput: true,
        showVideoInput: false,
        fei: false,
        message: 'Hello Vue!',
        title: 'FEI File Viewer',
        filterText: "",
        filereferences: {},
        video: {
            showframe: false,
            url: false,
            yturl: "",
            isYT: false
        },
        playback: {}
    },
    computed: {
        tableView: function() {
            let shots = this.shots;
            if ( this.filterText ) {
                return shots.filter(x => {
                    return JSON.stringify(x)
                        .toLowerCase()
                        .includes(this.filterText.toLowerCase());
                });
            }
            else {
                return shots;
            }
        },
        shots: function() {
            let shots = get(this.fei, 'fbody.shotstmt.shots') || [];
            shots = shots.map((shot, idx) => {
                shot.idx = idx;
                shot.start = this.tc2s(shot.timecodestart) / this.movielength;
                return shot;
            });
            let lastEnd = 0;
            for(let i = 1; i < shots.length; i++) {
                let prevShot = shots[i - 1],
                    shot = shots[i];
                
                lastEnd = this.tc2s(shot.timecodestart);
                prevShot.end = lastEnd / this.movielength;
                prevShot.length = prevShot.end - prevShot.start;
            }
            shots[shots.length - 1].end = lastEnd + 1;
            shots[shots.length - 1].length = shots[shots.length - 1].end - shots[shots.length - 1].start;
            for ( let shot of shots ) {
                shot.style = `left: ${shot.start*100}%; width: ${shot.length * 100}%; background-color: rgba(0, 0, 0, ${Math.random()*0.4+0.2})`;
            }
            return shots;
        },
        movielength: function() {
            let shots = get(this.fei, 'fbody.shotstmt.shots') || [];
            return this.tc2s(shots[shots.length - 1].timecodestart) + 1;
        },
        requiredFiles: function() {
            let shots = get(this.fei, 'fbody.shotstmt.shots') || [];
            let files = shots.map(shot => {
                return searchObj(shot, 'referenceframe');
            });
            return files;
            //searchObj
        }
    },
    methods: {
        tc2s: function(tc) {
            return tc.split(/\:/g)
                .map((t, i) => 60 ** (2 - i) * parseFloat(t))
                .reduce((a, b) => a + b, 0);
        },
        getAnnotationColumns: function(fei) {
            let types = [];
            fei.fbody.shotstmt.shots.forEach(shot => {
                if ( shot.annotations ) {
                    shot.annotations
                        .filter(x => x.type === 'text')
                        .forEach(el => {
                            types.push(el.about);
                    });
                    types = Array.from(new Set(types));
                }
            });
            return types;
        },
        getAnnotations: function (shot) {

        },
        importFEI: function(fei) {
            this.showInput = false;
            this.fei = fei;
            this.title = get(this.fei, "fhead.titlestmt.title") || "FEI File Viewer";
        },
        transformFEI: function() {
            const filelist = this.requiredFiles,
                  localfiles = this.filereferences;
            for ( let reference of filelist ) {
                for ( let lf in localfiles ) {
                    if ( reference.source.endsWith(lf) ) {
                        reference.sourceurl = localfiles[lf];
                    }
                }
            }
        },
        getFileReference: function(shot) {
            return searchObj(shot, 'referenceframe') ? searchObj(shot, 'referenceframe').sourceurl : false;
        },
        toggleVideoInput: function() {
            this.showVideoInput = !this.showVideoInput;
        },
        goto: function(shot) {
            let sec = this.tc2s(shot.timecodestart);
            const vid = document.querySelector('video');
            if ( vid ) {
                document.querySelector('video').currentTime = sec;
            }
            if ( player && "seekTo" in player ) {
                player.seekTo(sec, true);
            }
            this.makeactive(shot.idx);
        },
        makeactive: function(idx) {
            let shots = this.shots;
            for ( let shot of shots ) {
                shot.active = false;
            }
            if ( idx in shots ) {
                shots[idx].active = true;
            }
            const tr = document.getElementById('shot' + idx);
            if ( tr ) {
                tr.scrollIntoView({behavior: 'smooth'});
            }
            app.$forceUpdate();
        },
        changeyt: function() {
            //TODO: Match YT-URL
            const yturl = this.video.yturl;
            if( true && ytready ) {

                player = new YT.Player('player', {
                    height: '360',
                    width: '640',
                    videoId: yturl,
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange
                    }
                });
                
                this.video.isYT = true;
                
            }
        },
        getFirstShot: function(sec) {
            const shots = this.shots;
            for ( let shot of shots ) {
                if ( sec < (shot.start * this.movielength) ) {
                    return shot;
                }
            }
        },
        playbackloop: function() {
            try {
                if ( this.playback.playing ) {
                    let shot = this.getFirstShot(this.playback.currenttime);
                    this.makeactive(shot.idx);
                }
            } catch (error) {
                
            }
            setTimeout(this.playbackloop, 100);
        }
    }
});




function loadFEIFromFile(feifile) {
    const feiurl = URL.createObjectURL(feifile);
    fetch(feiurl).then(resp => resp.json()).then(fei => {
        URL.revokeObjectURL(feiurl);
        app.importFEI(fei);
        app.transformFEI();
        app.playbackloop();
    });
}

function loadVideoFromFile(videofile) {
    const videourl = URL.createObjectURL(videofile);    
    app.video.url = videourl;
    app.video.showframe = true;
    //app.transformFEI();
}

function loadImageFromFile(imagefile) {
    const imageurl = URL.createObjectURL(imagefile),
          name = imagefile.name;
    app.filereferences[name] = imageurl;
    app.transformFEI();
}


fileDropper.dropped((files, id) => {
    for ( file of files ) {
        if ( file.name.endsWith("json") ) {
            loadFEIFromFile(file);
        }
        else if ( file.name.endsWith("mp4") ) {
            loadVideoFromFile(file);
        }
        else if ( file.name.endsWith("jpg") ) {
            loadImageFromFile(file);
        }
    }
});





var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player, ytready = false;
function onYouTubeIframeAPIReady() {
    ytready = true;
}

function onPlayerReady(event) {
    event.target.playVideo();
}


var done = false;
function onPlayerStateChange(event) {
    // if (event.data == YT.PlayerState.PLAYING && !done) {
    // setTimeout(stopVideo, 6000);
    // done = true;
    // }
    done = true;
}
function stopVideo() {
    player.stopVideo();
}


function playbackloop() {
    try {
        if ( app.video.isYT ) {
            if ( ytready && player.getPlayerState() === YT.PlayerState.PLAYING ) {
                app.playback.playing = true;
                app.playback.currenttime = player.getCurrentTime();
                app.playback.currentp = app.playback.currenttime / app.movielength;
            }
            else {
                app.playback.playing = false;
            }
        }
        else {
            const vid = document.querySelector('video');
            if ( vid && !vid.paused ) {
                app.playback.playing = true;
                app.playback.currenttime = vid.currentTime;
                app.playback.currentp = app.playback.currenttime / app.movielength;
            }
            else {
                app.playback.playing = false;
            }
        }     
    } catch (error) {
        
    }
    setTimeout(playbackloop, 100);
}
playbackloop();