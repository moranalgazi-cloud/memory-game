import recordsIcon from "../docs/images/icons/icon-nav-records.png?url";
import adventureIcon from "../docs/images/icons/icon-nav-adventure.png?url";
import albumIcon from "../docs/images/icons/icon-nav-album.png?url";
import friendIcon from "../docs/images/icons/icon-nav-friend.png?url";

/** @type {Record<string, string>} */
export const NAV_ICON_URLS = {
  records: recordsIcon,
  adventure: adventureIcon,
  album: albumIcon,
  friend: friendIcon,
};

/** Wire bundled nav icons onto every `img[data-nav-icon]`. */
export function applyNavIcons() {
  for (const el of document.querySelectorAll("img[data-nav-icon]")) {
    const key = el.getAttribute("data-nav-icon");
    const url = key ? NAV_ICON_URLS[key] : null;
    if (url) el.src = url;
  }
}
