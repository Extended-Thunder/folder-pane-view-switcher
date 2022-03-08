/*
 * License:  MPL2
 */



/*
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
var defDelay = { delay: 300 };


/*
messenger.browserAction.onClicked.addListener(async (tab, info) => {

  const url = messenger.runtime.getURL("content/options.html");
  //await browser.tabs.create({ url });
  messenger.windows.create({ url, type: "popup" });//, height: 780, width: 990, });

});


*/


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
        //   main();
      }
      break;
    case "update":
      {
        const url = messenger.runtime.getURL("popup/update.html");
        await browser.tabs.create({ url });
        //  await messenger.NotifyTools.removeAllListeners();
        //  main();
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
  await messenger.Utilities.initFolderPaneOptionsPopup();

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



messenger.windows.onRemoved.addListener( async (windowId) => {  await messenger.Utilities.unregisterListener("all", "folderPaneHeader", windowId);})

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

  selectedFolder: null,  //not in use??

  timer: null,

  watchTimer: null,

  logger: console,


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
    FolderPaneSwitcher.cachedView = null;
  },

  onDragEnter: function () {
    console.log("not onDragEnter");

    //    FolderPaneSwitcher.logger.debug("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      //      FolderPaneSwitcher.logger.debug("onDragEnter: switch already in progress");
    }
    else {
      console.log("onDragEnter resettimer");
      FolderPaneSwitcher.resetTimer();
    }
  },

  onDragExit: function (aEvent) {
    // FolderPaneSwitcher.logger.debug("onDragExit(" + aEvent.type + ")");
       console.log("dragexit should never happen as the bug is wontfix");
    if (FolderPaneSwitcher.timer) {
      window.clearTimeout(FolderPaneSwitcher.timer);
      FolderPaneSwitcher.timer = 0;
      console.log("kill timer");
    };
    if (FolderPaneSwitcher.watchTimer) {
      window.clearTimeout(FolderPaneSwitcher.watchTimer);
      FolderPaneSwitcher.watchTimer = 0;
      console.log("kill watchTimer");
    };

  },

  onDragDrop: function (aEvent) {
    FolderPaneSwitcher.logger.debug("onDragDrop(" + aEvent.type + ")");
    if (FolderPaneSwitcher.timer) { //so we don't double call setSingleMode
      window.clearTimeout(FolderPaneSwitcher.timer);
      FolderPaneSwitcher.timer = 0;
      console.log("kill timer");
    };
    if (FolderPaneSwitcher.watchTimer) {
      window.clearTimeout(FolderPaneSwitcher.watchTimer);
      FolderPaneSwitcher.watchTimer = 0;
      console.log("kill watchTimer");
    };

  if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.cachedView);
      FolderPaneSwitcher.cachedView = null;
      FolderPaneSwitcher.currentFolder = null;
    }
  },


  timerCallback: {
    notify: async function () {
      FolderPaneSwitcher.logger.debug("timerCallback.notify");
      //debugger;
      let activeViews = await messenger.Utilities.getActiveViewModes();
      FolderPaneSwitcher.cachedView = activeViews[activeViews.length - 1];// if singlemode  gFolderTreeView.activeModes.slice();
      // FolderPaneSwitcher.viewsBeforeTimer = gFolderTreeView.activeModes.slice();
      FolderPaneSwitcher.logger.debug("cachedmode", FolderPaneSwitcher.cachedView);
      FolderPaneSwitcher.setSingleMode("all");

 //     FolderPaneSwitcher.timer = 0;
      FolderPaneSwitcher.watchTimer = window.setTimeout(FolderPaneSwitcher.watchTimerCallback.notify, 1500, FolderPaneSwitcher);
      /*
            var t = Components.classes["@mozilla.org/timer;1"]
              .createInstance(Components.interfaces.nsITimer);
            t.initWithCallback(FolderPaneSwitcher.watchTimerCallback, 250,
              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            FolderPaneSwitcher.watchTimer = t;
            */
    },
  },


  watchTimerCallback: {
    notify: async function () {
      FolderPaneSwitcher.logger.debug("watchTimerCallback.notify");
      if (FolderPaneSwitcher.cachedView) {
        //    FolderPaneSwitcher.cachedView = null;
        let inDragSession = await messenger.Utilities.inDragSession();
        console.log("watchtimer indragsession", inDragSession);
        if (!inDragSession) {
          await FolderPaneSwitcher.onDragDrop({ type: "watchTimer" });
        };
        /*
         var dragService = Components
           .classes["@mozilla.org/widget/dragservice;1"]
           .getService(Components.interfaces.nsIDragService);
         var dragSession = dragService.getCurrentSession();
         if (!dragSession) {
           FolderPaneSwitcher.onDragDrop({ type: "watchTimer" });
         }
         */
      };
      if (!FolderPaneSwitcher.cachedView) {  //there is intentionally no else because of the side effects of the await above
        // It's null either because we just called onDragDrop or
        // because something else finished the drop.
        //       FolderPaneSwitcher.watchTimer.cancel();
        //window.clearTimeout(FolderPaneSwitcher.watchTimer);

        FolderPaneSwitcher.watchTimer = 0;
      }
    }
  },

  resetTimer: async function () {

    //debugger;
    if (FolderPaneSwitcher.timer) {
      window.clearTimeout(FolderPaneSwitcher.timer);
      FolderPaneSwitcher.timer = 0;
      //       FolderPaneSwitcher.timer.cancel();
    };
    FolderPaneSwitcher.logger.debug("resettimer");
       let delay = await messenger.storage.local.get("delay");
    FolderPaneSwitcher.timer = window.setTimeout(FolderPaneSwitcher.timerCallback.notify, delay.delay, FolderPaneSwitcher);
    console.log("delay", delay, FolderPaneSwitcher.timer);
    /*
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

  /*
  messenger.messages.onMoved.addListener( async (originalMessages, movedMessages) =>
  {
    let lastHoveredFolder = await messenger.Utilities.getLastHoveredFolder();
    let newFolder = movedMessages.messages[0].folder;
    console.log("folder, ", lastHoveredFolder);
    console.log("eqhul", lastHoveredFolder.toString() == newFolder.toString() , movedMessages);
    FolderPaneSwitcher.onDragDrop({ type: "msgsMoveCopyCompleted" });
   
  });
   
  */
  messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
    //   console.log(info);
    switch (info.command) {
      case "onDragExit":
        //     console.log("bgr onDragExit");
        FolderPaneSwitcher.onDragDrop({ type: "dragexit" });
        break;
      case "onDragDrop":
        console.log("bgr onDragDrop");
        FolderPaneSwitcher.onDragDrop({ type: "dragdrop" });
        break;

      case "onDragEnter":
        console.log("bgr onDragEnter");
        FolderPaneSwitcher.onDragEnter();

        break;
      case "onDragOver":
        console.log("bgr onDragOver");//, info.folder);
        //         FolderPaneSwitcher.onDragOver(null);

        break;

      case "folderListener": //this replaces an event indicating that the messge/folder drop is finished
        console.log("bgr folderListener", info.type);//, info.folder);
        FolderPaneSwitcher.onDragDrop({ type: info.type });

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

  //messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/fp-prefs.js");

  /*
    messenger.WindowListener.registerChromeUrl([
      ["content", "FolderPaneSwitcher", "chrome/content/"],
      ["locale", "FolderPaneSwitcher", "en-US", "chrome/locale/en-US/"],
      ["locale", "FolderPaneSwitcher", "de", "chrome/locale/de/"]
  
    ]);
  
  */
  // messenger.WindowListener.registerOptionsPage("chrome://FolderPaneSwitcher/content/options.xhtml");
  //messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/fp-messenger.js");



  /*
   * Start listening for opened windows. Whenever a window is opened, the registered
   * JS file is loaded. To prevent namespace collisions, the files are loaded into
   * an object inside the global window. The name of that object can be specified via
   * the parameter of startListening(). This object also contains an extension member.
   */


  //messenger.WindowListener.startListening();
}

main();
