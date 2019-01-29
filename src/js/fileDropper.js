var fileDropper = {
    register: () => {
        Array.from(document.querySelectorAll('.droparea')).forEach(dropbox => {
            dropbox.addEventListener("dragenter", fileDropper.events.dragenter, false);
            dropbox.addEventListener("dragleave", fileDropper.events.dragleave, false);
            dropbox.addEventListener("dragend", fileDropper.events.dragleave, false);
            dropbox.addEventListener("dragover", fileDropper.events.dragover, false);
            dropbox.addEventListener("drop", fileDropper.events.drop, false);
        });
    },
    callback: (files) => {},
    dropped: (callback) => {
        fileDropper.callback = callback;
    },
    handleFiles: (target, files) => {
        let tid = target.id || target.getAttribute("for");
        if ( tid ) {
            fileDropper.callback(files, tid);
        }
    },
    events: {
        dragenter: (e) => {
            e.stopPropagation();
            e.preventDefault();
            document.querySelector('.droparea').classList.add('dragging');
        },
        dragleave: (e) => {
            e.stopPropagation();
            e.preventDefault();
            document.querySelector('.droparea').classList.remove('dragging');
        },
        dragend: (e) => {
            e.stopPropagation();
            e.preventDefault();
        },
        dragover: (e) => {
            e.stopPropagation();
            e.preventDefault();
        },
        drop: (e) => {
            e.stopPropagation();
            e.preventDefault();

            const dt = e.dataTransfer;
            const files = dt.files;

            fileDropper.handleFiles(e.target, files);
        },
    }
};

if ( "complete" === document.readyState || "loading" !== document.readyState ) {
    fileDropper.register();
}
else {
    document.addEventListener("DOMContentLoaded", () => {
        fileDropper.register();
    });
}