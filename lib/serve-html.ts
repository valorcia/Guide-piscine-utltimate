import fs from "fs";
import path from "path";
import { ProductId } from "./products";

const CHECKOUT_SCRIPT = (productId: ProductId) => `
<script>
(function(){
  var PRODUCT = ${JSON.stringify(productId)};
  function go(e){
    if(e){ e.preventDefault(); }
    var btn = (e && e.currentTarget) || null;
    if(btn){ btn.style.pointerEvents='none'; btn.style.opacity='0.7'; }
    fetch('/api/checkout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ product: PRODUCT })
    }).then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.url){ window.location.href = data.url; }
        else { alert('Erreur lors de la création du paiement. Réessaye dans un instant.'); if(btn){ btn.style.pointerEvents=''; btn.style.opacity=''; } }
      })
      .catch(function(){ alert('Erreur réseau. Réessaye.'); if(btn){ btn.style.pointerEvents=''; btn.style.opacity=''; } });
  }
  function bind(){
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

export function loadHtmlPage(filename: string, productId: ProductId): string {
  const filePath = path.join(process.cwd(), "html-sources", filename);
  const html = fs.readFileSync(filePath, "utf8");
  const script = CHECKOUT_SCRIPT(productId);
  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }
  return html + script;
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
