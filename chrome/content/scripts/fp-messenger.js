/*
 * License:  see License.txt
 * Code until Nostalgy 0.3.0/Nostalgy 1.1.15: Zlib
 * Code additions for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Contributors:  see Changes.txt
 */



var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


//var { manage_emails } = ChromeUtils.import("chrome://nostalgy/content/manage_emails.jsm");

//Services.scriptloader.loadSubScript("chrome://FolderPaneSwitcher/content/utils.js", window, "UTF-8");
//Services.scriptloader.loadSubScript("chrome://FolderPaneSwitcher/content/FolderPaneSwitcher.js", window, "UTF-8");
/*


 <script src="utils.js"/>
  <script src="FolderPaneSwitcher.js"/>
 
Services.scriptloader.loadSubScript("chrome://nostalgy/content/folders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://nostalgy/content/nostalgy_keys.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://nostalgy/content/sqlite.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://nostalgy/content/nfpredict.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://nostalgy/content/nostalgy.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://nostalgy/content/header_parser.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://nostalgy/content/edit_prefs.js", window, "UTF-8");
*/

function onLoad(activatedWhileWindowOpen) {
    console.log(Services.appinfo.version);
    /*
       let layout = WL.injectCSS("chrome://quickfolders/content/quickfolders-layout.css");
       layout.setAttribute("title", "QuickFolderStyles");
       
    */
/**/
    WL.injectElements(`
 
    <toolbarbutton id="FolderPaneSwitcher-forward-arrow-button"
    insertbefore = "folderPaneOptionsButton"
 
    image="chrome://FolderPaneSwitcher/content/right-arrow.png"

    />
    <toolbarbutton id="FolderPaneSwitcher-back-arrow-button"
    insertbefore= "FolderPaneSwitcher-forward-arrow-button"
                   image="chrome://FolderPaneSwitcher/content/left-arrow.png"
    />
 
`, ["chrome://FolderPaneSwitcher/locale/switcher.dtd"]);

    console.log("messenger-FPS");
    //window.onNostalgyLoad();
 //   window.FolderPaneSwitcher.onLoad();

    //manage_emails.WL = WL;
    /*   
    */
}

function onUnload(isAddOnShutDown) {
    console.log("FPS unload");
    //    window.onNostalgyUnload();
    Components.classes["@mozilla.org/xre/app-info;1"].
        getService(Components.interfaces.nsIXULRuntime).invalidateCachesOnRestart();
}
