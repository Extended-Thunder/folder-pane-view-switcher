/**
 * Finds the currently running Thunderbird version
 * @returns {number} The used Thunderbird version or 0
 */
export const findThunderbirdVersion = (window) => {
    // ...or maybe head over to await browser.runtime.getBrowserInfo()
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
