
var FPVSOptions = {
    chkboxSt: [],


    arrowViews: [],

    activeViews: [],

    menuViews: [],

    menuChangeHandler: async function (event) {

        // var menu_checkbox = event.target;
        // menu_id = menu_checkbox.getAttribute("id");

        // arrows_id = menu_id.replace('menu', 'arrows');
        // var arrows_checkbox = document.getElementById(arrows_id);
        // let status = document.getElementById(menu_id).checked;
        // //arrows_checkbox.disabled=true;
        // document.getElementById(arrows_id).disabled = true;
        // if (menu_checkbox.checked) { //arrows_checkbox.disabled=false;
        //     document.getElementById(arrows_id).removeAttribute("disabled");
        // }
    },

    prefs: {},

    loadPrefs: async function () {
        var i = 0;
        FPVSOptions.prefs = await browser.storage.local.get("prefs");
        FPVSOptions.arrowChk = await browser.storage.local.get("arrows");
        FPVSOptions.Delay = await browser.storage.local.get("delay");


        for (view of FPVSOptions.gviews) {
            var elt = document.getElementById(view + "_arrow");
            elt.checked = FPVSOptions.prefs.prefs[view].arrow;

            elt = document.getElementById(view + "_menu");
            elt.checked = FPVSOptions.prefs.prefs[view].menu;

        };
    },
    arrowChk: true,
    delay: 1000,
    gviews: null,
    onLoad: async function () {
        try {
            console.log("options");
           // FPVSOptions.prefs = await browser.storage.local.get("prefs");
            //console.log("prefs", FPVSOptions.prefs);
            FPVSOptions.arrowChk = await browser.storage.local.get("arrows");
            FPVSOptions.delay = await browser.storage.local.get("delay");

            //console.log("arrows", FPVSOptions.arrowChk.arrows, FPVSOptions.delay);


            document.title = browser.i18n.getMessage("appName");;
            var heading = document.getElementById("heading");
            heading.textContent = browser.i18n.getMessage("appName");

            var lblckbx_shFPA = document.getElementById("lblckbx_showFPA");
            var lblFPV_dlytxtbx = document.getElementById("lbl_FPV-delay-textbox");
            var lbl_EnblDsbl = document.getElementById("lbl_EnblDsbl");
            var table = document.getElementById("tbl_enbldsblViews");


            lblckbx_shFPA.textContent = browser.i18n.getMessage("lblckbx_showFPA");
            lblFPV_dlytxtbx.textContent = browser.i18n.getMessage("lblnmbr_delayBFVS");
            lbl_EnblDsbl.textContent = browser.i18n.getMessage("lbl_EnblDsbl");


            var lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-arrows-checkbox");
            lblckbx_shFPA.checked = FPVSOptions.arrowChk.arrows;

            var lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-delay-textbox");
            lblckbx_shFPA.value = FPVSOptions.delay.delay;

            FPVSOptions.gviews = await messenger.Utilities.getAllViewModes();
            FPVSOptions.activeViews = await messenger.Utilities.getActiveViewModes();
            //console.log("actviews", FPVSOptions.activeViews);

            var btn_ok = document.getElementById("btn_accept");

            var btn_cancel = document.getElementById("btn_extra1");

            let btn_reset = document.getElementById("btn_reset");
            btn_cancel.addEventListener("click", async function (event) {
                let wnd = await browser.tabs.getCurrent();
                browser.tabs.remove(wnd.id);  //window.close();

            });
            btn_ok.addEventListener("click", function (event) {
                FPVSOptions.validatePrefs();
            });

            btn_reset.addEventListener("click", async function (event) {
                FPVSOptions.resetPrefs();
            });

            var row_position = 0;
            for (view of FPVSOptions.gviews) {
                var row = table.insertRow(row_position);
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);

                var menu_checkbox = document.createElement("input");
                menu_checkbox.setAttribute('type', 'checkbox');

                if (FPVSOptions.prefs.prefs[view].menu) menu_checkbox.setAttribute("checked", true); else menu_checkbox.removeAttribute("checked");
                menu_checkbox.checked = FPVSOptions.prefs.prefs[view].menu;


                var box_id = view + "_menu";
                menu_checkbox.setAttribute("id", box_id);
                cell1.appendChild(menu_checkbox);
                var arrows_checkbox = document.createElement("input");
                box_id = view + "_arrow";
                arrows_checkbox.setAttribute("id", box_id);
                arrows_checkbox.setAttribute('type', 'checkbox');
                //console.log(view, "arraow", FPVSOptions.prefs.prefs[view].arrow);
                arrows_checkbox.checked = FPVSOptions.prefs.prefs[view].arrow;

                cell2.appendChild(arrows_checkbox);

                var label = document.createElement("label");

                var y = await browser.Utilities.getViewDisplayName(view);
                //console.log("name", y);
                label.appendChild(document.createTextNode(y));
                cell3.appendChild(label);
                table.appendChild(row);
                row_position + 1;

            }

        }

        catch (err) {
            alert(err);
        }
    },

    setViewForArrows: function (viewname, enabled) {
        if (enabled) {
            if (!FPVSOptions.arrowViews.includes(viewname)) FPVSOptions.arrowViews.push(viewname);

        } else {
            FPVSOptions.arrowViews = FPVSOptions.arrowViews.filter(value => value != viewname);
        };

        //    //if current view is no longer in selectedViews, then set selectedViews[0]
        //    if (!FolderPaneSwitcher.selectedViews.includes(gFolderTreeView.activeModes[gFolderTreeView.activeModes.length - 1]))
        //      FolderPaneSwitcher.setSingleMode(FolderPaneSwitcher.selectedViews[0]);


    },

    resetPrefs: async function (event) {

        //console.log("resetprefs", FPVSOptions.prefs);
        for (view of FPVSOptions.gviews) {
            let elt = document.getElementById(view + "_arrow");
            elt.checked = true;
            FPVSOptions.prefs.prefs[view].arrow = true;
            elt = document.getElementById(view + "_menu");
            elt.checked = true;
            FPVSOptions.prefs.prefs[view].menu = true;

        };

        lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-arrows-checkbox");
        FPVSOptions.arrowChk.arrows = true;
        lblckbx_shFPA.checked = true;
        lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-delay-textbox");
        FPVSOptions.delay.delay = 1000;
        lblckbx_shFPA.value = 1000;
    },

    validatePrefs: async function (event) {
        FPVSOptions.arrowViews = [];
        FPVSOptions.menuViews = [];

        //console.log("prefs", FPVSOptions.prefs);
        for (view of FPVSOptions.gviews) {
            let elt = document.getElementById(view + "_arrow");
            FPVSOptions.prefs.prefs[view].arrow = elt.checked;
            if (elt.checked) FPVSOptions.arrowViews.push(view);
            elt = document.getElementById(view + "_menu");
            FPVSOptions.prefs.prefs[view].menu = elt.checked;
            if (elt.checked) FPVSOptions.menuViews.push(view);
            messenger.Utilities.showViewInMenus(view, elt.checked)
        };
        await browser.storage.local.set(FPVSOptions.prefs);
        await browser.storage.local.set({ "arrowViews": FPVSOptions.arrowViews });
        await browser.storage.local.set({ "menuViews": FPVSOptions.menuViews });


        lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-arrows-checkbox");
        FPVSOptions.arrowChk.arrows = lblckbx_shFPA.checked;
        messenger.Utilities.toggleElementHidden(!lblckbx_shFPA.checked);

        lblckbx_shFPA = document.getElementById("FolderPaneSwitcher-delay-textbox");
        FPVSOptions.delay.delay = lblckbx_shFPA.value;

        await browser.storage.local.set(FPVSOptions.arrowChk);
        await browser.storage.local.set(FPVSOptions.delay);
        let wnd = await browser.tabs.getCurrent();
        browser.tabs.remove(wnd.id);  //window.close();

    }
};

window.addEventListener("load", FPVSOptions.onLoad, true);