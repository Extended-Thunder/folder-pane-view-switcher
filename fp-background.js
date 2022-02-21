/*
 * License:  MPL2
 */



/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 */

var lastTab = 0, lastWindow = 0;

var defPrefs = {

  all: { arrow: false, menu: true, pos: -1 },
  smart: { arrow: true, menu: true, pos: -1 },
  recent: { arrow: true, menu: false, pos: -1 },
  unread: { arrow: true, menu: true, pos: -1 },
  favorite: { arrow: true, menu: true, pos: -1 }
};

var defChk = {arrows: true};
var defDelay = {delay: 1000};



messenger.browserAction.onClicked.addListener(async (tab, info) => {

  const url = messenger.runtime.getURL("content/options.html");
  //await browser.tabs.create({ url });
  messenger.windows.create({ url, type: "popup" });//, height: 780, width: 990, });

});





messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
        browser.storage.local.set({ "prefs": defPrefs });
        browser.storage.local.set(defChk);
        browser.storage.local.set(defDelay);
        const url = messenger.runtime.getURL("popup/installed.html");

        await browser.tabs.create({ url });
        //         await messenger.windows.create({ url, type: "popup", height: 780, width: 990, });
      }
      break;
    case "update":
      {
        const url = messenger.runtime.getURL("popup/update.html");
        await browser.tabs.create({ url });
        //await messenger.windows.create({ url, type: "popup", height: 780, width: 990, });
      }
      break;

  }
});

const url = messenger.runtime.getURL("content/options.html");
//await browser.tabs.create({ url });
messenger.windows.create({ url, type: "popup" });//, height: 780, width: 990, });


async function main() {
  let modes = await messenger.Utilities.getActiveViewModes();
  console.log("bgrd modes", modes);

  modes = await messenger.Utilities.getAllViewModes();
  console.log("bgrd allmodes", modes);
  /**/
  for (vieww of modes) {
    let name1 = await messenger.Utilities.getViewDisplayName(vieww);
    console.log("name", name1);
  }
  ;
  let name1 = await messenger.Utilities.getViewDisplayName("all");
  console.log("name", name1);

  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/fp-prefs.js");


  messenger.WindowListener.registerChromeUrl([
    ["content", "FolderPaneSwitcher", "chrome/content/"],
    ["locale", "FolderPaneSwitcher", "en-US", "chrome/locale/en-US/"],
    ["locale", "FolderPaneSwitcher", "de", "chrome/locale/de/"]

  ]);


 // messenger.WindowListener.registerOptionsPage("chrome://FolderPaneSwitcher/content/options.xhtml");
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/fp-messenger.js");



  /*
   * Start listening for opened windows. Whenever a window is opened, the registered
   * JS file is loaded. To prevent namespace collisions, the files are loaded into
   * an object inside the global window. The name of that object can be specified via
   * the parameter of startListening(). This object also contains an extension member.
   */


  messenger.WindowListener.startListening();
}

main();
