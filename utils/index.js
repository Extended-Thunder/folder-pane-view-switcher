/**
 * Finds the currently running Thunderbird version
 * @returns {number} The used Thunderbird version or 0
 */
export const findThunderbirdVersion = (window) => {
    // ...or maybe head over to await messenger.runtime.getBrowserInfo()
    const agent = window.navigator.userAgent;
    const version = (agent || "").split("/").pop().split(".").shift();
    return Number.parseInt(version) || 0;
};

export const createLogger =
    (context, logEnabled) =>
    (...a) => {
        if (logEnabled) {
            if ("string" === typeof context) {
                console.log(`FPVS [${context}]`, ...a);
            } else if ("object" === typeof context) {
                const { severity, name } = context;
                switch (severity) {
                    case "error":
                        console.error(`FPVS ERROR [${name}]`, ...a);
                        break;
                    case "warn":
                        console.warn(`FPVS warning [${name}]`, ...a);
                        break;
                    default:
                    case "error":
                        console.log(`FPVS [${name}]`, ...a);
                        break;
                }
            }
        }
    };

export const initializeSettings = () => {
    const defPrefs = {
        all: { arrow: true, menu: true, pos: -1 },
        smart: { arrow: true, menu: true, pos: -1 },
        recent: { arrow: true, menu: true, pos: -1 },
        unread: { arrow: true, menu: true, pos: -1 },
        favorite: { arrow: true, menu: true, pos: -1 },
        arrows: true
    };
    const defArrowViews = ["all", "smart", "recent", "unread", "favorite"];
    const defMenuViews = ["all", "smart", "recent", "unread", "favorite"];

    const defDelay = { delay: 300 };
    const defChk = { arrows: true };

    const version = findThunderbirdVersion(window);
    if (version >= 115) {
        defPrefs.tags = {
            arrow: true,
            menu: true,
            pos: -1
        };
        defArrowViews.push("tags");
        defMenuViews.push("tags");
    }

    return { defPrefs, defArrowViews, defMenuViews, defDelay, defChk };
};

export const getPrefsOrDefault = async () => {
    const prefs = await messenger.storage.local.get("prefs");
    if (Object.keys(prefs).length == 0) {
        const { defPrefs } = initializeSettings();
        await messenger.storage.local.set({ prefs: defPrefs });
        return defPrefs;
    }
    return prefs;
};

export const getArrowChksOrDefault = async () => {
    const prefs = await messenger.storage.local.get("arrows");
    if (Object.keys(prefs).length == 0) {
        const { defPrefs } = initializeSettings();
        await messenger.storage.local.set({ arrows: true });
        return defPrefs;
    }
    return prefs;
};

export const getMenuViewsOrDefault = async () => {
    const { menuViews } = await messenger.storage.local.get("menuViews");
    if (Array.isArray(menuViews)) {
        return menuViews;
    }

    const { defMenuViews } = initializeSettings();
    await messenger.storage.local.set({ menuViews: defMenuViews });

    return defMenuViews;
};

export const getArrowViewsOrDefault = async () => {
    const { arrowViews } = await messenger.storage.local.get("arrowViews");
    if (Array.isArray(arrowViews)) {
        return arrowViews;
    }

    const { defArrowViews } = initializeSettings();
    await messenger.storage.local.set({ arrowViews: defArrowViews });

    return defArrowViews;
};

export const getDelayOrDefault = async () => {
    const delay = await messenger.storage.local.get("delay");
    if (Object.keys(delay) == 0) {
        const { defDelay } = initializeSettings();
        await messenger.storage.local.set(defDelay);
        return defDelay;
    }
    return delay;
};

export const translate = (doc) => {
    /**
     * @type {HTMLElement[]}
     */
    const elements = Array.from(doc.querySelectorAll("[data-i18n]"));
    elements.forEach((element) => {
        const text = messenger.i18n.getMessage(element.dataset["i18n"]);
        element.insertBefore(doc.createTextNode(text), element.firstChild);
    });
};
