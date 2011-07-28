Components.utils.import("resource:///modules/gloda/log4moz.js");

// Rules:
// 
// onDragEnter: Reset timer
//              Set current row to null
//              Set cached view to null
// onDragExit:  Cancel timer
//              Switch to cached folder view, if any
// onDragOver:  In all folders view?
//              Yes: Do nothing
//              No: Has current row changed?
//                  Yes: Reset timer
//                  No: Do nothing         
// notify:      Cache old folder view
//              Switch to all folders view
// resetTimer:  In all folders view?
//              Yes: Do nothing
//              No: Start timer

var FolderPaneSwitcher = {
  showHideArrowsObserver: {
    observe: function() {
      var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
          .getService(Components.interfaces.nsIPrefBranch);
      var show = prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");
      FolderPaneSwitcher.logger.debug("show="+show);
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
    var folderTree = document.getElementById("folderTree");
    var treechildren = folderTree.getElementsByTagName("treechildren")[0];
    treechildren.addEventListener("dragenter", me.onDragEnter, false);
    treechildren.addEventListener("dragexit", me.onDragExit, false);
    treechildren.addEventListener("dragover", me.onDragOver, false);
    FolderPaneSwitcher.showHideArrowsObserver.observe();
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    prefBranch.addObserver("extensions.FolderPaneSwitcher.arrows",
			   FolderPaneSwitcher.showHideArrowsObserver, false);
  },

  onDragEnter: function() {
    FolderPaneSwitcher.logger.debug("onDragEnter");
    FolderPaneSwitcher.resetTimer();
    FolderPaneSwitcher.currentRow = null;
    FolderPaneSwitcher.cachedView = null;
  },

  onDragExit: function() {
    FolderPaneSwitcher.logger.debug("onDragExit");
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
      FolderPaneSwitcher.timer = null;
    }
    if (FolderPaneSwitcher.cachedView) {
      gFolderTreeView.mode = FolderPaneSwitcher.cachedView;
    }
  },

  onDragOver: function(aEvent) {
    FolderPaneSwitcher.logger.debug("onDragOver");
    if (gFolderTreeView.mode == "all") {
      return;
    }
    var row = gFolderTreeView.getFolderAtCoords(aEvent.clientX, aEvent.clientY);
    if (row != FolderPaneSwitcher.currentRow) {
      FolderPaneSwitcher.resetTimer();
      FolderPaneSwitcher.currentRow = row;
    }
  },

  timer: null,
  timerCallback: {
    notify: function() {
      FolderPaneSwitcher.logger.debug("timerCallback.notify");
      FolderPaneSwitcher.cachedView = gFolderTreeView.mode;
      gFolderTreeView.mode = "all";
      FolderPaneSwitcher.timer = null;
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
};

window.addEventListener("load", function () { FolderPaneSwitcher.onLoad(); }, false);
