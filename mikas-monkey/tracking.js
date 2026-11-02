"use strict";
(() => {
  const config = window.MIKA_CONFIG || {};
  const id = config.ga4MeasurementId || "";
  const enabled = /^G-[A-Z0-9]+$/.test(id);
  const storageKey = "ab_music_analytics_v1";
  const panel = document.getElementById("consent-panel");
  const preferences = document.getElementById("analytics-preferences");
  let choice = null;
  let initialized = false;
  try { choice = localStorage.getItem(storageKey); } catch (_) { /* Storage can be unavailable. */ }
  const validChoices = new Set(["granted", "denied"]);
  if (!validChoices.has(choice)) choice = null;

  const params = new URLSearchParams(location.search);
  const campaign = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) campaign[key] = value.slice(0, 100);
  }

  function initialize() {
    if (!enabled || initialized || choice !== "granted") return;
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    window.gtag("consent", "update", {analytics_storage: "granted"});
    window.gtag("js", new Date());
    window.gtag("config", id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  function setChoice(next) {
    choice = next;
    try { localStorage.setItem(storageKey, next); } catch (_) { /* Keep the in-memory choice. */ }
    panel.hidden = true;
    if (next === "granted") initialize();
    else if (initialized) {
      window.gtag("consent", "update", {analytics_storage: "denied"});
      // Unload the tag after revocation; the saved choice survives the reload.
      location.reload();
    }
  }

  window.MikaAnalytics = Object.freeze({
    track(name, extra = {}) {
      if (!enabled || choice !== "granted") return;
      initialize();
      window.gtag("event", name, {
        send_to: id,
        track_name: config.trackName,
        artist_name: config.artistName,
        release_name: config.releaseName,
        ...campaign,
        ...extra
      });
    }
  });

  if (!enabled) return;
  preferences.hidden = false;
  panel.hidden = choice !== null;
  document.getElementById("allow-analytics").addEventListener("click", () => setChoice("granted"));
  document.getElementById("decline-analytics").addEventListener("click", () => setChoice("denied"));
  preferences.addEventListener("click", () => {
    panel.hidden = false;
    document.getElementById("decline-analytics").focus();
  });
  if (choice === "granted") initialize();
})();
