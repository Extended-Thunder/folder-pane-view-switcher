/*
 * License:  MPL2
 */

/*
 */

var lastTab = 0,
    lastWindow = 0;

var defPrefs = {
    all: { arrow: true, menu: true, pos: -1 },
    smart: { arrow: true, menu: true, pos: -1 },
    recent: { arrow: true, menu: true, pos: -1 },
    unread: { arrow: true, menu: true, pos: -1 },
    favorite: { arrow: true, menu: true, pos: -1 }
};
arrowViews = ["all", "smart", "recent", "unread", "favorite"];
menuViews = ["all", "smart", "recent", "unread", "favorite"];

var defChk = { arrows: true };
var defDelay = { delay: 300 };
var updated = false;

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    // if (temporary) return; // skip during development
    switch (reason) {
        case "install":
            {
                updated = true;
                await browser.storage.local.set({ updated: updated });

                await browser.storage.local.set({ prefs: defPrefs });
                await browser.storage.local.set(defChk);
                await browser.storage.local.set(defDelay);
                await browser.storage.local.set({ arrowViews: arrowViews });
                await browser.storage.local.set({ menuViews: menuViews });
                const url = messenger.runtime.getURL("popup/installed.html");
                await browser.tabs.create({ url });
            }
            break;
        case "update": {
            // await browser.storage.local.set({ "updated": false });
            //await browser.storage.local.remove( "updated");
            const url = messenger.runtime.getURL("popup/update.html");
            await browser.tabs.create({ url });

            //update from old prefs?
            //      updated = await browser.storage.local.get("updated");
            updated = await browser.storage.local.get({ updated: false });
            //console.log("upd", updated.updated);
            //updated.updated = false;
            if (!updated.updated) {
                await browser.storage.local.set({ updated: true });

                let p = await messenger.Utilities.getLegacyPrefs();
                //console.log("p in bgrd", p);
                if ("delay" in p) {
                    //console.log("del from exp", p.delay);
                    await browser.storage.local.set(p.delay);
                } else {
                    await browser.storage.local.set(defDelay);
                }
                if ("arrows" in p) {
                    await browser.storage.local.set(p.arrows);
                } else {
                    await browser.storage.local.set(defChk);
                }
                /**/
                arrowViews = [];
                menuViews = [];

                for (let view in p.prefs) {
                    //console.log("view", view, p.prefs[view], p.prefs[view]["arrow"]);

                    defPrefs[view] = p.prefs[view];

                    if (p.prefs[view]["arrow"]) arrowViews.push(view);
                    if (p.prefs[view].menu) menuViews.push(view);
                }

                for (let view in defPrefs) {
                    messenger.Utilities.showViewInMenus(
                        view,
                        defPrefs[view]["menu"]
                    );
                }
                //console.log("update: defpref", defPrefs, arrowViews, menuViews);
                await browser.storage.local.set({ prefs: defPrefs });
                await browser.storage.local.set({ arrowViews: arrowViews });
                await browser.storage.local.set({ menuViews: menuViews });
                await browser.storage.local.set({ updated: true });
            }

            break;
        }
    }
});

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
    //console.log("manipulateWindow");

    let inited = await messenger.Utilities.isTreeInited(id);
    while (!inited) {
        if (window.setTimeout) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
        inited = await messenger.Utilities.isTreeInited();
    }

    await messenger.Utilities.unregisterListener("all", "folderPaneHeader", id);
    await messenger.Utilities.registerListener("all", "folderPaneHeader", id);
    await messenger.Utilities.initFolderPaneOptionsPopup();

    /**/
    await messenger.LegacyMenu.add(id, {
        id: "FolderPaneSwitcher-forward-arrow-button",
        type: "toolbarButton",
        reference: "folderPaneOptionsButton",
        position: "before",
        label: "",
        //  "accesskey" : "B",
        image: "content/right-arrow.png",
        tooltip: "Next View"
    });

    await messenger.LegacyMenu.add(id, {
        id: "FolderPaneSwitcher-back-arrow-button",
        type: "toolbarButton",
        reference: "FolderPaneSwitcher-forward-arrow-button",
        position: "before",
        label: "",
        //  "accesskey" : "B",
        image: "content/left-arrow.png",
        tooltip: "Previous View"
    });
}

messenger.windows.onRemoved.addListener(async (windowId) => {
    await messenger.Utilities.unregisterListener(
        "all",
        "folderPaneHeader",
        windowId
    );
});

messenger.LegacyMenu.onCommand.addListener(async (windowsId, id) => {
    if (id == "FolderPaneSwitcher-forward-arrow-button") {
        //console.log("forward clicked");
        FolderPaneSwitcher.goForwardView();
        return;
    }

    if (id == "FolderPaneSwitcher-back-arrow-button") {
        //console.log("back clicked");
        FolderPaneSwitcher.goBackView();
        return;
    }
});

var FolderPaneSwitcher = {
    cachedView: null,

    selectedFolder: null, //not in use??

    timer: 0,

    watchTimer: 0,

    logger: console,

    setSingleMode: async function (modeName) {
        let activeModes = await messenger.Utilities.getActiveViewModes();
        let currModes = activeModes.slice();
        if (!activeModes.includes(modeName))
            await messenger.Utilities.toggleActiveViewMode(modeName);

        for (viewName of currModes) {
            if (viewName != modeName)
                await messenger.Utilities.toggleActiveViewMode(viewName);
        }
    },

    goForwardView: async function (event) {
        let activeModes = await messenger.Utilities.getActiveViewModes();
        let arrowViews = await messenger.storage.local.get("arrowViews");
        selectedViews = arrowViews.arrowViews;
        //console.log("selectedViews", selectedViews);

        var currentView = activeModes[activeModes.length - 1];
        let currInd = selectedViews.findIndex((name) => name == currentView);
        currInd = (currInd + 1) % selectedViews.length;
        FolderPaneSwitcher.setSingleMode(selectedViews[currInd]);
    },

    goBackView: async function () {
        let activeModes = await messenger.Utilities.getActiveViewModes();
        let arrowViews = await messenger.storage.local.get("arrowViews");
        selectedViews = arrowViews.arrowViews;
        //console.log("selectedViews", selectedViews);

        var currentView = activeModes[activeModes.length - 1];
        let currInd = selectedViews.findIndex((name) => name == currentView);

        currInd = (currInd + selectedViews.length - 1) % selectedViews.length;
        FolderPaneSwitcher.setSingleMode(selectedViews[currInd]);
    },

    onDragEnter: function () {
        //console.log("bgr FPVS onDragEnter");

        if (!FolderPaneSwitcher.timer) {
            FolderPaneSwitcher.cachedView = null;
        }

        //    FolderPaneSwitcher.logger.debug("onDragEnter");
        if (FolderPaneSwitcher.cachedView) {
            //      FolderPaneSwitcher.logger.debug("onDragEnter: switch already in progress");
        } else {
            //console.log("onDragEnter resettimer");
            FolderPaneSwitcher.resetTimer();
        }
    },

    onDragLeaveFolderPane: function (aEvent) {
        //FolderPaneSwitcher.logger.debug("onDragDrop(" + aEvent.type + ")");
        //console.log("leaveFolderPane", FolderPaneSwitcher.cachedView, FolderPaneSwitcher.timer, FolderPaneSwitcher.watchTimer);

        if (FolderPaneSwitcher.cachedView && !FolderPaneSwitcher.timer) {
            //console.log("reset onDragLeaveFolderPane cached view", FolderPaneSwitcher.cachedView);
            FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.cachedView);
            FolderPaneSwitcher.cachedView = null;
            FolderPaneSwitcher.currentFolder = null;
            FolderPaneSwitcher.watchTimer = 0;
        }
    },

    onDragExit: function (aEvent) {
        // FolderPaneSwitcher.logger.debug("onDragExit(" + aEvent.type + ")");
        //console.log("dragexit should never happen as the bug is wontfix");
        if (FolderPaneSwitcher.timer) {
            window.clearTimeout(FolderPaneSwitcher.timer);
            FolderPaneSwitcher.timer = 0;
            //console.log("kill timer");
        }
        if (FolderPaneSwitcher.watchTimer) {
            window.clearTimeout(FolderPaneSwitcher.watchTimer);
            FolderPaneSwitcher.watchTimer = 0;
            //console.log("kill watchTimer");
        }
    },

    onDragDrop: function (aEvent) {
        //FolderPaneSwitcher.logger.debug("onDragDrop(" + aEvent.type + ")");
        if (FolderPaneSwitcher.timer) {
            //so we don't double call setSingleMode
            window.clearTimeout(FolderPaneSwitcher.timer);
            FolderPaneSwitcher.timer = 0;
            //console.log("kill timer");
        }
        if (FolderPaneSwitcher.watchTimer) {
            window.clearTimeout(FolderPaneSwitcher.watchTimer);
            FolderPaneSwitcher.watchTimer = 0;
            //console.log("kill watchTimer");
        }

        if (FolderPaneSwitcher.cachedView) {
            //console.log("reset cached view", FolderPaneSwitcher.cachedView);
            FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.cachedView);
            FolderPaneSwitcher.cachedView = null;
            FolderPaneSwitcher.currentFolder = null;
        }
    },

    timerCallback: {
        notify: async function () {
            // FolderPaneSwitcher.logger.debug("timerCallback.notify");
            let activeViews = await messenger.Utilities.getActiveViewModes();
            FolderPaneSwitcher.cachedView = activeViews[activeViews.length - 1];
            // FolderPaneSwitcher.logger.debug("cachedmode", FolderPaneSwitcher.cachedView);
            FolderPaneSwitcher.setSingleMode("all");

            //     FolderPaneSwitcher.timer = 0;
            FolderPaneSwitcher.watchTimer = window.setTimeout(
                FolderPaneSwitcher.watchTimerCallback.notify,
                1500,
                FolderPaneSwitcher
            );
        }
    },

    watchTimerCallback: {
        //needed because drop/dragend is not fired on folderPaneHeader
        notify: async function () {
            //FolderPaneSwitcher.logger.debug("watchTimerCallback.notify");
            FolderPaneSwitcher.timer = 0;
            if (FolderPaneSwitcher.cachedView) {
                //    FolderPaneSwitcher.cachedView = null;
                let inDragSession = await messenger.Utilities.inDragSession();
                //console.log("watchtimer indragsession", inDragSession);
                if (!inDragSession) {
                    await FolderPaneSwitcher.onDragDrop({ type: "watchTimer" });
                }
            }
            if (!FolderPaneSwitcher.cachedView) {
                //there is intentionally no else because of the side effects of the await above
                // It's null either because we just called onDragDrop or
                // because something else finished the drop.
                //       FolderPaneSwitcher.watchTimer.cancel();
                //window.clearTimeout(FolderPaneSwitcher.watchTimer);

                FolderPaneSwitcher.watchTimer = 0;
                FolderPaneSwitcher.timer = 0;
            }
        }
    },

    resetTimer: async function () {
        //debugger;

        if (!FolderPaneSwitcher.timer) {
            //FolderPaneSwitcher.logger.debug("resettimer");
            FolderPaneSwitcher.cachedView = null;
            let delay = await messenger.storage.local.get("delay");
            FolderPaneSwitcher.timer = window.setTimeout(
                FolderPaneSwitcher.timerCallback.notify,
                delay.delay,
                FolderPaneSwitcher
            );
            //console.log("delay", delay, FolderPaneSwitcher.timer);
        }

        // if (FolderPaneSwitcher.timer) {
        //   window.clearTimeout(FolderPaneSwitcher.timer);
        //   FolderPaneSwitcher.timer = 0;
        // };
        // FolderPaneSwitcher.logger.debug("resettimer");
        //    let delay = await messenger.storage.local.get("delay");
        // FolderPaneSwitcher.timer = window.setTimeout(FolderPaneSwitcher.timerCallback.notify, delay.delay, FolderPaneSwitcher);
        // //console.log("delay", delay, FolderPaneSwitcher.timer);
    }
};

async function notifyListener(info) {
    //   //console.log(info);
    switch (info.command) {
        case "onDragExit":
            //     //console.log("bgr onDragExit");
            FolderPaneSwitcher.onDragDrop({ type: "dragexit" });
            break;
        case "onDragDrop":
            //console.log("bgr onDragDrop");
            FolderPaneSwitcher.onDragDrop({ type: "dragdrop" });
            break;
        case "onDragLeave":
            //console.log("bgr onDragLeave");
            FolderPaneSwitcher.onDragDrop({ type: "onDragLeave" });
            break;
        case "onDragLeaveFolderPane":
            FolderPaneSwitcher.onDragLeaveFolderPane({
                type: "onDragLeaveFolderPane"
            });
            break;
        case "onDragEnter":
            //console.log("bgr onDragEnter");
            FolderPaneSwitcher.onDragEnter();

            break;
        case "onDragOver":
            //console.log("bgr onDragOver");
            break;

        case "folderListener": //this replaces an event indicating that the message/folder drop is finished
            //console.log("bgr folderListener", info.type);//, info.folder);
            FolderPaneSwitcher.onDragDrop({ type: info.type });

            break;
    }
}

async function main() {
    const windows = await messenger.windows.getAll();
    for (let window of windows) {
        await manipulateWindow(window);
    }
    messenger.windows.onCreated.addListener((window) => {
        manipulateWindow(window);
    });

    // for future use, cuurently, event on tree is not firing
    // messenger.messages.onMoved.addListener( async (originalMessages, movedMessages) =>
    // {
    //   let lastHoveredFolder = await messenger.Utilities.getLastHoveredFolder();
    //   let newFolder = movedMessages.messages[0].folder;
    //   //console.log("folder, ", lastHoveredFolder);
    //   //console.log("eqhul", lastHoveredFolder.toString() == newFolder.toString() , movedMessages);
    //   FolderPaneSwitcher.onDragDrop({ type: "msgsMoveCopyCompleted" });

    // });

    //console.log("bgrd");

    //console.log("p", p);
    await messenger.NotifyTools.onNotifyBackground.removeListener(
        notifyListener
    );
    await messenger.NotifyTools.onNotifyBackground.addListener(notifyListener);
}

main();
