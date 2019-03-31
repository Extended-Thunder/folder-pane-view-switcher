// -*- js-indent-level: 2 -*-
var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");
const {FPVSDefaultPreferencesLoader} = ChromeUtils.import(
  "chrome://FolderPaneSwitcher/content/defaultPreferencesLoader.jsm");

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

var FolderPaneSwitcher = {
  addRemoveButtonsObserver: {
    observe: function() {
      var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
      var show = prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");
      var toolbar = document.getElementById("folderPane-toolbar")
      var changed = false;
      if (show) {
        if (! document.getElementById("FolderPaneSwitcher-back-arrow-button")) {
          toolbar.insertItem("FolderPaneSwitcher-back-arrow-button");
          changed = true;
        }
        if (! document.getElementById("FolderPaneSwitcher-forward-arrow-button")) {
          toolbar.insertItem("FolderPaneSwitcher-forward-arrow-button");
          changed = true;
        }
      }
      else {
        var origset = toolbar.currentSet;
        var newset = origset;
        newset = newset.replace(/FolderPaneSwitcher-(back|forward)-arrow-button/g, "");
        newset = newset.replace(/,,+/g, ",");
        if (origset != newset) {
          toolbar.currentSet = newset;
          changed = true;
        }
      }
      if (changed) {
        toolbar.setAttribute("currentset", toolbar.currentSet)
      }
    }
  },

  goBackView: function() {
    var currentMode = gFolderTreeView.mode;
    var prevMode = null;
    var modes = Object.keys(gFolderTreeView._modes)
    for (var i in modes) {
      m = modes[i];
      if (m == currentMode) {
        if (prevMode) {
          gFolderTreeView.mode = prevMode;
          return;
        }
      }
      if (!this.views[m] || (this.views[m]['menu_enabled'] &&
                             this.views[m]['arrows_enabled'])) {
        prevMode = m;
      }
    }
    if (prevMode) {
      gFolderTreeView.mode = prevMode;
    }
  },
    
  goForwardView: function() {
    var currentMode = gFolderTreeView.mode;
    var prevMode = null;
    var modes = Object.keys(gFolderTreeView._modes).reverse()
    for (var i in modes) {
      m = modes[i];
      if (m == currentMode) {
        if (prevMode) {
          gFolderTreeView.mode = prevMode;
          return;
        }
      }
      if (!this.views[m] || (this.views[m]['menu_enabled'] &&
                             this.views[m]['arrows_enabled'])) {
        prevMode = m;
      }
    }
    if (prevMode) {
      gFolderTreeView.mode = prevMode;
    }
  },

  views: null,

  viewsObserver: {
    register: function(logger, views) {
      this.logger = logger;
      this.views = views;
      fpvsUtils.addObserver(fpvsUtils.viewsBranch, "", this);
      for (var name in views) {
        view = views[name];
        if (! view['menu_enabled']) {
          this.observe(fpvsUtils.viewsBranch, "",
                       view['number'] + '.menu_enabled');
        }
      }
    },

    observe: function(aSubject, aTopic, aData) {
      var match = /^(\d+)\.(.*_enabled)$/.exec(aData);
      if (! match) return;
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

  showHideArrowsObserver: {
    observe: function() {
      var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
      var show = prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");
      document.getElementById("folderPaneHeader").hidden = !show;
    }
  },

  onLoad: function() {
    // Current Thunderbird nightly builds do not load default preferences
    // from overlay add-ons. They're probably going to fix this, but it may go
    // away again at some point in the future, and in any case we'll need to do
    // it ourselves when we convert from overlay to bootstrapped, and there
    // shouldn't be any harm in setting the default values of preferences twice
    // (i.e., both Thunderbird and our code doing it).
    // This is in a try/catch because if it fails it's probably because
    // setStringPref failed, in which case we're running inside an earlier
    // application version which has already loaded the default preferences
    // automatically.
    try {
        var loader = new FPVSDefaultPreferencesLoader();
        loader.parseUri("chrome://FolderPaneSwitcher-defaults/content/" +
                        "preferences/prefs.js");
    } catch (ex) {}

    fpvsUtils.init();

    if (! this.logger) {
      this.logger = Log4Moz.getConfiguredLogger("extensions.FolderPaneSwitcher",
						Log4Moz.Level.Trace,
						Log4Moz.Level.Info,
						Log4Moz.Level.Debug);
    }
    var me = FolderPaneSwitcher;
    var title = document.getElementById("folderpane-title");
    fpvsUtils.updateViews(gFolderTreeView);
    this.views = fpvsUtils.getViews(true);
    this.viewsObserver.register(this.logger, this.views);

    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);

    if (title) {
      title.addEventListener("dragexit", me.onDragExit, false);
      title.addEventListener("drop", me.onDragDrop, false);
      title.addEventListener("dragenter", me.onDragEnter, false);
      FolderPaneSwitcher.showHideArrowsObserver.observe();
      fpvsUtils.addObserver(prefBranch, "extensions.FolderPaneSwitcher.arrows",
                            FolderPaneSwitcher.showHideArrowsObserver, false);
    }
    else {
      // Thunderbird 49+
      title = document.getElementById("folderPane-toolbar");
      title.addEventListener("dragexit", me.onDragExit, false);
      title.addEventListener("drop", me.onDragDrop, false);
      title.addEventListener("dragenter", me.onDragEnter, false);
      title.collapsed = false;
      FolderPaneSwitcher.addRemoveButtonsObserver.observe();
      fpvsUtils.addObserver(prefBranch, "extensions.FolderPaneSwitcher.arrows",
                            FolderPaneSwitcher.addRemoveButtonsObserver, false);
    }      
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

  onUnload: function() {
    fpvsUtils.uninit();
  },

  folderListener: {
    msgsMoveCopyCompleted: function(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
      FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
	// Still remotely possible that someone else could be copying
	// into the same folder at the same time as us, but this is
	// the best we can do until they fix the event bug.
	FolderPaneSwitcher.onDragDrop({type:"msgsMoveCopyCompleted"});
      }
      else {
	FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted: non-matching folder");
      }
    },
    folderMoveCopyCompleted: function(aMove, aSrcFolder, aDestFolder) {
      FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
	// Still remotely possible that someone else could be copying
	// into the same folder at the same time as us, but this is
	// the best we can do until they fix the event bug.
	FolderPaneSwitcher.onDragDrop({type:"folderMoveCopyCompleted"});
      }
      else {
	FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted: non-matching folder");
      }
    }
  },

  onDragEnter: function() {
    FolderPaneSwitcher.logger.debug("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.logger.debug("onDragEnter: switch already in progress");
    }
    else {
      FolderPaneSwitcher.resetTimer();
    }
  },

  onDragExit: function(aEvent) {
    FolderPaneSwitcher.logger.debug("onDragExit("+aEvent.type+")");
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
      FolderPaneSwitcher.timer = null;
    }
  },

  onDragOver: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
    FolderPaneSwitcher.currentFolder = 
      gFolderTreeView.getFolderAtCoords(aEvent.clientX, aEvent.clientY);
  },

  onDragDrop: function(aEvent) {
    FolderPaneSwitcher.logger.debug("onDragDrop("+aEvent.type+")");
    if (FolderPaneSwitcher.cachedView) {
      gFolderTreeView.mode = FolderPaneSwitcher.cachedView;
      FolderPaneSwitcher.cachedView = null;
      FolderPaneSwitcher.currentFolder = null;
    }
  },
  
  timer: null,
  timerCallback: {
    notify: function() {
      FolderPaneSwitcher.logger.debug("timerCallback.notify");
      FolderPaneSwitcher.cachedView = gFolderTreeView.mode;
      gFolderTreeView.mode = "all";

      FolderPaneSwitcher.timer = null;

      var t = Components.classes["@mozilla.org/timer;1"]
	.createInstance(Components.interfaces.nsITimer);
      t.initWithCallback(FolderPaneSwitcher.watchTimerCallback, 250,
			 Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
      FolderPaneSwitcher.watchTimer = t;
    },
  },

  resetTimer: function() {
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
    }
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    var delay = prefBranch.getIntPref("extensions.FolderPaneSwitcher.delay");
    var t = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    t.initWithCallback(FolderPaneSwitcher.timerCallback, delay,
		       Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    FolderPaneSwitcher.timer = t;
  },

  watchTimer: null,
  watchTimerCallback: {
    notify: function() {
      if (FolderPaneSwitcher.cachedView) {
	var dragService = Components
	  .classes["@mozilla.org/widget/dragservice;1"]
	  .getService(Components.interfaces.nsIDragService);
	var dragSession = dragService.getCurrentSession();
	if (! dragSession) {
	  FolderPaneSwitcher.onDragDrop({type:"watchTimer"});
	}
      }
      if (! FolderPaneSwitcher.cachedView) {
	// It's null either because we just called onDragDrop or
	// because something else finished the drop.
	FolderPaneSwitcher.watchTimer.cancel();
	FolderPaneSwitcher.watchTimer = null;
      }
    }
  }
};

window.addEventListener("load", function () { FolderPaneSwitcher.onLoad(); }, false);
window.addEventListener("unload", function () { FolderPaneSwitcher.onUnload(); }, false);
