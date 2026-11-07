// WP-82 (D-067): källkoden till loadern (`/widget/v1.js`) som företaget lägger på sin
// egen sida. Ren logik i ES5 (körs i okända webbläsare/sidor): hittar platshållare
// (`data-agenda-widget`), skapar iframes mot våra /embed-sidor, tar emot meddelanden
// (se `protocol.ts`) och öppnar bokningsdialogen. Innehållet ritas av våra egna sidor,
// så designen följer tokens; loadern har bara layout och en bakgrundsfärg för dialogen.
import { WIDGET_MESSAGE_SOURCE } from "@/lib/widgets/protocol";
import {
  WIDGET_ATTR_PREFIX,
  WIDGET_KINDS,
  WIDGET_SLUG_PATTERN,
} from "@/lib/validation/widgets";

export type LoaderStrings = {
  /** Tillgänglig titel på dialogen med bokningen. */
  readonly dialogTitle: string;
  /** Tillgänglig titel på inbäddade widgets per sort. */
  readonly frameTitles: Readonly<Record<string, string>>;
  /** Vår egen adress (t.ex. `https://ordenacalendar.vercel.app`), inbakad av servern.
   * Läses INTE ur `script.src`: cacheplugin (t.ex. WP Rocket) kopierar och slår ihop
   * skriptet till kundens egen domän, och då pekade iframen på kundens sajt (deras
   * 404-sida i rutan). Se BookingBuddy WP-104. */
  readonly origin: string;
};

/** Startvärden för höjd (px) innan iframen rapporterat sin egen. */
const INITIAL_HEIGHT: Readonly<Record<string, number>> = {
  resenas: 64,
  boton: 56,
  reserva: 640,
};

export function buildLoaderSource(strings: LoaderStrings): string {
  const config = JSON.stringify({
    source: WIDGET_MESSAGE_SOURCE,
    attr: WIDGET_ATTR_PREFIX,
    kinds: WIDGET_KINDS,
    slugPattern: WIDGET_SLUG_PATTERN.source,
    initialHeight: INITIAL_HEIGHT,
    dialogTitle: strings.dialogTitle,
    frameTitles: strings.frameTitles,
    origin: strings.origin,
  });
  return `(function () {
  "use strict";
  var CFG = ${config};
  if (window.__agendaWidgetsLoaded) { if (window.AgendaWidgets) window.AgendaWidgets.init(); return; }
  window.__agendaWidgetsLoaded = true;
  var ORIGIN = CFG.origin;
  var A = CFG.attr;
  var SLUG = new RegExp(CFG.slugPattern);
  var frames = [];
  var dialog = null;

  function qs(el) {
    var parts = [];
    ["theme", "size", "label"].forEach(function (k) {
      var v = el.getAttribute(A + k);
      if (v) parts.push(k + "=" + encodeURIComponent(v));
    });
    return parts;
  }

  function makeFrame(path, params, title, height) {
    var f = document.createElement("iframe");
    f.src = ORIGIN + path + (params.length ? "?" + params.join("&") : "");
    f.title = title;
    f.loading = "lazy";
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
    f.style.border = "0";
    f.style.width = "100%";
    f.style.display = "block";
    f.style.colorScheme = "normal";
    f.style.height = height + "px";
    return f;
  }

  function mount(el) {
    if (el.getAttribute(A + "ready")) return;
    var kind = el.getAttribute(A + "widget");
    var slug = el.getAttribute(A + "slug");
    if (CFG.kinds.indexOf(kind) < 0 || !slug || !SLUG.test(slug)) return;
    el.setAttribute(A + "ready", "1");
    var f = makeFrame("/embed/" + slug + "/" + kind, qs(el), CFG.frameTitles[kind] || "", CFG.initialHeight[kind] || 64);
    el.appendChild(f);
    frames.push({ el: f, kind: kind, slug: slug, params: qs(el), dialog: false });
  }

  function closeDialog() {
    if (!dialog) return;
    document.removeEventListener("keydown", dialog.onKey, true);
    document.documentElement.style.overflow = dialog.prevOverflow;
    for (var j = 0; j < dialog.inerted.length; j++) dialog.inerted[j].removeAttribute("inert");
    dialog.root.parentNode && dialog.root.parentNode.removeChild(dialog.root);
    for (var i = frames.length - 1; i >= 0; i--) if (frames[i].dialog) frames.splice(i, 1);
    var back = dialog.opener;
    dialog = null;
    if (back && back.focus) try { back.focus(); } catch (e) {}
  }

  function openDialog(slug, params) {
    if (dialog) return;
    var root = document.createElement("div");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", CFG.dialogTitle);
    var s = root.style;
    s.position = "fixed"; s.top = "0"; s.left = "0"; s.right = "0"; s.bottom = "0";
    s.zIndex = "2147483000"; s.display = "flex"; s.alignItems = "center"; s.justifyContent = "center";
    s.background = "rgba(0, 0, 0, 0.5)"; s.padding = window.innerWidth < 640 ? "0" : "16px";
    var box = document.createElement("div");
    var b = box.style;
    b.width = "100%"; b.maxWidth = "960px"; b.height = "100%"; b.maxHeight = window.innerWidth < 640 ? "100%" : "760px";
    b.overflow = "hidden"; b.borderRadius = window.innerWidth < 640 ? "0" : "16px";
    var f = makeFrame("/embed/" + slug + "/reserva", params.concat(["dialog=1"]), CFG.dialogTitle, 0);
    f.style.height = "100%";
    f.loading = "eager";
    box.appendChild(f);
    root.appendChild(box);
    root.addEventListener("mousedown", function (e) { if (e.target === root) closeDialog(); });
    var onKey = function (e) { if (e.key === "Escape") { e.stopPropagation(); closeDialog(); } };
    document.addEventListener("keydown", onKey, true);
    dialog = { root: root, onKey: onKey, opener: document.activeElement, prevOverflow: document.documentElement.style.overflow };
    document.documentElement.style.overflow = "hidden";
    document.body.appendChild(root);
    var inerted = [];
    for (var k = 0; k < document.body.children.length; k++) {
      var sib = document.body.children[k];
      if (sib !== root && !sib.hasAttribute("inert")) { sib.setAttribute("inert", ""); inerted.push(sib); }
    }
    dialog.inerted = inerted;
    var entry = { el: f, kind: "reserva", slug: slug, params: params, dialog: true };
    frames.push(entry);
    try { f.focus(); } catch (e) {}
  }

  function onMessage(e) {
    if (e.origin !== ORIGIN) return;
    var d = e.data;
    if (!d || d.source !== CFG.source || typeof d.type !== "string") return;
    var entry = null;
    for (var i = frames.length - 1; i >= 0; i--) {
      var fr = frames[i];
      if (!document.contains(fr.el)) { frames.splice(i, 1); continue; }
      if (fr.el.contentWindow === e.source) entry = fr;
    }
    if (!entry) return;
    switch (d.type) {
      case "resize":
        if (!entry.dialog && typeof d.height === "number" && d.height >= 0 && d.height <= 10000) entry.el.style.height = Math.ceil(d.height) + "px";
        break;
      case "empty":
        if (!entry.dialog) { entry.el.style.display = "none"; }
        break;
      case "open-booking":
        if (!entry.dialog) openDialog(entry.slug, entry.params);
        break;
      case "close":
        if (entry.dialog) closeDialog();
        break;
    }
  }

  function init() {
    var nodes = document.querySelectorAll("[" + A + "widget]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  window.addEventListener("message", onMessage);
  window.AgendaWidgets = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
`;
}
