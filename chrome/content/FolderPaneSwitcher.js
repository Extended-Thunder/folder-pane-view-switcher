// -*- js-indent-level: 2 -*-
//var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");

// Rules:
// 
// Enter title bar:
//   Restart timer
// Exit title bar:
//   Cancel timer
// Drag over:
//   Record current folder for movecopycompleted listener.
// Timer expires:
//   Cache old folder view
//   Switch to all folders view
//   Initiate the recurring watch timer
// Drag finished:
//   Cancel timer
//   Switch to cached folder view, if any
// Watch timer:
//   Is there a cached view? Yes:
//     Is there no current drag session? Yes:
//       Pretend drag finished
//   Is there a cached view? No:
//     Cancel watch timer


//'use strict';



var FolderPaneSwitcher = {

  originalModeNames: [],
  originalModes: [],
  originalModeDisplayNames: [],
  selectedViews: [],
  menuEnabledViews: [],

  setViewInUI: function (viewname, enabled) {



    if (enabled) {
      if (!FolderPaneSwitcher.menuEnabledViews.includes(viewname)) FolderPaneSwitcher.menuEnabledViews.push(viewname);

    } else {
      FolderPaneSwitcher.menuEnabledViews = FolderPaneSwitcher.menuEnabledViews.filter(value => value != viewname);
    };
 

    let popupF = document.getElementById("folderPaneOptionsPopup");
    let item = popupF.querySelector(`[value=${viewname}]`);
    if (item != null) {
      item.hidden = !enabled;
    };



    popupF = document.getElementById("menu_FolderViewsPopup");
     item = popupF.querySelector(`[value=${viewname}]`);
    if (item != null) {
      item.hidden = !enabled;
      //    console.log("menu_FolderViewsPopup", popupF, items, viewname);
    };
    popupF = document.getElementById("appMenu-foldersView");
    item = popupF.querySelector(`[value=${viewname}]`);
    if (item != null) {
      item.setAttribute("hidden", !enabled);
      //     console.log("appMenu-foldersView", popupF, items, viewname);

    };

  },

  setViewForArrows: function (viewname, enabled) {
    if (enabled) {
      if (!FolderPaneSwitcher.selectedViews.includes(viewname)) FolderPaneSwitcher.selectedViews.push(viewname);

    } else {
      FolderPaneSwitcher.selectedViews = FolderPaneSwitcher.selectedViews.filter(value => value != viewname);
    };
    //if current view is no longer in selectedViews, then set selectedViews[0]
    if (!FolderPaneSwitcher.selectedViews.includes(gFolderTreeView.activeModes[gFolderTreeView.activeModes.length - 1]))
      FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.selectedViews[0]);


  },

  addRemoveButtonsObserver: {
    observe: function () {
      var should_be_hidden =
        !Services.prefs.getBoolPref("extensions.FolderPaneSwitcher.arrows");
      var is_hidden =
        !!document.getElementById(
          "FolderPaneSwitcher-back-arrow-button").hidden;
      if (should_be_hidden != is_hidden) {
        document.getElementById("FolderPaneSwitcher-back-arrow-button").
          hidden = should_be_hidden;
        document.getElementById("FolderPaneSwitcher-forward-arrow-button").
          hidden = should_be_hidden;
      }
    }
  },

  goBackView: function () {


    var currentView = gFolderTreeView.activeModes[gFolderTreeView.activeModes.length - 1];
    //   console.log("goback, currentview", currentView);
    let currInd = FolderPaneSwitcher.selectedViews.findIndex((name) => name == currentView);
    //    console.log("goback, currind, length", currInd, FolderPaneSwitcher.selectedViews.length);

    if (currInd > 0) currInd--
    //FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.selectedViews[currInd+1])
    else currInd = FolderPaneSwitcher.selectedViews.length - 1;
    //   console.log("next view, _actmodes, _modes", FolderPaneSwitcher.selectedViews[currInd], gFolderTreeView._activeModes, gFolderTreeView._modes);
    FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.selectedViews[currInd]);
    //gFolderTreeView.activeModes = "favorite";//gFolderTreeView._modes["favorite"];
    //  console.log("actmodes, actModes[0]", gFolderTreeView.activeModes, gFolderTreeView.activeModes[0]);
  },

  goForwardView: function (event) {


    var currentView = gFolderTreeView.activeModes[gFolderTreeView.activeModes.length - 1];
    //   console.log("goforw, currentview", currentView);
    let currInd = FolderPaneSwitcher.selectedViews.findIndex((name) => name == currentView);
    //   console.log("goforw, currind, length", currInd, FolderPaneSwitcher.selectedViews.length);

    if (currInd < FolderPaneSwitcher.selectedViews.length - 1) currInd++
    //FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.selectedViews[currInd+1])
    else currInd = 0;
    //   console.log("next view, _actmodes, _modes", FolderPaneSwitcher.selectedViews[currInd], gFolderTreeView._activeModes, gFolderTreeView._modes);
    FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.selectedViews[currInd]);
    //gFolderTreeView.activeModes = "favorite";//gFolderTreeView._modes["favorite"];
    //   console.log("actmodes, actModes[0]", gFolderTreeView.activeModes, gFolderTreeView.activeModes[0]);
  },

  views: null,

  viewsBeforeTimer: null,

  viewsObserver: {
    register: function (logger, views) {
      this.logger = logger;
      this.views = views;
      fpvsUtils.addObserver(fpvsUtils.viewsBranch, "", this);
      for (var name in views) {
        let view = views[name];
        if (!view['menu_enabled']) {
          this.observe(fpvsUtils.viewsBranch, "",
            view['number'] + '.menu_enabled');
        }
      }
    },

    observe: function (aSubject, aTopic, aData) {
      //     console.log("viewobserver", aSubject, aData);
      var match = /^(\d+)\.(.*_enabled)$/.exec(aData);
      if (!match) return;
      var viewNum = match[1];
      var which = match[2];
      var enabled = aSubject.getBoolPref(aData);
      var name = fpvsUtils.getStringPref(fpvsUtils.viewsBranch,
        viewNum + ".name");
      var view = this.views[name];
      view[which] = enabled;
      //     console.log("viewobserver", aSubject, aData, "name", name, viewNum, which, enabled);


      if (which == 'menu_enabled') {
        FolderPaneSwitcher.setViewInUI(name, enabled);
        return;
      } else {
      if (which == 'arrows_enabled') {
        FolderPaneSwitcher.setViewForArrows(name, enabled);
      };
    };
    }
  },

  onLoad: function () {
      //init popup in case it was never opened
    gFolderTreeView.initFolderPaneOptionsPopup();



    fpvsUtils.init();  //set pref branches

    if (!this.logger) {
      this.logger = console;

   
    }
    var me = FolderPaneSwitcher;
    me.originalModeNames = gFolderTreeView._modeNames;
    me.originalModes = gFolderTreeView._modes;
    me.originalModeDisplayNames = gFolderTreeView._modeDisplayNames;
    //    console.log("all possible mode names", gFolderTreeView._modeNames);

    //  me.selectedViews = me.originalModeNames; //start with all views

    var title = document.getElementById("folderPaneHeader");
    //   var title = document.getElementById("FolderPaneSwitcher-back-arrow-button");
    fpvsUtils.updateViews(gFolderTreeView); //save views as "dontworryaboutit", if none in prefs
    this.views = fpvsUtils.getViews(true);  //get real view name
    this.viewsObserver.register(this.logger, this.views);
    //    console.log("views in load", this.views);
    let actViews = gFolderTreeView.activeModes; //there might be views active that are not yet in the prefs
    for (let [key, value] of Object.entries(this.views)) {
      me.setViewInUI(key, value.menu_enabled);
      if (value.menu_enabled) actViews = actViews.filter(element => element != key); //removes key if present
      me.setViewForArrows(key, value.arrows_enabled);
      //both also take care to set selectedViews and menuEnabledViews
    };
    //remove any views still in activeModes but not in prefs
    actViews.forEach(key => gFolderTreeView.activeModes = key); //remove

    //    console.log("selviews", me.selectedViews);

    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);

    title.addEventListener("dragexit", me.onDragExit, false);
    title.addEventListener("drop", me.onDragDrop, false);
    title.addEventListener("dragenter", me.onDragEnter, false);
    title.collapsed = false;
    FolderPaneSwitcher.addRemoveButtonsObserver.observe();
    fpvsUtils.addObserver(prefBranch, "extensions.FolderPaneSwitcher.arrows",
      FolderPaneSwitcher.addRemoveButtonsObserver, false);

    var folderTree = document.getElementById("folderTree");
    folderTree.addEventListener("dragover", me.onDragOver, false);
    // Dragexit and dragdrop don't actually get sent when the user
    // drops a message into a folder. This is arguably a bug in
    // Thunderbird (see bz#674807). To work around it, I register a
    // folder listener to detect when a move or copy is
    // completed. This is gross, but appears to work well enough.
    //By 2022, the bug is wontfix
    var ns =
      Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
        .getService(Components.interfaces.nsIMsgFolderNotificationService);

    // Disable this because the watcher serves the same function now,
    // by automatically reverting to the cached view within a half
    // second at most of when the drop finishes, and leaving this
    // active cdauses the view to revert if some other message happens
    // to be deposited into a folder while the drag is in progress.
    // I'm keeping the code, inactive, in case I determine later that
    // it needs to be reactivated, e.g., if we can get rid of the
    // watcher because the drag&drop infrastructure has improved to
    // the point where the watcher is no longer needed.

    //    ns.addListener(me.folderListener, ns.msgsMoveCopyCompleted|
    //		   ns.folderMoveCopyCompleted);
  },

  onUnload: function () {
    fpvsUtils.uninit(); //remove observers, eventlisteners
  },

  folderListener: {
    msgsMoveCopyCompleted: function (aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
      FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
        // Still remotely possible that someone else could be copying
        // into the same folder at the same time as us, but this is
        // the best we can do until they fix the event bug.
        FolderPaneSwitcher.onDragDrop({ type: "msgsMoveCopyCompleted" });
      }
      else {
        FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted: non-matching folder");
      }
    },
    folderMoveCopyCompleted: function (aMove, aSrcFolder, aDestFolder) {
      FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
        // Still remotely possible that someone else could be copying
        // into the same folder at the same time as us, but this is
        // the best we can do until they fix the event bug.
        FolderPaneSwitcher.onDragDrop({ type: "folderMoveCopyCompleted" });
      }
      else {
        FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted: non-matching folder");
      }
    }
  },

  onDragEnter: function (aEvent) {
    FolderPaneSwitcher.logger.debug("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.logger.debug("onDragEnter: switch already in progress");
    }
    else {
      FolderPaneSwitcher.resetTimer();
    }
  },

  onDragExit: function (aEvent) {
    FolderPaneSwitcher.logger.debug("onDragExit(" + aEvent.type + ")");
    //   console.log("dragexit should never happen as the bug is wontfix");
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
      FolderPaneSwitcher.timer = null;
    }
  },

  onDragOver: function (aEvent) {
    FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
    FolderPaneSwitcher.currentFolder =
      gFolderTreeView.getFolderAtCoords(aEvent.clientX, aEvent.clientY);
  },

  onDragDrop: function (aEvent) {
    FolderPaneSwitcher.logger.debug("onDragDrop(" + aEvent.type + ")");
    //   console.log("onDragDrop(" + aEvent.type + ")");
    if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.cachedView);
      // for (viewname of FolderPaneSwitcher.cachedView)  {
      //   console.log("onDrDr, add ", viewname);
      //   gFolderTreeView.activeModes = viewname; 
      // }

      FolderPaneSwitcher.cachedView = null;
      FolderPaneSwitcher.currentFolder = null;
    }
  },

  setSingleMode: function (modeName) {
    let currModes = gFolderTreeView.activeModes.slice();
    //    console.log("setSingleMode: currModes", currModes, "set to", modeName);
    //    console.log("setSingleMode: actModes", gFolderTreeView.activeModes);

    if (!gFolderTreeView.activeModes.includes(modeName)) gFolderTreeView.activeModes = modeName;

    for (viewName of currModes) {
      //     console.log("remove", viewName);
      if (viewName != modeName) gFolderTreeView.activeModes = viewName; //toggles, removes if present, if all gone, set to kDefaultMode (="all")
    }
  },


  timer: null,
  timerCallback: {
    notify: function () {
      FolderPaneSwitcher.logger.debug("timerCallback.notify");
      //     console.log("defMode", gFolderTreeView._modeNames);
      FolderPaneSwitcher.cachedView = gFolderTreeView.activeModes[gFolderTreeView.activeModes.length - 1];// if singlemode  gFolderTreeView.activeModes.slice();
      FolderPaneSwitcher.viewsBeforeTimer = gFolderTreeView.activeModes.slice();
      //     console.log("viewsBeforeTimer", FolderPaneSwitcher.viewsBeforeTimer);
      FolderPaneSwitcher.setSingleMode("all");

      FolderPaneSwitcher.timer = null;

      var t = Components.classes["@mozilla.org/timer;1"]
        .createInstance(Components.interfaces.nsITimer);
      t.initWithCallback(FolderPaneSwitcher.watchTimerCallback, 250,
        Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
      FolderPaneSwitcher.watchTimer = t;
    },
  },

  resetTimer: function () {
    //   console.log("resettimer");
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
    }
    var delay = Services.prefs.getIntPref("extensions.FolderPaneSwitcher.delay");
    var t = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    t.initWithCallback(FolderPaneSwitcher.timerCallback, delay,
      Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    FolderPaneSwitcher.timer = t;
  },

  watchTimer: null,
  watchTimerCallback: {
    notify: function () {
      if (FolderPaneSwitcher.cachedView) {
        var dragService = Components
          .classes["@mozilla.org/widget/dragservice;1"]
          .getService(Components.interfaces.nsIDragService);
        var dragSession = dragService.getCurrentSession();
        if (!dragSession) {
          FolderPaneSwitcher.onDragDrop({ type: "watchTimer" });
        }
      }
      if (!FolderPaneSwitcher.cachedView) {
        // It's null either because we just called onDragDrop or
        // because something else finished the drop.
        FolderPaneSwitcher.watchTimer.cancel();
        FolderPaneSwitcher.watchTimer = null;
      }
    }
  }
};
