document.querySelector("#new-track-button:not(.disabled)").addEventListener("click", function(){
    newTrack.push({
        "color": newTrack.defaultColors[Math.floor(Math.random()*newTrack.defaultColors.length)]
    });
    newTrack.show();
});
document.querySelector("#undo-button:not(.disabled)").addEventListener("click", function(){
    master.undo();
});
document.querySelector("#redo-button:not(.disabled)").addEventListener("click", function(){
    master.redo();
});
document.querySelector("#export-button:not(.disabled)").addEventListener("click", function(){
    exportData.show();
});
document.querySelector("#save-button:not(.disabled)").addEventListener("click", function(){
    saveProject.show();
});
document.querySelectorAll(".help-button:not(.disabled)").forEach(function(el){
    el.addEventListener("click", function(){
        helpText.show();
    });
});
document.querySelector("#scale-button:not(.disabled)").addEventListener("click", function(){
    if(master.scale !== undefined && master.scale !== null)
    {
        editScale.push({
            "name": master.scale.name,
            "color": master.scale.color
        }).show();
    }
    else
    {
        newScale.show();
    }
});
document.querySelector("#edit-project-button:not(.disabled)").addEventListener("click", function(){
    editProject.push({
        "name": master.name,
        "framerate": master.timeline.fps,
        "axesColor": master.axes.color,
        "pointsForward": master.viewPoints.forward,
        "pointsBackward": master.viewPoints.backward
    }).show();
});

master.on("undo, created, change", function(){
    if(this.undoManager.hasUndo())
        document.getElementById("undo-button").classList.remove("disabled");
    else
        document.getElementById("undo-button").classList.add("disabled");
});
master.on("redo, created, change", function(){
    if(this.undoManager.hasRedo())
        document.getElementById("redo-button").classList.remove("disabled");
    else
        document.getElementById("redo-button").classList.add("disabled");
});

document.getElementById("track-list").querySelector("ul").querySelectorAll("li").forEach(function(element){
    element.addEventListener("click", function(){
        let uid = this.getAttribute("data-uid");
        master.switchTrack(uid);
    });
    element.addEventListener("dblclick", function(){
        let uid = this.getAttribute("data-uid");
        if(master.trackList[uid] !== undefined)
        {
            editTrack.push({
                "name": master.trackList[uid].name,
                "color": master.trackList[uid].color,
                "unit": master.trackList[uid].unit.toString(),
                "uid": uid
            }).show();
        }
    });
});


function hideLaunchModal()
{
    document.getElementById("modal-container").classList.remove("active");
    document.getElementById("modal-container").classList.remove("launch");
    document.getElementById("launch").classList.remove("active");
    
    keyboardJS.resume();
}
var dropArea = document.getElementById("file-drop-area");

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
    dropArea.addEventListener(eventName, function preventDefaults (e) {
        e.preventDefault()
        e.stopPropagation()
    }, false);
    document.body.addEventListener(eventName, function preventDefaults (e) {
        e.preventDefault()
        e.stopPropagation()
    }, false);
});



['dragenter', 'dragover'].forEach(function(eventName) {
    dropArea.addEventListener(eventName, function(e){
        dropArea.classList.add('highlight');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function(){
        dropArea.classList.remove('highlight');
    }, false);
});

dropArea.addEventListener('drop', function(e){
    showLoader();
    let dt = e.dataTransfer
    let files = dt.files

    handleFiles(files);
}, false);


if(localStorage.getItem("backup") !== undefined && localStorage.getItem("backup") !== null && localStorage.getItem("backup") !== "")
{
    if(document.getElementById("launch").classList.contains("active"))
    {
        var backupInfo = JSON.parse(localStorage.getItem("backup"));
        var date = backupInfo.date || (new Date().toString());
        date = new Date(date).toLocaleString();
        if(confirm("You have a project backup from " + date + ". Would you like to recover this?"))
        {
            
            if(backupInfo.video !== undefined && backupInfo.video !== null && backupInfo.video !== "")
            {
                showLoader();
                var file = dataURLtoBlob(backupInfo.video);

                let fileUrl = URL.createObjectURL(file);
                JSZipUtils.getBinaryContent(fileUrl, function(err, data) {
                    if(err) {
                        throw err; // or handle err
                    }
                
                    JSZip.loadAsync(data).then(function (data) {
                        data.file("video.mp4").async("blob").then(function(videoBlob){
                            loadVideo(videoBlob, function(){
                                if(backupInfo.data !== undefined && backupInfo.data !== null && backupInfo.data !== "")
                                {
                                    var file = dataURLtoBlob(backupInfo.data);

                                    let fileUrl = URL.createObjectURL(file);
                                    JSZipUtils.getBinaryContent(fileUrl, function(err, data) {
                                        if(err) {
                                            throw err; // or handle err
                                        }
                                    
                                        JSZip.loadAsync(data).then(function (data) {
                                            data.file("meta.json").async("text").then(function(projectJson){
                                                master.load(JSON.parse(projectJson));
                                                
                                                hideLoader();
                                                hideLaunchModal();
                                                master.saved = true;
                                                master.trigger("created");
                                            });
                                        });
                                    });
                                }
                            });
                        });
                    });
                });
            }
            else
            {
                if(confirm("Error opening project. Would you like to remove it from storage?"))
                {
                    localStorage.removeItem("backup");
                }
            }
        }
        else
        {
            if(confirm("Would you like to delete this from storage?"))
            {
                localStorage.removeItem("backup");
            }
        }
    }
}


document.body.addEventListener('drop', function(e){
    if(!document.getElementById("launch").classList.contains("active"))
    {
        let dt = e.dataTransfer
        let files = dt.files

        var fileArray = [...files];
        if(fileArray.length > 0)
        {
            var file = fileArray[0];
            if(file.type === "" && file.name.split(".").pop() == CUSTOM_EXTENSION)
            {
                if(confirm("This will replace the current project and open this file. Would you like to continue?"))
                {
                    showLoader();
                    stage.removeAllChildren();
                    master.destroy();

                    master = new Project("My Project", new Timeline(canvas.width, canvas.height, document.getElementById("my-video"), 0), new Handsontable(tableContainer), stage);
                    stage.addChild(background);
                    stage.addChild(posText);

                    let tracklist = document.getElementById("track-list").querySelector("ul");
                    while (tracklist.firstChild) {
                        tracklist.removeChild(tracklist.firstChild);
                    }

                    frameMarkers.master.markers = {};
                    frameMarkers.master.shape.graphics.clear();
                    frameMarkers.master.shape.graphics.beginFill("#0000ff");
                    
                    handleFile(file, function(){
                        master.saved = true;
                        hideLoader();
                    });
                }
            }
            else if(file.type == "video/mp4")
            {
                if(confirm("This will create a new project with this video. Would you like to continue?"))
                {
                    showLoader();
                    master.destroy();
                    stage.removeAllChildren();

                    master = new Project("My Project", new Timeline(canvas.width, canvas.height, document.getElementById("my-video"), 0), new Handsontable(tableContainer), stage);
                    stage.addChild(background);
                    stage.addChild(posText);

                    let tracklist = document.getElementById("track-list").querySelector("ul");
                    while (tracklist.firstChild) {
                        tracklist.removeChild(tracklist.firstChild);
                    }

                    frameMarkers.master.shape.graphics.clear();
                    frameMarkers.master.markers = {};

                    handleFile(file);
                }
            }
            else
            {
                alert("This filetype is not supported. It must be .mp4 or ." + CUSTOM_EXTENSION);
            }
        }
    }
}, false);

document.getElementById("file-input").addEventListener("change", function(e){
    handleFiles(this.files);
    showLoader();
});

function handleFile(file, callback=null)
{
    switch(file.type)
    {
        case "video/mp4":
            loadVideo(file, function(){
                if(callback !== null)
                    callback();
                master.timeline.detectFrameRate(function(framerate){
                    console.log(framerate);
                    hideLaunchModal();
                    newProject.push({
                        "framerate": framerate
                    });
                    newProject.show();
                    hideLoader();
                });
            });
            break;
        case "":
        case "application/x-zip":
            if(file.name.split(".").pop() == CUSTOM_EXTENSION)
            {
                loadProject(file, callback);
                hideLaunchModal();
            }
            else
            {
                alert("This filetype is not supported. It must be .mp4 or ." + CUSTOM_EXTENSION);
            }
            break;
        default:
            alert("This filetype is not supported. It must be .mp4 or ." + CUSTOM_EXTENSION);
    }
}
function handleFiles(files)
{
    var fileArray = [...files];
    if(fileArray.length > 0)
    {
        var file = fileArray[0];
        handleFile(file);
    }
}

window.addEventListener("beforeunload", function (e) {
    if(master.saved)
        return null;
    else
    {
        var confirmationMessage = "You have made unsaved changes. If you leave without saving these changes will be lost.";

        (e || window.event).returnValue = confirmationMessage; //Gecko + IE
        return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    }
});