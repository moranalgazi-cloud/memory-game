import appLogoUrl from "../docs/images/memory-games-logo.png?url";

export { appLogoUrl };

/**
 * @param {(key: string) => string} t
 */
export function applyAppBranding(t) {
  let icon = document.querySelector('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    document.head.append(icon);
  }
  icon.href = appLogoUrl;

  let apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.append(apple);
  }
  apple.href = appLogoUrl;

  const alt = t("appLogoAlt");
  for (const id of ["#appLogo", "#aboutLogo", "#appBrandLogo"]) {
    const img = document.querySelector(id);
    if (img instanceof HTMLImageElement) {
      img.src = appLogoUrl;
      img.alt = alt;
    }
  }
}
