// @ts-check
/*
 * License:  MPL2
 */

import {
    createLogger,
    getArrowChksOrDefault,
    getArrowViewsOrDefault,
    getDelayOrDefault,
    getMenuViewsOrDefault,
    getPrefsOrDefault,
    initializeSettings
} from "./utils/index.js";

const logEnabled = false;

/**
 * Finds the currently running Thunderbird version
 * @returns
 */
const findThunderbirdVersion = (wnd = window) => {
    // ...or maybe head over to await messenger.runtime.getBrowserInfo()
    const agent = wnd.navigator.userAgent;
    const version = (agent || "").split("/").pop().split(".").shift();
    return Number.parseInt(version) || 0;
};

const { defDelay, defPrefs, defArrowViews, defMenuViews, defChk } =
    initializeSettings();

const log = createLogger("background", logEnabled);
const error = createLogger("background", logEnabled);

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    log("reason", reason);
    switch (reason) {
        case "install":
            {
                await messenger.storage.local.set({ updated: true });
                await messenger.storage.local.set({ prefs: defPrefs });
                await messenger.storage.local.set(defChk);
                await messenger.storage.local.set(defDelay);
                await messenger.storage.local.set({
                    arrowViews: defArrowViews
                });
                await messenger.storage.local.set({ menuViews: defMenuViews });
                await messenger.tabs.create({ url: "popup/installed.html" });
            }
            break;
        case "update": {
            //await messenger.storage.local.set({ "updated": false });
            //await messenger.storage.local.remove( "updated");
            await messenger.tabs.create({ url: "popup/update.html" });

            //update from old prefs?
            let { updated } = await messenger.storage.local.get({
                updated: false
            });

            if (!updated) {
                await messenger.storage.local.set({ updated: true });

                const storedLegacyPrefs = await messenger.FPVS.getLegacyPrefs();
                log("legacyPreferences from localStorage", storedLegacyPrefs);

                if ("delay" in storedLegacyPrefs) {
                    //log("del from exp", p.delay);
                    await messenger.storage.local.set(storedLegacyPrefs.delay);
                } else {
                    await messenger.storage.local.set(defDelay);
                }

                if ("arrows" in storedLegacyPrefs) {
                    await messenger.storage.local.set(storedLegacyPrefs.arrows);
                } else {
                    await messenger.storage.local.set(defChk);
                }

                let migratedArrowViews = [];
                let migratedMenuViews = [];
                let migratedPrefs = { compacted: [] };

                for (let view in storedLegacyPrefs.prefs) {
                    //log("view", view, p.prefs[view], p.prefs[view]["arrow"]);

                    migratedPrefs[view] = storedLegacyPrefs.prefs[view];

                    if (storedLegacyPrefs.prefs[view]["arrow"])
                        migratedArrowViews.push(view);
                    if (storedLegacyPrefs.prefs[view].menu)
                        migratedMenuViews.push(view);
                }

                for (let view in migratedPrefs) {
                    messenger.FPVS.showViewInMenus(
                        view,
                        migratedPrefs[view]["menu"]
                    );
                }
                //log("update: defpref", defPrefs, arrowViews, menuViews);
                await messenger.storage.local.set({ prefs: migratedPrefs });
                await messenger.storage.local.set({
                    arrowViews: migratedArrowViews
                });
                await messenger.storage.local.set({
                    menuViews: migratedMenuViews
                });
                await messenger.storage.local.set({ updated: true });
            } else {
                log("updated without loading the legacy preferences");

                /* ensure that preferences are set */
                const prefs = await getPrefsOrDefault();
                const arrows = await getArrowChksOrDefault();
                const delay = await getDelayOrDefault();

                const menuViews = await getMenuViewsOrDefault();
                const arrowViews = await getArrowViewsOrDefault();

                log("stored prefs: ", {
                    prefs,
                    arrows,
                    delay,
                    menuViews,
                    arrowViews
                });
            }

            break;
        }
    }
});

async function manipulateWindow(wnd, i18n) {
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

    if (`${wnd.type}` !== "normal") {
        return;
    }

    let windowId = `${wnd.id}`;

    FolderPaneSwitcher.windowData.set(windowId, {
        cachedView: null,
        timer: 0,
        watchTimer: 0
    });

    const version = findThunderbirdVersion(window);
    if (version < 115) {
        await messenger.FPVS.initFolderPaneOptionsPopup(windowId);

        await messenger.LegacyMenu.add(windowId, {
            id: "FolderPaneSwitcher-forward-arrow-button",
            type: "toolbarButton",
            reference: "folderPaneOptionsButton",
            position: "before",
            label: "",
            image: "content/right-arrow.png",
            tooltip: i18n.nextButtonLabel || "Next View",
            className: "button-flat",
            tabIndex: 0
        });

        await messenger.LegacyMenu.add(windowId, {
            id: "FolderPaneSwitcher-back-arrow-button",
            type: "toolbarButton",
            reference: "FolderPaneSwitcher-forward-arrow-button",
            position: "before",
            label: "",
            image: "content/left-arrow.png",
            tooltip: i18n.backButtonLabel || "Previous View",
            className: "button-flat",
            tabIndex: 0
        });
    }
}

const manipulateTab = async (tabId, i18n) => {
    const { arrows: showArrows } = await getArrowChksOrDefault();
    const menuViews = await getMenuViewsOrDefault();
    return await messenger.FPVS.initUI(`${tabId}`, i18n, {
        showArrows,
        menuViews
    });
};

const onChangePaneClickHandler = async (changeDirection) => {
    const tabs = await messenger.tabs.query({
        active: true,
        // currentWindow: true
        lastFocusedWindow: true
    });
    log(tabs);
    if (tabs && tabs.length) {
        const { type, windowId, id: tabId } = tabs[0];

        log(`switching pane for tabId ${tabId}`);
        if (windowId !== null && tabId != null) {
            switch (changeDirection) {
                case "next-pane":
                    await FolderPaneSwitcher.goForwardView(
                        `${windowId}`,
                        `${tabId}`
                    );
                    break;
                case "previous-pane":
                    await FolderPaneSwitcher.goBackView(
                        `${windowId}`,
                        `${tabId}`
                    );
                    break;
            }
        }
    }
};

messenger.FPVS.onChangePaneClick.addListener(onChangePaneClickHandler);

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

    setSingleMode: async function (windowId, modeName, tabId = null) {
        let activeModes = await messenger.FPVS.getActiveViewModes(windowId);
        let currModes = activeModes.slice();

        log({ currModes, modeName, activeModes });

        const version = findThunderbirdVersion(window);
        if (version < 115) {
            if (!activeModes.includes(modeName)) {
                await messenger.FPVS.toggleActiveViewMode(windowId, modeName);
            }

            for (let viewName of currModes) {
                if (viewName != modeName) {
                    await messenger.FPVS.toggleActiveViewMode(
                        windowId,
                        viewName
                    );
                }
            }
        } else {
            if (tabId == null) {
                error(`No tab given to switch to`);
            }

            // toggle just the actual tab
            await messenger.FPVS.toggleActiveViewModeForTab(
                windowId,
                `${tabId}`,
                modeName
            );
        }

        const compact = await isViewCompacted(modeName);
        await messenger.FPVS.toggleCompactMode(windowId, compact);

        log(`toggle compact view ${modeName}: `, compact);
    },

    getCurrentViewSelections: async function (windowId, tabId = null) {
        const version = findThunderbirdVersion(window);
        if (version < 115) {
            let { modes: activeModes, isCompactView } =
                await messenger.FPVS.getActiveViewModesEx(windowId);
            let { arrowViews: selectedViews } =
                await messenger.storage.local.get("arrowViews");

            let currentView = activeModes[activeModes.length - 1];

            return { selectedViews, currentView, isCompactView };
        } else {
            let { activeModes, isCompactView } =
                await messenger.FPVS.getActiveViewModesExForTab(`${tabId}`);

            let selectedViews = await getArrowViewsOrDefault();

            let currentView = activeModes[activeModes.length - 1];

            return { selectedViews, currentView, isCompactView };
        }
    },

    storeCurrentCompactViewState: async function (windowId, tabId = null) {
        let { currentView, selectedViews, isCompactView } =
            await this.getCurrentViewSelections(windowId, tabId);

        await setCompactedView(currentView, isCompactView, tabId);

        return { currentView, selectedViews };
    },

    goForwardView: async function (windowId, tabId = null) {
        const version = findThunderbirdVersion(window);
        if (version >= 115 && (tabId == null || tabId == undefined)) {
            // in supernova we need a tab focused where the folder tree is visible
            log("cannot switch views, we need a visible folder tree");
            return;
        }

        let { currentView, selectedViews } =
            await this.storeCurrentCompactViewState(windowId, tabId);
        let currInd = selectedViews.findIndex((name) => name == currentView);

        currInd = (currInd + 1) % selectedViews.length;

        let nextMode = selectedViews[currInd];

        if (version < 115) {
            // once we have set the folder pane view for one tree, all trees are in sync
            await FolderPaneSwitcher.setSingleMode(windowId, nextMode);
        } else {
            // in supernova we have to iterate over all views
            await FolderPaneSwitcher.setSingleMode(windowId, nextMode, tabId);
        }
    },

    goBackView: async function (windowId, tabId = null) {
        const version = findThunderbirdVersion(window);
        if (version >= 115 && (tabId == null || tabId == undefined)) {
            // in supernova we need a tab focused where the folder tree is visible
            log("cannot switch views, we need a visible folder tree");
            return;
        }

        let { currentView, selectedViews } =
            await this.storeCurrentCompactViewState(windowId, tabId);

        let currInd = selectedViews.findIndex((name) => name == currentView);
        currInd = (currInd + selectedViews.length - 1) % selectedViews.length;

        let nextMode = selectedViews[currInd];

        if (version < 115) {
            // once we have set the folder pane view for one tree, all trees are in sync
            await FolderPaneSwitcher.setSingleMode(windowId, nextMode);
        } else {
            // in supernova we have to iterate over all views
            await FolderPaneSwitcher.setSingleMode(windowId, nextMode, tabId);
        }
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
                let inDragSession =
                    await messenger.FPVS.inDragSession(windowId);
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
    const tabs = await messenger.tabs.query({
        active: true,
        currentWindow: true
    });

    if (tabs && tabs.length) {
        const { type, windowId, id: tabId } = tabs[0];

        log(`Command? `, { windowId });

        if (windowId !== null) {
            switch (command) {
                case "fpvs_folder_next":
                    await FolderPaneSwitcher.goForwardView(
                        `${windowId}`,
                        `${tabId}`
                    );
                    break;
                case "fpvs_folder_back":
                    await FolderPaneSwitcher.goBackView(
                        `${windowId}`,
                        `${tabId}`
                    );
                    break;
            }
        }
    }
});

const setupUI = async () => {
    const i18n = {
        nextButtonLabel: messenger.i18n.getMessage("button_next_pane"),
        backButtonLabel: messenger.i18n.getMessage("button_back_pane")
    };

    // in supernova we need to inject the UI into every single tab
    const ensureTabIsManipulated = async (tabId, i18n) => {
        let success = await manipulateTab(tabId, i18n);
        let retries = 0;
        try {
            while (!success && retries < 10) {
                retries++;
                log(
                    `tabId ${tabId} not initialized, retrying... (${retries} of 10)`
                );
                await new Promise((resolve) => {
                    setTimeout(resolve, 250);
                });
                success = await manipulateTab(tabId, i18n);
            }
        } catch (e) {
            error(e);
            return false;
        }

        return success;
    };

    const manipulateAllTabs = async (mailTabs) => {
        if (mailTabs && mailTabs.length) {
            for (let tab of mailTabs) {
                await ensureTabIsManipulated(tab.id, i18n);
            }
        }
    };

    messenger.windows.onCreated.addListener(async ({ id }) => {
        log("new window created");
        const mailTabs = await messenger.tabs.query({
            mailTab: true,
            windowId: id
        });

        log("init all tabs in new window", mailTabs);
        await manipulateAllTabs(mailTabs);
    });

    messenger.tabs.onActivated.addListener(async ({ tabId }) => {
        const { mailTab } = await messenger.tabs.get(tabId);
        if (mailTab) {
            log(`re-init tabId ${tabId}`);
            await manipulateTab(tabId, i18n);
        }
    });

    const mailTabs = await messenger.tabs.query({ mailTab: true });
    await manipulateAllTabs(mailTabs);
};

async function main() {
    const version = findThunderbirdVersion(window);
    if (version < 115) {
        const i18n = {
            nextButtonLabel: messenger.i18n.getMessage("button_next_pane"),
            backButtonLabel: messenger.i18n.getMessage("button_back_pane")
        };
        const windows = await messenger.windows.getAll();

        for (let wnd of windows) {
            await manipulateWindow(wnd, i18n);
        }

        messenger.windows.onCreated.addListener(async (wnd) => {
            await manipulateWindow(wnd, i18n);
        });

        messenger.FPVS.onDragDrop.addListener(dragDropListener);
    } else {
        await setupUI();
    }
}

messenger.runtime.onMessage.addListener(async (msg) => {
    const { topic, payload } = msg;
    switch (topic) {
        case "options-refresh":
            await setupUI();
            break;
    }
});

main()
    .then(() => log(`FolderPaneViewSwitcher is initialized`))
    .catch((err) => console.error("FPVS", err));
