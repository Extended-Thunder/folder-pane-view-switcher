function fpvsMenuChangeHandler(event) {
    var menu_checkbox = event.target;
    menu_id = menu_checkbox.getAttribute("id");
    arrows_id = menu_id.replace('menu', 'arrows');
    var arrows_checkbox = document.getElementById(arrows_id);
    arrows_checkbox.disabled = ! menu_checkbox.hasAttribute("checked");
}

function fpvsOptionsOnLoad() {
    fpvsUtils.init();
    var preferences = document.getElementById("fpvs-preferences");
    var rows = document.getElementById("grid-rows");
    var views = fpvsUtils.getViews();
    for (var viewNum in views) {
        var row = document.createElement("row");
        var pref = document.createElement("preference");
        var prefId = viewNum + "_menu_enabled";
        var prefName = "views." + viewNum + ".menu_enabled";
        pref.setAttribute("id", prefId);
        pref.setAttribute("name", fpvsPrefRoot + prefName);
        pref.setAttribute("type", "bool");
        preferences.appendChild(pref);
        var menu_checkbox = document.createElement("checkbox");
        menu_checkbox.setAttribute("id", viewNum + "_menu_checkbox");
        menu_checkbox.setAttribute("preference", prefId);
        if (fpvsUtils.prefBranch.getBoolPref(prefName))
            menu_checkbox.setAttribute('checked', true);
        else
            menu_checkbox.removeAttribute('checked');
        pref = document.createElement("preference");
        prefId = viewNum + "_arrows_enabled";
        prefName = "views." + viewNum + ".arrows_enabled";
        pref.setAttribute("id", prefId);
        pref.setAttribute("name", fpvsPrefRoot + prefName);
        pref.setAttribute("type", "bool");
        preferences.appendChild(pref);
        var arrows_checkbox = document.createElement("checkbox");
        arrows_checkbox.setAttribute("id", viewNum + "_arrows_checkbox");
        arrows_checkbox.setAttribute("preference", prefId);
        if (fpvsUtils.prefBranch.getBoolPref(prefName))
            arrows_checkbox.setAttribute('checked', true);
        else
            arrows_checkbox.removeAttribute('checked');
        fpvsUtils.addEventListener(
            menu_checkbox, "command", fpvsMenuChangeHandler, true);
        row.appendChild(menu_checkbox);
        row.appendChild(arrows_checkbox);
        var label = document.createElement("label");
        label.appendChild(document.createTextNode(
            fpvsUtils.getStringPref(
                fpvsUtils.viewsBranch, viewNum + ".display_name")));
        row.appendChild(label);
        rows.appendChild(row);
        fpvsMenuChangeHandler({'target': menu_checkbox});
    }
}

function fpvsOptionsOnUnload() {
    fpvsUtils.uninit();
}

fpvsUtils.addEventListener(window, "load", fpvsOptionsOnLoad, false);
fpvsUtils.addEventListener(window, "unload", fpvsOptionsOnUnload, false);
