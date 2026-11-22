// 시연 화면 위에 얹는 연출 층: 카메라(확대·이동), 스포트라이트, 온보딩 말풍선, 탭 표시, 처음·끝 카드.
window.__dir = (() => {
  const W = 1920, H = 1080;
  const EASE = 'cubic-bezier(.65,0,.25,1)';
  const css = document.createElement('style');
  css.textContent = `
    html{background:#f5f6f8}
    body{transform-origin:0 0;will-change:transform}
    .tog{display:none!important}
    #__spot{position:fixed;left:0;top:0;width:${W}px;height:${H}px;border-radius:22px;pointer-events:none;z-index:2147483000;
      box-shadow:0 0 0 4000px rgba(12,24,18,0),0 0 0 0 rgba(15,149,71,0);opacity:1;
      transition:left .9s ${EASE},top .9s ${EASE},width .9s ${EASE},height .9s ${EASE},box-shadow .6s ease}
    #__spot.on{box-shadow:0 0 0 4000px rgba(12,24,18,.52),0 0 0 4px #0f9547}
    #__bub{position:fixed;left:0;top:0;width:560px;z-index:2147483100;pointer-events:none;background:#fff;border-radius:24px;
      padding:30px 34px 32px;border-radius:32px;box-shadow:0 20px 48px rgba(10,40,22,.20);opacity:0;transform:translateY(16px);
      transition:opacity .4s ease,transform .5s cubic-bezier(.2,.9,.25,1);font-family:Pretendard,system-ui,sans-serif}
    #__bub.on{opacity:1;transform:none}
    #__bub .__step{display:block;background:none;padding:0;color:#8b95a1;font-weight:700;font-size:24px;letter-spacing:.02em}
    #__bub .t{margin-top:8px;font-size:44px;line-height:1.28;font-weight:800;color:#191f28;letter-spacing:-.03em;word-break:keep-all}
    #__bub .__step+.t{margin-top:6px}
    #__bub > .t:first-child{margin-top:0}
    #__bub .t b{color:#0f9547;font-weight:850}
    #__bub .s b{color:#0f9547;font-weight:750}
    #__bub .s{margin-top:12px;font-size:28px;line-height:1.5;font-weight:600;color:#6b7684;word-break:keep-all}
    .__tap{position:fixed;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;pointer-events:none;z-index:2147483200;
      background:rgba(15,149,71,.28);border:4px solid #0f9547;animation:__tap .75s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes __tap{0%{transform:scale(.3);opacity:0}25%{opacity:1}100%{transform:scale(1.25);opacity:0}}
    .__tag{position:fixed;z-index:2147483100;pointer-events:none;background:#0f9547;color:#fff;font:800 30px Pretendard,system-ui,sans-serif;
      padding:12px 24px;border-radius:999px;box-shadow:0 10px 30px rgba(10,60,30,.28);opacity:0;transform:translateY(14px) scale(.96);
      transition:opacity .4s ease,transform .5s cubic-bezier(.2,.9,.25,1)}
    .__tag.on{opacity:1;transform:none}
    #__card{position:fixed;inset:0;z-index:2147483500;background:#0919b4;color:#fff;display:flex;flex-direction:column;justify-content:center;
      padding:0 150px;font-family:Pretendard,system-ui,sans-serif;transition:clip-path .9s ${EASE};clip-path:inset(0 0 0 0)}
    #__card.out{clip-path:inset(0 0 100% 0)}
    #__card.in{clip-path:inset(100% 0 0 0)}
    #__card .eb{font-size:34px;font-weight:700;color:#cbd4fa;opacity:0;transform:translateY(18px);transition:all .6s cubic-bezier(.2,.9,.25,1) .15s}
    #__card .tt{margin-top:22px;font-size:92px;line-height:1.18;font-weight:850;letter-spacing:-.03em;word-break:keep-all;opacity:0;transform:translateY(24px);transition:all .7s cubic-bezier(.2,.9,.25,1) .3s}
    #__card .tt em{font-style:normal;color:#fff000}
    #__card .ft{position:absolute;left:150px;bottom:90px;font-size:30px;font-weight:700;color:#cbd4fa;opacity:0;transition:opacity .6s ease .6s}
    #__card .wm{position:absolute;right:150px;bottom:84px;font-size:40px;font-weight:900;letter-spacing:.06em;color:#fff;opacity:0;transition:opacity .6s ease .6s}
    #__card.show .eb,#__card.show .tt{opacity:1;transform:none}
    #__card.show .ft,#__card.show .wm{opacity:1}
  `;
  document.head.append(css);
  const spot = document.createElement('div'); spot.id = '__spot';
  const bub = document.createElement('div'); bub.id = '__bub';
  document.documentElement.append(spot, bub);

  let cs = 1, ctx = 0, cty = 0;
  const body = document.body;
  const pageRect = el => {
    const r = (typeof el === 'string' ? document.querySelector(el) : el).getBoundingClientRect();
    return { x: (r.x - ctx) / cs, y: (r.y - cty) / cs, w: r.width / cs, h: r.height / cs };
  };
  const unite = (...rs) => {
    const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y));
    return { x, y, w: Math.max(...rs.map(r => r.x + r.w)) - x, h: Math.max(...rs.map(r => r.y + r.h)) - y };
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 카메라: 페이지 좌표의 점(cx,cy)을 화면 (fx,fy)에 오도록 s배 확대
  const busyEmph = () => spot.classList.contains('on') || bub.classList.contains('on') || parseFloat(getComputedStyle(bub).opacity) > 0.01 || !/rgba\([^)]*, 0\)/.test(getComputedStyle(spot).boxShadow.split('),')[0] + ')');
  function cam(cx, cy, s, ms = 1100, fx = W / 2, fy = H / 2) {
    if (busyEmph()) throw new Error('cam while emphasis visible');
    cs = s; ctx = s > 1 ? clamp(fx - s * cx, W - W * s, 0) : fx - s * cx; cty = s > 1 ? clamp(fy - s * cy, H - H * s, 0) : fy - s * cy;
    body.style.transition = `transform ${ms}ms ${EASE}`;
    body.style.transform = `translate(${ctx}px,${cty}px) scale(${s})`;
  }
  const toScreen = r => ({ x: r.x * cs + ctx, y: r.y * cs + cty, w: r.w * cs, h: r.h * cs });
  function spotOn(r, pad = 12) {
    const s = toScreen(r);
    Object.assign(spot.style, { left: s.x - pad + 'px', top: s.y - pad + 'px', width: s.w + pad * 2 + 'px', height: s.h + pad * 2 + 'px' });
    spot.classList.add('on');
    return { x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h + pad * 2 };
  }
  function spotOff() { spot.classList.remove('on'); return new Promise(r => setTimeout(r, 700)); }
  function bubble(hole, { step, title, sub, side = 'right', gap = 34 }) {
    bub.classList.remove('on');
    bub.innerHTML = (step ? `<span class="__step">${step}</span>` : '') + `<div class="t">${title}</div>` + (sub ? `<div class="s">${sub}</div>` : '');
    const bw = 560, bh = bub.offsetHeight;
    let x, y;
    if (side === 'right') { x = hole.x + hole.w + gap; y = hole.y + hole.h / 2 - bh / 2; }
    if (side === 'left') { x = hole.x - gap - bw; y = hole.y + hole.h / 2 - bh / 2; }
    if (side === 'below') { x = hole.x + hole.w / 2 - bw / 2; y = hole.y + hole.h + gap; }
    if (side === 'above') { x = hole.x + hole.w / 2 - bw / 2; y = hole.y - gap - bh; }
    x = clamp(x, 40, W - bw - 40); y = clamp(y, 40, H - bh - 40);
    Object.assign(bub.style, { left: x + 'px', top: y + 'px' });
    void bub.offsetWidth; bub.classList.add('on');
  }
  function bubbleOff() { bub.classList.remove('on'); return new Promise(r => setTimeout(r, 450)); }
  async function clear() { bub.classList.remove('on'); spot.classList.remove('on'); await new Promise(r => setTimeout(r, 720)); return !busyEmph(); }
  function tap(x, y) {
    const t = document.createElement('i'); t.className = '__tap';
    Object.assign(t.style, { left: x + 'px', top: y + 'px' });
    document.documentElement.append(t); setTimeout(() => t.remove(), 900);
  }
  function tag(text, x, y) {
    const t = document.createElement('div'); t.className = '__tag'; t.textContent = text;
    Object.assign(t.style, { left: x + 'px', top: y + 'px' });
    document.documentElement.append(t); void t.offsetWidth; t.classList.add('on');
    return () => { t.classList.remove('on'); setTimeout(() => t.remove(), 600); };
  }
  function card({ eb, tt, ft, wm = 'SOKURI', enter = false }) {
    let c = document.getElementById('__card');
    if (!c) { c = document.createElement('div'); c.id = '__card'; document.documentElement.append(c); }
    c.innerHTML = `<div class="eb">${eb || ''}</div><div class="tt">${tt}</div><div class="ft">${ft || ''}</div><div class="wm">${wm}</div>`;
    c.classList.remove('out', 'show');
    if (enter) { c.classList.add('in'); void c.offsetWidth; c.classList.remove('in'); }
    setTimeout(() => c.classList.add('show'), enter ? 500 : 50);
  }
  function cardOut() { const c = document.getElementById('__card'); if (c) c.classList.add('out'); }
  return { cam, pageRect, unite, spotOn, spotOff, bubble, bubbleOff, clear, busyEmph, tap, tag, card, cardOut, toScreen };
})();
