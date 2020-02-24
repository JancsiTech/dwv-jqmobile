// namespaces
var dwvjq = dwvjq || {};

/**
 * Application launcher.
 */

// start app function
function startApp() {
    // translate page
    dwv.i18nPage();

    // show dwv version
    dwvjq.gui.appendVersionHtml(dwv.getVersion());

    // main application
    var myapp = new dwv.App();

    // setup the undo gui
    var undoGui = new dwvjq.gui.Undo(myapp);

    var nReceivedError = null;
    var nReceivedAbort = null;

    // display loading time
    var loadTimerListener = function (event) {
        if (event.type === "load-start") {
            console.time("load-data");
        } else if (event.type === "load-end") {
            console.timeEnd("load-data");
        }
    };
    var abortOnCrtlX = function (event) {
        if (event.ctrlKey && event.keyCode === 88 ) { // crtl-x
            console.log("Abort load received from user (crtl-x).");
            myapp.abortLoad();
        }
    };
    myapp.addEventListener("load-start", function (event) {
        loadTimerListener(event);
        // reset counts
        nReceivedError = 0;
        nReceivedAbort = 0;
        // reset progress bar
        dwvjq.gui.displayProgress(0);
        // allow to cancel via crtl-x
        window.addEventListener("keydown", abortOnCrtlX);
    });
    myapp.addEventListener("load-progress", function (event) {
        var percent = Math.ceil((event.loaded / event.total) * 100);
        dwvjq.gui.displayProgress(percent);
    });
    myapp.addEventListener("error", function (event) {
        console.error("load error", event);
        console.error(event.error);
        // count errors to not show too many messages
        ++nReceivedError;
    });
    myapp.addEventListener("abort", function (/*event*/) {
        ++nReceivedAbort;
    });
    myapp.addEventListener("load-end", function (event) {
        loadTimerListener(event);
        // check errors
        if (nReceivedError !== 0) {
            // basic alert window
            var message = "A load error has ";
            if (nReceivedError > 1) {
                message = "Load errors have ";
            }
            message += "occured. See log for details.";
            alert(message);
        }
        // check abort
        if (nReceivedAbort !== 0) {
            console.warn("Data load was aborted.");
        }
        // stop listening for crtl-x
        window.removeEventListener("keydown", abortOnCrtlX);
        // hide the progress bar
        dwvjq.gui.displayProgress(100);
    });

    myapp.addEventListener("undo-add", function (event) {
        undoGui.addCommandToUndoHtml(event.command);
    });
    myapp.addEventListener("undo", function (/*event*/) {
        undoGui.enableLastInUndoHtml(false);
    });
    myapp.addEventListener("redo", function (/*event*/) {
        undoGui.enableLastInUndoHtml(true);
    });
    myapp.addEventListener("keydown", function (event) {
        myapp.defaultOnKeydown(event);
    });

    // listen to window resize
    window.addEventListener('resize', myapp.onResize);

    // initialise the application
    var loaderList = [
        "File",
        "Url",
        "GoogleDrive",
        "Dropbox"
    ];

    var filterList = [
        "Threshold",
        "Sharpen",
        "Sobel"
    ];

    var shapeList = [
        "Arrow",
        "Ruler",
        "Protractor",
        "Rectangle",
        "Roi",
        "Ellipse",
        "FreeHand"
    ];

    var toolList = {
        "Scroll": {},
        "WindowLevel": {},
        "ZoomAndPan": {},
        "Draw": {
            options: shapeList,
            type: "factory",
            events: ["draw-create", "draw-change", "draw-move", "draw-delete"]
        },
        "Livewire":  {
            events: ["draw-create", "draw-change", "draw-move", "draw-delete"]
        },
        "Filter": {
            options: filterList,
            type: "instance",
            events: ["filter-run", "filter-undo"]
        },
        "Floodfill": {
            events: ["draw-create", "draw-change", "draw-move", "draw-delete"]
        }
    };

    // initialise the application
    var options = {
        "containerDivId": "dwv",
        "gui": ["help", "undo"],
        "loaders": loaderList,
        "tools": toolList
        //"defaultCharacterSet": "chinese"
    };
    if ( dwv.env.hasInputDirectory() ) {
        options.loaders.splice(1, 0, "Folder");
    }
    myapp.init(options);

    undoGui.setup();

    // show help
    var isMobile = true;
    dwvjq.gui.appendHelpHtml(
        myapp.getToolboxController().getToolList(),
        isMobile,
        myapp,
        "resources/help");

    // setup the dropbox loader
    var dropBoxLoader = new dwvjq.gui.DropboxLoader(myapp);
    dropBoxLoader.init();

    // setup the loadbox gui
    var loadboxGui = new dwvjq.gui.Loadbox(myapp);
    loadboxGui.setup(loaderList);

    // info layer
    var infoController = new dwvjq.gui.info.Controller(myapp, "dwv");
    infoController.init();

    // setup the tool gui
    var toolboxGui = new dwvjq.gui.ToolboxContainer(myapp, infoController);
    toolboxGui.setup(toolList);

    // setup the meta data gui
    var metaDataGui = new dwvjq.gui.MetaData(myapp);

    // setup the draw list gui
    var drawListGui = new dwvjq.gui.DrawList(myapp);
    drawListGui.init();

    // update overlay info on item load
    myapp.addEventListener('load-item', function (event) {
        if (event.loadtype === "image") {
            infoController.onLoadItem(event);
        }
    });

    // listen to 'load'
    myapp.addEventListener('load', function (/*event*/) {
        // hide drop box
        dropBoxLoader.hideDropboxElement();
        // initialise undo gui
        undoGui.setup();
        // initialise and display the toolbox
        toolboxGui.initialise();
        toolboxGui.display(true);
        // update meta data
        metaDataGui.update(myapp.getMetaData());
        // update info overlay
        infoController.onLoadEnd();
    });

    // possible load from location
    dwvjq.utils.loadFromUri(window.location.href, myapp);
}

// Image decoders (for web workers)
dwv.image.decoderScripts = {
    "jpeg2000": "node_modules/dwv/decoders/pdfjs/decode-jpeg2000.js",
    "jpeg-lossless": "node_modules/dwv/decoders/rii-mango/decode-jpegloss.js",
    "jpeg-baseline": "node_modules/dwv/decoders/pdfjs/decode-jpegbaseline.js",
    "rle": "node_modules/dwv/decoders/dwv/decode-rle.js"
};

// status flags
var domContentLoaded = false;
var i18nInitialised = false;
// launch when both DOM and i18n are ready
function launchApp() {
    if ( domContentLoaded && i18nInitialised ) {
        startApp();
    }
}
// i18n ready?
dwv.i18nOnInitialised( function () {
    // call next once the overlays are loaded
    var onLoaded = function (data) {
        dwvjq.gui.info.overlayMaps = data;
        i18nInitialised = true;
        launchApp();
    };
    // load overlay map info
    $.getJSON( dwv.i18nGetLocalePath("overlays.json"), onLoaded )
    .fail( function () {
        console.log("Using fallback overlays.");
        $.getJSON( dwv.i18nGetFallbackLocalePath("overlays.json"), onLoaded );
    });
});

// check environment support
dwv.env.check();
// initialise i18n
dwv.i18nInitialise("auto", "node_modules/dwv");

// DOM ready?
$(document).ready( function() {
    domContentLoaded = true;
    launchApp();
});