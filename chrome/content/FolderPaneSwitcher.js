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
  addRemoveButtonsObserver: {
    observe: function () {
      var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
      var should_be_hidden =
        !prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");
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
    var currentMode = gFolderTreeView.activeModes[gFolderTreeView.activeModes.length-1];
    var prevMode = null;
    var modes = Object.keys(gFolderTreeView._modes)
    for (var i in modes) {
      m = modes[i];
      if (m == currentMode) {
        if (prevMode) {
//          gFolderTreeView.mode = prevMode;
          FolderPaneSwitcher.setSingleMode(prevMode);
          return;
        }
      }
      if (!this.views[m] || (this.views[m]['menu_enabled'] &&
        this.views[m]['arrows_enabled'])) {
        prevMode = m;
      }
    }
    if (prevMode) {
//      gFolderTreeView.mode = prevMode;
      FolderPaneSwitcher.setSingleMode(prevMode);
    }
  },

  goForwardView: function (event) {
  
  console.log("goforw");
  console.log("actmodes", gFolderTreeView._activeModes, gFolderTreeView._modes);
  //gFolderTreeView.activeModes = "favorite";//gFolderTreeView._modes["favorite"];
  console.log("actmodes2", gFolderTreeView._activeModes, gFolderTreeView.activeModes, gFolderTreeView.activeModes[0]);
      var currentMode = gFolderTreeView.activeModes[gFolderTreeView.activeModes.length-1];
    var prevMode = null;
    console.log("keys", Object.keys(gFolderTreeView._modes), Object.keys(gFolderTreeView._modes).reverse() );
    var modes = Object.keys(gFolderTreeView._modes).reverse()
    for (var i in modes) {
      let m = modes[i];
      if (m == currentMode) {
        if (prevMode) {
       //   gFolderTreeView.mode = prevMode;
  //        gFolderTreeView.activeModes = prevMode;
          FolderPaneSwitcher.setSingleMode(prevMode);
          return;
        }
      }
      if (!this.views[m] || (this.views[m]['menu_enabled'] &&
        this.views[m]['arrows_enabled'])) {
        prevMode = m;
      }
    }
    if (prevMode) {
    //  gFolderTreeView.mode = prevMode;
     // gFolderTreeView.activeModes = prevMode;
      FolderPaneSwitcher.setSingleMode(prevMode);

    }
  
  
  },

  views: null,

  viewsBeforeTimer: null,

  viewsObserver: {
    register: function (logger, views) {
      this.logger = logger;
      this.views = views;
      fpvsUtils.addObserver(fpvsUtils.viewsBranch, "", this);
      for (var name in views) {
        view = views[name];
        if (!view['menu_enabled']) {
          this.observe(fpvsUtils.viewsBranch, "",
            view['number'] + '.menu_enabled');
        }
      }
    },

    observe: function (aSubject, aTopic, aData) {
      var match = /^(\d+)\.(.*_enabled)$/.exec(aData);
      if (!match) return;
      var viewNum = match[1];
      var which = match[2];
      var enabled = aSubject.getBoolPref(aData);
      var name = fpvsUtils.getStringPref(fpvsUtils.viewsBranch,
        viewNum + ".name");
      var view = this.views[name];
      view[which] = enabled;
      if (which != 'menu_enabled') return;
      if (enabled) {
        gFolderTreeView.registerFolderTreeMode(name, view['handler'],
          view['display_name']);
      } else {
        view['handler'] = gFolderTreeView._modes[name];
        gFolderTreeView.unregisterFolderTreeMode(name);
      }
    }
  },

  onLoad: function () {
    // Current Thunderbird nightly builds do not load default preferences
    // from overlay add-ons. They're probably going to fix this, but it may go
    // away again at some point in the future, and in any case we'll need to do
    // it ourselves when we convert from overlay to bootstrapped, and there
    // shouldn't be any harm in setting the default values of preferences twice
    // (i.e., both Thunderbird and our code doing it).
    var { DefaultPreferencesLoader } = ChromeUtils.import(
      "chrome://FolderPaneSwitcher/content/defaultPreferencesLoader.jsm");
    var loader = new DefaultPreferencesLoader();
    loader.parseUri("chrome://FolderPaneSwitcher/content/scripts/" +
      "fp-prefs.js");

    fpvsUtils.init();

    if (!this.logger) {
      this.logger = console;
      /*
                  Log4Moz.getConfiguredLogger("extensions.FolderPaneSwitcher",
                  Log4Moz.Level.Trace,
                  Log4Moz.Level.Info,
                  Log4Moz.Level.Debug);
          */
    }
    var me = FolderPaneSwitcher;
    var title = document.getElementById("folderPaneHeader");
    fpvsUtils.updateViews(gFolderTreeView);
    this.views = fpvsUtils.getViews(true);
    this.viewsObserver.register(this.logger, this.views);

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
    fpvsUtils.uninit();
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

  onDragEnter: function () {
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
   console.log("onDragDrop(" + aEvent.type + ")");
    if (FolderPaneSwitcher.cachedView) {
      for (viewname of FolderPaneSwitcher.cachedView)  {
        console.log("onDrDr, add ", viewname);
        gFolderTreeView.activeModes = viewname; 
      }
      FolderPaneSwitcher.cachedView = null;
      FolderPaneSwitcher.currentFolder = null;
    }
  },

  setSingleMode: function (modeName) {
    let currModes = gFolderTreeView.activeModes.slice();
    for (viewName of currModes ) 
    {
      console.log("remove", viewName);
       gFolderTreeView.activeModes = viewName; //toggles, removes if present, if all gone, set to kDefaultMode (="all")
    }
    if (modeName != "all") {
      gFolderTreeView.activeModes = modeName;
      gFolderTreeView.activeModes = "all"; //remove "all"

    }

/*
    else 
    for (viewName of currModes ) 
    {
      console.log("remove", viewName);
       gFolderTreeView.activeModes = viewName; //toggles, removes if present, if all gone, set to kDefaultMode (="all")
       gFolderTreeView.activeModes = modeName;
              gFolderTreeView.activeModes = "all"; //remove all
              }
    
*/

  },


  timer: null,
  timerCallback: {
    notify: function () {
      FolderPaneSwitcher.logger.debug("timerCallback.notify");
      console.log("defMode",  gFolderTreeView._modeNames);
      gFolderTreeView.unregisterFolderTreeMode("favorite");
      console.log("defMode nach unreg",  gFolderTreeView._modeNames);
      FolderPaneSwitcher.cachedView = gFolderTreeView.activeModes.slice();
//      FolderPaneSwitcher.viewsBeforeTimer = gFolderTreeView.activeModes.slice();
      console.log("no type views", FolderPaneSwitcher.viewsBeforeTimer);
      FolderPaneSwitcher.setSingleMode("all");
   
      /*
      for (viewName of FolderPaneSwitcher.cachedView ) 
      {
        console.log("remove", viewName);
         gFolderTreeView.activeModes = viewName; //toggles, removes if present, if all gone, set to kDefaultMode (="all")
      }

      */
//      FolderPaneSwitcher.cachedView = gFolderTreeView.activeModes.slice();
    //!  gFolderTreeView.mode = "all";
  //  gFolderTreeView._activeModes.length = 0;
  //  gFolderTreeView._activeModes.push( "all");
  //  gFolderTreeView._activeModes.push( "favorites");
  //    gFolderTreeView.activeModes =  "all";
  //    gFolderTreeView.activeModes =  "favorite";

      FolderPaneSwitcher.timer = null;

      var t = Components.classes["@mozilla.org/timer;1"]
        .createInstance(Components.interfaces.nsITimer);
      t.initWithCallback(FolderPaneSwitcher.watchTimerCallback, 250,
        Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
      FolderPaneSwitcher.watchTimer = t;
    },
  },

  resetTimer: function () {
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
    }
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    var delay = 1000; //!prefBranch.getIntPref("extensions.FolderPaneSwitcher.delay");
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



//window.addEventListener("load", function () { FolderPaneSwitcher.onLoad(); }, false);
//window.addEventListener("unload", function () { FolderPaneSwitcher.onUnload(); }, false);
