/* laporan_docx.js — pembuat laporan Word (.docx) di browser, mengikuti format template PT DP.
   Bergantung: JSZip (global), DOK_DEF & MET_DESC (dokumen_default.js). API: window.LapDocx.buat(tplBuf, dok, ctx) -> Blob; LapDocx.token(ctx) -> peta token. */
(function () {
const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NS_WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const NS_XML = 'http://www.w3.org/XML/1998/namespace';
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const METHODS = ['TD', 'KS', 'WWC', 'FGD', 'ANL', 'OBS', 'PJ'];
const METNAME = { TD: 'Tinjauan Dokumentasi', KS: 'Kuesioner', WWC: 'Wawancara', FGD: 'FGD', ANL: 'Analisis', OBS: 'Observasi', PJ: 'Pengujian' };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (x, n = 4) => (typeof x === 'number' && isFinite(x)) ? x.toFixed(n) : '';

/* ---------- tanggal ---------- */
const pd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null };
const tgl = s => { const a = pd(s); return a ? `${a.d} ${BLN[a.m - 1]} ${a.y}` : '[ISI TANGGAL]' };
function rentang(s1, s2, up) {
  const a = pd(s1), b = pd(s2); if (!a || !b) return '[ISI TANGGAL]'; let r;
  if (a.y === b.y && a.m === b.m && a.d === b.d) r = tgl(s1);
  else if (a.y === b.y && a.m === b.m) r = `${a.d}-${b.d} ${BLN[a.m - 1]} ${a.y}`;
  else if (a.y === b.y) r = `${a.d} ${BLN[a.m - 1]} - ${b.d} ${BLN[b.m - 1]} ${a.y}`;
  else r = `${tgl(s1)} - ${tgl(s2)}`;
  return up ? r.toUpperCase() : r;
}
const sdate = s => { const a = pd(s); return a ? `${String(a.d).padStart(2, '0')}/${String(a.m).padStart(2, '0')}/${a.y}` : '' };
const durasi = (s1, s2) => { const a = pd(s1), b = pd(s2); if (!a || !b) return null; return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5) + 1 };

/* ---------- token ---------- */
function token(ctx) {
  const I = ctx.id || {}, meta = (ctx.dok && ctx.dok.meta) || {};
  const nama = meta.nama || ctx.nama || '', sing = meta.singkatan || I.singkatan || ('PT ' + (ctx.kode || ''));
  const site = I.site || '';
  const mitra = ctx.ents.filter(e => e.peran !== 'IUP').map(e => e.kode).join(', ') || '-';
  const mitraRinci = ctx.ents.filter(e => e.peran !== 'IUP').map(e => `${e.nama} (${e.peran})`).join('; ');
  const tot = ctx.ents.reduce((a, e) => a + (+e.pekerja || 0), 0);
  const T = {
    NAMA: nama, NAMA_UP: nama.toUpperCase(), SINGKATAN: sing, SITE: site, SITE_UP: String(site).toUpperCase().replace(/^SITE\s+/, '').trim(),
    ALAMAT_PUSAT: I.alamat_pusat || '', ALAMAT_PUSAT_UP: String(I.alamat_pusat || '').toUpperCase(), ALAMAT_SITE: I.alamat_site || '', ALAMAT_SITE_UP: String(I.alamat_site || '').toUpperCase(),
    IZIN: I.izin || '', NOMOR_IZIN: I.nomor_izin || '', KOMODITAS: I.komoditas || '', DIREKTUR: I.direktur || '', KTT: I.ktt || '', LUAS: I.luas || '',
    JML_PEKERJA: tot ? String(Math.round(tot)) : '', MITRA: mitra,
    PERIODE_MULAI: tgl(I.periode_mulai), PERIODE_SELESAI: tgl(I.periode_selesai), NILAI_MULAI: tgl(I.nilai_mulai), NILAI_SELESAI: tgl(I.nilai_selesai),
    PELAKSANAAN: rentang(I.nilai_mulai, I.nilai_selesai), PELAKSANAAN_UP: rentang(I.nilai_mulai, I.nilai_selesai, true),
    LOKASI: I.lokasi_ttd || '[Lokasi]', TGL_LAPORAN: tgl(I.tgl_laporan), TAHUN: (pd(I.nilai_selesai) || pd(I.periode_selesai) || {}).y || '',
    TOTAL: num(ctx.total.cap, 4), KATEGORI: ctx.total.cat, JUMLAH_ITEM: String(ctx.nItems), AGG: ctx.agg === 'MIN' ? 'MIN (skor terendah antar-entitas)' : 'rata-rata tertimbang jumlah pekerja',
    LINGKUP: `Penilaian di ${nama} ini dilaksanakan terhadap seluruh item pengukuran (${ctx.nItems} item) dengan lingkup pekerja ${sing} selaku pemegang IUP` + (mitraRinci ? ` serta mitra kerja: ${mitraRinci}.` : '.')
  };
  return T;
}
const sub = (t, T) => String(t == null ? '' : t).replace(/\{\{(\w+)\}\}/g, (m, k) => (T[k] !== undefined && T[k] !== '') ? T[k] : '…');

/* ---------- XML teks ---------- */
function runs(text, rPr) { // mendukung \t, \n dan **tebal**
  rPr = rPr || ''; let out = '', bold = false;
  String(text == null ? '' : text).split('**').forEach((seg, i) => {
    if (i > 0) bold = !bold;
    const rp = '<w:rPr>' + (bold ? '<w:b/><w:bCs/>' : '') + rPr + '</w:rPr>';
    seg.split('\n').forEach((ln, li) => {
      if (li > 0) out += `<w:r>${rp}<w:br/></w:r>`;
      ln.split('\t').forEach((tt, ti) => {
        if (ti > 0) out += `<w:r>${rp}<w:tab/></w:r>`;
        if (tt) out += `<w:r>${rp}<w:t xml:space="preserve">${esc(tt)}</w:t></w:r>`;
      });
    });
  });
  return out;
}
const para = (pPr, text, rPr) => `<w:p><w:pPr>${pPr}${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:pPr>${runs(text, rPr)}</w:p>`;
const HL = '<w:highlight w:val="yellow"/>';
const ARIAL = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';

/* preset paragraf: [pPr, rPr] */
const PRE = {
  bab: ['<w:pStyle w:val="Heading1"/><w:keepNext/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="11"/></w:numPr><w:tabs><w:tab w:val="left" w:pos="641"/></w:tabs><w:spacing w:before="120" w:line="276" w:lineRule="auto"/><w:ind w:hanging="361"/>', ''],
  sub: ['<w:pStyle w:val="Heading1"/><w:keepNext/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="11"/></w:numPr><w:tabs><w:tab w:val="left" w:pos="1170"/></w:tabs><w:spacing w:before="137" w:line="276" w:lineRule="auto"/><w:ind w:hanging="721"/>', ''],
  'subsub:op': ['<w:pStyle w:val="ListParagraph"/><w:keepNext/><w:tabs><w:tab w:val="left" w:pos="2280"/></w:tabs><w:spacing w:before="120" w:line="360" w:lineRule="auto"/><w:ind w:left="2280" w:right="212" w:hanging="900"/>', '<w:b/><w:bCs/>'],
  'subsub:met': ['<w:pStyle w:val="Heading1"/><w:keepNext/><w:tabs><w:tab w:val="left" w:pos="1260"/></w:tabs><w:spacing w:before="120" w:line="276" w:lineRule="auto"/><w:ind w:left="1260" w:hanging="810"/>', ''],
  'subsub:ind': ['<w:pStyle w:val="ListParagraph"/><w:keepNext/><w:tabs><w:tab w:val="left" w:pos="900"/></w:tabs><w:spacing w:before="120" w:line="276" w:lineRule="auto"/><w:ind w:left="900" w:hanging="630"/><w:jc w:val="both"/>', '<w:b/><w:bCs/><w:sz w:val="24"/>'],
  'p:p': ['<w:pStyle w:val="BodyText"/><w:spacing w:before="139" w:line="276" w:lineRule="auto"/><w:ind w:left="640" w:right="538" w:firstLine="719"/><w:jc w:val="both"/>', ''],
  'p:pl': ['<w:pStyle w:val="BodyText"/><w:spacing w:before="60" w:line="276" w:lineRule="auto"/><w:ind w:left="450" w:right="460"/><w:jc w:val="both"/>', ''],
  'p:pop': ['<w:pStyle w:val="BodyText"/><w:spacing w:before="216" w:line="360" w:lineRule="auto"/><w:ind w:left="2280" w:right="140" w:firstLine="360"/><w:jc w:val="both"/>', ARIAL],
  'p:ld': ['<w:tabs><w:tab w:val="left" w:pos="2124"/></w:tabs><w:spacing w:before="120" w:line="276" w:lineRule="auto"/><w:ind w:left="270"/><w:jc w:val="both"/>', '<w:sz w:val="24"/>'],
  'p:ld2': ['<w:pStyle w:val="ListParagraph"/><w:spacing w:before="60" w:line="276" w:lineRule="auto"/><w:ind w:left="270" w:firstLine="630"/><w:jc w:val="both"/>', ARIAL + '<w:sz w:val="24"/><w:szCs w:val="24"/>'],
  'p:note': ['<w:spacing w:before="60" w:after="60"/><w:jc w:val="both"/>', '<w:i/><w:sz w:val="16"/>'],
  kv: ['<w:pStyle w:val="BodyText"/><w:tabs><w:tab w:val="left" w:pos="4620"/><w:tab w:val="left" w:pos="5103"/></w:tabs><w:spacing w:line="360" w:lineRule="auto"/><w:ind w:left="5103" w:right="623" w:hanging="3723"/><w:jc w:val="both"/>', ARIAL],
  lh: ['<w:keepNext/><w:spacing w:before="120" w:after="60"/>', '<w:b/><w:sz w:val="24"/>']
};
PRE['p:ld3'] = PRE['p:ld'];
const SZ = '<w:sz w:val="24"/><w:szCs w:val="24"/>';

/* ---------- tabel generik ---------- */
const CATC = { Dasar: 'F4B183', Reaktif: 'FFD966', Terencana: 'FFF2CC', Proaktif: 'C6E0B4', Resilient: '70AD47' };
function tblXml(o) { // o: {head, rows, w[] (twip), size, align[], catcol, bandRows(set), fill}
  const sz = o.size || 18, n = o.head.length, W = o.w;
  const total = W.reduce((a, b) => a + b, 0);
  const cell = (txt, wd, opt) => {
    const al = (opt.al === 'c') ? '<w:jc w:val="center"/>' : '';
    const sh = opt.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${opt.fill}"/>` : '';
    const rp = `${opt.b ? '<w:b/>' : ''}${opt.color ? `<w:color w:val="${opt.color}"/>` : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
    return `<w:tc><w:tcPr><w:tcW w:w="${wd}" w:type="dxa"/>${sh}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/>${al}<w:rPr>${rp}</w:rPr></w:pPr>${runs(txt, rp)}</w:p></w:tc>`;
  };
  let x = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${W.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  x += `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${o.head.map((h, j) => cell(h, W[j], { b: 1, al: 'c', fill: o.fill || '1F3864', color: 'FFFFFF' })).join('')}</w:tr>`;
  o.rows.forEach((r, ri) => {
    const band = o.band && o.band.has(ri);
    x += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((v, j) => {
      const s = v == null ? '' : String(v); const f = band ? 'DDEBF7' : ((o.catcol === j && CATC[s]) ? CATC[s] : null);
      return cell(s, W[j], { al: o.align && o.align[j], fill: f, b: band && j === 1 });
    }).join('')}</w:tr>`;
  });
  return x + '</w:tbl>';
}
const fitW = (rel, total) => { const s = rel.reduce((a, b) => a + b, 0); const w = rel.map(r => Math.floor(r / s * total)); w[w.length - 1] += total - w.reduce((a, b) => a + b, 0); return w };

/* ---------- gambar & grafik ---------- */
function loadImg(src) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Gambar tidak dapat dibaca')); im.src = src }) }
async function pngFrom(src, maxW) {
  const im = await loadImg(src); const k = Math.min(1, (maxW || 1600) / im.naturalWidth);
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  const b = await new Promise(r => c.toBlob(r, 'image/png')); return { bytes: new Uint8Array(await b.arrayBuffer()), w: c.width, h: c.height };
}
async function chartPng(labels, vals, title, pct) {
  const c = document.createElement('canvas'); c.width = 992; c.height = 480; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText(title, c.width / 2, 32);
  const L = 70, R = 20, T = 60, B = 60, w = c.width - L - R, h = c.height - T - B;
  g.strokeStyle = '#ccc'; g.fillStyle = '#444'; g.font = '16px Arial'; g.textAlign = 'right';
  for (let i = 0; i <= 5; i++) { const y = T + h - h * i / 5; g.beginPath(); g.moveTo(L, y); g.lineTo(L + w, y); g.stroke(); g.fillText(pct ? (i * 20) + '%' : (i / 5).toFixed(1), L - 8, y + 5) }
  const n = labels.length, bw = w / n * .6;
  labels.forEach((lb, i) => {
    const v = Math.max(0, Math.min(1, typeof vals[i] === 'number' ? vals[i] : 0)), x = L + w / n * (i + .5) - bw / 2, y = T + h - h * v;
    g.fillStyle = '#2E75B6'; g.fillRect(x, y, bw, h * v); g.fillStyle = '#000'; g.textAlign = 'center'; g.font = '16px Arial';
    g.fillText(pct ? Math.round(v * 100) + '%' : v.toFixed(2), x + bw / 2, Math.max(T + 14, y - 6)); g.fillText(String(lb).slice(0, 14), x + bw / 2, T + h + 24);
  });
  const b = await new Promise(r => c.toBlob(r, 'image/png')); return { bytes: new Uint8Array(await b.arrayBuffer()), w: c.width, h: c.height };
}

/* ---------- DOM util ---------- */
function build(tplBuf, dok, ctx) {
  return JSZip.loadAsync(tplBuf).then(zip => run(zip, dok, ctx));
}
async function run(zip, dok, ctx) {
  const xml = await zip.file('word/document.xml').async('string');
  const head = xml.slice(0, xml.indexOf('<w:body>') + 8);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagNameNS(NS_W, 'body')[0];
  const kids = [...body.children];
  const ser = n => new XMLSerializer().serializeToString(n);
  const T = token(ctx), S = t => sub(t, T);
  const w = n => doc.createElementNS(NS_W, 'w:' + n);
  const kidsOf = (e, n) => [...e.children].filter(c => c.localName === n);
  const rels = []; let imgN = 0, docId = 900;
  const media = [];

  function setPar(p, text, bold) {
    const rs = kidsOf(p, 'r'); let base = rs.find(r => [...r.getElementsByTagNameNS(NS_W, 't')].some(t => t.textContent.trim())) || rs[0];
    if (!base) { base = w('r'); const ppr = kidsOf(p, 'pPr')[0], mk = ppr && kidsOf(ppr, 'rPr')[0]; if (mk) base.appendChild(mk.cloneNode(true)); p.appendChild(base) }
    [...p.children].forEach(c => { if (c.localName !== 'pPr' && c !== base) p.removeChild(c) });
    [...base.children].forEach(c => { if (c.localName !== 'rPr') base.removeChild(c) });
    let rPr = kidsOf(base, 'rPr')[0];
    if (bold != null) {
      if (!rPr) { rPr = w('rPr'); base.insertBefore(rPr, base.firstChild) }
      kidsOf(rPr, 'b').forEach(x => rPr.removeChild(x));
      if (bold) { const b = w('b'); const rf = kidsOf(rPr, 'rFonts')[0]; if (rf) rf.after(b); else rPr.insertBefore(b, rPr.firstChild) }
    }
    String(text == null ? '' : text).split('\t').forEach((seg, i) => {
      if (i > 0) base.appendChild(w('tab'));
      if (seg) { const t = w('t'); t.setAttributeNS(NS_XML, 'xml:space', 'preserve'); t.textContent = seg; base.appendChild(t) }
    });
  }
  function cellSet(tc, text, bold) {
    const ps = kidsOf(tc, 'p'); setPar(ps[0], text, bold); ps.slice(1).forEach(p => tc.removeChild(p));
  }
  function fillMulti(tc, texts) {
    const ps = kidsOf(tc, 'p'); ps.slice(1).forEach(p => tc.removeChild(p));
    setPar(ps[0], texts.length ? texts[0] : ''); let last = ps[0];
    texts.slice(1).forEach(t => { const n = ps[0].cloneNode(true); last.after(n); setPar(n, t); last = n });
  }
  const trs = t => kidsOf(t, 'tr'), tcs = tr => kidsOf(tr, 'tc');
  const TT = i => kids[i].cloneNode(true);
  const afterTbl = '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';

  /* ---- sampul ---- */
  const C = dok.cover || {}; const cov = [];
  const cmap = { 0: C.l1, 1: C.l2, 2: C.l3, 3: C.jd, 14: C.lp, 15: C.ap, 19: C.ls, 20: C.as1, 21: C.as2, 25: C.lw, 26: C.wk };
  let logo = null;
  if (ctx.logo) { try { logo = await pngFrom(ctx.logo, 900) } catch (e) { logo = null } }
  for (let i = 0; i < 27; i++) {
    const p = kids[i].cloneNode(true);
    if (cmap[i] !== undefined && cmap[i] !== null) setPar(p, S(cmap[i]));
    if (logo) {
      p.getElementsByTagNameNS(NS_WP, 'anchor').length && (() => {
        const anc = p.getElementsByTagNameNS(NS_WP, 'anchor')[0], ext = anc.getElementsByTagNameNS(NS_WP, 'extent')[0];
        let cx = +ext.getAttribute('cx'), cy = Math.round(cx * logo.h / logo.w); const mx = Math.round(683260 * 1.5);
        if (cy > mx) { cy = mx; cx = Math.round(cy * logo.w / logo.h) }
        ext.setAttribute('cx', cx); ext.setAttribute('cy', cy);
        [...anc.getElementsByTagName('*')].filter(e => e.localName === 'ext' && e.hasAttribute('cx')).forEach(e => { e.setAttribute('cx', cx); e.setAttribute('cy', cy) });
      })();
    }
    cov.push(ser(p));
  }
  if (logo) zip.file('word/media/image1.png', logo.bytes, { createFolders: false });
  cov.push(ser(kids[27]));

  /* ---- gambar tambahan ---- */
  function drawing(img, cmW) {
    imgN++; const id = 'rIdImg' + imgN; media.push({ name: `word/media/gb${imgN}.png`, bytes: img.bytes });
    rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/gb${imgN}.png"/>`);
    const cx = Math.round(cmW * 360000), cy = Math.round(cx * img.h / img.w); docId++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docId}" name="Gambar ${imgN}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docId}" name="g${imgN}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }

  /* ---- narasi otomatis ---- */
  const IND_NAME = { 1: 'Partisipasi Pekerja Tambang', 2: 'Tanggung Jawab Pimpinan Unit Kerja', 3: 'Analisis dan Statistik Kecelakaan, Penyakit Akibat Kerja, Kejadian Akibat Penyakit Tenaga Kerja, dan Kejadian Berbahaya', 4: 'Upaya-Upaya Pengendalian yang Dilakukan' };
  function autoTemuan(i) {
    const ind = ctx.inds[i], ps = Object.entries(ctx.params).filter(([c]) => c.startsWith(i + '.')).sort((a, b) => a[1].pct - b[1].pct);
    const its = ctx.items.filter(x => x.ind === i).sort((a, b) => a.cap - b.cap);
    const out = [`Nilai capaian indikator mencapai ${num(ind.cap)} dari nilai maksimum ${num(ind.mx, 2)} (${(ind.pct * 100).toFixed(1)}% keterpenuhan) dengan tingkat ${ind.cat}.`];
    if (ps.length > 1) { const lo = ps[0], hi = ps[ps.length - 1]; out.push(`Parameter dengan capaian tertinggi adalah ${hi[0]} ${hi[1].name} (${(hi[1].pct * 100).toFixed(0)}%); terendah adalah ${lo[0]} ${lo[1].name} (${(lo[1].pct * 100).toFixed(0)}%).`) }
    let low = its.filter(x => x.cap < .5).slice(0, 5); if (!low.length) low = its.slice(0, 3);
    if (low.length) out.push('Item pengukuran dengan capaian terendah: ' + low.map(x => `${x.code} ${x.name} (${(x.cap * 100).toFixed(0)}%)`).join('; ') + '.');
    const vals = ctx.entInd[i]; if (vals) {
      const pr = ctx.ents.map((e, k) => [e.kode, vals[k]]).filter(x => typeof x[1] === 'number');
      if (pr.length > 1) { const lo = pr.reduce((a, b) => b[1] < a[1] ? b : a), hi = pr.reduce((a, b) => b[1] > a[1] ? b : a); out.push(`Berdasarkan entitas, keterpenuhan tertinggi pada ${hi[0]} (${(hi[1] * 100).toFixed(0)}%) dan terendah pada ${lo[0]} (${(lo[1] * 100).toFixed(0)}%).`) }
    }
    return out;
  }
  const listItems = (arr, kind) => arr.map((t, n) => {
    const lab = kind === 'bullet' ? '•' : `${n + 1}.`;
    const pPr = kind === 'lamp' ? '<w:tabs><w:tab w:val="left" w:pos="1350"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:ind w:left="1350" w:hanging="360"/>'
      : '<w:tabs><w:tab w:val="left" w:pos="630"/></w:tabs><w:spacing w:before="40" w:line="276" w:lineRule="auto"/><w:ind w:left="630" w:hanging="360"/><w:jc w:val="both"/>';
    return para(pPr, `${lab}\t${t}`, SZ);
  }).join('');

  /* ---- penghitung nomor ---- */
  let nb = 0, ns = 0, nss = 0, landscape = false, curW = 9360;
  const out = [];
  const lampNo = () => '';

  const auto = {
    tim() {
      const t = TT(94), r = trs(t), groups = {};
      ctx.team.forEach(m => (groups[m.peran || 'Lainnya'] = groups[m.peran || 'Lainnya'] || []).push(m));
      const aud = groups['Internal Auditor SMKP'] || []; delete groups['Internal Auditor SMKP'];
      const smeK = Object.keys(groups).filter(k => /SME|Expert/i.test(k)); const sme = smeK.flatMap(k => { const g = groups[k]; delete groups[k]; return g });
      const ra = tcs(r[1]), rs = tcs(r[2]);
      fillMulti(ra[1], aud.map(m => m.nama)); fillMulti(ra[2], aud.map(m => m.jab));
      fillMulti(rs[1], sme.map(m => m.nama)); fillMulti(rs[2], sme.filter(m => m.jab).map(m => m.jab));
      Object.entries(groups).forEach(([k, ms]) => { const nr = r[2].cloneNode(true); t.appendChild(nr); const c = tcs(nr); cellSet(c[0], k); fillMulti(c[1], ms.map(m => m.nama)); fillMulti(c[2], ms.map(m => m.jab)) });
      return ser(t) + afterTbl;
    },
    metode(b) {
      const t = TT(100), r = trs(t), ds = Object.assign({}, MET_DESC, (b && b.desc) || {});
      METHODS.forEach((m, k) => { const c = tcs(r[1 + k]); cellSet(c[1], `${ctx.metN[m] || 0} item`); cellSet(c[2], ds[m] || '') });
      return ser(t) + afterTbl;
    },
    matriks() {
      const t = TT(103), r = trs(t);
      for (let i = 1; i <= 4; i++) for (let k = 0; k < 7; k++) cellSet(tcs(r[i])[1 + k], String((ctx.matrix[i] || [])[k] || 0));
      return ser(t) + afterTbl;
    },
    jadwal() {
      const t = TT(109), rows = trs(t), gi = {}; const f0 = r => (tcs(r)[0].textContent || '').trim();
      rows.forEach((r, idx) => { const a = f0(r); if (['A', 'B', 'C'].includes(a) && (idx === 1 || !['A', 'B', 'C'].includes(f0(rows[idx - 1])))) gi[a] = idx });
      const order = ['A', 'B', 'C'];
      [...order].reverse().forEach(gk => {
        const start = gi[gk], nx = order.map(x => gi[x]).filter(x => x > start), end = (nx.length ? nx[0] : rows.length) - 1;
        const tr = []; for (let j = start + 1; j <= end; j++) tr.push(rows[j]);
        const need = Math.max(1, (ctx.sched[gk] || []).length);
        while (tr.length < need) { const nr = tr[tr.length - 1].cloneNode(true); tr[tr.length - 1].after(nr); tr.push(nr) }
        while (tr.length > need) { const x = tr.pop(); x.parentNode.removeChild(x) }
        tr.forEach((row, j) => {
          const s = (ctx.sched[gk] || [])[j], c = tcs(row), du = s ? durasi(s.d1, s.d2) : null;
          cellSet(c[0], String(j + 1)); cellSet(c[1], s ? s.keg : ''); cellSet(c[2], s ? s.pic : '');
          cellSet(c[3], du ? `${du} hari` : ''); cellSet(c[4], s && (s.d1 || s.d2) ? rentang(s.d1, s.d2) : '');
        });
      });
      return ser(t) + afterTbl;
    },
    tingkat() {
      const t = TT(180), r = trs(t), I = ctx.inds;
      [[1, 1], [2, 2], [3, 3], [4, 5]].forEach(([i, ri]) => {
        const c = tcs(r[ri]); cellSet(c[1], num(I[i].mx, 2), true); cellSet(c[2], num(I[i].cap)); cellSet(c[3], (I[i].pct * 100).toFixed(1) + '%'); cellSet(c[4], I[i].cat, true);
      });
      const c = tcs(r[6]); cellSet(c[1], num(ctx.total.cap, 4), true); cellSet(c[2], ctx.total.cat, true);
      let x = ser(t) + afterTbl;
      if (ctx.kelengkapan < .999) x += para(PRE['p:ld2'][0], `PERHATIAN: kelengkapan input penilaian baru ${Math.round(ctx.kelengkapan * 100)}% — nilai di atas belum final.`, HL + ARIAL + SZ);
      return x;
    },
    ttd(b) {
      const I = ctx.id || {}, K = '<w:keepNext/>', ind = '<w:tabs><w:tab w:val="left" w:pos="5600"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:ind w:firstLine="720"/>', rp = ARIAL + SZ;
      const l1 = b.l1 || 'Disusun Oleh,', l2 = b.l2 || 'Disetujui Oleh,';
      let x = para(K + '<w:spacing w:before="240" w:line="276" w:lineRule="auto"/><w:jc w:val="right"/>', `${T.LOKASI}, ${T.TGL_LAPORAN}`, rp);
      x += para(K + '<w:spacing w:line="276" w:lineRule="auto"/>', '', rp);
      x += para(K + ind, `${l1}\t${l2}`, rp);
      for (let i = 0; i < 4; i++) x += para(K + ind, '', rp);
      x += para(K + ind, `${I.penyusun || 'Nama'}\t${I.penyetuju || 'Nama'}`, '<w:b/><w:bCs/>' + rp);
      x += para(ind, `${I.penyusun_jab || ''}\t${I.penyetuju_jab || ''}`, rp);
      return x;
    },
    lamp1() {
      const rows = [], band = new Set(); let cp = null;
      ctx.items.forEach(x => {
        if (x.param !== cp) { cp = x.param; band.add(rows.length); rows.push([cp, (ctx.params[cp] || {}).name || '', '', '', '', '', '', '', '', '', '', '']) }
        rows.push([x.code, x.name, ...METHODS.map(m => { const v = x.m[m]; return v == null || v === '' ? '' : (Number.isInteger(v) ? v : String(+(+v).toFixed(1))) }),
          (typeof x.sk === 'number' ? Math.round(x.sk) : '-') + '/5', Math.round(x.cap * 100) + '%', x.cat]);
      });
      return tblXml({ head: ['Kode', 'Item pengukuran', ...METHODS, 'Skor', 'Capaian', 'Level'], rows, band, size: 14, catcol: 11, align: ['c', null, ...Array(10).fill('c')], w: fitW([1.6, 11.5, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.6, 1.8, 2.3], 14140) });
    },
    lamp2() {
      const rows = []; for (let i = 1; i <= 4; i++) ctx.programs.filter(x => x.ind === i).forEach((x, k) => rows.push([`${i}.${k + 1}`, x.par, x.prog, x.ent, x.pic, sdate(x.tgt), x.tn == null ? '' : x.tn, x.st]));
      if (!rows.length) return para('<w:spacing w:before="60"/>', '[Belum ada program yang diinput pada menu Data Laporan]', HL + '<w:sz w:val="20"/>');
      return tblXml({ head: ['No', 'Parameter', 'Program / kegiatan', 'Entitas sasaran', 'PIC', 'Target selesai', 'Target nilai', 'Status'], rows, size: 16, w: fitW([1.2, 5, 8, 3.2, 2.4, 2.2, 1.6, 1.8], 14140) });
    },
    async lamp3() {
      const A = ctx.ents, rows = [];
      for (let i = 1; i <= 4; i++) rows.push([`Indikator ${i}`, ...A.map((e, k) => { const v = (ctx.entInd[i] || [])[k]; return typeof v === 'number' ? Math.round(v * 100) + '%' : '-' })]);
      rows.push(['Indeks total (0–1)', ...A.map((e, k) => typeof ctx.entTot[k] === 'number' ? num(ctx.entTot[k], 3) : '-')]);
      rows.push(['Tingkat pencapaian', ...A.map((e, k) => ctx.entCat[k] || '-')]);
      rows.push(['Cakupan data', ...A.map((e, k) => typeof ctx.entCover[k] === 'number' ? Math.round(ctx.entCover[k] * 100) + '%' : '-')]);
      let x = tblXml({ head: ['Ukuran', ...A.map(e => `${e.kode} (${e.peran})`)], rows, size: 18, align: [null, ...A.map(() => 'c')], w: fitW([5.5, ...A.map(() => Math.min(3.6, 18 / Math.max(1, A.length)))], 12000) });
      x += afterTbl;
      const g1 = await chartPng(['Ind. 1', 'Ind. 2', 'Ind. 3', 'Ind. 4'], [1, 2, 3, 4].map(i => ctx.inds[i].pct), '% Keterpenuhan per Indikator', true);
      const g2 = await chartPng(A.map(e => e.kode), ctx.entTot.map(v => typeof v === 'number' ? v : 0), 'Indeks Total per Entitas (indikatif)', false);
      return x + `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${drawing(g1, 11.5)}<w:r><w:t xml:space="preserve">   </w:t></w:r>${drawing(g2, 11.5)}</w:p>`;
    }
  };
  [1, 2, 3, 4].forEach(i => {
    const idx = { 1: 119, 2: 133, 3: 143, 4: 166 }[i];
    auto['ind' + i] = () => {
      const t = TT(idx), r = trs(t), ps = Object.keys(ctx.params).filter(c => c.startsWith(i + '.')).sort((a, b) => a.split('.')[1] - b.split('.')[1]);
      ps.forEach((c, k) => { if (!r[1 + k]) return; const cc = tcs(r[1 + k]); cellSet(cc[3], num(ctx.params[c].cap)); if (k === 0) cellSet(cc[4], ctx.inds[i].cat, true) });
      return ser(t) + afterTbl;
    };
    auto['temuan' + i] = b => {
      const tx = (ctx.temuan[i] || '').split('\n').map(s => s.trim()).filter(Boolean); const isAuto = !tx.length; const lines = isAuto ? autoTemuan(i) : tx;
      let x = listItems(lines, 'num');
      if (isAuto && b.note !== false) x += para(PRE['p:ld'][0], '(Draf otomatis dari data penilaian — lengkapi dengan temuan dan bukti rinci pada menu Data Laporan.)', '<w:i/><w:sz w:val="20"/>');
      return x;
    };
    auto['program' + i] = () => {
      const pl = ctx.programs.filter(x => x.ind === i);
      if (!pl.length) return para(PRE['p:ld'][0], '[Belum ada program yang diinput pada menu Data Laporan]', HL + '<w:sz w:val="24"/>');
      return listItems(pl.map(x => { let s = `${x.prog} (parameter ${String(x.par).split(' ')[0]}`; if (x.ent) s += `; sasaran: ${x.ent}`; if (x.pic) s += `; PIC: ${x.pic}`; if (pd(x.tgt)) s += `; target selesai: ${tgl(x.tgt)}`; if (x.tn != null && x.tn !== '') s += `; target nilai: ${x.tn}`; return s + ')' }), 'num');
    };
  });

  /* ---- render blok ---- */
  for (const b of dok.blocks) {
    const t = b.t;
    if (t === 'bab') { nb++; ns = 0; nss = 0; out.push(para(PRE.bab[0], S(b.x), PRE.bab[1])) }
    else if (t === 'sub') { ns++; nss = 0; out.push(para(PRE.sub[0], S(b.x), PRE.sub[1])) }
    else if (t === 'subsub') {
      nss++; const v = b.v || 'met', pr = PRE['subsub:' + v] || PRE['subsub:met'];
      const no = (ns ? `${nb}.${ns}.${nss}` : `${nb}.${nss}`) + (v === 'ind' ? '' : '.');
      out.push(para(pr[0], `${no}\t${S(b.x)}`, pr[1]));
    }
    else if (t === 'p') { const pr = PRE['p:' + (b.v || 'p')] || PRE['p:p']; out.push(para(pr[0], S(b.x), pr[1])) }
    else if (t === 'kv') out.push(para(PRE.kv[0], `${S(b.k)}\t:\t${S(b.x)}`, PRE.kv[1]));
    else if (t === 'list') out.push(listItems((b.items || []).filter(s => String(s).trim()).map(S), b.kind || 'num'));
    else if (t === 'lh') out.push(para(PRE.lh[0], S(b.x), PRE.lh[1] + ARIAL));
    else if (t === 'sp') out.push('<w:p/>');
    else if (t === 'pb') out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    else if (t === 'sect') out.push(ser(kids[47]));
    else if (t === 'lanskap') {
      out.push('<w:p><w:pPr><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1170" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/></w:sectPr></w:pPr></w:p>');
      landscape = true; curW = 14140;
    }
    else if (t === 'tabel') {
      const hd = (b.head && b.head.length) ? b.head : ['Kolom 1', 'Kolom 2'], n = hd.length;
      const rows = (b.rows || []).map(r => Array.from({ length: n }, (_, j) => S(r[j] || '')));
      if (b.cap) out.push(para(PRE['p:ld'][0], S(b.cap), '<w:b/><w:sz w:val="22"/>'));
      out.push(tblXml({ head: hd.map(S), rows, size: b.size || 20, w: fitW((b.w && b.w.length === n) ? b.w : hd.map(() => 1), curW - 200), align: b.align }) + afterTbl);
    }
    else if (t === 'img') {
      if (b.data) { try { const im = await pngFrom(b.data, 1600); out.push(`<w:p><w:pPr><w:keepNext/><w:jc w:val="center"/></w:pPr>${drawing(im, Math.min(+b.w || 12, landscape ? 24 : 16))}</w:p>`); if (b.cap) out.push(para('<w:jc w:val="center"/>', S(b.cap), '<w:i/><w:sz w:val="20"/>')) } catch (e) { out.push(para('', '[Gambar tidak dapat dibaca]', HL)) } }
    }
    else if (t === 'auto') { const f = auto[b.k]; if (f) out.push(await f(b)) }
  }
  /* sectPr akhir */
  let fin = ser(kids[kids.length - 1]);
  if (landscape) fin = '<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>';
  zip.file('word/document.xml', head + cov.join('') + out.join('') + fin + '</w:body></w:document>');
  media.forEach(m => zip.file(m.name, m.bytes, { createFolders: false }));
  if (rels.length) { let r = await zip.file('word/_rels/document.xml.rels').async('string'); r = r.replace('</Relationships>', rels.join('') + '</Relationships>'); zip.file('word/_rels/document.xml.rels', r) }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
window.LapDocx = { buat: build, token, tgl, rentang, pngFrom };
})();
