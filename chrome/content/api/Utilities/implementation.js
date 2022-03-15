/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


if (!ExtensionParent) var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

// might be better to get the parent window of the current window
// because we may be screwed otherwise.
var win = Services.wm.getMostRecentWindow("mail:3pane");


var FPVS = {
  extension: ExtensionParent.GlobalManager.getExtension("FolderPaneSwitcher@kamens.us"),
  log: function (...a) {
    //console.log(...a);
  },

};
var FPVSlisteners = {
  onDragExit: async function (event) { //now: mouseout
    FPVS.notifyTools.notifyBackground({ command: "onDragLeaveFolderPane" });
  },
  onDragDrop: async function (event) {
    if (event.target.id == "folderPaneHeader") {
      FPVS.log("leg dragdrop");
      FPVS.notifyTools.notifyBackground({ command: "onDragDrop" });
    };

  },
  onDragEnter: async function (event) {
    //  console.log("d.ent", event);
    if (event.originalTarget.id == "folderPaneHeader") {
      FPVS.log("leg dragennter");
      FPVS.notifyTools.notifyBackground({ command: "onDragEnter" });
    };
  }
  // ,
  // onDragOver: async function (event) {
  //   // FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
  //   if (event.target.id != "folderPaneHeader") {
  //     FPVS.log("dragover", event);
  //     let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
  //       getMostRecentWindow("mail:3pane");

  //     //   let mail3Pane = event.ownerGlobal.window;
  //     FPVS.log("dragover, ownerglobal", event.target.ownerGlobal);
  //     let currentFolder =
  //       mail3Pane.gFolderTreeView.getFolderAtCoords(event.clientX, event.clientY);
  //     FPVS.log("dragover folder", currentFolder);
  //   }
  // }


};

var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {


    const PrefTypes = {
      [Services.prefs.PREF_STRING]: "string",
      [Services.prefs.PREF_INT]: "number",
      [Services.prefs.PREF_BOOL]: "boolean",
      [Services.prefs.PREF_INVALID]: "invalid"
    };

    let currentFolder;

    async function onDragOver(event) {
      // FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
      // let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
      //   getMostRecentWindow("mail:3pane");

      // let  mail3Pane = event.ownerGlobal.window;
      FPVS.log("dragover, ownerglobal", event.target.ownerGlobal);
      let mail3Pane = event.target.ownerGlobal.window;
      currentFolder =
        mail3Pane.gFolderTreeView.getFolderAtCoords(event.clientX, event.clientY);
      FPVS.log("dragover, currentFolder, ownerglobal", currentFolder, event.target.ownerGlobal);

    };

    async function onDragLeave(event) {
      FPVS.log("leg foldtree dragdleave");
      FPVS.notifyTools.notifyBackground({ command: "onDragLeave" });
      if (event.target.id == "foldertree") {
        FPVS.log("leg onDragLeave");
      };

    };

    /* */
    var folderListener = {
      msgsMoveCopyCompleted: function (aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
        //    FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted");
        if (aDestFolder == currentFolder) {
          // Still remotely possible that someone else could be copying
          // into the same folder at the same time as us, but this is
          // the best we can do until they fix the event bug.
          //  FolderPaneSwitcher.onDragDrop({ type: "msgsMoveCopyCompleted" });
          FPVS.notifyTools.notifyBackground({ command: "folderListener", type: "msgsMoveCopyCompleted" });
        }
        else {
          //     FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted: non-matching folder");
        }
      },
      folderMoveCopyCompleted: function (aMove, aSrcFolder, aDestFolder) {
        //    FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted");
        if (aDestFolder == currentFolder) {
          // Still remotely possible that someone else could be copying
          // into the same folder at the same time as us, but this is
          // the best we can do until they fix the event bug.
          //         FolderPaneSwitcher.onDragDrop({ type: "folderMoveCopyCompleted" });
          FPVS.notifyTools.notifyBackground({ command: "folderListener", type: "folderMoveCopyCompleted" });
        }
        else {
          //       FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted: non-matching folder");
        }
      }
    };

    return {
      Utilities: {

        firstCall: 1,

        initFolderPaneOptionsPopup: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          mail3Pane.gFolderTreeView.initFolderPaneOptionsPopup();
        },


        isMailTab: async function (isMailTab) {
          //    console.log("isMailTab",isMailTab, win);
          let i = 0;
          if (Utilities.firstCall == 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            Utilities.firstCall = 0;
            //    console.log("after 5s");
          };

        },

        getLastHoveredFolder: async function () {
          return context.extension.folderManager.convert(currentFolder);
        },

        getActiveViewModes: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          // let windowObject = context.extension.windowManager.get(windowId);
          // let mail3Pane = windowObject.window;

          let modes = mail3Pane.gFolderTreeView.activeModes;
          FPVS.log("modes", modes);
          return modes;
        },


        getAllViewModes: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let allViews = mail3Pane.gFolderTreeView._modeNames;
          FPVS.log("allModes", allViews);
          return allViews;
        },

        inDragSession: async function () {
          let dragService = Components
            .classes["@mozilla.org/widget/dragservice;1"]
            .getService(Components.interfaces.nsIDragService);
          let dragSession = dragService.getCurrentSession();
          FPVS.log("leg dragsession", dragSession, !!dragSession);
          return !!dragSession;
        },

        getLegacyPrefs: async function () {
          FPVS.log("getLegacyPrefs");

          let fpvsPrefRoot = "extensions.FolderPaneSwitcher.";
          let viewsBranch = Services.prefs.getBranch(fpvsPrefRoot + "views.");
          let prefs = {};

          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let allViews = mail3Pane.gFolderTreeView._modeNames;
          FPVS.log("allviews", allViews);


          try {
            prefs.delay = { "delay": Services.prefs.getIntPref(fpvsPrefRoot + "delay") };
            conFPVSsole.log("del", prefs.delay);
          }
          catch (e) { };
          try { prefs.arrows = { "arrows": Services.prefs.getBoolPref(fpvsPrefRoot + "arrows") }; }
          catch (e) { };

          prefs.prefs = {};

          let children = viewsBranch.getChildList("");//, obj);
          FPVS.log("children", children);
          let regex = /^(\d+)\./;
          for (let child of children) {
            let match = regex.exec(child);
            let num = match[1];
            let name = viewsBranch.getStringPref(num + ".name");
            let arrow = viewsBranch.getBoolPref(num + ".arrows_enabled");
            let menu = viewsBranch.getBoolPref(num + ".menu_enabled");

            //       if (["all", "smart", "recent", "favorite", "unread"].includes (name) )  prefs.prefs[name] = {"arrow": arrow, "menu": menu, "pos": -1};
            if (allViews.includes(name)) prefs.prefs[name] = { "arrow": arrow, "menu": menu, "pos": -1 };

          };

          FPVS.log("prefs", prefs);

          return prefs;
          /*        */
          //       return "prefs";        
        },


        isTreeInited: async function (id) {
          FPVS.log("isTreeInited");
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          FPVS.log("isTreeInited");
          try {
            let inited = mail3Pane.gFolderTreeView.isInited;
            FPVS.log("inited", inited);
            return inited;
          }
          catch (e) {
            return false;
          };

        },


        getViewDisplayName: async function (commonName) {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          // let windowObject = context.extension.windowManager.get(windowId);
          // let mail3Pane = windowObject.window;
          let key = "folderPaneModeHeader_" + commonName;
          let nameString = mail3Pane.gFolderTreeView.messengerBundle.getString(key);
          FPVS.log("legname", nameString);
          return nameString;
        },

        registerListener: async function (eventType, DOMid, windowId) {
          //      let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
          //      getMostRecentWindow("mail:3pane");
          let windowObject = context.extension.windowManager.get(windowId);
          let mail3Pane = windowObject.window;
          FPVS.log("registerListener", mail3Pane);
          let item = mail3Pane.document.getElementById(DOMid);
          //        item.addEventListener("dragleave", FPVSlisteners.onDragExit, true);  //gives problem if dragleave inside folderPaneHeader (e.g. between buttons and label)
          item.addEventListener("mouseout", FPVSlisteners.onDragExit, false);  //dragleave
          item.addEventListener("dragend", FPVSlisteners.onDragDrop, false);
          item.addEventListener("dragenter", FPVSlisteners.onDragEnter, false);

          //left for testing when the new foldertree is enabled
          // item.addEventListener("drop", () => { console.log("foldpa drop"); }, false);  //not fired
          // item.addEventListener("dragend", () => { console.log("foldpa dragend"); }, false);  //not fired
          // item.addEventListener("dragexit", () => { console.log("foldpa dragexit"); }, false);  //not fired
          // item.addEventListener("dragover", () => { console.log("foldpa dragover"); }, false);  //not fired
          // item.addEventListener("dragenter", () => { console.log("foldpa dragenter"); }, false);  //not fired
          // item.addEventListener("dragleave", () => { console.log("foldpa dragleave"); }, false);  //not fired
          // item.addEventListener("mouseup", () => { console.log("foldpa mouseup"); }, false);  //not fired
          // item.addEventListener("pointerup", () => { console.log("foldpa pointerup"); }, false);  //not fired
          // item.addEventListener("mouseout", () => { console.log("foldpa mouseout"); }, false);  //not fired
          //   item.addEventListener("dragover", FPVSlisteners.onDragOver, false);
          //folderTree.addEventListener("drop", () => { console.log("fold drop"); }, false);  //not fired
          //folderTree.addEventListener("dragend", () => { console.log("fold dragend"); }, false);  //not fired
          let folderTree = mail3Pane.document.getElementById("folderTree");
          FPVS.log("foldertree", folderTree);
          //folderTree.addEventListener("drop", FPVSlisteners.onDragDrop, false); //event currentl broken/not coming/bubbling   
          folderTree.addEventListener("dragover", onDragOver, false);
          folderTree.addEventListener("dragleave", onDragLeave, false);


          // Dragexit and dragdrop don't actually get sent when the user
          // drops a message into a folder. This is arguably a bug in
          // Thunderbird (see bz#674807). To work around it, I register a
          // folder listener to detect when a move or copy is
          // completed. This is gross, but appears to work well enough.
          //By 2022, the bug is wontfix
          var ns =
            Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
              .getService(Components.interfaces.nsIMsgFolderNotificationService);
          ns.addListener(folderListener, ns.msgsMoveCopyCompleted |
            ns.folderMoveCopyCompleted);
        },

        unregisterListener: async function (eventType, DOMid, windowId) {
          let windowObject = context.extension.windowManager.get(windowId);
          let mail3Pane = windowObject.window;
          FPVS.log("unregisterListener", mail3Pane);
          let item = mail3Pane.document.getElementById(DOMid);
          item.removeEventListener("mouseout", FPVSlisteners.onDragExit);
          item.removeEventListener("dragend", FPVSlisteners.onDragDrop);
          item.removeEventListener("dragenter", FPVSlisteners.onDragEnter);
          //item.removeEventListener("dragover", FPVSlisteners.onDragOver);
          let folderTree = mail3Pane.document.getElementById("folderTree");
          FPVS.log("foldertree", folderTree);
          //folderTree.addEventListener("drop", FPVSlisteners.onDragDrop, false); //event currentl broken/not coming/bubbling   
          folderTree.removeEventListener("dragover", onDragOver);
          folderTree.removeEventListener("dragleave", onDragLeave);


          // Dragexit and dragdrop don't actually get sent when the user
          // drops a message into a folder. This is arguably a bug in
          // Thunderbird (see bz#674807). To work around it, I register a
          // folder listener to detect when a move or copy is
          // completed. This is gross, but appears to work well enough.
          //By 2022, the bug is wontfix

          var ns =
            Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
              .getService(Components.interfaces.nsIMsgFolderNotificationService);
          ns.removeListener(folderListener);

        },



        showViewInMenus: async function (view, enabled) {

          FPVS.log("showViewInMenus");
          let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
          FPVS.log("3pane", mail3PaneWindow);
          FPVS.log("3paneDoc", mail3PaneWindow.document);

          let item = mail3PaneWindow.document.querySelector(`#folderPaneOptionsPopup [value=${view}]`);
          if (item != null) {
            item.hidden = !enabled;
          };
          item = mail3PaneWindow.document.querySelector(`#menu_FolderViewsPopup [value=${view}]`);
          if (item != null) {
            item.hidden = !enabled;
          };
          item = mail3PaneWindow.document.querySelector(`#appMenu-foldersView [value=${view}]`);
          if (item != null) {
            item.setAttribute("hidden", !enabled);
          };


        },

        toggleElementHidden: async function (should_be_hidden) {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let is_hidden =
            !!mail3Pane.document.getElementById(
              "FolderPaneSwitcher-back-arrow-button").hidden;
          if (should_be_hidden != is_hidden) {
            mail3Pane.document.getElementById("FolderPaneSwitcher-back-arrow-button").
              hidden = should_be_hidden;
            mail3Pane.document.getElementById("FolderPaneSwitcher-forward-arrow-button").
              hidden = should_be_hidden;
          }

        },



        toggleActiveViewMode: async function (view) {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          mail3Pane.gFolderTreeView.activeModes = view;
          return;
        },



        setAllActiveViews: async function (views) {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          FPVS.log("views", views, views.split(','));
          mail3Pane.gFolderTreeView._activeModes = views.split(',');
          return;
        }


      }
    }
  };
};


Services.scriptloader.loadSubScript(FPVS.extension.rootURI.resolve("chrome/content/scripts/notifyTools.js"), FPVS, "UTF-8");





