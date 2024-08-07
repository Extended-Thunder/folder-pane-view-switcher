import { findThunderbirdVersion, translate } from "../utils/index.js";
import { createLogger } from "../utils/index.js";

const logEnabled = false;
const log = createLogger("options", logEnabled);
const warn = createLogger({ name: "options", severity: "warn" }, logEnabled);
const error = createLogger({ name: "options", severity: "error" }, logEnabled);

const getMail3paneIds = async () => {
    let windows = await messenger.windows.getAll({
        windowTypes: ["normal"]
    });
    return windows.map((window) => `${window.id}`);
};

const setViewForArrows = (viewname, enabled) => {
    if (enabled) {
        if (!FPVSOptions.arrowViews.includes(viewname)) {
            FPVSOptions.arrowViews.push(viewname);
        }
    } else {
        FPVSOptions.arrowViews = FPVSOptions.arrowViews.filter(
            (value) => value != viewname
        );
    }
};

const loadPrefs = async () => {
    FPVSOptions.prefs = await messenger.storage.local.get("prefs");
    FPVSOptions.arrowChk = await messenger.storage.local.get("arrows");
    FPVSOptions.Delay = await messenger.storage.local.get("delay");

    for (view of FPVSOptions.gviews) {
        let elt = document.getElementById(view + "_arrow");
        elt.checked = FPVSOptions.prefs.prefs[view].arrow;

        elt = document.getElementById(view + "_menu");
        elt.checked = FPVSOptions.prefs.prefs[view].menu;
    }
};

const resetPrefs = async () => {
    for (let view of FPVSOptions.gviews) {
        let elt = document.getElementById(view + "_arrow");
        elt.checked = true;
        FPVSOptions.prefs.prefs[view].arrow = true;
        elt = document.getElementById(view + "_menu");
        elt.checked = true;
        FPVSOptions.prefs.prefs[view].menu = true;
    }

    let lblckbx_shFPA = document.getElementById(
        "FolderPaneSwitcher-arrows-checkbox"
    );
    FPVSOptions.arrowChk.arrows = true;
    lblckbx_shFPA.checked = true;
    lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-delay-textbox");
    FPVSOptions.delay.delay = 1000;
    lblckbx_shFPA.value = 1000;
};

const validatePrefs = async () => {
    FPVSOptions.arrowViews = [];
    FPVSOptions.menuViews = [];

    let mail3paneIds = await getMail3paneIds();
    for (let view of FPVSOptions.gviews) {
        let elt = document.getElementById(view + "_arrow");
        FPVSOptions.prefs.prefs[view].arrow = elt.checked;
        if (elt.checked) {
            FPVSOptions.arrowViews.push(view);
        }

        elt = document.getElementById(view + "_menu");
        FPVSOptions.prefs.prefs[view].menu = elt.checked;
        if (elt.checked) {
            FPVSOptions.menuViews.push(view);
        }

        mail3paneIds.forEach((mail3paneId) => {
            messenger.FPVS.showViewInMenus(mail3paneId, view, elt.checked);
        });
    }
    await messenger.storage.local.set(FPVSOptions.prefs);
    await messenger.storage.local.set({ arrowViews: FPVSOptions.arrowViews });
    await messenger.storage.local.set({ menuViews: FPVSOptions.menuViews });

    let lblckbx_shFPA = document.getElementById(
        "FolderPaneSwitcher-arrows-checkbox"
    );
    FPVSOptions.arrowChk.arrows = lblckbx_shFPA.checked;

    const version = findThunderbirdVersion(window);
    if (version < 115) {
        mail3paneIds.forEach((mail3paneId) => {
            messenger.FPVS.toggleElementHidden(
                mail3paneId,
                !lblckbx_shFPA.checked
            );
        });
    } else {
        await messenger.runtime.sendMessage({ topic: "options-refresh" });
    }

    lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-delay-textbox");
    FPVSOptions.delay.delay = lblckbx_shFPA.value;

    await messenger.storage.local.set(FPVSOptions.arrowChk);
    await messenger.storage.local.set(FPVSOptions.delay);

    let wnd = await messenger.tabs.getCurrent();
    browser.tabs.remove(wnd.id); //window.close();
};

const onLoad = async () => {
    try {
        FPVSOptions.prefs = await messenger.storage.local.get("prefs");
        FPVSOptions.arrowChk = await messenger.storage.local.get("arrows");
        FPVSOptions.delay = await messenger.storage.local.get("delay");

        document.title = browser.i18n.getMessage("appName");

        const heading = document.getElementById("heading");
        heading.textContent = browser.i18n.getMessage("appName");

        const lblckbx_shFPA = document.getElementById("lblckbx_showFPA");
        lblckbx_shFPA.textContent = browser.i18n.getMessage("lblckbx_showFPA");

        const lblFPV_dlytxtbx = document.getElementById(
            "lbl_FPV-delay-textbox"
        );
        lblFPV_dlytxtbx.textContent =
            browser.i18n.getMessage("lblnmbr_delayBFVS");

        const lbl_EnblDsbl = document.getElementById("lbl_EnblDsbl");
        lbl_EnblDsbl.textContent = browser.i18n.getMessage("lbl_EnblDsbl");

        const showArrowsCheckbox = document.getElementById(
            "FolderPaneSwitcher-arrows-checkbox"
        );
        showArrowsCheckbox.checked = FPVSOptions.arrowChk.arrows;

        const delayInputBox = document.getElementById(
            "FolderPaneSwitcher-delay-textbox"
        );
        delayInputBox.value = FPVSOptions.delay.delay;

        log(`prefs loaded, trying to get pane`, FPVSOptions);

        // Assuming the available views are the same in all windows, just read
        // the first window.
        const [mail3paneId] = await getMail3paneIds();
        FPVSOptions.gviews = await messenger.FPVS.getAllViewModes(mail3paneId);
        FPVSOptions.activeViews = await messenger.FPVS.getActiveViewModes(
            mail3paneId
        );

        const btn_ok = document.getElementById("btn_accept");
        btn_ok.addEventListener("click", async (_event) => {
            await validatePrefs();
        });

        const btn_cancel = document.getElementById("btn_extra1");

        btn_cancel.addEventListener("click", async function (event) {
            let wnd = await messenger.tabs.getCurrent();
            browser.tabs.remove(wnd.id); //window.close();
        });

        const btn_reset = document.getElementById("btn_reset");
        btn_reset.addEventListener("click", async (_event) => {
            resetPrefs();
        });

        const table = document.getElementById("tbl_enbldsblViews");
        let row_position = 0;

        log(`everything loaded`, FPVSOptions);

        for (let view of FPVSOptions.gviews) {
            const currentView = FPVSOptions?.prefs?.prefs?.[view];
            if (!currentView) {
                error(`Unsupported view found: `, {
                    version: window.navigator.userAgent,
                    view
                });
            }

            const row = table.insertRow(row_position);
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);

            const menu_checkbox = document.createElement("input");
            menu_checkbox.setAttribute("type", "checkbox");

            if (currentView.menu) {
                menu_checkbox.setAttribute("checked", true);
            } else {
                menu_checkbox.removeAttribute("checked");
            }
            menu_checkbox.checked = currentView.menu;

            const menuCheckboxId = view + "_menu";
            menu_checkbox.setAttribute("id", menuCheckboxId);
            cell1.appendChild(menu_checkbox);

            const arrowsCheckbox = document.createElement("input");
            const arrowsCheckboxId = view + "_arrow";
            arrowsCheckbox.setAttribute("id", arrowsCheckboxId);
            arrowsCheckbox.setAttribute("type", "checkbox");
            //console.log(view, "arraow", FPVSOptions.prefs.prefs[view].arrow);
            arrowsCheckbox.checked = currentView.arrow;

            cell2.appendChild(arrowsCheckbox);

            const label = document.createElement("label");

            const findViewNameText = async (viewName) => {
                if (findThunderbirdVersion(window) < 115) {
                    return await messenger.FPVS.getViewDisplayName(
                        mail3paneId,
                        viewName
                    );
                } else {
                    return (
                        messenger.i18n.getMessage(
                            `folderPaneModeHeader_${viewName}`
                        ) || viewName
                    );
                }
            };

            const text = await findViewNameText(view);

            label.appendChild(document.createTextNode(text));
            cell3.appendChild(label);
            table.appendChild(row);
            row_position + 1;
        }

        translate(document);
    } catch (err) {
        error(err);
    }
};

var FPVSOptions = {
    chkboxSt: [],

    arrowViews: [],

    activeViews: [],

    menuViews: [],

    menuChangeHandler: async function (event) {
        // let menu_checkbox = event.target;
        // menu_id = menu_checkbox.getAttribute("id");
        // arrows_id = menu_id.replace('menu', 'arrows');
        // let arrows_checkbox = document.getElementById(arrows_id);
        // let status = document.getElementById(menu_id).checked;
        // //arrows_checkbox.disabled=true;
        // document.getElementById(arrows_id).disabled = true;
        // if (menu_checkbox.checked) { //arrows_checkbox.disabled=false;
        //     document.getElementById(arrows_id).removeAttribute("disabled");
        // }
    },

    prefs: {},

    arrowChk: true,
    delay: 1000,
    gviews: null
};

window.addEventListener("load", onLoad, true);
