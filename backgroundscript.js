const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");
//  transfered the same code from bootstrap.js : migration from legacy to mailextension  TB78
var fpvsUtils;

var FolderPaneSwitcher = {
    // This is replaced with Log4Moz when we're initialized, but we need to be
    // able to log before it's initialized.
    logger: {
      trace(msg) {
        console.log("extensions.FolderPaneSwitcher TRACE " + msg);
      },
  
      debug(msg) {
        console.log("extensions.FolderPaneSwitcher DEBUG " + msg);
      }
    },

    addRemoveButtonsObserver: {
        observe: function(document) {
          var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
          var should_be_hidden =
              !prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");

              // rewrite this area for sending message to contentscript for further task
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


      goBackView: function(window) {
        var gFolderTreeView = window.gFolderTreeView;
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
          if (!FolderPaneSwitcher.views[m] ||
              (FolderPaneSwitcher.views[m]['menu_enabled'] &&
               FolderPaneSwitcher.views[m]['arrows_enabled'])) {
            prevMode = m;
          }
        }
        if (prevMode) {
          gFolderTreeView.mode = prevMode;
        }
      },

      goForwardView: function(window) {
        var gFolderTreeView = window.gFolderTreeView;
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
          if (!FolderPaneSwitcher.views[m] ||
              (FolderPaneSwitcher.views[m]['menu_enabled'] &&
               FolderPaneSwitcher.views[m]['arrows_enabled'])) {
            prevMode = m;
          }
        }
        if (prevMode) {
          gFolderTreeView.mode = prevMode;
        }
      },



      views: null,

      viewsObserver: {
        register: function(window, logger, views) {
          this.window = window;
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
        var gFolderTreeView = this.window.gFolderTreeView;
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


    onLoad: function(window) {
        this.logger.debug("onLoad, readyState=" + window.document.readyState);
        var gFolderTreeView = window.gFolderTreeView;
        var document = window.document;
        var {DefaultPreferencesLoader} = ChromeUtils.import(
          "chrome://FolderPaneSwitcher/content/defaultPreferencesLoader.jsm");
        var loader = new DefaultPreferencesLoader();
        loader.parseUri("chrome://FolderPaneSwitcher/content/prefs.js");
    
        fpvsUtils.init();
    
        FolderPaneSwitcher.logger = Log4Moz.getConfiguredLogger(
          "extensions.FolderPaneSwitcher",
          Log4Moz.Level.Trace,
          Log4Moz.Level.Info,
          Log4Moz.Level.Debug);
    
        var me = FolderPaneSwitcher;
        var title = document.getElementById("folderPane-toolbar");
        this.logger.debug("title=" + title);
        fpvsUtils.updateViews(gFolderTreeView);
        FolderPaneSwitcher.views = fpvsUtils.getViews(true);
        FolderPaneSwitcher.viewsObserver.register(
          window, FolderPaneSwitcher.logger, FolderPaneSwitcher.views);
    
        var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);


         // need to check what modification need to be done here ..

        title.addEventListener("dragexit", me.onDragExit, false);
        title.addEventListener("drop", me.onDragDrop, false);
        title.addEventListener("dragenter", me.onDragEnter, false);
        title.collapsed = false;
        this.logger.debug("title.collapsed=" + title.collapsed);
        // This is really gross. There appears to be some sort of race condition
        // in TB68 which causes it occasionally to be not finished initializing the
        // window when this functiong gets called, such that shortly after this
        // function sets collapsed to false, TB sets it back to true. Ugh! So we
        // try to catch that and fix it here.
        this.raceIntervalsRemaining = 5
        this.raceInterval = window.setInterval(() => {
          this.raceIntervalsRemaining--;
          if (title.collapsed) {
            this.logger.warn("title.collapsed changed, flipping it back!");
            title.collapsed = false;
            this.raceIntervalsRemaining = 0;
          }
          else {
            this.logger.debug("title.collapsed is still false, will keep " +
                              "checking for " + this.raceIntervalsRemaining +
                             " more seconds");
          }
          if (! this.raceIntervalsRemaining) {
            this.logger.debug("Clearing this.raceInterval");
            window.clearInterval(this.raceInterval);
          }
        }, 1000);
        FolderPaneSwitcher.addRemoveButtonsObserver.observe(document);
        var observer = {
          observe: function() {
            FolderPaneSwitcher.addRemoveButtonsObserver.observe(document);
          }
        }
        fpvsUtils.addObserver(prefBranch, "extensions.FolderPaneSwitcher.arrows",
                              observer, false);
    
        var folderTree = document.getElementById("folderTree");
        folderTree.addEventListener("dragover", me.onDragOver, false);
        // Dragexit and dragdrop don't actually get sent when the user
        // drops a message into a folder. This is arguably a bug in
        // Thunderbird (see bz#674807). To work around it, I register a
        // folder listener to detect when a move or copy is
        // completed. This is gross, but appears to work well enough.
        // Disable this because the watcher serves the same function now,
        // by automatically reverting to the cached view within a half
        // second at most of when the drop finishes, and leaving this
        // active cdauses the view to revert if some other message happens
        // to be deposited into a folder while the drag is in progress.
        // I'm keeping the code, inactive, in case I determine later that
        // it needs to be reactivated, e.g., if we can get rid of the
        // watcher because the drag&drop infrastructure has improved to
        // the point where the watcher is no longer needed.
    //    var ns =
    //      Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
    //      .getService(Components.interfaces.nsIMsgFolderNotificationService);
    //
    //    ns.addListener(me.folderListener, ns.msgsMoveCopyCompleted|
    //		   ns.folderMoveCopyCompleted);
      },


      onUnload: function() {
        fpvsUtils.uninit();
      },



  folderListener: {
    msgsMoveCopyCompleted: function(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
      FolderPaneSwitcher.logger.trace("msgsMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
	// Still remotely possible that someone else could be copying
	// into the same folder at the same time as us, but this is
	// the best we can do until they fix the event bug.
	FolderPaneSwitcher.onDragDrop({type:"msgsMoveCopyCompleted"});
      }
      else {
	FolderPaneSwitcher.logger.debug(
          "msgsMoveCopyCompleted: non-matching folder");
      }
    },
    folderMoveCopyCompleted: function(aMove, aSrcFolder, aDestFolder) {
      FolderPaneSwitcher.logger.trace("folderMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
	// Still remotely possible that someone else could be copying
	// into the same folder at the same time as us, but this is
	// the best we can do until they fix the event bug.
	FolderPaneSwitcher.onDragDrop({type:"folderMoveCopyCompleted"});
      }
      else {
	FolderPaneSwitcher.logger.debug(
          "folderMoveCopyCompleted: non-matching folder");
      }
    }
  },


  onDragEnter: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.logger.debug(
        "onDragEnter: switch already in progress");
    }
    else {
      FolderPaneSwitcher.setTimer(aEvent.view);
    }
  },


  onDragExit: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragExit("+aEvent.type+")");
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
      FolderPaneSwitcher.timer = null;
    }
  },


  onDragOver: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
    FolderPaneSwitcher.currentFolder = aEvent.view.
      gFolderTreeView.getFolderAtCoords(aEvent.clientX, aEvent.clientY);
  },

  onDragDrop: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragDrop("+aEvent.type+")");
    if (FolderPaneSwitcher.cachedView) {
      aEvent.view.gFolderTreeView.mode = FolderPaneSwitcher.cachedView;
      FolderPaneSwitcher.cachedView = null;
      FolderPaneSwitcher.currentFolder = null;
    }
  },


  timer: null,

  setTimer: function(window) {
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
    }
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    var delay = prefBranch.getIntPref("extensions.FolderPaneSwitcher.delay");
    var t = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    t.initWithCallback(new timerCallback(window), delay,
		       Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    FolderPaneSwitcher.timer = t;
  },

  watchTimer: null
};



function timerCallback(window) {
    FolderPaneSwitcher.logger.trace("timerCallback");
    this.window = window;
  }


  timerCallback.prototype = {
    notify: function() {
      FolderPaneSwitcher.logger.trace("timerCallback.notify");
      FolderPaneSwitcher.cachedView = this.window.gFolderTreeView.mode;
      this.window.gFolderTreeView.mode = "all";
  
      FolderPaneSwitcher.timer = null;
  
      var t = Components.classes["@mozilla.org/timer;1"].
      createInstance(Components.interfaces.nsITimer);
      t.initWithCallback(new watchTimerCallback(this.window), 250,
                 Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
      FolderPaneSwitcher.watchTimer = t;
    }
  };


  function watchTimerCallback(window) {
    FolderPaneSwitcher.logger.trace("watchTimerCallback");
    this.window = window;
  }

  watchTimerCallback.prototype = {
    notify: function() {
      FolderPaneSwitcher.logger.trace("watchTimerCallback.notify");
      if (FolderPaneSwitcher.cachedView) {
        var dragService = Components
        .classes["@mozilla.org/widget/dragservice;1"]
        .getService(Components.interfaces.nsIDragService);
        var dragSession = dragService.getCurrentSession();
        if (! dragSession) {
      FolderPaneSwitcher.onDragDrop({type: "watchTimer", view: this.window});
        }
      }
      if (! FolderPaneSwitcher.cachedView) {
        // It's null either because we just called onDragDrop or
        // because something else finished the drop.
        FolderPaneSwitcher.watchTimer.cancel();
        FolderPaneSwitcher.watchTimer = null;
      }
    }
  };



  function forEachOpenWindow(todo) { // Apply a function to all open windows
    FolderPaneSwitcher.logger.trace("forEachOpenWindow");
    for (let window of Services.wm.getEnumerator("mail:3pane")) {
      if (window.document.readyState != "complete") {
        FolderPaneSwitcher.logger.debug("forEachOpenWindow skip, readyState=" +
                                        window.document.readyState);
        continue;
      }
      todo(window);
    }
  }


  function loadIntoWindow(window) {
    FolderPaneSwitcher.logger.trace("loadIntoWindow");
    var document = window.document;



    var toolbar = document.getElementById("folderPane-toolbar");
    if (! toolbar) return;

    if (document.getElementById("FolderPaneSwitcher-back-arrow-button")) return;

    var button = document.createXULElement("toolbarbutton");
    button.setAttribute("id", "FolderPaneSwitcher-back-arrow-button");
    button.setAttribute(
      "image", "chrome://FolderPaneSwitcher/content/left-arrow.png");
    listener = function() { FolderPaneSwitcher.goBackView(window); }
    button.addEventListener("command", listener);
    toolbar.appendChild(button);

    button = document.createXULElement("toolbarbutton");
    button.setAttribute("id", "FolderPaneSwitcher-forward-arrow-button");
    button.setAttribute(
        "image", "chrome://FolderPaneSwitcher/content/right-arrow.png");
    listener = function() { FolderPaneSwitcher.goForwardView(window); }
    button.addEventListener("command", listener);
    toolbar.appendChild(button);

    FolderPaneSwitcher.onLoad(window);
}



function unloadFromWindow(window) {
    FolderPaneSwitcher.logger.trace("unloadFromWindow");
    var document = window.document;
    var toolbar = document.getElementById("folderPane-toolbar");
    if (! toolbar) return;
    var button = document.getElementById("FolderPaneSwitcher-back-arrow-button");
    if (! button) return;
    toolbar.removeChild(button);
    button = document.getElementById("FolderPaneSwitcher-forward-arrow-button");
    toolbar.removeChild(button);
  }



  var WindowObserver = {
    observe: function(aSubject, aTopic, aData) {
        FolderPaneSwitcher.logger.trace("WindowObserver.observe");
        var window = aSubject;
        var document = window.document;
        if (document.documentElement.getAttribute("windowtype") ==
            "mail:3pane") {
            loadIntoWindow(window);
        }
    },
};


