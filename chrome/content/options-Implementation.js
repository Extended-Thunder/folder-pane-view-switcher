
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

//const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");

var extension = ExtensionParent.GlobalManager.getExtension("FolderPaneSwitcher@kamens1.us");

var { fpvsUtils } = ChromeUtils.import(extension.rootURI.resolve("chrome/content/utils.jsm"));



var FPVSOptions = {
    mapping: [
        ["FolderPaneSwitcher-arrows-checkbox", "arrows", "bool"],
        ["FolderPaneSwitcher-delay-textbox", "delay", "int"],
        // Currently disabled
        //["FolderPaneSwitcher-drop-delay-textbox", "dropDelay", "int"],
    ],

    menuChangeHandler: function(event) {
        var menu_checkbox = event.target;
        menu_id = menu_checkbox.getAttribute("id");
        arrows_id = menu_id.replace('menu', 'arrows');
        var arrows_checkbox = document.getElementById(arrows_id);
        arrows_checkbox.disabled = ! menu_checkbox.hasAttribute("checked");
    },

    onLoad: function() {
        fpvsUtils.init();
        document.addEventListener("dialogextra1", function(event) {
            FPVSOptions.loadPrefs();
        });
        document.addEventListener("dialogaccept", function(event) {
            if (! FPVSOptions.validatePrefs())
                event.preventDefault();
        });
        mapping = FPVSOptions.mapping;
        var preferences = document.getElementById("fpvs-preferences");

         //Migration TB68-TB78
      //  var rows = document.getElementById("grid-rows");
          var table = document.getElementById("tbl_enbldsblViews");

          var views = fpvsUtils.getViews();
          var row_position=0;
          for (var viewNum in views) {


            //Migration TB68-TB78
            //var row = document.createXULElement("row");

            var row=table.insertRow(row_position);
            var cell1=row.insertCell(0);
            var cell2=row.insertCell(1);
            var cell3=row.insertCell(2);

            var prefName = "views." + viewNum + ".menu_enabled";

            //Migration TB68-TB78
            //var menu_checkbox = document.createXULElement("checkbox");
            var menu_checkbox = document.createElement("input");
            menu_checkbox.setAttribute('type','checkbox');


            var box_id = viewNum + "_menu_checkbox";

            menu_checkbox.setAttribute("id", box_id);
            mapping.push([box_id, prefName, "bool"]);
            if (views[viewNum]['name'] == "all") {
                // All Folders view can't be completely disabled.
                menu_checkbox.setAttribute("checked", true);
                menu_checkbox.disabled = true;
            }
            prefName = "views." + viewNum + ".arrows_enabled";

            //Migration TB68-TB78
           // var arrows_checkbox = document.createXULElement("checkbox");
            var arrows_checkbox = document.createElement("input");
            arrows_checkbox.setAttribute('type','checkbox');

            box_id = viewNum + "_arrows_checkbox";
            arrows_checkbox.setAttribute("id", box_id);
            mapping.push([box_id, prefName, "bool"]);
            fpvsUtils.addEventListener(
                menu_checkbox, "command", FPVSOptions.menuChangeHandler, true);


                cell1.appendChild(menu_checkbox);
                cell2.appendChild(arrows_checkbox);
            //row.appendChild(menu_checkbox);
            //row.appendChild(arrows_checkbox);


            //Migration TB68-TB78
           // var label = document.createXULElement("label");
           var label = document.createElement("label");

            label.appendChild(document.createTextNode(
                fpvsUtils.getStringPref(
                    fpvsUtils.viewsBranch, viewNum + ".display_name")));
            //row.appendChild(label);
            cell3.appendChild(label);
           // rows.appendChild(row);

            row_position +1;
        }
        FPVSOptions.loadPrefs();
        mapping.forEach(function(mapping) {
            if (! mapping[0].endsWith("_menu_checkbox")) return;
            FPVSOptions.menuChangeHandler(
                {'target': document.getElementById(mapping[0])});
        });
    },

    loadPrefs: function() {
        mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                elt.value = fpvsUtils.prefBranch.getIntPref(pref);
                break;
            case "bool":
                elt.checked = fpvsUtils.prefBranch.getBoolPref(pref);
                break;
            case "string":
                elt.value = fpvsUtils.prefBranch.getStringPref(pref);
                break;
            case "char":
                elt.value = fpvsUtils.prefBranch.getCharPref(pref);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
    },

    validatePrefs: function(event) {
        FPVSOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                fpvsUtils.prefBranch.setIntPref(pref, elt.value);
                break;
            case "bool":
                fpvsUtils.prefBranch.setBoolPref(pref, elt.checked);
                break;
            case "string":
                fpvsUtils.prefBranch.setStringPref(pref, elt.value);
                break;
            case "char":
                fpvsUtils.prefBranch.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    }
};





var fpvs_optionsAPI = class extends ExtensionCommon.ExtensionAPI{

getAPI(context)
{
    return{
        fpvs_optionsAPI:
        {
            addlst: async function(){

// still in progress

                //alert("hello");
               fpvsUtils.init();
               fpvsUtils.addEventListener(window,"load", FPVSOptions.onLoad, false);
            }
        }

    };




}


}




//fpvsUtils.addEventListener(window, "load", FPVSOptions.onLoad, false);
