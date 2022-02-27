/*
 * License:  MPL2
 */



/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 */

var lastTab = 0, lastWindow = 0;

var defPrefs = {

  all: { arrow: false, menu: true, pos: -1 },
  smart: { arrow: true, menu: true, pos: -1 },
  recent: { arrow: true, menu: false, pos: -1 },
  unread: { arrow: true, menu: true, pos: -1 },
  favorite: { arrow: true, menu: true, pos: -1 }
};

var defChk = { arrows: true };
var defDelay = { delay: 1000 };



messenger.browserAction.onClicked.addListener(async (tab, info) => {

  const url = messenger.runtime.getURL("content/options.html");
  //await browser.tabs.create({ url });
  messenger.windows.create({ url, type: "popup" });//, height: 780, width: 990, });

});





messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
        browser.storage.local.set({ "prefs": defPrefs });
        browser.storage.local.set(defChk);
        browser.storage.local.set(defDelay);
        const url = messenger.runtime.getURL("popup/installed.html");

        await browser.tabs.create({ url });
        //         await messenger.windows.create({ url, type: "popup", height: 780, width: 990, });
      }
      break;
    case "update":
      {
        const url = messenger.runtime.getURL("popup/update.html");
        await browser.tabs.create({ url });
        //await messenger.windows.create({ url, type: "popup", height: 780, width: 990, });
      }
      break;

  }
});

const url = messenger.runtime.getURL("content/options.html");
//await browser.tabs.create({ url });
messenger.windows.create({ url, type: "popup" });//, height: 780, width: 990, });





async function manipulateWindow(window) {
  // Skip in case it is not the window we want to manipulate.
  // https://thunderbird-webextensions.readthedocs.io/en/latest/windows.html#windowtype
  // * normal
  // * popup
  // * panel
  // * app
  // * devtools
  // * addressBook
  // * messageCompose
  // * messageDisplay

  if (`${window.type}` !== "normal") {
    return;
  }

  let id = `${window.id}`;
  console.log("manipulateWindow");

  let inited = await messenger.Utilities.isTreeInited(id);
  while (!inited) {
    await new Promise(resolve => window.setTimeout(resolve, 100));
    inited = await messenger.Utilities.isTreeInited();
  };

  await messenger.Utilities.registerListener("all", "folderPaneHeader", id);

  /**/
  await messenger.LegacyMenu.add(id, {
    "id": "FolderPaneSwitcher-forward-arrow-button",
    "type": "toolbarButton",
    "reference": "folderPaneOptionsButton",
    "position": "before",
    "label": "",
    //  "accesskey" : "B",
    "image": "content/right-arrow.png",
    "tooltip": "Next View"
  });



  await messenger.LegacyMenu.add(id, {
    "id": "FolderPaneSwitcher-back-arrow-button",
    "type": "toolbarButton",
    "reference": "FolderPaneSwitcher-forward-arrow-button",
    "position": "before",
    "label": "",
    //  "accesskey" : "B",
    "image": "content/left-arrow.png",
    "tooltip": "Previous View"
  });


};


messenger.LegacyMenu.onCommand.addListener(async (windowsId, id) => {
  if (id == "FolderPaneSwitcher-forward-arrow-button") {
    console.log("forward clicked");
    FolderPaneSwitcher.goForwardView();
    //  messenger.NotifyTools.notifyExperiment({ windowsId, command: "addBookmark" });
    return;
  };

  if (id == "FolderPaneSwitcher-back-arrow-button") {
    console.log("back clicked");
    FolderPaneSwitcher.goBackView();
    //  messenger.NotifyTools.notifyExperiment({ windowsId, command: "help" });
    return;
  };


});

var FolderPaneSwitcher = {

  cachedView: null,

  selectedFolder: null,


  setSingleMode: async function (modeName) {
    let activeModes = await messenger.Utilities.getActiveViewModes();
    let currModes = activeModes.slice();
    if (!activeModes.includes(modeName)) await messenger.Utilities.toggleActiveViewMode(modeName);//  gFolderTreeView.activeModes = modeName;

    for (viewName of currModes) {
      if (viewName != modeName) await messenger.Utilities.toggleActiveViewMode(viewName);  //  gFolderTreeView.activeModes = viewName; //toggles, removes if present, if all gone, set to kDefaultMode (="all")
    }
  },

  goForwardView: async function (event) {

    let activeModes = await messenger.Utilities.getActiveViewModes();
    let selectedViews = (await messenger.storage.local.get("arrowViews")).arrowViews;
    console.log("selectedViews", selectedViews);

    var currentView = activeModes[activeModes.length - 1];
    let currInd = selectedViews.findIndex((name) => name == currentView);
    currInd = (currInd + 1) % selectedViews.length;
    FolderPaneSwitcher.setSingleMode(selectedViews[currInd]);
  },

  goBackView: async function () {

    let activeModes = await messenger.Utilities.getActiveViewModes();
    let selectedViews = (await messenger.storage.local.get("arrowViews")).arrowViews;
    console.log("selectedViews", selectedViews);

    var currentView = activeModes[activeModes.length - 1];
    let currInd = selectedViews.findIndex((name) => name == currentView);

    currInd = (currInd + selectedViews.length - 1) % selectedViews.length;
    FolderPaneSwitcher.setSingleMode(selectedViews[currInd]);
  },

  onDragEnter: function (aEvent) {
    console.log("not onDragEnter");

    //    FolderPaneSwitcher.logger.debug("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      //      FolderPaneSwitcher.logger.debug("onDragEnter: switch already in progress");
    }
    else {
      FolderPaneSwitcher.resetTimer();
    }
  },

  resetTimer: function () {
    /*
       if (FolderPaneSwitcher.timer) {
         FolderPaneSwitcher.timer.cancel();
       }
       var delay = Services.prefs.getIntPref("extensions.FolderPaneSwitcher.delay");
       var t = Components.classes["@mozilla.org/timer;1"]
         .createInstance(Components.interfaces.nsITimer);
       t.initWithCallback(FolderPaneSwitcher.timerCallback, delay,
         Components.interfaces.nsITimer.TYPE_ONE_SHOT);
       FolderPaneSwitcher.timer = t;
       */
  }

};

async function main() {



  const windows = await messenger.windows.getAll();
  for (let window of windows) {
    await manipulateWindow(window);
  }
  messenger.windows.onCreated.addListener((window) => {
    manipulateWindow(window);
  });



  messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
    console.log(info);
    switch (info.command) {
      case "onDragExit":
        console.log("bgr onDragExit");
        break;
      case "onDragDrop":
        console.log("bgr onDragDrop");
        break;

      case "onDragEnter":
        console.log("bgr onDragEnter");
        FolderPaneSwitcher.onDragEnter(null);

        break;
      case "onDragOver":
        console.log("bgr onDragOver");
        //         FolderPaneSwitcher.onDragOver(null);

        break;

    }
  });



  let modes = await messenger.Utilities.getActiveViewModes();
  console.log("bgrd modes", modes);

  modes = await messenger.Utilities.getAllViewModes();
  console.log("bgrd allmodes", modes);
  /**/
  for (vieww of modes) {
    let name1 = await messenger.Utilities.getViewDisplayName(vieww);
    console.log("name", name1);
  }
  ;
  let name1 = await messenger.Utilities.getViewDisplayName("all");
  console.log("name", name1);

  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/fp-prefs.js");


  messenger.WindowListener.registerChromeUrl([
    ["content", "FolderPaneSwitcher", "chrome/content/"],
    ["locale", "FolderPaneSwitcher", "en-US", "chrome/locale/en-US/"],
    ["locale", "FolderPaneSwitcher", "de", "chrome/locale/de/"]

  ]);


  // messenger.WindowListener.registerOptionsPage("chrome://FolderPaneSwitcher/content/options.xhtml");
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/fp-messenger.js");



  /*
   * Start listening for opened windows. Whenever a window is opened, the registered
   * JS file is loaded. To prevent namespace collisions, the files are loaded into
   * an object inside the global window. The name of that object can be specified via
   * the parameter of startListening(). This object also contains an extension member.
   */


  messenger.WindowListener.startListening();
}

main();
