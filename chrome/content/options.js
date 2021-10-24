var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var FPVSOptions = {
    mapping: [
        ["FolderPaneSwitcher-arrows-checkbox", "arrows", "bool"],
        ["FolderPaneSwitcher-delay-textbox", "delay", "int"],
        // Currently disabled
        //["FolderPaneSwitcher-drop-delay-textbox", "dropDelay", "int"],
    ],

    menuChangeHandler: function (event) {
        var menu_checkbox = event.target;
        menu_id = menu_checkbox.getAttribute("id");
        arrows_id = menu_id.replace('menu', 'arrows');
        var arrows_checkbox = document.getElementById(arrows_id);
        arrows_checkbox.disabled = !menu_checkbox.hasAttribute("checked");
    },

    onLoad: function () {
        fpvsUtils.init();
        mapping = FPVSOptions.mapping;
        var preferences = document.getElementById("fpvs-preferences");
        var rows = document.getElementById("grid-rows");
        var views = fpvsUtils.getViews();
        for (var viewNum in views) {
            var row = document.createElement("tr");
            var prefName = "views." + viewNum + ".menu_enabled";
            var menu_checkbox = document.createXULElement("checkbox");
            var box_id = viewNum + "_menu_checkbox";
            menu_checkbox.setAttribute("id", box_id);
            mapping.push([box_id, prefName, "bool"]);
            if (views[viewNum]['name'] == "all")
                // All Folders view can't be completely disabled.
                menu_checkbox.disabled = true;
            prefName = "views." + viewNum + ".arrows_enabled";
            var arrows_checkbox = document.createXULElement("checkbox");
            box_id = viewNum + "_arrows_checkbox";
            arrows_checkbox.setAttribute("id", box_id);
            mapping.push([box_id, prefName, "bool"]);
            fpvsUtils.addEventListener(
                menu_checkbox, "command", FPVSOptions.menuChangeHandler, true);
                let td1 = document.createElement("td");
                td1.appendChild(menu_checkbox);
            row.appendChild(td1);
            let td2 = document.createElement("td");
            td2.appendChild(arrows_checkbox);
            row.appendChild(td2);
            var label = document.createXULElement("label");
            label.appendChild(document.createTextNode(
                fpvsUtils.getStringPref(
                    fpvsUtils.viewsBranch, viewNum + ".display_name")));
                    let td3 = document.createElement("td");
                    td3.appendChild(label);
                    row.appendChild(td3);
            rows.appendChild(row);
            FPVSOptions.menuChangeHandler({ 'target': menu_checkbox });
        }
        FPVSOptions.loadPrefs();
        document.addEventListener("dialogaccept", FPVSOptions.validatePrefs);
 
    },

    loadPrefs: function () {
        mapping.forEach(function (mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            console.log("getprefs", mapping);
            switch (pref_type) {
                case "int":
                    elt.value = Services.prefs.getIntPref(fpvsUtils.fpvsPrefRoot+pref);//fpvsUtils.prefBranch.getIntPref(pref);
                    break;
                case "bool":
                    elt.checked = Services.prefs.getBoolPref(fpvsUtils.fpvsPrefRoot+pref);
                    break;
                case "string":
                    elt.value = Services.prefs.getStringPref(fpvsUtils.fpvsPrefRoot+pref);
                    break;
                case "char":
                    elt.value = Services.prefs.getCharPref(fpvsUtils.fpvsPrefRoot+pref);
                    break;
                default:
                    throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
    },

    validatePrefs: function (event) {
        FPVSOptions.mapping.forEach(function (mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
                case "int":
                    Services.prefs.setIntPref(fpvsUtils.fpvsPrefRoot+pref, elt.value);
                    break;
                case "bool":
                    Services.prefs.setBoolPref(fpvsUtils.fpvsPrefRoot+pref, elt.checked);
                    break;
                case "string":
                    Services.prefs.setStringPref(fpvsUtils.fpvsPrefRoot+pref, elt.value);
                    break;
                case "char":
                    Services.prefs.setCharPref(fpvsUtils.fpvsPrefRoot+pref, elt.value);
                    break;
                default:
                    throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    },

    onUnload: function () {
        fpvsUtils.uninit();
        document.removeEventListener("dialogaccept", FPVSOptions.validatePrefs);

    }
};

fpvsUtils.addEventListener(window, "load", FPVSOptions.onLoad, false);
fpvsUtils.addEventListener(window, "unload", FPVSOptions.onUnload, false);
