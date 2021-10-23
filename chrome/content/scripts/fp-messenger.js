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


function onLoad(activatedWhileWindowOpen) {
    console.log(Services.appinfo.version);
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

    console.log("messenger-FPS");
    window.FolderPaneSwitcher.onLoad();
}

function onUnload(isAddOnShutDown) {
    console.log("FPS unload");
    window.FolderPaneSwitcher.onUnload();  
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);          
}
