/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * Do not remove or change this comment.
 *
 * The initial author of the code is:
 *   Thomas Schmid <schmid-thomas@gmx.net>
 *
 * Extended by Klaus Bücher/opto
 * toolbar - menu button is adapted according to hacktoolbarbutton example.
 */
if (!ExtensionParent)
    var { ExtensionParent } = ChromeUtils.importESModule(
        "resource://gre/modules/ExtensionParent.sys.mjs"
    );

(function (exports) {
    "use strict";

    let contextHelp = {};

    /**
     * A helper class for dom manipulations...
     */
    class DomHelper {
        /**
         * Creates a new instance
         * @param {Document} document
         *   the dom element which should be used by this helper.
         */
        constructor(document) {
            this.document = document;
        }

        /**
         * Checks if a menu item with the given id exists.
         *
         * @param {string} id
         *   the nodes unique id
         * @returns {boolean}
         *   true in case the element exists otherwise false.
         */
        hasNode(id) {
            const node = this.document.getElementById(id);

            if (!node) {
                return false;
            }

            return true;
        }

        /**
         * Gets an existing node from the document.
         * In case it does not exist an exception it throws.
         *
         * @param {string} id
         *   the nodes unique id
         * @returns {DOMElement}
         *   the dom element or throws an exception.
         */
        getNode(id) {
            const node = this.document.getElementById(id);
            if (!node) {
                throw new Error(`Unknown element ${id}`);
            }

            return node;
        }

        /**
         * Removes the node with the given id. In case no such node exists
         * it will fail silently.
         * @param {string} id
         *   the node to be removed.
         */
        removeNode(id) {
            const elm = this.document.getElementById(id);
            if (elm) {
                elm.parentNode.removeChild(elm);
            }
        }

        /**
         * Inserts the menu item directly before the reference node.
         * @param {string} refId
         *   the reference node.
         * @param {AbstractWidget} item
         *   the item to be added
         */
        insertBefore(refId, item) {
            const ref = this.getNode(refId);
            this.removeNode(item.getId());

            ref.parentNode.insertBefore(item.createNode(this.document), ref);
        }

        /**
         * Inserts the menu item directly after the reference node.
         * @param {string} refId
         *   the reference node.
         * @param {AbstractWidget} item
         *   the item to be added
         */
        insertAfter(refId, item) {
            const ref = this.getNode(refId);
            this.removeNode(item.getId());

            ref.parentNode.insertBefore(
                item.createNode(this.document),
                ref.nextSibling
            );
        }

        /**
         * Inserts the menu item as a last child of the reference node.
         *
         * @param {string} refId
         *   the reference node.
         * @param {AbstractWidget} item
         *   the item to be added.
         */
        appendChild(refId, item) {
            const ref = this.getNode(refId);
            this.removeNode(item.getId());

            ref.appendChild(item.createNode(this.document));
        }
    }

    /**
     * An abstract wrapper for menu item widgets.
     */
    class AbstractWidget {
        /**
         * Creates a new instance
         * @param {string} id
         *   the unique menu item.
         */
        constructor(id) {
            this.id = id;
        }

        /**
         * Gets the widgets unique id which is used inside the DOM.
         *
         * @returns {string}
         *   returns the widgets unique id.
         */
        getId() {
            return this.id;
        }

        /**
         * Creates a new node in the given document.
         * @abstract
         *
         * @param {Document} document
         *   the dom document to which the widget should be added.
         * @returns {DOMElement}
         *   the newly created node.
         */
        createNode(document) {
            throw new Error(`Implement createNode(${document})`);
        }
    }

    /**
     * A warper for a menu item label.
     */
    class Menu extends AbstractWidget {
        /**
         * Initializes the menu label widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         */
        constructor(id, label, accesskey) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;
        }

        createNode(document) {
            const item = document.createXULElement("menu");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);

            if (
                typeof this.accesskey !== "undefined" ||
                this.accesskey !== null
            )
                item.setAttribute("accesskey", this.accesskey);

            return item;
        }
    }

    class MenuPopup extends AbstractWidget {
        /**
         * Initializes the menu label widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         */
        constructor(id, label, accesskey) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;
        }

        createNode(document) {
            const item = document.createXULElement("menupopup");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);

            if (
                typeof this.accesskey !== "undefined" ||
                this.accesskey !== null
            )
                item.setAttribute("accesskey", this.accesskey);

            return item;
        }
    }

    /**
     * A warper for a menu item label.
     */
    class MenuLabel extends AbstractWidget {
        /**
         * Initializes the menu label widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         * @param {string} labelType
         *   the optional type.
         * @param {string} checked
         *   the optional checked.
         */
        constructor(id, label, accesskey, labelType, checked) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;
            this.type = labelType;
            this.checked = checked;
        }

        createNode(document) {
            const item = document.createXULElement("menuitem");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);

            if (
                typeof this.accesskey !== "undefined" ||
                this.accesskey !== null
            )
                item.setAttribute("accesskey", this.accesskey);
            if (typeof this.type !== "undefined" || this.type !== null)
                item.setAttribute("type", this.type);
            if (typeof this.checked !== "undefined" || this.checked !== null) {
                item.setAttribute("checked", this.checked);
                item.setAttribute("persist", "checked");
            }

            return item;
        }
    }

    /**
     * A wrapper for a menu item separator
     */
    class MenuSeparator extends AbstractWidget {
        createNode(document) {
            const item = document.createXULElement("menuseparator");
            item.setAttribute("id", this.id);

            return item;
        }
    }

    /**
     * A wrapper for an toolbar
     */
    class Toolbar extends AbstractWidget {
        /**
         * Initializes the app menu widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         */
        constructor(id, label, accesskey) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;
        }

        createNode(document) {
            const item = document.createXULElement("toolbar");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);
            item.setAttribute("class", "subviewbutton");

            if (
                typeof this.accesskey !== "undefined" ||
                this.accesskey !== null
            )
                item.setAttribute("accesskey", this.accesskey);

            return item;
        }
    }

    class ToolbarButton extends AbstractWidget {
        /**
         * Initializes the app menu widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         * @param {string} [image]
         *   the optional access key.
         * @param {string} [tooltip]
         *   the optional access key.
         */
        constructor(
            id,
            label,
            accesskey,
            image,
            tooltip,
            className = "",
            tabIndex = null
        ) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;

            this.image = contextHelp.extension.rootURI.resolve(image); //image;
            this.tooltip = tooltip;

            this.className = className;
            this.tabIndex = tabIndex;
        }

        createNode(document) {
            const item = document.createXULElement("toolbarbutton");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);
            //    item.setAttribute("class", "subviewbutton");

            //   if (typeof (this.accesskey) !== "undefined" || this.accesskey !== null)
            //     item.setAttribute("accesskey", this.accesskey);
            if (typeof this.image !== "undefined" || this.image !== null)
                item.setAttribute("image", this.image);
            // if (typeof (this.tooltip) !== "undefined" || this.tooltip !== null)
            item.setAttribute("tooltiptext", this.tooltip);

            if (this.className) {
                item.setAttribute("class", this.className);
            }

            if (typeof this.tabIndex === "number") {
                item.setAttribute("tabindex", this.tabIndex);
            }

            return item;
        }
    }

    class ToolbarMenuButton extends AbstractWidget {
        /**
         * Initializes the app menu widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         * @param {string} [image]
         *   the optional access key.
         * @param {string} [tooltip]
         *   the optional access key.
         */
        constructor(id, label, accesskey, image, tooltip) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;

            this.image = contextHelp.extension.rootURI.resolve(image); //image;
            this.tooltip = tooltip;
        }

        createNode(document) {
            const item = document.createXULElement("toolbarbutton");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);
            //    item.setAttribute("class", "subviewbutton");

            //   if (typeof (this.accesskey) !== "undefined" || this.accesskey !== null)
            //     item.setAttribute("accesskey", this.accesskey);
            if (typeof this.image !== "undefined" || this.image !== null)
                item.setAttribute("image", this.image);
            // if (typeof (this.tooltip) !== "undefined" || this.tooltip !== null)
            item.setAttribute("wantdropmarker", "true");
            item.setAttribute("is", "toolbarbutton-menu-button");
            item.setAttribute("class", "toolbarbutton-1");
            item.setAttribute("type", "menu-button");
            item.setAttribute("orient", "horizontal");

            return item;
        }
    }

    /**
     * A wrapper for a menu item separator
     */
    class ToolbarSeparator extends AbstractWidget {
        createNode(document) {
            const item = document.createXULElement("toolbarseparator");
            item.setAttribute("id", this.id);

            return item;
        }
    }

    /**
     * A wrapper for a menu item separator
     */
    class HBox extends AbstractWidget {
        /**
         * Initializes the app menu widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {boolean} collapsed
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         * @param {string} style
         *   the optional style.
         */
        constructor(id, collapsed, accesskey, style) {
            super(id);
            this.collapsed = collapsed;
            this.style = style;
            // this.accesskey = accesskey;
        }
        createNode(document) {
            const item = document.createXULElement("hbox");
            item.setAttribute("id", this.id);
            if (
                typeof this.collapsed !== "undefined" ||
                this.collapsed !== null
            )
                item.setAttribute("collapsed", this.collapsed);
            if (typeof this.style !== "undefined" || this.style !== null)
                item.setAttribute("style", this.style);

            return item;
        }
    }

    /**
     * A wrapper for an app menu label
     */
    class AppMenuLabel extends AbstractWidget {
        /**
         * Initializes the app menu widget.
         *
         * @param {string} id
         *   the widgets unique id.
         * @param {string} label
         *   the widgets description.
         * @param {string} [accesskey]
         *   the optional access key.
         */
        constructor(id, label, accesskey) {
            super(id);
            this.label = label;
            this.accesskey = accesskey;
        }

        createNode(document) {
            const item = document.createXULElement("toolbarbutton");
            item.setAttribute("id", this.id);
            item.setAttribute("label", this.label);
            item.setAttribute("class", "subviewbutton");

            if (
                typeof this.accesskey !== "undefined" ||
                this.accesskey !== null
            )
                item.setAttribute("accesskey", this.accesskey);

            return item;
        }
    }

    /**
     * A wrapper for an app menu separator
     */
    class AppMenuSeparator extends AbstractWidget {
        createNode(document) {
            const item = document.createXULElement("toolbarseparator");
            item.setAttribute("id", this.id);

            return item;
        }
    }

    const callbacks = new Set();
    const ids = new Set();

    /**
     * Clears all of the known custom ui elements from all known windows.
     */
    function clearAllWindows() {
        const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(
            Ci.nsIWindowMediator
        );

        const windows = wm.getEnumerator(null);

        while (windows.hasMoreElements()) {
            const doc = new DomHelper(
                windows.getNext().docShell.domWindow.document
            );

            for (const id of ids) doc.removeNode(id);
        }
    }

    /**
     * Converts the widget description into a widget class
     * which can be used to construct the dom element.
     *
     * @param {object} widget
     *   the widget description
     *
     * @returns {AbstractWidget}
     *   the widget or an exception in case the description is invalid.
     */
    function createWidget(widget, context) {
        contextHelp = context;
        if (widget.type === "menu")
            return new Menu(widget.id, widget.label, widget.accesskey);

        if (widget.type === "menu-popup")
            return new MenuPopup(widget.id, widget.label, widget.accesskey);

        if (widget.type === "menu-label")
            return new MenuLabel(
                widget.id,
                widget.label,
                widget.accesskey,
                widget.labelType,
                widget.checked
            );

        if (widget.type === "menu-separator")
            return new MenuSeparator(widget.id);

        if (widget.type === "appmenu-label")
            return new AppMenuLabel(widget.id, widget.label, widget.accesskey);

        if (widget.type === "toolbar")
            return new Toolbar(widget.id, widget.label, widget.accesskey);

        if (widget.type === "toolbarButton")
            return new ToolbarButton(
                widget.id,
                widget.label,
                widget.accesskey,
                widget.image,
                widget.tooltip,
                widget.className,
                widget.tabIndex
            );

        if (widget.type === "toolbarMenuButton")
            return new ToolbarMenuButton(
                widget.id,
                widget.label,
                widget.accesskey,
                widget.image,
                widget.tooltip
            );

        if (widget.type === "toolbarseparator")
            return new ToolbarSeparator(
                widget.id,
                widget.label,
                widget.accesskey
            );

        if (widget.type === "hbox")
            return new HBox(
                widget.id,
                widget.collapsed,
                widget.accesskey,
                widget.style
            );

        if (widget.type === "appmenu-separator")
            return new AppMenuSeparator(widget.id);

        throw new Error("Unknown widget type");
    }

    /**
     * Gets the document of the given window.
     * In case no window with the given id exists an exception will be thrown.
     *
     * @param {string} windowId
     *   the windows unique id
     *
     * @returns {DomHelper}
     *   the warper which can be used to access the windows document.
     */
    function getDocumentByWindow(windowId) {
        const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(
            Ci.nsIWindowMediator
        );

        const windows = wm.getEnumerator(null);

        while (windows.hasMoreElements()) {
            const win = windows.getNext().docShell.domWindow;

            if (`${windowId}` === `${win.docShell.outerWindowID}`)
                return new DomHelper(win.document);
        }

        throw new Error(`Invalid window ${windowId}`);
    }

    /**
     * Invokes an event callback for the given window and element.
     *
     * @param {string} windowId
     *   the windows unique id.
     * @param {string} id
     *   the elements unique id on which the event occurred
     */
    function invokeCallback(windowId, id) {
        for (const callback of callbacks) callback(windowId, id);
    }

    class LegacyMenu extends ExtensionCommon.ExtensionAPI {
        getAPI(context) {
            context.callOnClose({
                close: () => {
                    clearAllWindows();
                }
            });

            return {
                LegacyMenu: {
                    onCommand: new ExtensionCommon.EventManager({
                        context,
                        name: "LegacyMenu.onCommand",
                        register: (fire) => {
                            const callback = async (windowsId, id) => {
                                return await fire.async(windowsId, id);
                            };

                            callbacks.add(callback);

                            return () => {
                                callbacks.delete(callback);
                            };
                        }
                    }).api(),

                    /**
                     * Adds the widget to the given window.
                     *
                     * @param {string} windowId
                     *   the window id to which the element should be added.
                     * @param {object} widget
                     *   the widget description.
                     */
                    async add(windowId, widget) {
                        const item = createWidget(widget, context);
                        const document = getDocumentByWindow(windowId);

                        const id = item.getId();

                        switch (widget.position) {
                            case "child":
                                document.appendChild(widget.reference, item);
                                break;

                            case "before":
                                document.insertBefore(widget.reference, item);
                                break;

                            case "after":
                                document.insertAfter(widget.reference, item);
                                break;

                            default:
                                throw new Error(
                                    `Invalid position ${widget.position}`
                                );
                        }

                        ids.add(id);

                        await document
                            .getNode(id)
                            .addEventListener("command", () => {
                                invokeCallback(windowId, id);
                            });
                    },

                    /**
                     * Removes a menu item from the window.
                     *
                     * @param {string} windowId
                     *   the unique window id.
                     * @param {string} id
                     *   the menu elements id
                     */
                    async remove(windowId, id) {
                        await getDocumentByWindow(windowId).removeNode(id);
                    },

                    /**
                     * Checks if the given menu item exist in the given window.
                     * @param {string} windowId
                     *   the unique window id.
                     * @param {string} id
                     *   the menu element's id
                     *
                     * @returns {boolean}
                     *   true in case the element exists otherwise false.
                     */
                    async has(windowId, id) {
                        return await getDocumentByWindow(windowId).hasNode(id);
                    }
                }
            };
        }
    }

    exports.LegacyMenu = LegacyMenu;
})(this);
