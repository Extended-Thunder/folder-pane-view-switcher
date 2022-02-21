/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
//das geht nicht:
//var { QF } = ChromeUtils.import("chrome://quickfolders/content/quickfolders.js");  
//var { utils } = ChromeUtils.import("chrome://quickfolders/content/quickfolders-util.js");
//var { addonPrefs } = ChromeUtils.import("chrome://quickfolders/content/quickfolders-preferences.js");
//Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");

if (!ExtensionParent) var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
//if (!manage_emailsExtension) var manage_emailsExtension = ExtensionParent.GlobalManager.getExtension("nostalgy@opto.one");
//var { manage_emails } = ChromeUtils.import(manage_emailsExtension.rootURI.resolve("chrome://nostalgy/content/manage_emails.jsm"));




// might be better to get the parent window of the current window
// because we may be screwed otherwise.
var win = Services.wm.getMostRecentWindow("mail:3pane");


//console.log("impl utilities");
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {

    const PrefTypes = {
      [Services.prefs.PREF_STRING]: "string",
      [Services.prefs.PREF_INT]: "number",
      [Services.prefs.PREF_BOOL]: "boolean",
      [Services.prefs.PREF_INVALID]: "invalid"
    };

    return {
      Utilities: {

        firstCall: 1,

        isMailTab: async function (isMailTab) {
          //    console.log("isMailTab",isMailTab, win);
          let i = 0;
          // /*
          //           while (! win.manage_emails)  {
          //             i++; console.log("i",i);
          //               let w = await new Promise(resolve => win.setTimeout(resolve, 300));
          //           };
          // */
          if (Utilities.firstCall == 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            Utilities.firstCall = 0;
            //    console.log("after 5s");
          };

        },

        getActiveViewModes: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          // let modes = mail3Pane.gFolderTreeView._modeDisplayNames;
          let modes = mail3Pane.gFolderTreeView.activeModes;
          console.log("modes", modes);
          return modes;
        },


        getAllViewModes: async function () {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let allViews = mail3Pane.gFolderTreeView._modeNames;
          console.log("allModes", allViews);
          return allViews;//{modeDisplayNames: modeDisplayNames, allViews: allViews};
        },



        getViewDisplayName: async function (commonName) {
          let mail3Pane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).
            getMostRecentWindow("mail:3pane");
          let key = "folderPaneModeHeader_" + commonName;
          let nameString = mail3Pane.gFolderTreeView.messengerBundle.getString(key);
          console.log("legname", nameString);
          return  nameString;
        },


        showViewInMenus: async function (view, enabled) {
   /*
          let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
         

          let item = mail3PaneWindow.document.querySelector(`#folderPaneOptionsPopup [value=${view}]`);
          if (item != null) {
            item.hidden = !enabled;
          };
          item = mail3PaneWindow.document.querySelector(`#menu_FolderViewsPopup [value=${view}]`);
          if (item != null) {
            item.hidden = !enabled;
          };
          item = mail3PaneWindow.document.querySelector(`#appMenu-foldersView [value=${view}]`);
          if (item != null) {
            item.setAttribute("hidden", !enabled);
          };
 */     
        }


      }
    }
  };
}
