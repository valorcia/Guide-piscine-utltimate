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

export function loadHtmlPage(filename: string, productId: ProductId): string {
  const filePath = path.join(process.cwd(), "html-sources", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const html = rewriteLegacyLinks(raw);
  const checkout = CHECKOUT_SCRIPT(productId);
  const analytics = plausibleSnippet();

  let out = html;
  if (analytics && out.includes("</head>")) {
    out = out.replace("</head>", `${analytics}</head>`);
  }
  if (out.includes("</body>")) {
    out = out.replace("</body>", `${checkout}</body>`);
  } else {
    out = out + checkout;
  }
  return out;
}

export function loadStaticPage(filename: string): string {
  // Sans script de checkout : utilisé pour les pages de contenu (résumé, etc.).
  // On rewrite quand même les liens legacy et on injecte Plausible.
  const filePath = path.join(process.cwd(), "html-sources", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  let out = rewriteLegacyLinks(raw);
  const analytics = plausibleSnippet();
  if (analytics && out.includes("</head>")) {
    out = out.replace("</head>", `${analytics}</head>`);
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
