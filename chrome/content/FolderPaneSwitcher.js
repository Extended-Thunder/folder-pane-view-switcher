// -*- js-indent-level: 2 -*-
Components.utils.import("resource:///modules/gloda/log4moz.js");

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
  showHideArrowsObserver: {
    observe: function() {
      var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
      var show = prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");
      document.getElementById("folderPaneHeader").hidden = !show;
    }
  },

  onLoad: function() {
    if (! this.logger) {
      this.logger = Log4Moz.getConfiguredLogger("extensions.FolderPaneSwitcher",
						Log4Moz.Level.Trace,
						Log4Moz.Level.Info,
						Log4Moz.Level.Debug);
    }
    var me = FolderPaneSwitcher;
    var title = document.getElementById("folderpane-title");
    title.addEventListener("dragenter", me.onDragEnter, false);
    var folderTree = document.getElementById("folderTree");
    folderTree.addEventListener("dragover", me.onDragOver, false);
    title.addEventListener("dragexit", me.onDragExit, false);
    title.addEventListener("dragdrop", me.onDragDrop, false);
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
    FolderPaneSwitcher.showHideArrowsObserver.observe();
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    prefBranch.addObserver("extensions.FolderPaneSwitcher.arrows",
			   FolderPaneSwitcher.showHideArrowsObserver, false);
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
