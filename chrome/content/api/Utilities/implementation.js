/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
//das geht nicht:
//var { QF } = ChromeUtils.import("chrome://quickfolders/content/quickfolders.js");  
//var { utils } = ChromeUtils.import("chrome://quickfolders/content/quickfolders-util.js");
//var { addonPrefs } = ChromeUtils.import("chrome://quickfolders/content/quickfolders-preferences.js");
//Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");

if (!ExtensionParent) var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
//if (!manage_emailsExtension) var manage_emailsExtension = ExtensionParent.GlobalManager.getExtension("nostalgy@opto.one");
//var { manage_emails } = ChromeUtils.import(manage_emailsExtension.rootURI.resolve("chrome://nostalgy/content/manage_emails.jsm"));




// might be better to get the parent window of the current window
// because we may be screwed otherwise.
var win = Services.wm.getMostRecentWindow("mail:3pane");


var FPVS = {
  extension: ExtensionParent.GlobalManager.getExtension("FolderPaneSwitcher@kamens.us")

};
var FPVSlisteners = {
  onDragExit: async function (event) {
    if (event.target.id == "folderPaneHeader") {
      console.log("leg onDragExit");

      FPVS.notifyTools.notifyBackground({ command: "onDragExit" });
    };
  },
  onDragDrop: async function (event) {
    if (event.target.id == "folderPaneHeader") {
      console.log("leg dragdropr");
      FPVS.notifyTools.notifyBackground({ command: "onDragDrop" });
    };

  },
  onDragEnter: async function (event) {
    //  console.log("d.ent", event);
    if (event.target.id == "folderPaneHeader") {
      console.log("leg dragennter");
      FPVS.notifyTools.notifyBackground({ command: "onDragEnter" });
    };
  },
  onDragOver: async function (event) {
    // FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
    if (event.target.id != "folderPaneHeader") {
      console.log("dragover", event);
      /* */
      let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
        getMostRecentWindow("mail:3pane");

      //   let mail3Pane = event.ownerGlobal.window;

      let currentFolder =
        mail3Pane.gFolderTreeView.getFolderAtCoords(event.clientX, event.clientY);
      console.log("dragover folder", currentFolder);
    }

    //FPVS.notifyTools.notifyBackground({ command: "onDragOver", folder: FPVS.extension.folderManager.convert(currentFolder) });

  }


};
//console.log("impl utilities");
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {


    console.log("context", context);
    const PrefTypes = {
      [Services.prefs.PREF_STRING]: "string",
      [Services.prefs.PREF_INT]: "number",
      [Services.prefs.PREF_BOOL]: "boolean",
      [Services.prefs.PREF_INVALID]: "invalid"
    };

    let currentFolder;

    async function onDragOver(event) {
      //    console.log("dragover2", event);
      //    console.log("contextevli", context);
      // FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
      /**/
      let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
        getMostRecentWindow("mail:3pane");

      // let  mail3Pane = event.ownerGlobal.window;
      // let 
      currentFolder =
        mail3Pane.gFolderTreeView.getFolderAtCoords(event.clientX, event.clientY);

      // FPVS.notifyTools.notifyBackground({ command: "onDragOver", folder: context.extension.folderManager.convert(currentFolder) });
      //   console.log("dragover2",currentFolder, context.extension.folderManager.convert(currentFolder), FPVS);
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



        //    currentFolder:null,
        /*
                onDragOver: async function (event) {
                  console.log("dragover", event);
                  // FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
         
                  let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
                    getMostRecentWindow("mail:3pane");
        
                  let  mail3Pane = event.ownerGlobal.window;
                  let currentFolder =
                    mail3Pane.gFolderTreeView.getFolderAtCoords(event.clientX, event.clientY);
               
               //   FPVS.notifyTools.notifyBackground({ command: "onDragOver"});//, folder: context.extension.folderManager.convert(currentFolder) });
                  console.log("dragover",currentFolder);//, context.extension.folderManager.convert(Utilities.currentFolder), FPVS);
              },
        */

        initFolderPaneOptionsPopup: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          mail3Pane.gFolderTreeView.initFolderPaneOptionsPopup();
        },


        isMailTab: async function (isMailTab) {
          //    console.log("isMailTab",isMailTab, win);
          let i = 0;
          // /*
          //           while (! win.manage_emails)  {
          //             i++; console.log("i",i);
          //               let w = await new Promise(resolve => win.setTimeout(resolve, 300));
          //           };
          // */
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
          // let modes = mail3Pane.gFolderTreeView._modeDisplayNames;
          let modes = mail3Pane.gFolderTreeView.activeModes;
          console.log("modes", modes);
          return modes;
        },


        getAllViewModes: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let allViews = mail3Pane.gFolderTreeView._modeNames;
          console.log("allModes", allViews);
          return allViews;//{modeDisplayNames: modeDisplayNames, allViews: allViews};
        },

        inDragSession: async function () {
          let dragService = Components
            .classes["@mozilla.org/widget/dragservice;1"]
            .getService(Components.interfaces.nsIDragService);
          let dragSession = dragService.getCurrentSession();
          console.log("dragsession", dragSession, !!dragSession);
          return !!dragSession;//{modeDisplayNames: modeDisplayNames, allViews: allViews};
        },

        isTreeInited: async function (id) {
          console.log("isTreeInited");
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          console.log("isTreeInited");
          try {
            let inited = mail3Pane.gFolderTreeView.isInited;
            console.log("inited", inited);
            return inited;//{modeDisplayNames: modeDisplayNames, allViews: allViews};
          }
          catch (e) {
            return false;
          };

        },


        getViewDisplayName: async function (commonName) {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let key = "folderPaneModeHeader_" + commonName;
          let nameString = mail3Pane.gFolderTreeView.messengerBundle.getString(key);
          console.log("legname", nameString);
          return nameString;
        },

        registerListener: async function (eventType, DOMid, windowId) {
          //      let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
          //      getMostRecentWindow("mail:3pane");
          let windowObject = context.extension.windowManager.get(windowId);
          let mail3Pane = windowObject.window;
          console.log("registerListener", mail3Pane);
          let item = mail3Pane.document.getElementById(DOMid);
      //    item.addEventListener("dragexit", FPVSlisteners.onDragExit, false);
      //    item.addEventListener("drop", FPVSlisteners.onDragDrop, false);
          item.addEventListener("dragenter", FPVSlisteners.onDragEnter, false);
       //   item.addEventListener("dragover", FPVSlisteners.onDragOver, false);
          let folderTree = mail3Pane.document.getElementById("folderTree");
          console.log("foldertree", folderTree);
          //folderTree.addEventListener("drop", FPVSlisteners.onDragDrop, false); //event currentl broken/not coming/bubbling   Utilities
    //      folderTree.addEventListener("dragover", onDragOver, false);


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



          //   if (item) 

        },

        unregisterListener: async function (eventType, DOMid, windowId) {
          //      let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
          //      getMostRecentWindow("mail:3pane");
          let windowObject = context.extension.windowManager.get(windowId);
          let mail3Pane = windowObject.window;
          console.log("unregisterListener", mail3Pane);
          let item = mail3Pane.document.getElementById(DOMid);
          item.removeEventListener("dragexit", FPVSlisteners.onDragExit);
          item.removeEventListener("drop", FPVSlisteners.onDragDrop);
          item.removeEventListener("dragenter", FPVSlisteners.onDragEnter);
          item.removeEventListener("dragover", FPVSlisteners.onDragOver);
          let folderTree = mail3Pane.document.getElementById("folderTree");
          console.log("foldertree", folderTree);
          //folderTree.addEventListener("drop", FPVSlisteners.onDragDrop, false); //event currentl broken/not coming/bubbling   Utilities
          folderTree.removeEventListener("dragover", onDragOver);


          // Dragexit and dragdrop don't actually get sent when the user
          // drops a message into a folder. This is arguably a bug in
          // Thunderbird (see bz#674807). To work around it, I register a
          // folder listener to detect when a move or copy is
          // completed. This is gross, but appears to work well enough.
          //By 2022, the bug is wontfix
 /*
          var ns =
            Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
              .getService(Components.interfaces.nsIMsgFolderNotificationService);
          ns.addListener(folderListener, ns.msgsMoveCopyCompleted |
            ns.folderMoveCopyCompleted);
*/


          //   if (item) 

        },



        showViewInMenus: async function (view, enabled) {
          /*  */
          console.log("showViewInMenus");
          let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
          console.log("3pane", mail3PaneWindow);
          console.log("3paneDoc", mail3PaneWindow.document);

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
          console.log("views", views, views.split(','));
          mail3Pane.gFolderTreeView._activeModes = views.split(',');
          return;
        }


      }
    }
  };
};


Services.scriptloader.loadSubScript(FPVS.extension.rootURI.resolve("chrome/content/scripts/notifyTools.js"), FPVS, "UTF-8");





