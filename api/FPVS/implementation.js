/* eslint-disable object-shorthand */

"use strict";

(function (exports) {
    var { ExtensionCommon } = ChromeUtils.import(
        "resource://gre/modules/ExtensionCommon.jsm"
    );
    const { ExtensionUtils } = ChromeUtils.import(
        "resource://gre/modules/ExtensionUtils.jsm"
    );
    var { ExtensionSupport } = ChromeUtils.import(
        "resource:///modules/ExtensionSupport.jsm"
    );
    var { MailServices } = ChromeUtils.import(
        "resource:///modules/MailServices.jsm"
    );
    var { Services } =
        globalThis.Services ||
        ChromeUtils.import("resource://gre/modules/Services.jsm");
    var { ExtensionError } = ExtensionUtils;

    /**
     * Finds the currently running Thunderbird version
     * @returns
     */
    const findThunderbirdVersion = (window) => {
        // ...or maybe head over to await messenger.runtime.getBrowserInfo()
        const agent = window.navigator.userAgent;
        const version = (agent || "").split("/").pop().split(".").shift();
        return Number.parseInt(version) || 0;
    };

    const get_about_3pane = (window, searchAllTabs = false) => {
        const tabmail = window.document.getElementById("tabmail");
        if (tabmail?.currentTabInfo.mode.name == "mail3PaneTab") {
            return tabmail.currentAbout3Pane;
        } else if (searchAllTabs) {
            const maybe3Pane =
                window.gTabmail?.tabInfo?.[0]?.chromeBrowser?.contentWindow;
            if (maybe3Pane) {
                return maybe3Pane;
            }

            const { length: tabCount } = window;

            for (let tabIndex = 0; tabIndex < tabCount; tabIndex++) {
                const anyTab = window[tabIndex];

                if (anyTab && anyTab.name.startsWith("mail3PaneTabBrowser")) {
                    return anyTab;
                }
            }
        }
        throw new Error("The current tab is not a mail3PaneTab.");
    };

    let windowListener;
    const logEnabled = false;

    function log(...a) {
        if (logEnabled) {
            console.log("FPVS Experiment", ...a);
        }
    }

    class WindowListener extends ExtensionCommon.EventEmitter {
        constructor(extension) {
            super();
            this.extension = extension;
            this.callbackCount = 0;
            this.currentFolder = new WeakMap();
        }

        get listenerId() {
            return `experiment_listener_${this.extension.uuid}_${this.extension.instanceId}`;
        }

        // Implements nsIMsgFolderListener
        msgsMoveCopyCompleted(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
            // We have to assume, that the folder action was on the active window.
            let mail3Pane = Services.wm.getMostRecentWindow("mail:3pane");

            if (aDestFolder == this.currentFolder.get(mail3Pane)) {
                // Still remotely possible that someone else could be copying
                // into the same folder at the same time as us, but this is
                // the best we can do until they fix the event bug.
                //  FolderPaneSwitcher.onDragDrop({ type: "msgsMoveCopyCompleted" });
                windowListener.emit(
                    "dragdrop",
                    mail3Pane,
                    "folderListener",
                    "msgsMoveCopyCompleted"
                );
            }
        }

        folderMoveCopyCompleted(aMove, aSrcFolder, aDestFolder) {
            if (aDestFolder == this.currentFolder.get(mail3Pane)) {
                // Still remotely possible that someone else could be copying
                // into the same folder at the same time as us, but this is
                // the best we can do until they fix the event bug.
                //         FolderPaneSwitcher.onDragDrop({ type: "folderMoveCopyCompleted" });
                windowListener.emit(
                    "dragdrop",
                    mail3Pane,
                    "folderListener",
                    "folderMoveCopyCompleted"
                );
            }
        }

        handleEvent(event) {
            // This function handles the events received from the window and forwards
            // them to the WebExtension by emitting a custom event (this is an EventEmitter)
            // with the information/parameters we want to send to the WebExtension event
            // listeners.
            let win = event.target.ownerGlobal;
            log(event.type);
            switch (event.type) {
                case "mouseout":
                    windowListener.emit(
                        "dragdrop",
                        win,
                        "onDragLeaveFolderPane"
                    );
                    break;
                case "dragend":
                    if (event.target.id == "folderPaneHeader") {
                        windowListener.emit("dragdrop", win, "onDragDrop");
                    }
                    break;
                case "dragenter":
                    if (event.originalTarget.id == "folderPaneHeader") {
                        windowListener.emit("dragdrop", win, "onDragEnter");
                    }
                    break;
                case "dragover":
                    this.currentFolder.set(
                        win,
                        win.gFolderTreeView.getFolderAtCoords(
                            event.clientX,
                            event.clientY
                        )
                    );
                    break;
                case "dragleave":
                    windowListener.emit("dragdrop", win, "onDragLeave");
                    break;
                default:
                    throw new Error(
                        `Encountered unknown event <${event.type}>`
                    );
            }
        }

        add(callback) {
            this.on("dragdrop", callback);
            this.callbackCount++;

            if (this.callbackCount == 1) {
                ExtensionSupport.registerWindowListener(this.listenerId, {
                    chromeURLs: ["chrome://messenger/content/messenger.xhtml"],
                    onLoadWindow: function (window) {
                        let folderPaneHeader =
                            window.document.getElementById("folderPaneHeader");
                        folderPaneHeader.addEventListener(
                            "mouseout",
                            windowListener,
                            false
                        );
                        folderPaneHeader.addEventListener(
                            "dragend",
                            windowListener,
                            false
                        );
                        folderPaneHeader.addEventListener(
                            "dragenter",
                            windowListener,
                            false
                        );

                        //left for testing when the new foldertree is enabled
                        //folderPaneHeader.addEventListener("drop", () => { log("foldpa drop"); }, false);
                        //folderPaneHeader.addEventListener("dragexit", () => { log("foldpa dragexit"); }, false);
                        //folderPaneHeader.addEventListener("dragover", () => { log("foldpa dragover"); }, false);
                        //folderPaneHeader.addEventListener("dragleave", () => { log("foldpa dragleave"); }, false);
                        //folderPaneHeader.addEventListener("mouseup", () => { log("foldpa mouseup"); }, false);
                        //folderPaneHeader.addEventListener("pointerup", () => { log("foldpa pointerup"); }, false);
                        //folderPaneHeader.addEventListener("dragover", () => { log("tree dragover"); }, false);
                        //folderTree.addEventListener("drop", () => { log("tree drop"); }, false);
                        //folderTree.addEventListener("dragend", () => { log("tree dragend"); }, false);

                        let folderTree =
                            window.document.getElementById("folderTree");
                        folderTree.addEventListener(
                            "dragover",
                            windowListener,
                            false
                        );
                        folderTree.addEventListener(
                            "dragleave",
                            windowListener,
                            false
                        );
                    }
                });

                // Dragexit and dragdrop don't actually get sent when the user
                // drops a message into a folder. This is arguably a bug in
                // Thunderbird (see bz#674807). To work around it, I register a
                // folder listener to detect when a move or copy is
                // completed. This is gross, but appears to work well enough.
                // By 2022, the bug is wontfix
                // This needs to be registered only once, not per window!
                MailServices.mfn.addListener(
                    this,
                    MailServices.mfn.msgsMoveCopyCompleted |
                        MailServices.mfn.folderMoveCopyCompleted
                );
            }
        }

        remove(callback) {
            this.off("dragdrop", callback);
            this.callbackCount--;

            if (this.callbackCount == 0) {
                log("Remove listener");
                for (let window of ExtensionSupport.openWindows) {
                    let location = new window.URL(window.location.href);
                    if (
                        ["chrome://messenger/content/messenger.xhtml"].includes(
                            location.origin
                        )
                    ) {
                        let folderPaneHeader =
                            window.document.getElementById("folderPaneHeader");
                        folderPaneHeader.removeEventListener(
                            "mouseout",
                            windowListener
                        );
                        folderPaneHeader.removeEventListener(
                            "dragend",
                            windowListener
                        );
                        folderPaneHeader.removeEventListener(
                            "dragenter",
                            windowListener
                        );

                        let folderTree =
                            window.document.getElementById("folderTree");
                        folderTree.removeEventListener(
                            "dragover",
                            windowListener
                        );
                        folderTree.removeEventListener(
                            "dragleave",
                            windowListener
                        );
                    }
                }
                ExtensionSupport.unregisterWindowListener(this.listenerId);

                // Dragexit and dragdrop don't actually get sent when the user
                // drops a message into a folder. This is arguably a bug in
                // Thunderbird (see bz#674807). To work around it, I register a
                // folder listener to detect when a move or copy is
                // completed. This is gross, but appears to work well enough.
                // By 2022, the bug is wontfix
                // This needs to be registered only once, not per window!
                MailServices.mfn.removeListener(this);
            }
        }
    }

    var FPVS = class extends ExtensionCommon.ExtensionAPI {
        // An alternative to defining a constructor here, is to use the onStartup
        // event. However, this causes the API to be instantiated directly after the
        // add-on has been loaded, not when the API is first used. Depends on what is
        // desired.
        constructor(extension) {
            super(extension);
            windowListener = new WindowListener(extension);
        }

        onChangePaneClick({ context, fire }) {
            const { extension } = this;
            const listener = async (_event, changeDirection) => {
                fire.async(changeDirection);
            };

            extension.on("changePaneClick", listener);
            return () => extension.off("changePaneClick", listener);
        }

        getAPI(context) {
            const get3PaneTab = (tabId) => {
                const { nativeTab } = context.extension.tabManager.get(
                    parseInt(tabId, 10)
                );
                if (
                    nativeTab &&
                    nativeTab.mode &&
                    nativeTab.mode.name == "mail3PaneTab"
                ) {
                    return nativeTab.chromeBrowser.contentWindow;
                }
                return null;
            };

            return {
                FPVS: {
                    initFolderPaneOptionsPopup: async function (windowId) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        let ready = false;
                        do {
                            const version = findThunderbirdVersion(mail3Pane);
                            log(
                                `version found: ${version}, source: ${mail3Pane.navigator.userAgent}`
                            );

                            if (version < 115) {
                                try {
                                    ready = mail3Pane.gFolderTreeView.isInited;
                                } catch (e) {
                                    log("treeIsReady Err", e.message);
                                }
                                log("treeIsReady", ready);
                            } else {
                                const the3pane = get_about_3pane(mail3Pane);
                                console.assert(
                                    Boolean(the3pane),
                                    `[found] `,
                                    the3pane
                                );
                                return;
                                throw new Error(
                                    `Folder Pane View Switcher couldn't start`
                                );
                            }
                            if (!ready) {
                                await new Promise((resolve) =>
                                    mail3Pane.setTimeout(resolve, 100)
                                );
                            }
                        } while (!ready);
                        mail3Pane.gFolderTreeView.initFolderPaneOptionsPopup();
                    },

                    getAny3Pane: async function () {
                        let windows =
                            await context.extension.windowManager.getAll();

                        for (let wnd of windows) {
                            if (wnd.window && wnd.window.document) {
                                let tab = get_about_3pane(wnd.window, true);
                                if (tab) {
                                    return tab;
                                }
                            }
                        }

                        return null;
                    },

                    getLastHoveredFolder: async function (windowId) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        return context.extension.folderManager.convert(
                            this.currentFolder.get(mail3Pane)
                        );
                    },

                    toggleCompactMode: async function (windowId, toggle) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        const version = findThunderbirdVersion(mail3Pane);
                        if (version < 115) {
                            mail3Pane.gFolderTreeView.toggleCompactMode(toggle);
                        } else {
                            const the3pane = await this.getAny3Pane();
                            the3pane.folderPane.isCompact = toggle;
                        }
                    },

                    getActiveViewModes: async function (windowId) {
                        const mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        const version = findThunderbirdVersion(mail3Pane);
                        if (version < 115) {
                            const modes = mail3Pane.gFolderTreeView.activeModes;
                            log("modes", modes);
                            return modes;
                        } else {
                            const the3pane = await this.getAny3Pane();
                            if (!the3pane.folderPane) {
                                console.error(
                                    "Do we have a 3pane and folderPane?",
                                    mail3Pane,
                                    the3pane
                                );
                            }
                            const activeModes = the3pane.folderPane.activeModes;
                            console.warn(
                                `the active modes: `,
                                activeModes,
                                the3pane.folderPane
                            );
                            return activeModes;
                        }
                    },

                    getActiveViewModesEx: async function (windowId) {
                        let isCompactView = false;
                        let modes = await this.getActiveViewModes(windowId);
                        let mayHasCompactView = modes.find(
                            (mode) => mode == "favorite" || mode == "unread"
                        );

                        if (mayHasCompactView) {
                            let mail3Pane =
                                context.extension.windowManager.get(
                                    windowId
                                ).window;

                            let tree;
                            const version = findThunderbirdVersion(mail3Pane);
                            if (version < 115) {
                                tree =
                                    mail3Pane.document.getElementById(
                                        "folderTree"
                                    );
                                // Interrupt if the popup has never been initialized.
                                if (tree) {
                                    isCompactView =
                                        mail3Pane.document
                                            .getElementById("folderTree")
                                            .getAttribute("compact") === "true";
                                }
                            } else {
                                const the3pane = await this.getAny3Pane();
                                isCompactView = the3pane.folderPane.isCompact;
                            }
                        }

                        log("FPVS[getActiveViewModesEx] ", {
                            isCompactView,
                            modes
                        });

                        return { modes, isCompactView };
                    },

                    getActiveViewModesExForTab: async function (tabId) {
                        try {
                            const the3pane = get3PaneTab(tabId);
                            const activeModes = the3pane.folderPane.activeModes;

                            let isCompactView = false;
                            let mayHasCompactView = activeModes.find(
                                (mode) => mode == "favorite" || mode == "unread"
                            );

                            if (mayHasCompactView) {
                                isCompactView = the3pane.folderPane.isCompact;
                            }
                            log("FPVS[getActiveViewModesExForTab] ", {
                                isCompactView,
                                activeModes
                            });

                            return { activeModes, isCompactView };
                        } catch (experimentError) {
                            throw new ExtensionError(
                                `${experimentError.message}, file: ${experimentError.fileName}, line: ${experimentError.lineNumber}`
                            );
                        }
                    },

                    getAllViewModes: async function (windowId) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;

                        const version = findThunderbirdVersion(mail3Pane);
                        if (version < 115) {
                            let allViews = mail3Pane.gFolderTreeView._modeNames;
                            log("allModes", allViews);
                            return allViews;
                        } else {
                            const the3Pane = await this.getAny3Pane();
                            log("getAllViewModes", the3Pane);
                            const viewModes = Object.keys(
                                the3Pane.folderPane._modes
                            );
                            return viewModes;
                        }
                    },

                    inDragSession: async function (windowId) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        let dragService = Components.classes[
                            "@mozilla.org/widget/dragservice;1"
                        ].getService(Components.interfaces.nsIDragService);
                        let dragSession = dragService.getCurrentSession();
                        let isInDragSession =
                            dragSession?.sourceNode?.ownerGlobal == mail3Pane;
                        log("leg dragsession", dragSession, isInDragSession);
                        return isInDragSession;
                    },

                    getLegacyPrefs: async function () {
                        log("getLegacyPrefs");

                        let fpvsPrefRoot = "extensions.FolderPaneSwitcher.";
                        let viewsBranch = Services.prefs.getBranch(
                            fpvsPrefRoot + "views."
                        );
                        let prefs = {};

                        let mail3Pane =
                            Services.wm.getMostRecentWindow("mail:3pane");
                        let allViews = mail3Pane.gFolderTreeView._modeNames;
                        log("allviews", allViews);

                        try {
                            prefs.delay = {
                                delay: Services.prefs.getIntPref(
                                    fpvsPrefRoot + "delay"
                                )
                            };
                            conFPVSsole.log("del", prefs.delay);
                        } catch (e) {}
                        try {
                            prefs.arrows = {
                                arrows: Services.prefs.getBoolPref(
                                    fpvsPrefRoot + "arrows"
                                )
                            };
                        } catch (e) {}

                        prefs.prefs = {};

                        let children = viewsBranch.getChildList(""); //, obj);
                        log("children", children);
                        let regex = /^(\d+)\./;
                        for (let child of children) {
                            let match = regex.exec(child);
                            let num = match[1];
                            let name = viewsBranch.getStringPref(num + ".name");
                            let arrow = viewsBranch.getBoolPref(
                                num + ".arrows_enabled"
                            );
                            let menu = viewsBranch.getBoolPref(
                                num + ".menu_enabled"
                            );

                            //       if (["all", "smart", "recent", "favorite", "unread"].includes (name) )  prefs.prefs[name] = {"arrow": arrow, "menu": menu, "pos": -1};
                            if (allViews.includes(name))
                                prefs.prefs[name] = {
                                    arrow: arrow,
                                    menu: menu,
                                    pos: -1
                                };
                        }

                        log("prefs", prefs);

                        return prefs;
                    },

                    getViewDisplayName: async function (windowId, commonName) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        const version = findThunderbirdVersion(mail3Pane);
                        if (version < 115) {
                            let key = "folderPaneModeHeader_" + commonName;
                            let nameString =
                                mail3Pane.gFolderTreeView.messengerBundle.getString(
                                    key
                                );
                            log("legname", nameString);
                            return nameString;
                        }
                    },

                    // only in pre-115
                    showViewInMenus: async function (windowId, view, enabled) {
                        log("showViewInMenus");
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        let item = mail3Pane.document.querySelector(
                            `#folderPaneOptionsPopup [value=${view}]`
                        );
                        if (item != null) {
                            item.hidden = !enabled;
                        }
                        item = mail3Pane.document.querySelector(
                            `#menu_FolderViewsPopup [value=${view}]`
                        );
                        if (item != null) {
                            item.hidden = !enabled;
                        }
                        item = mail3Pane.document.querySelector(
                            `#appMenu-foldersView [value=${view}]`
                        );
                        if (item != null) {
                            item.setAttribute("hidden", !enabled);
                        }
                    },

                    toggleElementHidden: async function (
                        windowId,
                        should_be_hidden
                    ) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        let backButton = mail3Pane.document.getElementById(
                            "FolderPaneSwitcher-back-arrow-button"
                        );
                        let forwardButton = mail3Pane.document.getElementById(
                            "FolderPaneSwitcher-forward-arrow-button"
                        );

                        let is_hidden = !!backButton.hidden;
                        if (should_be_hidden != is_hidden) {
                            backButton.hidden = should_be_hidden;
                            forwardButton.hidden = should_be_hidden;
                        }
                    },

                    toggleActiveViewMode: async function (windowId, view) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        const version = findThunderbirdVersion(mail3Pane);
                        if (version < 115) {
                            mail3Pane.gFolderTreeView.activeModes = view;
                        } else {
                            // const the3pane = get_about_3pane(mail3Pane);
                            const the3pane = await this.getAny3Pane();
                            log(this.toggleActiveViewMode.name, {
                                the3pane,
                                folderPane: the3pane?.folderPane,
                                view
                            });
                            the3pane.folderPane.activeModes = [view];
                        }
                    },

                    toggleActiveViewModeForTab: async function (
                        _,
                        tabId,
                        view
                    ) {
                        try {
                            const the3pane = get3PaneTab(tabId);
                            the3pane.folderPane.activeModes = [view];
                        } catch (experimentError) {
                            console.trace();
                            throw new ExtensionError(
                                `${experimentError.message}, file: ${experimentError.fileName}, line: ${experimentError.lineNumber}`
                            );
                        }
                    },

                    setAllActiveViews: async function (windowId, views) {
                        let mail3Pane =
                            context.extension.windowManager.get(
                                windowId
                            ).window;
                        log("views", views, views.split(","));
                        mail3Pane.gFolderTreeView._activeModes =
                            views.split(",");
                    },

                    initUI: async function (tabId, i18n, props) {
                        try {
                            const contentWindow = get3PaneTab(tabId);
                            const { showArrows, menuViews } = props;
                            if (contentWindow) {
                                const document = contentWindow.document;
                                const initializeUI = () => {
                                    // document.onreadystatechange
                                    log(
                                        "new tab starts initializing",
                                        document.readyState
                                    );
                                    const folderPaneHeaderBar =
                                        document.getElementById(
                                            "folderPaneHeaderBar"
                                        );

                                    const preExistingContainer =
                                        document.getElementById(
                                            "fpvs-container"
                                        );
                                    if (preExistingContainer) {
                                        preExistingContainer.remove();
                                    }

                                    if (showArrows) {
                                        const fpvsContainer =
                                            document.createElement("div");
                                        fpvsContainer.id = "fpvs-container";
                                        fpvsContainer.style.minWidth = "50px";

                                        const buttonBackPane =
                                            document.createElement("button");
                                        buttonBackPane.title =
                                            i18n.backButtonLabel;
                                        buttonBackPane.classList.add(
                                            "button",
                                            "button-flat",
                                            "icon-button",
                                            "icon-only"
                                        );
                                        buttonBackPane.style.backgroundImage =
                                            "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAOCAYAAAAbvf3sAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QUQFgILNHreoAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAA/ElEQVQoz42RsUrDYBCAT0dDOogEsnUUAn0VIVNx8gUCQhDpXik4uWfzCRw6Zsnq8Gf6IUggUbeQySHY0D+fW4k1sT04uOH77rg7kZEA+vXFdrt9MMa8HwPfNk1ThGFIURT1KNx1nQcU6/Ua27YREbTW9VDHKfCotWY+nyMiu9Ra1/vwPfAZBAGTyeQXvBOMMSfAZdu2b3EcY1nWH3B/wlOSJPi+Pwr2hVMRmTqOI0opOTqAG+BjuVziuu5/E9q+dA7c5XneLhaLQSFN083QWc+Al7Ismc1mw8LIh6+A1yiK8DwPEUEptTm0mwVcV1X1vVqtyLLsoNCvn4GvHw/h9W3z85x3AAAAAElFTkSuQmCC)";
                                        buttonBackPane.addEventListener(
                                            "click",
                                            async () => {
                                                context.extension.emit(
                                                    "changePaneClick",
                                                    "previous-pane"
                                                );
                                            }
                                        );
                                        const buttonNextPane =
                                            contentWindow.document.createElement(
                                                "button"
                                            );
                                        buttonNextPane.title =
                                            i18n.nextButtonLabel;
                                        buttonNextPane.classList.add(
                                            "button",
                                            "button-flat",
                                            "icon-button",
                                            "icon-only"
                                        );
                                        buttonNextPane.style.backgroundImage =
                                            "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAOCAYAAAAbvf3sAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QUQFgE6TomNWQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABCElEQVQoz42Sv0rDcBSFj46GdBAJZOsoBPIqQqfg5AsUhCDSPVJwcu/mEzh07NLVIZl+ECSQqFvo5FBMaPq5GKF/UnvgbPe7B869aprmfbVaPQAX+hWgTuV5vgjDkOVymQO3/0LGmIUkbNtmOp0C5Ov12uuEWqB1EAQYYwAegf5O4jYgiV6vx3A4BPgE7jegfUBry7KYzWbUdf0GXDZNc3IQaD0YDJjP5wBPpzpCcRzLcRxJ6ssYU3dtdl2XKIoAPoAbSVKSJNW+4dFoRJZlNXAHnP/FbQO+71MUBcALcLZTaxzHlSQ8z2MymQC8AledF0/TtBqPx5Rl+Q1cA9bBBoAv4Pmox5P0A+Ui9W110fJbAAAAAElFTkSuQmCC)";
                                        buttonNextPane.addEventListener(
                                            "click",
                                            async () => {
                                                context.extension.emit(
                                                    "changePaneClick",
                                                    "next-pane"
                                                );
                                            }
                                        );

                                        fpvsContainer.appendChild(
                                            buttonBackPane
                                        );
                                        fpvsContainer.appendChild(
                                            buttonNextPane
                                        );

                                        folderPaneHeaderBar.insertBefore(
                                            fpvsContainer,
                                            contentWindow.document.getElementById(
                                                "folderPaneMoreButton"
                                            ).nextElementSibling
                                        );
                                    }

                                    const menuItems = document.querySelectorAll(
                                        "#folderModesContextMenuPopup menuitem.folder-pane-mode"
                                    );

                                    const toggleMenuItem = (
                                        wnd,
                                        menuItem,
                                        show
                                    ) => {
                                        if (!show) {
                                            const oldDisplayState = wnd
                                                .getComputedStyle(menuItem)
                                                .getPropertyValue("display");
                                            menuItem.dataset.fpvsPreviousDisplayState =
                                                oldDisplayState;
                                            menuItem.style.display = "none";
                                        } else {
                                            const oldDisplayState =
                                                menuItem.dataset
                                                    .fpvsPreviousDisplayState;
                                            const currentDisplayState = wnd
                                                .getComputedStyle(menuItem)
                                                .getPropertyValue("display");
                                            if (
                                                currentDisplayState !== "none"
                                            ) {
                                                return;
                                            }

                                            menuItem.style.display =
                                                oldDisplayState;
                                            menuItem.dataset.fpvsPreviousDisplayState =
                                                undefined;
                                        }
                                    };
                                    menuItems.forEach((menuItem) => {
                                        toggleMenuItem(
                                            contentWindow,
                                            menuItem,
                                            menuViews.includes(menuItem.value)
                                        );
                                    });
                                };

                                if (document.readyState === "complete") {
                                    initializeUI();
                                } else {
                                    log(
                                        `postponing init of tabId ${tabId}`,
                                        contentWindow
                                    );
                                    return false;
                                }
                            } else {
                                throw new Error(
                                    `cannot initialize tabId '${tabId}'`
                                );
                            }
                        } catch (experimentError) {
                            // throw new ExtensionError(
                            console.error(
                                `${experimentError.message}, file: '${experimentError.fileName}', line: ${experimentError.lineNumber}`
                            );
                        }
                        return true;
                    },

                    // Instead of having individual WebExtension Events, we have a single
                    // "onDragDrop" event, which handles all drag-drop related events and has
                    // the specific event as a parameter.
                    onDragDrop: new ExtensionCommon.EventManager({
                        context,
                        name: "FPVS.onDragDrop",
                        register(fire) {
                            function callback(
                                emitter /* always "dragdrop" */,
                                win,
                                dragDropEventName,
                                extraData
                            ) {
                                let windowId = `${
                                    context.extension.windowManager.getWrapper(
                                        win
                                    ).id
                                }`;
                                return fire.async(
                                    windowId,
                                    dragDropEventName,
                                    extraData
                                );
                            }

                            windowListener.add(callback);
                            return function () {
                                windowListener.remove(callback);
                            };
                        }
                    }).api(),

                    onChangePaneClick: new ExtensionCommon.EventManager({
                        context,
                        module: "FPVS",
                        event: "onChangePaneClick",
                        register: (fire) =>
                            this.onChangePaneClick({ context, fire })
                    }).api()
                }
            };
        }
    };

    exports.FPVS = FPVS;
})(this);
