addEventListener("load", async (event) => {
    let text = document.body.innerHTML;
    htmltext = text.replace(
        /{addon}/g,
        await messenger.runtime.getManifest().name
    );
    htmltext2 = htmltext.replace(
        /{version}/g,
        await messenger.runtime.getManifest().version
    );
    let browserInfo = await messenger.runtime.getBrowserInfo();
    htmltext = htmltext2.replace(/{appver}/g, browserInfo.version);
    document.body.innerHTML = htmltext;
});
