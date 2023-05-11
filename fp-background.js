// @ts-check
/*
 * License:  MPL2
 */

const defPrefs = {
    all: { arrow: true, menu: true, pos: -1 },
    smart: { arrow: true, menu: true, pos: -1 },
    recent: { arrow: true, menu: true, pos: -1 },
    unread: { arrow: true, menu: true, pos: -1 },
    favorite: { arrow: true, menu: true, pos: -1 }
};
const defArrowViews = ["all", "smart", "recent", "unread", "favorite"];
const defMenuViews = ["all", "smart", "recent", "unread", "favorite"];
const defChk = { arrows: true };
const defDelay = { delay: 300 };
const logEnabled = false;

function log(...a) {
    if (logEnabled) {
        console.log("FPVS Background", ...a);
    }
}

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    // if (temporary) return; // skip during development
    switch (reason) {
        case "install":
            {
                await browser.storage.local.set({ updated: true });
                await browser.storage.local.set({ prefs: defPrefs });
                await browser.storage.local.set(defChk);
                await browser.storage.local.set(defDelay);
                await browser.storage.local.set({ arrowViews: defArrowViews });
                await browser.storage.local.set({ menuViews: defMenuViews });
                await browser.tabs.create({ url: "popup/installed.html" });
            }
            break;
        case "update": {
            //await browser.storage.local.set({ "updated": false });
            //await browser.storage.local.remove( "updated");
            await browser.tabs.create({ url: "popup/update.html" });

            //update from old prefs?
            let { updated } = await browser.storage.local.get({
                updated: false
            });

            if (!updated) {
                await browser.storage.local.set({ updated: true });

                let p = await messenger.FPVS.getLegacyPrefs();
                //log("p in bgrd", p);
                if ("delay" in p) {
                    //log("del from exp", p.delay);
                    await browser.storage.local.set(p.delay);
                } else {
                    await browser.storage.local.set(defDelay);
                }
                if ("arrows" in p) {
                    await browser.storage.local.set(p.arrows);
                } else {
                    await browser.storage.local.set(defChk);
                }

                let migratedArrowViews = [];
                let migratedMenuViews = [];
                let migratedPrefs = { compacted: [] };

                for (let view in p.prefs) {
                    //log("view", view, p.prefs[view], p.prefs[view]["arrow"]);

                    migratedPrefs[view] = p.prefs[view];

                    if (p.prefs[view]["arrow"]) migratedArrowViews.push(view);
                    if (p.prefs[view].menu) migratedMenuViews.push(view);
                }

                for (let view in migratedPrefs) {
                    messenger.FPVS.showViewInMenus(
                        view,
                        migratedPrefs[view]["menu"]
                    );
                }
                //log("update: defpref", defPrefs, arrowViews, menuViews);
                await browser.storage.local.set({ prefs: migratedPrefs });
                await browser.storage.local.set({
                    arrowViews: migratedArrowViews
                });
                await browser.storage.local.set({
                    menuViews: migratedMenuViews
                });
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

    let windowId = `${window.id}`;

    FolderPaneSwitcher.windowData.set(windowId, {
        cachedView: null,
        timer: 0,
        watchTimer: 0
    });

    await messenger.FPVS.initFolderPaneOptionsPopup(windowId);

    await messenger.LegacyMenu.add(windowId, {
        id: "FolderPaneSwitcher-forward-arrow-button",
        type: "toolbarButton",
        reference: "folderPaneOptionsButton",
        position: "before",
        label: "",
        //  "accesskey" : "B",
        image: "content/right-arrow.png",
        tooltip: "Next View",
        className: "button-flat",
        tabIndex: 0
    });

    await messenger.LegacyMenu.add(windowId, {
        id: "FolderPaneSwitcher-back-arrow-button",
        type: "toolbarButton",
        reference: "FolderPaneSwitcher-forward-arrow-button",
        position: "before",
        label: "",
        //  "accesskey" : "B",
        image: "content/left-arrow.png",
        tooltip: "Previous View",
        className: "button-flat",
        tabIndex: 0
    });
}

messenger.LegacyMenu.onCommand.addListener(async (windowId, id) => {
    switch (id) {
        case "FolderPaneSwitcher-forward-arrow-button":
            log("forward clicked");
            await FolderPaneSwitcher.goForwardView(windowId);
            break;
        case "FolderPaneSwitcher-back-arrow-button":
            log("back clicked");
            await FolderPaneSwitcher.goBackView(windowId);
            break;
    }
});

const getCompactedViews = async () => {
    const { compacted } = await messenger.storage.local.get({ compacted: [] });
    return compacted;
};

const isViewCompacted = async (viewName) => {
    const compactedViews = await getCompactedViews();
    return compactedViews.indexOf(viewName) > -1;
};

const setCompactedView = async (viewName, isCompacted) => {
    const isCurrentViewCompacted = await isViewCompacted(viewName);
    if (isCompacted && !isCurrentViewCompacted) {
        // the view is Compacted but not listed, so we need to add the view name
        const compactedViews = await getCompactedViews();
        await messenger.storage.local.set({
            compacted: [...compactedViews, viewName]
        });
    } else if (!isCompacted && isCurrentViewCompacted) {
        // the view is Compacted but not listed, so we need to add the view name
        const compactedViews = await getCompactedViews();
        await messenger.storage.local.set({
            compacted: compactedViews.filter((view) => viewName !== view)
        });
    }
};

var FolderPaneSwitcher = {
    windowData: new Map(),

    setSingleMode: async function (windowId, modeName) {
        let activeModes = await messenger.FPVS.getActiveViewModes(windowId);
        let currModes = activeModes.slice();

        log({ currModes, modeName, activeModes });

        if (!activeModes.includes(modeName)) {
            await messenger.FPVS.toggleActiveViewMode(windowId, modeName);
        }

        for (let viewName of currModes) {
            if (viewName != modeName) {
                await messenger.FPVS.toggleActiveViewMode(windowId, viewName);
            }
        }

        const compact = await isViewCompacted(modeName);
        await messenger.FPVS.toggleCompactMode(windowId, compact);

        log(`toggle compact view ${modeName}: `, compact);
    },

    getCurrentViewSelections: async function (windowId) {
        let { modes: activeModes, isCompactView } =
            await messenger.FPVS.getActiveViewModesEx(windowId);
        let { arrowViews: selectedViews } = await messenger.storage.local.get(
            "arrowViews"
        );

        let currentView = activeModes[activeModes.length - 1];

        return { selectedViews, currentView, isCompactView };
    },

    storeCurrentCompactViewState: async function (windowId) {
        let { currentView, selectedViews, isCompactView } =
            await this.getCurrentViewSelections(windowId);

        await setCompactedView(currentView, isCompactView);

        return { currentView, selectedViews };
    },

    goForwardView: async function (windowId) {
        let { currentView, selectedViews } =
            await this.storeCurrentCompactViewState(windowId);
        let currInd = selectedViews.findIndex((name) => name == currentView);

        currInd = (currInd + 1) % selectedViews.length;

        let nextMode = selectedViews[currInd];
        FolderPaneSwitcher.setSingleMode(windowId, nextMode);
    },

    goBackView: async function (windowId) {
        let { currentView, selectedViews } =
            await this.storeCurrentCompactViewState(windowId);

        let currInd = selectedViews.findIndex((name) => name == currentView);
        currInd = (currInd + selectedViews.length - 1) % selectedViews.length;

        let nextMode = selectedViews[currInd];

        FolderPaneSwitcher.setSingleMode(windowId, nextMode);
    },

    onDragEnter: async function (windowId, aEvent) {
        log(`onDragEnter(${windowId}, ${aEvent?.type})`);
        if (!FolderPaneSwitcher.windowData.get(windowId).timer) {
            FolderPaneSwitcher.windowData.get(windowId).cachedView = null;
        }

        if (FolderPaneSwitcher.windowData.get(windowId).cachedView) {
            log("onDragEnter: switch already in progress");
        } else {
            log("onDragEnter resettimer");
            FolderPaneSwitcher.resetTimer(windowId);
            await this.storeCurrentCompactViewState(windowId);
        }
    },

    onDragLeaveFolderPane: function (windowId, aEvent) {
        log(`onDragLeaveFolderPane(${windowId}, ${aEvent?.type})`);
        //log("leaveFolderPane", FolderPaneSwitcher.windowData.get(windowId).cachedView, FolderPaneSwitcher.windowData.get(windowId).timer, FolderPaneSwitcher.windowData.get(windowId).watchTimer);

        if (
            FolderPaneSwitcher.windowData.get(windowId).cachedView &&
            !FolderPaneSwitcher.windowData.get(windowId).timer
        ) {
            //log("reset onDragLeaveFolderPane cached view", FolderPaneSwitcher.windowData.get(windowId).cachedView);
            FolderPaneSwitcher.setSingleMode(
                windowId,
                FolderPaneSwitcher.windowData.get(windowId).cachedView
            );
            FolderPaneSwitcher.windowData.get(windowId).cachedView = null;
            FolderPaneSwitcher.windowData.get(windowId).watchTimer = 0;
        }
    },

    onDragExit: function (windowId, aEvent) {
        log(`onDragExit(${windowId}, ${aEvent?.type})`);
        //log("dragexit should never happen as the bug is wontfix");
        if (FolderPaneSwitcher.windowData.get(windowId).timer) {
            window.clearTimeout(
                FolderPaneSwitcher.windowData.get(windowId).timer
            );
            FolderPaneSwitcher.windowData.get(windowId).timer = 0;
            log("kill timer");
        }
        if (FolderPaneSwitcher.windowData.get(windowId).watchTimer) {
            window.clearTimeout(
                FolderPaneSwitcher.windowData.get(windowId).watchTimer
            );
            FolderPaneSwitcher.windowData.get(windowId).watchTimer = 0;
            log("kill watchTimer");
        }
    },

    onDragDrop: function (windowId, aEvent) {
        log(`onDragDrop(${windowId}, ${aEvent?.type})`);
        if (FolderPaneSwitcher.windowData.get(windowId).timer) {
            //so we don't double call setSingleMode
            window.clearTimeout(
                FolderPaneSwitcher.windowData.get(windowId).timer
            );
            FolderPaneSwitcher.windowData.get(windowId).timer = 0;
            log("kill timer");
        }
        if (FolderPaneSwitcher.windowData.get(windowId).watchTimer) {
            window.clearTimeout(
                FolderPaneSwitcher.windowData.get(windowId).watchTimer
            );
            FolderPaneSwitcher.windowData.get(windowId).watchTimer = 0;
            log("kill watchTimer");
        }

        if (FolderPaneSwitcher.windowData.get(windowId).cachedView) {
            //log("reset cached view", FolderPaneSwitcher.windowData.get(windowId).cachedView);
            FolderPaneSwitcher.setSingleMode(
                windowId,
                FolderPaneSwitcher.windowData.get(windowId).cachedView
            );
            FolderPaneSwitcher.windowData.get(windowId).cachedView = null;
        }
    },

    timerCallback: {
        notify: async function (windowId) {
            //log("timerCallback.notify");
            let activeViews = await messenger.FPVS.getActiveViewModes(windowId);
            FolderPaneSwitcher.windowData.get(windowId).cachedView =
                activeViews[activeViews.length - 1];
            //log("cachedmode", FolderPaneSwitcher.windowData.get(windowId).cachedView);
            FolderPaneSwitcher.setSingleMode(windowId, "all");

            //     FolderPaneSwitcher.windowData.get(windowId).timer = 0;
            FolderPaneSwitcher.windowData.get(windowId).watchTimer =
                window.setTimeout(
                    FolderPaneSwitcher.watchTimerCallback.notify,
                    1500,
                    windowId
                );
        }
    },

    watchTimerCallback: {
        //needed because drop/dragend is not fired on folderPaneHeader
        notify: async function (windowId) {
            //log("watchTimerCallback.notify");
            FolderPaneSwitcher.windowData.get(windowId).timer = 0;
            if (FolderPaneSwitcher.windowData.get(windowId).cachedView) {
                //    FolderPaneSwitcher.windowData.get(windowId).cachedView = null;
                let inDragSession = await messenger.FPVS.inDragSession(
                    windowId
                );
                //log("watchtimer indragsession", inDragSession);
                if (!inDragSession) {
                    FolderPaneSwitcher.onDragDrop(windowId, {
                        type: "watchTimer"
                    });
                }
            }
            if (!FolderPaneSwitcher.windowData.get(windowId).cachedView) {
                //there is intentionally no else because of the side effects of the await above
                // It's null either because we just called onDragDrop or
                // because something else finished the drop.
                //       FolderPaneSwitcher.windowData.get(windowId).watchTimer.cancel();
                //window.clearTimeout(FolderPaneSwitcher.windowData.get(windowId).watchTimer);

                FolderPaneSwitcher.windowData.get(windowId).watchTimer = 0;
                FolderPaneSwitcher.windowData.get(windowId).timer = 0;
            }
        }
    },

    resetTimer: async function (windowId) {
        if (!FolderPaneSwitcher.windowData.get(windowId).timer) {
            //log("resettimer");
            FolderPaneSwitcher.windowData.get(windowId).cachedView = null;
            let delay = await messenger.storage.local.get("delay");
            FolderPaneSwitcher.windowData.get(windowId).timer =
                window.setTimeout(
                    FolderPaneSwitcher.timerCallback.notify,
                    delay.delay,
                    windowId
                );
            //log("delay", delay, FolderPaneSwitcher.windowData.get(windowId).timer);
        }

        // if (FolderPaneSwitcher.windowData.get(windowId).timer) {
        //   window.clearTimeout(FolderPaneSwitcher.windowData.get(windowId).timer);
        //   FolderPaneSwitcher.windowData.get(windowId).timer = 0;
        // };
        // //log("resettimer");
        //    let delay = await messenger.storage.local.get("delay");
        // FolderPaneSwitcher.windowData.get(windowId).timer = window.setTimeout(FolderPaneSwitcher.timerCallback.notify, delay.delay, FolderPaneSwitcher);
        // //log("delay", delay, FolderPaneSwitcher.windowData.get(windowId).timer);
    }
};

async function dragDropListener(windowId, event, type) {
    // type is currently ignored by all consumers.
    switch (event) {
        case "onDragDrop":
            FolderPaneSwitcher.onDragDrop(windowId, { type: "onDragDrop" });
            break;
        case "onDragLeave":
            FolderPaneSwitcher.onDragDrop(windowId, { type: "onDragLeave" });
            break;
        case "onDragLeaveFolderPane":
            FolderPaneSwitcher.onDragLeaveFolderPane(windowId, {
                type: "onDragLeaveFolderPane"
            });
            break;
        case "onDragEnter":
            FolderPaneSwitcher.onDragEnter(windowId);
            break;
        case "folderListener": //this replaces an event indicating that the message/folder drop is finished
            //log("bgr folderListener", info.type);//, info.folder);
            FolderPaneSwitcher.onDragDrop(windowId, { type });
            break;
    }
}

messenger.commands.onCommand.addListener(async (command, tab) => {
    const findWindowId = async () => {
        if (tab) {
            const { windowId } = tab;
            return windowId;
        } else {
            const { id } = await messenger.windows.getLastFocused();
            if (typeof id === "number") {
                return id;
            }
        }

        return null;
    };

    const windowId = await findWindowId();

    log(`Command? `, { windowId });

    if (windowId !== null) {
        switch (command) {
            case "fpvs_folder_next":
                await FolderPaneSwitcher.goForwardView(`${windowId}`);
                break;
            case "fpvs_folder_back":
                await FolderPaneSwitcher.goBackView(`${windowId}`);
                break;
        }
    }
});

async function main() {
    const windows = await messenger.windows.getAll();
    for (let window of windows) {
        await manipulateWindow(window);
    }

    messenger.windows.onCreated.addListener(async (window) => {
        await manipulateWindow(window);
    });

    // for future use, currently, event on tree is not firing
    // messenger.messages.onMoved.addListener( async (originalMessages, movedMessages) =>
    // {
    //   let lastHoveredFolder = await messenger.FPVS.getLastHoveredFolder();
    //   let newFolder = movedMessages.messages[0].folder;
    //   //log("folder, ", lastHoveredFolder);
    //   //log("eqhul", lastHoveredFolder.toString() == newFolder.toString() , movedMessages);
    //   FolderPaneSwitcher.onDragDrop({ type: "msgsMoveCopyCompleted" });

    // });

    messenger.FPVS.onDragDrop.addListener(dragDropListener);
}

main()
    .then(() => log(`FolderPaneViewSwitcher is initialized`))
    .catch((err) => console.error("FPVS", err));
