/*
 * License:  see License.txt
 * Contributors:  see Changes.txt
 */



/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 */

var lastTab = 0, lastWindow = 0;


/*
messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
 // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
        const url = messenger.runtime.getURL("popup/installed.html");
//        const url = messenger.runtime.getURL("popup/about_content.html");
        //await browser.tabs.create({ url });
        await messenger.windows.create({ url, type: "popup", height: 780, width: 990, });
      }
      break;
      case "update":
        {
          const url = messenger.runtime.getURL("popup/update.html");
          //await browser.tabs.create({ url });
          await messenger.windows.create({ url, type: "popup", height: 780, width: 990, });
        }
        break;
      // see below
  }
});
*/


async function main() {

  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/fp-prefs.js");


  messenger.WindowListener.registerChromeUrl([
    ["content", "FolderPaneSwitcher", "chrome/content/"],
    ["locale", "FolderPaneSwitcher", "en-US", "chrome/locale/en-US/"],
     ["locale", "FolderPaneSwitcher", "de", "chrome/locale/de/"]
    
  ]);


  messenger.WindowListener.registerOptionsPage("chrome://FolderPaneSwitcher/content/options.xhtml");
    messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/fp-messenger.js");

 
  /* 
   
     messenger.WindowListener.registerStartupScript("chrome/content/scripts/qf-startup.js");
     messenger.WindowListener.registerShutdownScript("chrome/content/scripts/qf-shutdown.js");
 */
  /*
   * Start listening for opened windows. Whenever a window is opened, the registered
   * JS file is loaded. To prevent namespace collisions, the files are loaded into
   * an object inside the global window. The name of that object can be specified via
   * the parameter of startListening(). This object also contains an extension member.
   */


  messenger.WindowListener.startListening();
}

main();
