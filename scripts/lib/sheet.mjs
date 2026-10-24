// Contact sheet: lays out stills in a labelled grid by rendering a page in the same browser.
export async function contactSheet(browser, shots, { cols = 4, cellW = 640, title = '' } = {}) {
  const page = await browser.newPage();
  const first = shots[0];
  const ratio = first.h / first.w, cellH = Math.round(cellW * ratio);
  const rows = Math.ceil(shots.length / cols);
  const W = cols * cellW + (cols + 1) * 12, H = rows * (cellH + 34) + 12 + (title ? 44 : 0);
  await page.setViewportSize({ width: W, height: H });
  const cells = shots.map(s => `<figure><img src="data:image/${s.type || 'png'};base64,${s.buf.toString('base64')}"><figcaption>${s.label}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:0;background:#111;font:600 15px/1 ui-monospace,monospace;color:#ddd;padding:12px 0 0 12px;width:${W}px}
  h1{font-size:18px;margin:4px 0 14px;color:#fff}.g{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:12px}
  figure{margin:0}img{display:block;width:${cellW}px;height:${cellH}px;object-fit:cover;background:#222}figcaption{padding:7px 0 0}</style>
  ${title ? `<h1>${title}</h1>` : ''}<div class="g">${cells}</div>`);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  const buf = await page.screenshot({ type: 'jpeg', quality: 88, fullPage: true });
  await page.close();
  return buf;
}
