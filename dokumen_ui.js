/* dokumen_ui.js — tab "Dokumen Laporan": editor struktur laporan (bab/sub/sub-sub/poin/tabel/gambar/lampiran), identitas & logo, unduh Word.
   Memakai variabel global aplikasi: D, SCOPE, call, esc, $, MASTER, METHODS, cat, activeEnt, ksScores, calc, allEnt, LAPIUP. */
const DOK_TYPES = { bab: 'Bab (1, 2, 3…)', sub: 'Sub bab (1.1)', subsub: 'Sub-sub bab (1.1.1)', p: 'Paragraf', kv: 'Baris data (label : isi)', list: 'Poin / daftar bernomor', tabel: 'Tabel (isi sendiri)', img: 'Gambar', lh: 'Judul lampiran', pb: 'Halaman baru', sp: 'Spasi kosong', sect: 'Pemisah bagian (halaman baru)', lanskap: 'Mulai lampiran lanskap', auto: 'Isi otomatis' };
const DOK_AUTO = { tim: 'Tabel tim penilai', metode: 'Tabel metode & sampel', matriks: 'Tabel matriks indikator × metode', jadwal: 'Tabel jadwal pelaksanaan', tingkat: 'Tabel tingkat pencapaian + nilai total', ttd: 'Blok tanda tangan', lamp1: 'Tabel Lampiran 1 (hasil per item)', lamp2: 'Tabel Lampiran 2 (program peningkatan)', lamp3: 'Tabel + grafik Lampiran 3 (per entitas)' };
[1, 2, 3, 4].forEach(i => { DOK_AUTO['ind' + i] = `Tabel nilai Indikator ${i}`; DOK_AUTO['temuan' + i] = `Daftar temuan Indikator ${i}`; DOK_AUTO['program' + i] = `Daftar program Indikator ${i}` });
const DOK_LVL = { bab: 1, lh: 1, sub: 2, subsub: 3 };
const PVAR = { p: 'Paragraf menjorok (isi bab)', pl: 'Paragraf rata (isi sub bab)', pop: 'Paragraf kegiatan (di bawah sub-sub)', ld: 'Kalimat pengantar', ld2: 'Paragraf hasil', note: 'Catatan kecil (miring)' };
const SVAR = { met: 'Standar (2.3.1)', op: 'Kegiatan (tebal, menjorok)', ind: 'Indikator (3.1.1)' };
let DOK = null, DOK_IUP = '', DOK_DIRTY = false, DOK_TPL = null;
const dokClone = o => JSON.parse(JSON.stringify(o));
const dokLap = iup => (D.lap && D.lap[iup]) || {};

/* ---- penyimpanan bertahap (batas 1 sel ≈ 49.000 karakter) ---- */
const CHUNK = 24000;
async function lapPut(iup, kunci, nilai) {
  const r = await call({ action: 'saveLaporan', iup, kunci, nilai }); if (!r.ok) throw new Error(r.error || 'Gagal menyimpan');
  D.lap = D.lap || {}; (D.lap[iup] = D.lap[iup] || {})[kunci] = nilai;
}
async function bigPut(iup, kunci, obj) {
  const s = JSON.stringify(obj), n = Math.max(1, Math.ceil(s.length / CHUNK));
  for (let i = 0; i < n; i++) await lapPut(iup, `${kunci}_${i}`, s.slice(i * CHUNK, (i + 1) * CHUNK));
  await lapPut(iup, kunci + '_n', n);
}
function bigGet(iup, kunci) {
  const L = dokLap(iup), n = L[kunci + '_n']; if (!n) return undefined; let s = '';
  for (let i = 0; i < n; i++) { if (typeof L[`${kunci}_${i}`] !== 'string') return undefined; s += L[`${kunci}_${i}`] }
  try { return JSON.parse(s) } catch (e) { return undefined }
}
function loadDok(iup) {
  let d = bigGet(iup, 'dokumen');
  if (!d || !d.blocks) d = dokClone(DOK_DEF);
  d.meta = d.meta || {}; d.cover = Object.assign({}, DOK_DEF.cover, d.cover || {});
  d.blocks.forEach(b => { if (b.t === 'img') b.data = bigGet(iup, 'gbr_' + b.id) || '' });
  return d;
}

/* ---- data untuk generator ---- */
function laporanCtx(iup) {
  const sc0 = SCOPE; SCOPE = 'iup:' + iup;
  try {
    const ents = activeEnt().slice().sort((a, b) => (b.kode === iup) - (a.kode === iup)), ks = ksScores(), R = calc(ents, ks);
    const iupE = ents.find(e => e.kode === iup) || {}, L = dokLap(iup);
    const items = MASTER.items.filter(it => R.items[it.code]).map(it => {
      const x = R.items[it.code], f = x.f, cp = f ? f / 5 : 0; const m = {}; METHODS.forEach(k => m[k] = x.ms[k] == null ? null : x.ms[k]);
      return { code: it.code, ind: +it.code[0], param: it.param, name: it.name, m, sk: f, cap: cp, cat: cat(cp, MASTER.th_item) };
    });
    const metN = {}, matrix = {}; METHODS.forEach(k => metN[k] = MASTER.items.filter(it => it.methods.includes(k) && R.items[it.code]).length);
    for (let i = 1; i <= 4; i++) matrix[i] = METHODS.map(k => MASTER.items.filter(it => it.code.startsWith(i + '.') && it.methods.includes(k)).length);
    const entInd = { 1: [], 2: [], 3: [], 4: [] }, entTot = [], entCat = [], entCover = [];
    ents.forEach(e => { const Re = calc([e], ks); for (let i = 1; i <= 4; i++) entInd[i].push(Re.comp > 0 ? Re.inds[i].pct : null); entTot.push(Re.comp > 0 ? Re.total : null); entCat.push(Re.comp > 0 ? Re.cat : '-'); entCover.push(Re.comp) });
    const sched = { A: [], B: [], C: [] }; ['A', 'B', 'C'].forEach(g => ((L.jadwal || {})[g] || []).forEach(j => sched[g].push({ keg: j.keg, pic: j.pic || '', d1: j.d1 || '', d2: j.d2 || '' })));
    const programs = (L.program || []).filter(x => x.prog && x.par).map(x => ({ ind: +String(x.par)[0], par: MASTER.params[x.par] ? `${x.par} ${MASTER.params[x.par].name}` : x.par, prog: x.prog, item: x.item || '', ent: x.ent || '', pic: x.pic || '', tgt: x.tgt || '', tn: x.tn === '' || x.tn == null ? null : +x.tn, st: x.st || '' }));
    const temuan = {}; for (let i = 1; i <= 4; i++) temuan[i] = String((L.temuan || {})[i] || '').trim();
    return {
      nama: iupE.nama || '', kode: iup, id: L.identitas || {}, ents: ents.map(e => ({ nama: e.nama, kode: e.kode, peran: e.peran, pekerja: e.pekerja })), agg: D.cfg.agg,
      items, params: R.params, inds: R.inds, total: { cap: R.total, cat: R.cat }, kelengkapan: R.comp, nItems: items.length, metN, matrix, entInd, entTot, entCat, entCover,
      team: (L.tim || []).filter(m => m.nama).map(m => ({ peran: m.peran || '', nama: m.nama, jab: m.jab || '' })), sched, temuan, programs, logo: bigGet(iup, 'logo') || '', dok: DOK
    };
  } finally { SCOPE = sc0 }
}

async function dokTemplate() {
  if (DOK_TPL) return DOK_TPL;
  const r = await fetch('template.docx', { cache: 'no-cache' }); if (!r.ok) throw new Error('template.docx belum ada di repo GitHub (unggah bersama app.html), atau pilih berkasnya manual di bawah.');
  return DOK_TPL = await r.arrayBuffer();
}
async function dokUnduh() {
  const m = $('#dkm'); m.innerHTML = 'Menyusun dokumen Word…';
  try {
    if (typeof JSZip === 'undefined') throw new Error('Pustaka JSZip tidak termuat (periksa koneksi internet).');
    const tpl = await dokTemplate(), ctx = laporanCtx(DOK_IUP);
    const blob = await LapDocx.buat(tpl, DOK, ctx);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Laporan_PTPKKP_${DOK_IUP}_${D.cfg.periode || ''}.docx`.replace(/\s+/g, '_'); a.click();
    m.innerHTML = '<span class="ok">Dokumen Word terunduh.</span>';
  } catch (e) { m.innerHTML = `<span class="er">${esc(e.message || e)}</span>` }
}
async function dokSimpan() {
  const m = $('#dkm'); m.textContent = 'Menyimpan…';
  try {
    const d = dokClone(DOK);
    for (const b of DOK.blocks) if (b.t === 'img' && b._dirty) { await bigPut(DOK_IUP, 'gbr_' + b.id, b.data || ''); b._dirty = false }
    d.blocks.forEach(b => { if (b.t === 'img') { delete b.data; delete b._dirty } });
    await bigPut(DOK_IUP, 'dokumen', d); DOK_DIRTY = false; m.innerHTML = '<span class="ok">Tersimpan di server.</span>';
  } catch (e) { m.innerHTML = `<span class="er">${esc(e.message || e)}</span>` }
}
const fileToUrl = (f, max, type) => new Promise((ok, no) => {
  const fr = new FileReader(); fr.onerror = () => no(new Error('Berkas tidak terbaca')); fr.onload = () => {
    const im = new Image(); im.onerror = () => no(new Error('Bukan berkas gambar')); im.onload = () => {
      const k = Math.min(1, max / im.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height) } g.drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL(type, .85));
    }; im.src = fr.result
  }; fr.readAsDataURL(f)
});

/* ---- struktur ---- */
function dokSpan(i) { const l = DOK_LVL[DOK.blocks[i].t]; if (!l) return 1; let j = i + 1; while (j < DOK.blocks.length && !((DOK_LVL[DOK.blocks[j].t] || 99) <= l)) j++; return j - i }
const dokNewId = () => Math.max(0, ...DOK.blocks.map(b => b.id || 0)) + 1;
function dokNew(kind) {
  const [t, k] = kind.split(':'), id = dokNewId();
  const base = { bab: { x: 'JUDUL BAB BARU' }, sub: { x: 'Judul sub bab baru' }, subsub: { v: 'met', x: 'Judul sub-sub bab baru' }, p: { v: 'p', x: 'Tulis paragraf di sini…' }, kv: { k: 'Label', x: 'Isi' },
    list: { kind: 'num', items: ['Poin pertama', 'Poin kedua'] }, tabel: { cap: '', head: ['Kolom 1', 'Kolom 2', 'Kolom 3'], rows: [['', '', ''], ['', '', '']] }, img: { data: '', w: 12, cap: '' }, lh: { x: 'LAMPIRAN BARU' }, pb: {}, sp: {}, sect: {}, lanskap: {}, auto: { k } }[t];
  return Object.assign({ t, id }, dokClone(base));
}
function dokOp(op, i, arg) {
  const B = DOK.blocks;
  if (op === 'add') { const at = i < 0 ? B.length : i + dokSpan(i); B.splice(at, 0, dokNew(arg)) }
  else if (op === 'del') { const n = dokSpan(i); if (n > 1 && !confirm(`Hapus "${B[i].x}" beserta ${n - 1} blok isinya?`)) return; B.splice(i, n) }
  else if (op === 'dup') { const n = dokSpan(i), cp = dokClone(B.slice(i, i + n)); let id = dokNewId(); cp.forEach(b => { b.id = id++; if (b.t === 'img') b._dirty = true }); B.splice(i + n, 0, ...cp) }
  else if (op === 'up' || op === 'down') {
    const n = dokSpan(i), seg = B.slice(i, i + n);
    if (op === 'up') { const l = DOK_LVL[B[i].t]; let j = i - 1; if (j < 0) return; if (l) { while (j > 0 && (DOK_LVL[B[j].t] || 99) > l) j--; if ((DOK_LVL[B[j].t] || 99) < l) return } B.splice(i, n); B.splice(j, 0, ...seg) }
    else { const nx = i + n; if (nx >= B.length) return; const m = dokSpan(nx); B.splice(i, n); B.splice(i + m, 0, ...seg) }
  }
  DOK_DIRTY = true; dokRender();
}

/* ---- tampilan ---- */
function dokNums() {
  let nb = 0, ns = 0, nss = 0;
  return DOK.blocks.map(b => { if (b.t === 'bab') { nb++; ns = 0; nss = 0; return nb + '.' } if (b.t === 'sub') { ns++; nss = 0; return `${nb}.${ns}` } if (b.t === 'subsub') { nss++; return ns ? `${nb}.${ns}.${nss}` : `${nb}.${nss}` } return '' });
}
const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
const addMenu = i => `<select class="s" data-add="${i}" title="Tambah di bawah"><option value="">+ Tambah…</option><optgroup label="Struktur"><option value="bab">Bab</option><option value="sub">Sub bab</option><option value="subsub">Sub-sub bab</option><option value="lh">Judul lampiran</option></optgroup><optgroup label="Isi"><option value="p">Paragraf</option><option value="list">Poin / nomor</option><option value="kv">Baris data (label : isi)</option><option value="tabel">Tabel</option><option value="img">Gambar</option></optgroup><optgroup label="Tata letak"><option value="pb">Halaman baru</option><option value="sp">Spasi kosong</option><option value="sect">Pemisah bagian</option><option value="lanskap">Mulai lampiran lanskap</option></optgroup><optgroup label="Otomatis dari data">${Object.entries(DOK_AUTO).map(([k, l]) => `<option value="auto:${k}">${esc(l)}</option>`).join('')}</optgroup></select>`;
function blkBody(b, i) {
  const f = (k, ph = '') => `data-i="${i}" data-f="${k}" placeholder="${esc(ph)}"`;
  switch (b.t) {
    case 'bab': case 'sub': case 'lh': return `<input ${f('x')} value="${esc(b.x)}" style="width:100%;font-weight:700">`;
    case 'subsub': return `<div class="row" style="margin:0"><input ${f('x')} value="${esc(b.x)}" style="flex:1;min-width:240px;font-weight:700"><select data-i="${i}" data-f="v">${opt(SVAR, b.v || 'met')}</select></div>`;
    case 'p': return `<textarea ${f('x')} rows="${Math.min(10, Math.max(2, Math.ceil((b.x || '').length / 110)))}" style="width:100%">${esc(b.x)}</textarea><select data-i="${i}" data-f="v">${opt(PVAR, b.v || 'p')}</select>`;
    case 'kv': return `<div class="row" style="margin:0"><input ${f('k', 'Label')} value="${esc(b.k)}" style="width:220px"><span>:</span><input ${f('x', 'Isi')} value="${esc(b.x)}" style="flex:1;min-width:200px"></div>`;
    case 'list': return `<textarea data-i="${i}" data-f="items" rows="${Math.max(2, (b.items || []).length)}" style="width:100%" placeholder="Satu poin per baris">${esc((b.items || []).join('\n'))}</textarea><select data-i="${i}" data-f="kind">${opt({ num: 'Bernomor 1. 2. 3.', bullet: 'Butir •', lamp: 'Daftar lampiran' }, b.kind || 'num')}</select> <span class="mu">satu poin per baris</span>`;
    case 'tabel': { const n = (b.head || []).length; return `<input ${f('cap', 'Judul/keterangan tabel (opsional)')} value="${esc(b.cap || '')}" style="width:100%;margin-bottom:4px"><div class="sc" style="max-height:260px"><table>${`<tr>${b.head.map((h, c) => `<th><input data-i="${i}" data-th="${c}" value="${esc(h)}" style="width:100%;font-weight:700"></th>`).join('')}</tr>`}${(b.rows || []).map((r, ri) => `<tr>${b.head.map((_, c) => `<td><input data-i="${i}" data-tr="${ri}" data-tc="${c}" value="${esc(r[c] || '')}" style="width:100%"></td>`).join('')}</tr>`).join('')}</table></div><div class="row"><button class="s" data-tb="addr" data-i="${i}">+ Baris</button><button class="s" data-tb="delr" data-i="${i}">− Baris</button><button class="s" data-tb="addc" data-i="${i}">+ Kolom</button><button class="s" data-tb="delc" data-i="${i}" ${n < 2 ? 'disabled' : ''}>− Kolom</button></div>` }
    case 'img': return `<div class="row" style="margin:0">${b.data ? `<img src="${b.data}" style="max-height:70px;border:1px solid var(--bd)">` : '<span class="mu">Belum ada gambar</span>'}<input type="file" accept="image/*" data-img="${i}"><span>Lebar (cm)</span><input type="number" min="3" max="24" step="0.5" ${f('w')} value="${b.w || 12}" style="width:70px"></div><input ${f('cap', 'Keterangan gambar (opsional)')} value="${esc(b.cap || '')}" style="width:100%;margin-top:4px">`;
    case 'auto': {
      let ex = `<span class="mu">Diisi otomatis dari data penilaian${/^(tim|jadwal|temuan|program)/.test(b.k) ? ' dan menu Data Laporan' : ''}.</span>`;
      if (b.k === 'metode') ex += `<details><summary>Ubah deskripsi sampel per metode</summary>${METHODS.map(m => `<div class="mu">${m}</div><textarea data-i="${i}" data-desc="${m}" rows="2" style="width:100%">${esc((b.desc || {})[m] ?? MET_DESC[m] ?? '')}</textarea>`).join('')}</details>`;
      if (b.k === 'ttd') ex += `<div class="row"><input ${f('l1', 'Disusun Oleh,')} value="${esc(b.l1 || '')}" placeholder="Disusun Oleh,"><input ${f('l2', 'Disetujui Oleh,')} value="${esc(b.l2 || '')}" placeholder="Disetujui Oleh,"></div>`;
      return `<b>▣ ${esc(DOK_AUTO[b.k] || b.k)}</b> ${ex}`;
    }
    default: return `<span class="mu">${esc(DOK_TYPES[b.t] || b.t)}</span>`;
  }
}
function dokRender() {
  const nums = dokNums(), B = DOK.blocks, ind = { bab: 0, lh: 0, sub: 14, subsub: 28 }; let cur = 0;
  $('#dkl').innerHTML = B.map((b, i) => {
    if (DOK_LVL[b.t]) cur = DOK_LVL[b.t]; const pad = b.t in ind ? ind[b.t] : (cur === 1 ? 14 : cur === 2 ? 28 : 42);
    const tag = { bab: 'BAB', sub: 'SUB', subsub: 'SUB-SUB', p: 'Paragraf', kv: 'Data', list: 'Poin', tabel: 'Tabel', img: 'Gambar', lh: 'LAMPIRAN', pb: 'Halaman baru', sp: 'Spasi', sect: 'Pemisah bagian', lanskap: 'Lanskap', auto: 'Otomatis' }[b.t];
    const head = DOK_LVL[b.t] ? 'border-left:4px solid var(--ac);background:var(--hd)' : '';
    return `<div class="dkb" style="margin-left:${pad}px;border:1px solid var(--bd);border-radius:8px;padding:6px 8px;margin-top:5px;${head}"><div class="row" style="margin:0 0 4px"><span class="chip" style="background:var(--ac)">${nums[i] ? nums[i] + ' ' : ''}${tag}</span>
      <span style="margin-left:auto" class="row" ><button class="s" data-op="up" data-i="${i}" title="Naik">↑</button><button class="s" data-op="down" data-i="${i}" title="Turun">↓</button><button class="s" data-op="dup" data-i="${i}" title="Gandakan">⧉</button><button class="s" data-op="del" data-i="${i}" title="Hapus">✕</button>${addMenu(i)}</span></div>${blkBody(b, i)}</div>`;
  }).join('');
}
function dokBind() {
  const root = $('#dkroot'), fld = e => e.target;
  root.addEventListener('input', e => {
    const t = e.target, i = +t.dataset.i, b = DOK.blocks[i]; DOK_DIRTY = true;
    if (t.dataset.f) { const f = t.dataset.f; b[f] = f === 'items' ? t.value.split('\n') : (t.type === 'number' ? +t.value : t.value) }
    else if (t.dataset.th != null) b.head[+t.dataset.th] = t.value;
    else if (t.dataset.tr != null) { b.rows[+t.dataset.tr][+t.dataset.tc] = t.value }
    else if (t.dataset.desc) { b.desc = b.desc || {}; b.desc[t.dataset.desc] = t.value }
    else if (t.dataset.cv) DOK.cover[t.dataset.cv] = t.value;
    else if (t.dataset.mt) DOK.meta[t.dataset.mt] = t.value;
  });
  root.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset.add !== undefined && t.value) { const v = t.value; t.value = ''; dokOp('add', +t.dataset.add, v); return }
    if (t.dataset.f === 'v' || t.dataset.f === 'kind') { dokRender(); return }
    if (t.dataset.img !== undefined && t.files[0]) { try { const b = DOK.blocks[+t.dataset.img]; b.data = await fileToUrl(t.files[0], 1400, 'image/jpeg'); b._dirty = true; DOK_DIRTY = true; dokRender() } catch (x) { alert(x.message) } return }
    if (t.id === 'dkLogo' && t.files[0]) { try { const u = await fileToUrl(t.files[0], 700, 'image/png'); $('#dkm').textContent = 'Menyimpan logo…'; await bigPut(DOK_IUP, 'logo', u); $('#dkm').innerHTML = '<span class="ok">Logo tersimpan.</span>'; dokRenderLogo() } catch (x) { $('#dkm').innerHTML = `<span class="er">${esc(x.message)}</span>` } return }
    if (t.id === 'dkTpl' && t.files[0]) { DOK_TPL = await t.files[0].arrayBuffer(); $('#dkm').innerHTML = '<span class="ok">Template dimuat dari berkas pilihan Anda.</span>' }
  });
  root.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.op) return dokOp(t.dataset.op, +t.dataset.i);
    if (t.dataset.tb) { const b = DOK.blocks[+t.dataset.i], n = b.head.length; DOK_DIRTY = true;
      if (t.dataset.tb === 'addr') b.rows.push(Array(n).fill('')); if (t.dataset.tb === 'delr') b.rows.pop();
      if (t.dataset.tb === 'addc') { b.head.push('Kolom ' + (n + 1)); b.rows.forEach(r => r.push('')) } if (t.dataset.tb === 'delc' && n > 1) { b.head.pop(); b.rows.forEach(r => r.pop()) }
      return dokRender() }
    if (t.id === 'dkU') return dokUnduh(); if (t.id === 'dkS') return dokSimpan();
    if (t.id === 'dkLogoDel') { try { await bigPut(DOK_IUP, 'logo', ''); dokRenderLogo() } catch (x) { alert(x.message) } return }
    if (t.id === 'dkR') { if (confirm('Kembalikan seluruh struktur dan teks ke bawaan template? Perubahan Anda yang belum disimpan hilang.')) { DOK = dokClone(DOK_DEF); DOK.meta = {}; DOK_DIRTY = true; vDokumen(true) } return }
    if (t.dataset.top !== undefined) { const v = $('#dkTop').value; if (v) dokOp('add', -1, v) }
  });
}
function dokRenderLogo() { const u = bigGet(DOK_IUP, 'logo'); $('#dkLogoP').innerHTML = u ? `<img src="${u}" style="max-height:60px;background:#fff;border:1px solid var(--bd);padding:3px">` : '<span class="mu">Belum ada logo — memakai logo bawaan template.</span>' }

function vDokumen(keep) {
  const iups = allEnt().filter(e => e.peran === 'IUP');
  if (!iups.length) { $('#v').innerHTML = '<div class="c">Belum ada entitas berperan IUP.</div>'; return }
  if (!iups.some(e => e.kode === LAPIUP)) LAPIUP = iups[0].kode;
  if (!keep || DOK_IUP !== LAPIUP || !DOK) { DOK_IUP = LAPIUP; DOK = loadDok(DOK_IUP); DOK_DIRTY = false }
  const C = DOK.cover, M = DOK.meta, nm = (iups.find(e => e.kode === DOK_IUP) || {}).nama || '';
  const cv = (k, l, w = 280) => `<div><div class="mu">${l}</div><input data-cv="${k}" value="${esc(C[k] || '')}" style="width:100%"></div>`;
  $('#v').innerHTML = `<div id="dkroot"><div class="c"><div class="row"><b>Laporan Word untuk</b><select id="dkI">${iups.map(e => `<option value="${esc(e.kode)}" ${e.kode === DOK_IUP ? 'selected' : ''}>${esc(e.nama)}</option>`).join('')}</select>
    <button id="dkU">Unduh Word (.docx)</button><button class="s" id="dkS">Simpan ke server</button><button class="s" id="dkR">Kembalikan ke bawaan</button><span id="dkm" class="mu"></span></div>
    <div class="mu">Struktur dan teks di bawah ini menjadi isi laporan. Penulisan <code>{{NAMA}}</code>, <code>{{SINGKATAN}}</code>, <code>{{SITE}}</code>, <code>{{TOTAL}}</code>, <code>{{KATEGORI}}</code> dll diganti otomatis dari data; <code>**tebal**</code> untuk huruf tebal. Nomor bab/sub/sub-sub dihitung otomatis. Data tim, jadwal, temuan, program dan identitas diisi di menu <b>Data Laporan</b>. Klik <b>Simpan ke server</b> agar perubahan tidak hilang.</div></div>
  <div class="c"><h2>Identitas &amp; logo</h2><div class="grid">
    <div><div class="mu">Nama perusahaan di laporan (kosong = ${esc(nm)})</div><input data-mt="nama" value="${esc(M.nama || '')}" placeholder="${esc(nm)}" style="width:100%"></div>
    <div><div class="mu">Singkatan (mis. PT DP)</div><input data-mt="singkatan" value="${esc(M.singkatan || '')}" placeholder="PT ${esc(DOK_IUP)}" style="width:100%"></div>
    <div><div class="mu">Logo sampul (PNG/JPG, disimpan di server)</div><input type="file" id="dkLogo" accept="image/*"> <button class="s" id="dkLogoDel">Hapus logo</button><div id="dkLogoP" style="margin-top:4px"></div></div>
    <div><div class="mu">Template Word (jika <code>template.docx</code> tidak ada di repo)</div><input type="file" id="dkTpl" accept=".docx"></div></div></div>
  <div class="c"><h2>Sampul</h2><div class="grid">${cv('l1', 'Judul baris 1')}${cv('l2', 'Judul baris 2')}${cv('l3', 'Judul baris 3')}${cv('jd', 'Nama perusahaan / site')}${cv('lp', 'Label alamat pusat')}${cv('ap', 'Alamat kantor pusat')}${cv('ls', 'Label alamat site')}${cv('as1', 'Alamat site baris 1')}${cv('as2', 'Alamat site baris 2')}${cv('lw', 'Label pelaksanaan')}${cv('wk', 'Tanggal pelaksanaan')}</div></div>
  <div class="c"><div class="row"><h2 style="margin:0">Isi laporan</h2><span style="margin-left:auto" class="row"><select id="dkTop" class="s"><option value="">+ Tambah di akhir dokumen…</option>${['bab:Bab', 'sub:Sub bab', 'subsub:Sub-sub bab', 'p:Paragraf', 'list:Poin / nomor', 'tabel:Tabel', 'img:Gambar', 'lh:Judul lampiran', 'pb:Halaman baru'].map(s => `<option value="${s.split(':')[0]}">${s.split(':')[1]}</option>`).join('')}</select><button class="s" data-top>Tambah</button></span></div><div id="dkl"></div></div></div>`;
  dokBind(); dokRender(); dokRenderLogo();
  $('#dkI').onchange = e => {
    if (DOK_DIRTY && !confirm('Perubahan dokumen belum disimpan. Ganti IUP dan buang perubahan?')) { e.target.value = DOK_IUP; return }
    LAPIUP = e.target.value; DOK = null; vDokumen();
  };
}
window.addEventListener('beforeunload', e => { if (DOK_DIRTY) { e.preventDefault(); e.returnValue = '' } });
