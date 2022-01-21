/*
 * License:  see License.txt
 * Code until Nostalgy 0.3.0/Nostalgy 1.1.15: Zlib
 * Code additions for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Contributors:  see Changes.txt
 */



var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


Services.scriptloader.loadSubScript("chrome://FolderPaneSwitcher/content/utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://FolderPaneSwitcher/content/FolderPaneSwitcher.js", window, "UTF-8");


async function onLoad(activatedWhileWindowOpen) {
//    console.log(Services.appinfo.version);
    WL.injectElements(`
 
    <toolbarbutton id="FolderPaneSwitcher-forward-arrow-button"
    insertbefore = "folderPaneOptionsButton"
    oncommand="FolderPaneSwitcher.goForwardView(event);"

    image="chrome://FolderPaneSwitcher/content/right-arrow.png"

    />
    <toolbarbutton id="FolderPaneSwitcher-back-arrow-button"
    insertbefore= "FolderPaneSwitcher-forward-arrow-button"
    image="chrome://FolderPaneSwitcher/content/left-arrow.png"
    oncommand="FolderPaneSwitcher.goBackView(event);"
    />
 
`, ["chrome://FolderPaneSwitcher/locale/switcher.dtd"]);

//    console.log("messenger-FPS");//, window.gFolderTree.isInited);
//    window.setTimeout(window.FolderPaneSwitcher.onLoad, 30000);
//    console.log("messenger-FPS inited", window.gFolderTreeView.isInited);

    while (!window.gFolderTreeView.isInited) {
//        console.log("waiting");
        await new Promise(resolve => window.setTimeout(resolve, 100));
    };
    window.FolderPaneSwitcher.onLoad();
//    console.log("window", window);
}

function onUnload(isAddOnShutDown) {
//    console.log("FPS unload");
    window.FolderPaneSwitcher.onUnload();  
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);          
}
