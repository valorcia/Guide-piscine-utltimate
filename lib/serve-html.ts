import fs from "fs";
import path from "path";
import { ProductId } from "./products";

const CHECKOUT_SCRIPT = (productId: ProductId) => `
<style>
  #flv-modal-bg{position:fixed;inset:0;background:rgba(10,37,64,0.55);display:none;align-items:center;justify-content:center;z-index:99999;font-family:'Inter',system-ui,sans-serif}
  #flv-modal{background:#fff;border-radius:6px;padding:36px 32px;max-width:420px;width:92%;box-shadow:0 30px 80px -20px rgba(0,0,0,0.4)}
  #flv-modal h3{font-family:'Playfair Display',serif;font-size:22px;color:#0A2540;margin:0 0 8px;font-weight:700}
  #flv-modal p{font-size:14px;color:rgba(10,37,64,0.65);margin:0 0 20px;line-height:1.5}
  #flv-modal input{width:100%;padding:13px 14px;border:1px solid rgba(10,37,64,0.18);border-radius:3px;font-size:15px;font-family:inherit;color:#0A2540;outline:none;margin-bottom:14px;box-sizing:border-box}
  #flv-modal input:focus{border-color:#0A2540}
  #flv-modal-err{color:#c0392b;font-size:13px;margin:-8px 0 12px;min-height:18px}
  #flv-modal button.flv-ok{width:100%;background:#E8A020;color:#fff;border:none;padding:14px;border-radius:3px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:0.02em}
  #flv-modal button.flv-ok:hover{background:#d09015}
  #flv-modal button.flv-ok:disabled{opacity:0.6;cursor:wait}
  #flv-modal .flv-cancel{display:block;text-align:center;background:none;border:none;color:rgba(10,37,64,0.5);font-size:13px;margin-top:12px;cursor:pointer;font-family:inherit;width:100%}
</style>
<div id="flv-modal-bg" role="dialog" aria-modal="true">
  <div id="flv-modal">
    <h3>Ton email pour recevoir le PDF</h3>
    <p>On t'envoie les liens de téléchargement après le paiement. Stripe sécurise ta carte sur la prochaine page.</p>
    <input id="flv-email" type="email" placeholder="ton@email.fr" autocomplete="email" inputmode="email"/>
    <div id="flv-modal-err"></div>
    <button class="flv-ok" id="flv-ok">Continuer vers le paiement →</button>
    <button class="flv-cancel" id="flv-cancel">Annuler</button>
  </div>
</div>
<script>
(function(){
  var PRODUCT = ${JSON.stringify(productId)};
  var EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  var pendingBtn = null;

  function showModal(){
    var bg = document.getElementById('flv-modal-bg');
    bg.style.display = 'flex';
    var input = document.getElementById('flv-email');
    setTimeout(function(){ input.focus(); }, 50);
  }
  function hideModal(){
    document.getElementById('flv-modal-bg').style.display = 'none';
    document.getElementById('flv-modal-err').textContent = '';
    var ok = document.getElementById('flv-ok');
    ok.disabled = false;
    ok.textContent = 'Continuer vers le paiement →';
    if(pendingBtn){ pendingBtn.style.pointerEvents=''; pendingBtn.style.opacity=''; pendingBtn = null; }
  }
  function submitEmail(){
    var input = document.getElementById('flv-email');
    var err = document.getElementById('flv-modal-err');
    var email = (input.value || '').trim().toLowerCase();
    if(!EMAIL_RE.test(email)){
      err.textContent = 'Email invalide. Vérifie ta saisie.';
      return;
    }
    err.textContent = '';
    var ok = document.getElementById('flv-ok');
    ok.disabled = true;
    ok.textContent = 'Redirection…';
    try { localStorage.setItem('flv_email', email); } catch(_) {}
    // Lead capture (fire-and-forget)
    fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email, product: PRODUCT }) }).catch(function(){});
    // Checkout
    fetch('/api/checkout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ product: PRODUCT, email: email })
    }).then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.url){ window.location.href = data.url; }
        else { err.textContent = 'Erreur paiement. Réessaye.'; ok.disabled = false; ok.textContent = 'Continuer vers le paiement →'; }
      })
      .catch(function(){ err.textContent = 'Erreur réseau. Réessaye.'; ok.disabled = false; ok.textContent = 'Continuer vers le paiement →'; });
  }
  function go(e){
    if(e){ e.preventDefault(); }
    pendingBtn = (e && e.currentTarget) || null;
    if(pendingBtn){ pendingBtn.style.pointerEvents='none'; pendingBtn.style.opacity='0.7'; }
    var input = document.getElementById('flv-email');
    try {
      var saved = localStorage.getItem('flv_email');
      if(saved){ input.value = saved; }
    } catch(_) {}
    showModal();
  }
  function bindModal(){
    var ok = document.getElementById('flv-ok');
    var cancel = document.getElementById('flv-cancel');
    var input = document.getElementById('flv-email');
    var bg = document.getElementById('flv-modal-bg');
    if(ok && !ok.getAttribute('data-bound')){ ok.setAttribute('data-bound','1'); ok.addEventListener('click', submitEmail); }
    if(cancel && !cancel.getAttribute('data-bound')){ cancel.setAttribute('data-bound','1'); cancel.addEventListener('click', hideModal); }
    if(input && !input.getAttribute('data-bound')){ input.setAttribute('data-bound','1'); input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); submitEmail(); } }); }
    if(bg && !bg.getAttribute('data-bound')){ bg.setAttribute('data-bound','1'); bg.addEventListener('click', function(e){ if(e.target === bg){ hideModal(); } }); }
  }
  function bind(){
    bindModal();
    var nodes = document.querySelectorAll('a.cta, button.cta');
    nodes.forEach(function(n){
      if(n.classList.contains('cta-decline')) return;
      if(n.getAttribute('data-checkout-bound') === '1') return;
      n.setAttribute('data-checkout-bound','1');
      // Skip internal anchor jumps to #pricing — they are scroll targets
      var href = n.getAttribute('href') || '';
      if(href === '#pricing'){ return; }
      n.addEventListener('click', go);
    });
    // Decline buttons on OTOs : redirect to next step in funnel
    var declines = document.querySelectorAll('a.cta-decline');
    declines.forEach(function(n){
      if(n.getAttribute('data-decline-bound') === '1') return;
      n.setAttribute('data-decline-bound','1');
      n.addEventListener('click', function(e){
        e.preventDefault();
        var next = ${JSON.stringify(nextStepFor(productId))};
        var sid = new URLSearchParams(window.location.search).get('session_id');
        if(sid){ next += (next.indexOf('?') > -1 ? '&' : '?') + 'session_id=' + encodeURIComponent(sid); }
        window.location.href = next;
      });
    });
    // The #pricing anchor CTA at bottom of page : also wire as checkout fallback
    // (the user expects every "Commander" button to trigger checkout)
    var bottomCtas = document.querySelectorAll('a.cta[href="#pricing"]');
    bottomCtas.forEach(function(n){
      if(n.getAttribute('data-checkout-bound') === '1') return;
      n.setAttribute('data-checkout-bound','1');
      n.addEventListener('click', go);
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }
})();
</script>
`;

function nextStepFor(productId: ProductId): string {
  switch (productId) {
    case "ebook":
      return "/oto1";
    case "outils":
      return "/oto2";
    case "fiches":
      return "/oto3";
    case "bundle":
      return "/success";
  }
}

function plausibleSnippet(): string {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return "";
  return `<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`;
}

function rewriteLegacyLinks(html: string): string {
  // Les HTML d'origine contenaient des liens entre fichiers locaux.
  // On les remappe vers les routes Next.js.
  return html
    .replace(/href="Fini l'eau verte\.html"/g, 'href="/vente"')
    .replace(/href="Fini l&apos;eau verte\.html"/g, 'href="/vente"')
    .replace(/href="OTO1 - Pack Outils\.html"/g, 'href="/oto1"')
    .replace(/href="OTO2 - Fiches Urgences\.html"/g, 'href="/oto2"')
    .replace(/href="Bundle complet\.html"/g, 'href="/oto3"')
    .replace(/href="BUNDLE-page-vente\.html"/g, 'href="/bundle"')
    .replace(/href="R%C3%A9sum%C3%A9 du guide\.html"/g, 'href="/resume"')
    .replace(/href="Résumé du guide\.html"/g, 'href="/resume"')
    // Feuille de style relative -> chemin absolu servi depuis /public
    .replace(/href="fev\.css"/g, 'href="/fev.css"');
}

const DIRECT_SALE_CSS = `
<style>
  /* Mode vente directe : on masque le bouton "Non merci" du tunnel et le bandeau étape */
  .cta-decline{display:none !important}
  .tunnel{display:none !important}
</style>`;

const STICKY_BUNDLE_HTML = `
<style>
  #flv-sticky{position:fixed;left:0;right:0;bottom:0;z-index:9998;background:#0A2540;color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;box-shadow:0 -8px 30px -10px rgba(0,0,0,0.35);font-family:'Inter',system-ui,sans-serif;font-size:14px;letter-spacing:0.01em}
  #flv-sticky-txt{opacity:0.92}
  #flv-sticky-txt b{color:#E8A020;font-weight:700}
  #flv-sticky-cta{background:#E8A020;color:#0A2540;font-weight:700;padding:9px 18px;border-radius:2px;text-decoration:none;white-space:nowrap;font-size:13px;letter-spacing:0.02em;transition:transform 0.2s}
  #flv-sticky-cta:hover{transform:translateY(-1px)}
  #flv-sticky-close{background:none;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;padding:0 4px;line-height:1}
  #flv-sticky-close:hover{color:#fff}
  body{padding-bottom:64px !important}
  @media(max-width:560px){
    #flv-sticky{font-size:13px;padding:11px 16px;gap:12px}
    #flv-sticky-cta{padding:8px 14px}
  }
</style>
<div id="flv-sticky" role="complementary">
  <span id="flv-sticky-txt">Pack complet : guide + 4 PDFs <b>49€</b> au lieu de 98€</span>
  <a href="/bundle" id="flv-sticky-cta">Voir le pack →</a>
  <button id="flv-sticky-close" aria-label="Fermer">×</button>
</div>
<script>
(function(){
  try {
    if(sessionStorage.getItem('flv_sticky_closed')==='1'){
      var el=document.getElementById('flv-sticky'); if(el){ el.remove(); document.body.style.paddingBottom=''; }
      return;
    }
  } catch(_){}
  var btn=document.getElementById('flv-sticky-close');
  if(btn){ btn.addEventListener('click', function(){
    var el=document.getElementById('flv-sticky'); if(el){ el.remove(); document.body.style.paddingBottom=''; }
    try { sessionStorage.setItem('flv_sticky_closed','1'); } catch(_){}
  });}
})();
</script>`;

export interface PageOptions {
  /** Cache le bouton "Non merci" du tunnel (pour les pages /outils, /fiches en vente directe). */
  direct?: boolean;
  /** Affiche le sticky CTA "Pack 49€" en bas de page. */
  sticky?: boolean;
  /** Active le modal panier (sélection multi-produits avant Stripe). */
  cart?: boolean;
}

const CART_SCRIPT = `
<style>
  #flv-cart-bg{position:fixed;inset:0;background:rgba(10,37,64,0.55);display:none;align-items:center;justify-content:center;z-index:99999;font-family:'Inter',system-ui,sans-serif;padding:20px}
  #flv-cart{background:#fff;border-radius:6px;padding:34px 30px;max-width:520px;width:100%;box-shadow:0 30px 80px -20px rgba(0,0,0,0.4);max-height:92vh;overflow-y:auto}
  #flv-cart h3{font-family:'Playfair Display',serif;font-size:24px;color:#0A2540;margin:0 0 8px;font-weight:700}
  #flv-cart p.sub{font-size:14px;color:rgba(10,37,64,0.65);margin:0 0 22px;line-height:1.5}
  .flv-row{display:flex;align-items:flex-start;gap:14px;border:1px solid rgba(10,37,64,0.14);border-radius:4px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:border-color 0.2s,background 0.2s}
  .flv-row:hover{border-color:#0A2540;background:rgba(10,37,64,0.025)}
  .flv-row.checked{border-color:#0A2540;background:rgba(0,180,216,0.06)}
  .flv-row.fixed{cursor:not-allowed;background:rgba(10,37,64,0.04)}
  .flv-row input{margin-top:4px;flex-shrink:0;cursor:pointer}
  .flv-row.fixed input{cursor:not-allowed}
  .flv-row .lbl{flex:1}
  .flv-row .lbl-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
  .flv-row .lbl-name{font-weight:600;color:#0A2540;font-size:15px}
  .flv-row .lbl-price{font-family:'Playfair Display',serif;font-weight:700;color:#0A2540;font-size:18px;white-space:nowrap}
  .flv-row .lbl-desc{font-size:13px;color:rgba(10,37,64,0.6);margin-top:4px;line-height:1.5}
  .flv-row .badge{display:inline-block;background:#E8A020;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:2px;letter-spacing:0.08em;text-transform:uppercase;margin-left:8px}
  .flv-or{text-align:center;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(10,37,64,0.4);margin:14px 0 10px;position:relative}
  .flv-or::before,.flv-or::after{content:'';position:absolute;top:50%;width:38%;height:1px;background:rgba(10,37,64,0.1)}
  .flv-or::before{left:0}.flv-or::after{right:0}
  #flv-cart-total{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:1px solid rgba(10,37,64,0.12);margin-top:18px;font-size:16px;color:#0A2540}
  #flv-cart-total b{font-family:'Playfair Display',serif;font-size:28px;font-weight:700}
  #flv-cart input.flv-email{width:100%;padding:13px 14px;border:1px solid rgba(10,37,64,0.18);border-radius:3px;font-size:15px;font-family:inherit;color:#0A2540;outline:none;margin:8px 0 6px;box-sizing:border-box}
  #flv-cart input.flv-email:focus{border-color:#0A2540}
  #flv-cart-err{color:#c0392b;font-size:13px;margin:2px 0 10px;min-height:18px}
  #flv-cart button.flv-pay{width:100%;background:#E8A020;color:#fff;border:none;padding:15px;border-radius:3px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.02em}
  #flv-cart button.flv-pay:hover{background:#d09015}
  #flv-cart button.flv-pay:disabled{opacity:0.6;cursor:wait}
  #flv-cart .flv-cancel{display:block;text-align:center;background:none;border:none;color:rgba(10,37,64,0.5);font-size:13px;margin-top:10px;cursor:pointer;font-family:inherit;width:100%}
</style>
<div id="flv-cart-bg" role="dialog" aria-modal="true">
  <div id="flv-cart">
    <h3>Choisis ce que tu veux</h3>
    <p class="sub">Tu peux prendre le guide seul, ajouter des compléments, ou prendre le pack complet (économise 49€).</p>

    <label class="flv-row fixed checked" data-product="ebook">
      <input type="checkbox" checked disabled data-product="ebook">
      <div class="lbl">
        <div class="lbl-top"><span class="lbl-name">Le guide « Fini l'eau verte »</span><span class="lbl-price">27€</span></div>
        <div class="lbl-desc">Le guide complet, 7 chapitres, PDF illustré (inclus dans toutes les formules).</div>
      </div>
    </label>

    <label class="flv-row" data-product="outils">
      <input type="checkbox" data-product="outils">
      <div class="lbl">
        <div class="lbl-top"><span class="lbl-name">+ Pack Outils Premium</span><span class="lbl-price">+27€</span></div>
        <div class="lbl-desc">Checklists, calculateurs, planner saisonnier 12 mois.</div>
      </div>
    </label>

    <label class="flv-row" data-product="fiches">
      <input type="checkbox" data-product="fiches">
      <div class="lbl">
        <div class="lbl-top"><span class="lbl-name">+ Kit 12 Fiches Urgences</span><span class="lbl-price">+17€</span></div>
        <div class="lbl-desc">Fiches A5 plastifiables — eau verte, algues, mousse, taches, irritations…</div>
      </div>
    </label>

    <div class="flv-or">Ou mieux</div>

    <label class="flv-row" data-product="bundle">
      <input type="checkbox" data-product="bundle">
      <div class="lbl">
        <div class="lbl-top"><span class="lbl-name">🎁 Bundle complet<span class="badge">-45%</span></span><span class="lbl-price">49€</span></div>
        <div class="lbl-desc">Guide + Pack Outils + 12 Fiches + Guide Saison + Guide Électrolyse Sel. Tout, économise 49€.</div>
      </div>
    </label>

    <div id="flv-cart-total"><span>Total</span><b id="flv-cart-amount">27€</b></div>

    <input class="flv-email" id="flv-cart-email" type="email" placeholder="ton@email.fr" autocomplete="email" inputmode="email"/>
    <div id="flv-cart-err"></div>
    <button class="flv-pay" id="flv-cart-pay">Payer 27€ →</button>
    <button class="flv-cancel" id="flv-cart-cancel">Annuler</button>
  </div>
</div>
<script>
(function(){
  var EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  var PRICES = { ebook:2700, outils:2700, fiches:1700, bundle:4900 };
  var pendingBtn = null;

  function selected(){
    var nodes = document.querySelectorAll('#flv-cart input[type=checkbox]');
    var out = [];
    nodes.forEach(function(n){ if(n.checked){ out.push(n.getAttribute('data-product')); } });
    return out;
  }
  function computeTotal(){
    var ids = selected();
    // Si bundle coché, on ignore les à la carte (sauf affichage)
    if(ids.indexOf('bundle') !== -1){ return PRICES.bundle; }
    var total = 0;
    ids.forEach(function(id){ total += PRICES[id] || 0; });
    return total;
  }
  function fmt(c){ return (c/100).toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g,' ') + '€'; }
  function refresh(){
    var ids = selected();
    var bundleChecked = ids.indexOf('bundle') !== -1;
    // Quand bundle est coché, on désactive visuellement les à la carte
    document.querySelectorAll('#flv-cart .flv-row').forEach(function(row){
      var p = row.getAttribute('data-product');
      var box = row.querySelector('input[type=checkbox]');
      if(p === 'ebook') return;
      if(bundleChecked && p !== 'bundle'){
        row.style.opacity = '0.45';
        box.disabled = true;
        if(box.checked){ box.checked = false; }
      } else {
        row.style.opacity = '';
        if(p !== 'ebook'){ box.disabled = false; }
      }
      row.classList.toggle('checked', box.checked);
    });
    var total = computeTotal();
    document.getElementById('flv-cart-amount').textContent = fmt(total);
    document.getElementById('flv-cart-pay').textContent = 'Payer ' + fmt(total) + ' →';
  }
  function buildProducts(){
    var ids = selected();
    if(ids.indexOf('bundle') !== -1){ return ['bundle']; }
    // Garantit ebook en premier
    var out = ['ebook'];
    ids.forEach(function(id){ if(id !== 'ebook' && out.indexOf(id) === -1){ out.push(id); } });
    return out;
  }
  function showCart(){
    document.getElementById('flv-cart-bg').style.display = 'flex';
    refresh();
    setTimeout(function(){
      var e = document.getElementById('flv-cart-email');
      try { var s = localStorage.getItem('flv_email'); if(s){ e.value = s; } } catch(_){}
      e.focus();
    }, 50);
  }
  function hideCart(){
    document.getElementById('flv-cart-bg').style.display = 'none';
    document.getElementById('flv-cart-err').textContent = '';
    var pay = document.getElementById('flv-cart-pay');
    pay.disabled = false;
    if(pendingBtn){ pendingBtn.style.pointerEvents=''; pendingBtn.style.opacity=''; pendingBtn = null; }
  }
  function pay(){
    var email = (document.getElementById('flv-cart-email').value || '').trim().toLowerCase();
    var err = document.getElementById('flv-cart-err');
    if(!EMAIL_RE.test(email)){ err.textContent = 'Email invalide.'; return; }
    err.textContent = '';
    var products = buildProducts();
    var pay = document.getElementById('flv-cart-pay');
    pay.disabled = true;
    pay.textContent = 'Redirection…';
    try { localStorage.setItem('flv_email', email); } catch(_){}
    fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email, product: products.join(',') }) }).catch(function(){});
    fetch('/api/checkout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ products: products, email: email })
    }).then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.url){ window.location.href = data.url; }
        else { err.textContent = 'Erreur paiement. Réessaye.'; pay.disabled = false; refresh(); }
      })
      .catch(function(){ err.textContent = 'Erreur réseau. Réessaye.'; pay.disabled = false; refresh(); });
  }
  function go(e){
    if(e){ e.preventDefault(); }
    pendingBtn = (e && e.currentTarget) || null;
    if(pendingBtn){ pendingBtn.style.pointerEvents='none'; pendingBtn.style.opacity='0.7'; }
    showCart();
  }
  function bindRows(){
    document.querySelectorAll('#flv-cart input[type=checkbox]').forEach(function(b){
      if(b.getAttribute('data-bound')==='1') return;
      b.setAttribute('data-bound','1');
      b.addEventListener('change', refresh);
    });
  }
  function bind(){
    bindRows();
    document.getElementById('flv-cart-pay').addEventListener('click', pay);
    document.getElementById('flv-cart-cancel').addEventListener('click', hideCart);
    document.getElementById('flv-cart-email').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); pay(); } });
    document.getElementById('flv-cart-bg').addEventListener('click', function(e){ if(e.target.id==='flv-cart-bg'){ hideCart(); } });
    var ctas = document.querySelectorAll('a.cta:not(.cta-decline), button.cta');
    ctas.forEach(function(n){
      if(n.getAttribute('data-cart-bound')==='1') return;
      n.setAttribute('data-cart-bound','1');
      n.addEventListener('click', go);
    });
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})();
</script>`;

export function loadHtmlPage(filename: string, productId: ProductId, options: PageOptions = {}): string {
  const filePath = path.join(process.cwd(), "html-sources", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const html = rewriteLegacyLinks(raw);
  const checkout = options.cart ? CART_SCRIPT : CHECKOUT_SCRIPT(productId);
  const analytics = plausibleSnippet();

  let out = html;
  if (analytics && out.includes("</head>")) {
    out = out.replace("</head>", `${analytics}</head>`);
  }
  if (options.direct && out.includes("</head>")) {
    out = out.replace("</head>", `${DIRECT_SALE_CSS}</head>`);
  }
  // Sticky bundle inutile en mode cart : le bundle est déjà une option visible du panier.
  const sticky = options.sticky && !options.cart ? STICKY_BUNDLE_HTML : "";
  if (out.includes("</body>")) {
    out = out.replace("</body>", `${sticky}${checkout}</body>`);
  } else {
    out = out + sticky + checkout;
  }
  return out;
}

export function loadStaticPage(filename: string, options: { sticky?: boolean } = {}): string {
  // Sans script de checkout : utilisé pour les pages de contenu (résumé, etc.).
  // On rewrite quand même les liens legacy et on injecte Plausible.
  const filePath = path.join(process.cwd(), "html-sources", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  let out = rewriteLegacyLinks(raw);
  const analytics = plausibleSnippet();
  if (analytics && out.includes("</head>")) {
    out = out.replace("</head>", `${analytics}</head>`);
  }
  if (options.sticky && out.includes("</body>")) {
    out = out.replace("</body>", `${STICKY_BUNDLE_HTML}</body>`);
  }
  return out;
}

export function htmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
