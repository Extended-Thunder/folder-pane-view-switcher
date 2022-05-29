addEventListener("click", async (event) => {
    if (event.target.id.startsWith("donate")) {
        messenger.windows.openDefaultBrowser(
            "https://www.paypal.com/donate/?hosted_button_id=KKWUR5Y3NVSHQ"
        );
    }
});

addEventListener("load", async (event) => {
    let text = document.body.innerHTML,
        htmltext = text.replace(
            /{addon}/g,
            await browser.runtime.getManifest().name
        );
    let htmltext2 = htmltext.replace(
        /{version}/g,
        await browser.runtime.getManifest().version
    );
    let browserInfo = await browser.runtime.getBrowserInfo();
    htmltext = htmltext2.replace(/{appver}/g, browserInfo.version);
    document.body.innerHTML = htmltext;
});
