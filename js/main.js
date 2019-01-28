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
        filterText: "",
        filereferences: {},
        video: {
            showframe: false,
            url: false
        }
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
        },
        transformFEI: function() {
            const filelist = this.requiredFiles,
                  localfiles = this.filereferences;
            for ( reference of filelist ) {
                for ( lf in localfiles ) {
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
            document.querySelector('video').currentTime = sec;
        }
    }
});




/*
app.showInput = false;
fetch('dd/father_and_daughter.json').then(resp => resp.json()).then(f => {
    app.fei = f;
});
*/

function loadFEIFromFile(feifile) {
    const feiurl = URL.createObjectURL(feifile);
    fetch(feiurl).then(resp => resp.json()).then(fei => {
        URL.revokeObjectURL(feiurl);
        app.importFEI(fei);
        app.transformFEI();
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