// 시연 영상 녹화. 쓰는 법: node rec/onboard.js <출력 폴더> <시연 화면 주소> [preview]
// 온보딩 꼴 시연 영상: 실제 시연 화면을 돌리며 카메라·스포트라이트·말풍선을 얹어 CDP 화면 전송으로 녹화한다.
const { chromium } = require(process.env.PW || '/Users/noru/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const URL = process.argv[3];
const PREVIEW = process.argv[4] === 'preview'; // 미리보기: 녹화 없이 장면별 캡처만
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
const DIRECTOR = fs.readFileSync(path.join(__dirname, 'director.js'), 'utf8');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  await page.addScriptTag({ content: DIRECTOR });
  const D = (fn, ...a) => page.evaluate(([f, a]) => window.__dir[f](...a), [fn, a]);
  const ev = (f, a) => page.evaluate(f, a);
  const wait = ms => page.waitForTimeout(ms);
  let shot = 0;
  const snap = async name => { if (PREVIEW) await page.screenshot({ path: path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.jpg'), quality: 80 }); };

  // 처음부터 조금 물러난 전체 화면으로 시작한다
  await D('cam', 960, 540, 0.9, 0, 960, 585);
  await wait(700);

  let frames = [], cdp, n = 0;
  if (!PREVIEW) {
    cdp = await ctx.newCDPSession(page);
    cdp.on('Page.screencastFrame', f => {
      const file = path.join(OUT, 'frames', String(n++).padStart(5, '0') + '.jpg');
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  }
  const t0 = Date.now();
  const mark = s => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', s);
  // 화면 위 요소 가운데(카메라 반영) 좌표
  const center = async sel => { const b = await page.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const tapAt = async (sel, holdMs = 110) => {
    const [x, y] = await center(sel);
    await D('tap', x, y);
    await page.mouse.move(x, y); await page.mouse.down(); await wait(holdMs); await page.mouse.up();
  };

  // 장면 사이 규칙: 말풍선과 막을 끄고(clear) 다 사라진 것을 확인한 뒤에만 카메라를 움직인다.
  const clear = async () => { const ok = await D('clear'); if (!ok) { await wait(400); if (await D('busyEmph')) throw new Error('emphasis still visible'); } };
  const camTo = async (cx, cy, s, ms, fx, fy) => { await D('cam', cx, cy, s, ms, fx, fy); await wait(ms + 150); };

  await wait(500);

  // 시작: 전체 화면과 두 이름표
  await D('tag', '사장님 휴대폰', 212, 30);
  await D('tag', '소쿠리 운영 화면', 1060, 30);
  await wait(2600); await snap('wide');
  await page.evaluate(() => document.querySelectorAll('.__tag').forEach(t => { t.classList.remove('on'); setTimeout(() => t.remove(), 600); }));
  await wait(650);
  mark('전체 화면');

  // ① 1/3 식당 주문: 묶음 카드
  await camTo(250, 470, 1.75, 1300, 700, 560);
  let hole = await D('spotOn', await D('pageRect', '#flist > .card'), 10);
  await D('bubble', hole, { step: '1 / 3', title: '금요일 청양고추, <b>8kg</b> 모였어요', sub: '<b>10kg</b>이 되면 농가가 보내 줘요.', side: 'right' });
  await wait(3200); await snap('s1-bundle'); mark('1 묶음');
  await clear();
  await tapAt('#flist > .card');
  await wait(1150);

  // ① 2kg 담기 (카메라 그대로)
  hole = await D('spotOn', await D('pageRect', '#olist > .card'), 10);
  await D('bubble', hole, { title: '필요한 <b>2kg</b>만 담아요', sub: '가격은 10kg 단가 그대로예요. 1kg 소포장보다 <b>37%</b> 싸요.', side: 'right' });
  await wait(3400); await snap('s1-2kg'); mark('1 2kg');
  await clear();

  // ① 길게 누르기
  await camTo(250, 700, 1.75, 900, 700, 540);
  hole = await D('spotOn', await D('pageRect', '#hold'), 12);
  await D('bubble', hole, { title: '꾹 누르면 주문 끝', sub: '버튼이 다 차면 주문이 들어가요.', side: 'right' });
  await wait(1500); await snap('s1-hold');
  {
    // 누르는 동안 강조를 걷어 내고, 확정(1.1초) 뒤에 손을 뗀다. 시트가 뜰 때 막과 말풍선이 남지 않는다.
    const [x, y] = await center('#hold');
    await D('tap', x, y);
    await page.mouse.move(x, y); await page.mouse.down(); await wait(500);
    await clear();
    await wait(250); await page.mouse.up();
  }
  mark('1 발주');
  await wait(1200);

  // ② 2/3 공동발주 확정
  {
    const r = await D('pageRect', '#rcpt');
    await camTo(r.x + r.w / 2, r.y + r.h / 2, 1.9, 1000, 640, 560);
  }
  hole = await D('spotOn', await D('pageRect', '#rcpt'), 12);
  await D('bubble', hole, { step: '2 / 3', title: '<b>10kg</b>이 모여 발주가 확정됐어요', sub: '식당 5곳이 2kg씩 모았고, 농가는 한 번에 10kg을 보내요.', side: 'right' });
  await wait(3800); await snap('s2-confirm'); mark('2 확정');
  await clear();
  await tapAt('#sheetGo');
  await wait(700);

  // ③ 3/3 상권 데이터 기록: 주문 기록
  await camTo(1569, 660, 1.45, 1200);
  hole = await D('spotOn', await D('pageRect', '#feed .fi'), 6);
  await D('bubble', hole, { step: '3 / 3', title: '주문이 상권 기록에 쌓였어요', sub: '어느 가게가 무엇을 언제 받는지 한 줄씩 쌓여요.', side: 'below' });
  await wait(3400); await snap('s3-feed'); mark('3 기록');
  await clear();

  // ③ 구매 데이터
  await camTo(1569, 420, 1.45, 900);
  hole = await D('spotOn', await D('pageRect', '#purchase'), 8);
  await D('bubble', hole, { title: '상권 데이터도 바로 바뀌어요', sub: '청양고추 주문량에 방금 <b>2kg</b>이 더해졌어요.', side: 'below' });
  await wait(3400); await snap('s3-purchase'); mark('3 데이터');
  await clear();

  // 끝 장면: 다음 상권
  await camTo(1207, 520, 1.12, 1100);
  await tapAt('button[data-area="campus"]');
  await wait(1400);
  hole = await D('spotOn', await D('pageRect', '.mapc'), 8);
  await D('bubble', hole, { title: '다음은 회기·경희대, 청량리예요', sub: '시립대 정문에서 옆 상권으로 넓혀 가요.', side: 'right' });
  await wait(3600); await snap('s4-area'); mark('끝 상권');
  await clear();
  await tapAt('button[data-area="gate"]');
  await wait(900);

  // 전체로 물러나며 끝
  await camTo(960, 540, 0.9, 1300, 960, 585);
  await wait(2200); await snap('pullback'); mark('끝');

  if (!PREVIEW) {
    await cdp.send('Page.stopScreencast');
    await wait(300);
    const end = frames[frames.length - 1].t + 0.4;
    const lines = [];
    frames.forEach((f, i) => { const d = (i + 1 < frames.length ? frames[i + 1].t : end) - f.t; lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, d).toFixed(4)}`); });
    lines.push(`file '${frames[frames.length - 1].file}'`);
    fs.writeFileSync(path.join(OUT, 'list.txt'), lines.join('\n'));
    console.log('frames', frames.length, 'span', (end - frames[0].t).toFixed(1) + 's');
  }
  await browser.close();
})();
