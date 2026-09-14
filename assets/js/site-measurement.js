(function () {
  'use strict';
  var KEY = 'zn-measurement-consent';
  var id = 'G-NFEM9HPFLR';
  var active = false;
  var state = 'unknown';
  var page = document.body.dataset.measurementPage;
  var banner = document.getElementById('measurement-banner');
  var params = new URLSearchParams(location.search);
  var test = location.hostname !== 'znempreendimentos.com.br' || params.get('utm_source') === 'qa_codex' || params.get('utm_medium') === 'synthetic_test';
  try {
    if (test) sessionStorage.setItem('zn-measurement-test', '1');
    test = test || sessionStorage.getItem('zn-measurement-test') === '1';
    var saved = localStorage.getItem(KEY) || localStorage.getItem('gamboas-analytics-consent');
    state = saved === 'accepted' || saved === 'rejected' ? saved : JSON.parse(saved || '{}').state;
  } catch (_) {}
  function allowed() { return state === 'accepted' && !test; }
  function event(name, values) {
    if (!active || !allowed()) return;
    window.gtag('event', name, Object.assign({page_type: page, property_id: page === 'villa' ? 'villa' : undefined}, values));
  }
  function activate() {
    if (active || !allowed()) return;
    active = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    var cleanUrl = location.origin + location.pathname;
    var referrer = '';
    try { var ref = new URL(document.referrer); referrer = ref.origin + ref.pathname; } catch (_) {}
    window.gtag('js', new Date());
    window.gtag('set', {page_location: cleanUrl, page_referrer: referrer});
    var config = {send_page_view: false, page_location: cleanUrl, page_referrer: referrer};
    ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (key) {
      var value = params.get('utm_' + key);
      if (value && /^[a-zA-Z0-9_.-]{1,100}$/.test(value)) config['campaign_' + (key === 'campaign' ? 'name' : key)] = value;
    });
    window.gtag('config', id, config);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(script);
    event('page_view', {page_title: document.title});
  }
  function save(value) {
    state = value;
    try { localStorage.setItem(KEY, JSON.stringify({state: value, version: 'measurement-2026-08-19', updatedAt: new Date().toISOString()})); } catch (_) {}
    banner.hidden = true;
    window['ga-disable-' + id] = value !== 'accepted';
    if (value === 'accepted') { if (active) window['ga-disable-' + id] = false; else activate(); }
  }
  document.getElementById('measurement-accept').addEventListener('click', function () { save('accepted'); });
  document.getElementById('measurement-reject').addEventListener('click', function () { save('rejected'); });
  document.getElementById('measurement-manage').addEventListener('click', function () {
    banner.hidden = false;
    document.getElementById('measurement-accept').focus();
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    try { state = JSON.parse(e.newValue || '{}').state; } catch (_) { state = e.newValue; }
    window['ga-disable-' + id] = state !== 'accepted';
    if (state === 'accepted') activate();
  });
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var url = new URL(link.href, location.href);
    var section = link.closest('section[id]');
    var origin = section ? section.id : link.closest('footer') ? 'rodape' : link.closest('nav,header') ? 'menu' : 'pagina';
    if (url.hostname === 'wa.me') event('click_whatsapp', {cta_origin: origin});
    else if (url.origin === location.origin) event('select_content', {content_type: 'navigation', destination_path: url.pathname, destination_section: url.hash, cta_origin: origin});
  });
  // Only a validated handoff intent, never a confirmed lead or a sent message.
  window.znMeasurement = {whatsappIntent: function () { event('click_whatsapp', {cta_origin: 'formulario-villa'}); }};
  banner.hidden = state === 'accepted' || state === 'rejected';
  if (params.get('privacy') === 'manage') banner.hidden = false;
  activate();
})();
