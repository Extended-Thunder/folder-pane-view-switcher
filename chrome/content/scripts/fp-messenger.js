/*
 * License:  MPL2
 */



var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


Services.scriptloader.loadSubScript("chrome://FolderPaneSwitcher/content/utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://FolderPaneSwitcher/content/FolderPaneSwitcher.js", window, "UTF-8");


async function onLoad(activatedWhileWindowOpen) {
    WL.injectElements(`
 
    <toolbarbutton id="FolderPaneSwitcher-forward-arrow-button"
    insertbefore="folderPaneOptionsButton"
    oncommand="FolderPaneSwitcher.goForwardView(event);"
    image="chrome://FolderPaneSwitcher/content/right-arrow.png"
    />

    <toolbarbutton id="FolderPaneSwitcher-back-arrow-button"
    insertbefore="FolderPaneSwitcher-forward-arrow-button"
    image="chrome://FolderPaneSwitcher/content/left-arrow.png"
    oncommand="FolderPaneSwitcher.goBackView(event);"
    />
 
`, ["chrome://FolderPaneSwitcher/locale/switcher.dtd"]);


    while (!window.gFolderTreeView.isInited) {
        await new Promise(resolve => window.setTimeout(resolve, 100));
    };
    window.FolderPaneSwitcher.onLoad();
}

function onUnload(isAddOnShutDown) {
    window.FolderPaneSwitcher.onUnload();
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
}
