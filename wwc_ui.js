/* wwc_ui.js — Alat bantu Wawancara (WWC) dan FGD: target & realisasi sampel, daftar narasumber/kelompok, lembar penilaian per sesi,
   rekap otomatis per item/entitas, dan penerapan ke skor penilaian. Memakai global aplikasi: D, call, esc, $, MASTER, METHODS, MNAME, activeEnt, allEnt, DIRTY. */
const W_CATS = ['Top Management', 'Middle Management', 'Employee'];
const W_LEVELS = [...W_CATS, 'Khusus'];
const W_LV_LABEL = { 'Top Management': 'Top Management', 'Middle Management': 'Middle Management', Employee: 'Employee (pengawas/pelaksana)', Khusus: 'Jabatan khusus' };
const W_KS2CAT = { 'Top Management': 'Top Management', 'Top Management Site': 'Top Management', 'Middle Management': 'Middle Management', Pengawas: 'Employee', 'Non Staff': 'Employee' };
let WM = 'WWC', WSEL = null, WFILT = true, WALL = false, WENT = '*', WNEW = false, WDIRTY = false;
const WOPEN = {}, WNOTE = {};
const wParse = s => { try { const o = JSON.parse(s); return o && typeof o === 'object' ? o : {} } catch (e) { return {} } };
const wToday = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}` };
const wTags = (it, m) => { // level narasumber yang disasar item (dari kolom target)
  const t = String((it.tgt || {})[m] || ''); if (!t.trim()) return [];
  const u = t.toUpperCase(), r = [];
  if (u.includes('TOP MANAGEMENT')) r.push('Top Management'); if (u.includes('MIDDLE MANAGEMENT')) r.push('Middle Management'); if (u.includes('EMPLOYEE')) r.push('Employee');
  const rest = u.replace(/TOP MANAGEMENT|MIDDLE MANAGEMENT|EMPLOYEE/g, '').replace(/[-\s]/g, ''); if (rest) r.push('Khusus');
  return r;
};
const wApplies = (it, m, level) => { const t = wTags(it, m); return !t.length || t.includes(level) };
const wItems = (m, ent) => MASTER.items.filter(i => i.methods.includes(m) && !(i.iup && ent && ent.peran !== 'IUP'));
const wRecs = (m, ent) => (D.wwc || []).filter(r => r.metode === m && (!ent || r.entitas === ent));
const wRound = a => D.cfg.ksround === 'Dibulatkan ke bawah' ? Math.floor(a) : Math.round(a);

/* skor per entitas & item dari seluruh lembar: rata-rata per level (dibulatkan) lalu diambil nilai terendah antar-level */
function wScores(m, ents) {
  const out = {};
  ents.forEach(e => {
    out[e.kode] = {};
    wItems(m, e).forEach(it => {
      const by = {};
      wRecs(m, e.kode).forEach(r => { const v = +(r.skor || {})[it.code]; if (v >= 1 && v <= 5 && wApplies(it, m, r.level)) (by[r.level] = by[r.level] || []).push(v) });
      const lv = Object.keys(by); if (!lv.length) return;
      out[e.kode][it.code] = { s: Math.min(...lv.map(l => wRound(by[l].reduce((a, b) => a + b, 0) / by[l].length))), n: lv.reduce((a, l) => a + by[l].length, 0), by };
    });
  });
  return out;
}
/* target narasumber per entitas × kategori: 10% dari target sampel Slovin tiap level (dibulatkan ke atas), dijumlah per kategori */
function wTarget(ent) {
  const moe = +D.cfg.moe || .05, res = {}; W_CATS.forEach(c => res[c] = { pop: 0, tgt: 0 });
  (D.Populasi || []).filter(p => p.entitas === ent).forEach(p => {
    const c = W_KS2CAT[p.level]; if (!c) return; const N = +p.populasi || 0; if (!N) return;
    res[c].pop += N; res[c].tgt += Math.ceil(Math.ceil(N / (1 + N * moe * moe)) / 10);
  });
  return res;
}
const wReal = (m, ent, cat) => wRecs(m, ent).filter(r => r.level === cat).reduce((a, r) => a + (m === 'FGD' ? (+r.peserta || 1) : 1), 0);
const wApplicable = r => { const e = allEnt().find(x => x.kode === r.entitas); return wItems(r.metode, e).filter(it => wApplies(it, r.metode, r.level)) };
const wDone = r => { const its = wApplicable(r); return [its.filter(it => +(r.skor || {})[it.code] >= 1).length, its.length] };
const wNewId = () => Math.random().toString(36).slice(2, 10);

async function wSave(r) {
  const body = { action: 'saveWwc', row: { id: r.id, metode: r.metode, entitas: r.entitas, level: r.level, jabatan: r.jabatan || '', nama: r.nama || '', tanggal: r.tanggal || '', peserta: r.peserta || 1, skor: r.skor || {}, catatan: r.catatan || {} } };
  const x = await call(body); if (!x.ok) throw new Error(x.error || 'Gagal menyimpan'); return x;
}

function vWwc() {
  const ents = activeEnt(), entSel = WENT === '*' ? ents : ents.filter(e => e.kode === WENT), sc = wScores(WM, ents);
  const mn = WM === 'WWC' ? 'Wawancara' : 'FGD', unit = WM === 'WWC' ? 'narasumber' : 'peserta FGD';
  if (WSEL && !(D.wwc || []).some(r => r.id === WSEL)) WSEL = null;
  /* ringkasan */
  let tT = 0, tR = 0; ents.forEach(e => { const t = wTarget(e.kode); W_CATS.forEach(c => { tT += t[c].tgt; tR += Math.min(wReal(WM, e.kode, c), t[c].tgt || wReal(WM, e.kode, c)) }) });
  let itTot = 0, itOk = 0; ents.forEach(e => wItems(WM, e).forEach(it => { itTot++; if (sc[e.kode][it.code]) itOk++ }));
  const recs = wRecs(WM).filter(r => ents.some(e => e.kode === r.entitas) && (WENT === '*' || r.entitas === WENT)).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  $('#v').innerHTML = `
  <div class="c"><div class="row"><div class="seg"><button class="${WM === 'WWC' ? 'on' : ''}" data-wm="WWC">Wawancara (WWC)</button><button class="${WM === 'FGD' ? 'on' : ''}" data-wm="FGD">Focus Group Discussion (FGD)</button></div>
   <b style="margin-left:8px">Entitas</b><select id="went"><option value="*">Semua dalam cakupan</option>${ents.map(e => `<option value="${esc(e.kode)}" ${WENT === e.kode ? 'selected' : ''}>${esc(e.kode)} — ${esc(e.nama)}</option>`).join('')}</select>
   <span style="margin-left:auto" class="row"><button id="wadd">+ ${WM === 'WWC' ? 'Tambah narasumber' : 'Tambah kelompok FGD'}</button></span></div>
   <div class="mu">${WM === 'WWC' ? 'Setiap narasumber yang diwawancarai dicatat satu lembar; skor 1–5 diisi per item sesuai rubrik.' : 'Setiap kelompok diskusi dicatat satu lembar (isi jumlah peserta); skor 1–5 adalah kesepakatan kelompok per item.'} Skor akhir per entitas dihitung otomatis: rata-rata per level narasumber (pembulatan sesuai pengaturan), lalu diambil level terendah. Hasilnya diterapkan ke tab Penilaian dengan satu klik.</div></div>
  <div class="grid">
   <div class="c"><div class="mu">Lembar tercatat</div><div class="k">${recs.length}</div><div class="mu">${mn} pada cakupan ini</div></div>
   <div class="c"><div class="mu">Realisasi sampel ${unit}</div><div class="k ${tT && tR < tT ? 'er' : 'ok'}">${tT ? pct(tR, tT) + '%' : '—'}</div><div class="mu">${tT ? `${tR} dari target ${tT}` : 'Isi populasi di tab Kuesioner & Sampel untuk menghitung target'}</div></div>
   <div class="c"><div class="mu">Item sudah bernilai</div><div class="k ${itOk < itTot ? 'er' : 'ok'}">${pct(itOk, itTot)}%</div><div class="mu">${itOk} dari ${itTot} item-entitas</div></div></div>
  <div class="c"><h2>Target &amp; realisasi sampel</h2><div class="mu" style="margin-bottom:8px">Target = 10% dari sampel Slovin tiap level (dibulatkan ke atas), dijumlah per kategori: Top Management; Middle Management; Employee (pengawas + non staff).${WM === 'FGD' ? ' Realisasi FGD dihitung dari jumlah peserta.' : ''}</div>
   <div class="sc"><table><tr><th>Entitas</th>${W_CATS.map(c => `<th class="n">${c}<br><span style="text-transform:none;font-weight:500">populasi · target · realisasi</span></th>`).join('')}<th class="n">Total</th></tr>
   ${entSel.map(e => { const t = wTarget(e.kode); let a = 0, b = 0; return `<tr><td><b>${esc(e.kode)}</b> <span class="mu">${esc(e.peran)}</span></td>${W_CATS.map(c => { const r = wReal(WM, e.kode, c), g = t[c].tgt; a += r; b += g; const p = g ? Math.min(100, r / g * 100) : 0; return `<td class="n">${t[c].pop || '–'} · ${g || '–'} · <b class="${g && r < g ? 'er' : 'ok'}">${r}</b><div class="pb ${p >= 100 ? 'Proaktif' : p >= 50 ? 'Terencana' : 'Dasar'}"><i style="width:${p}%"></i></div></td>` }).join('')}<td class="n"><b>${a}</b> / ${b || '–'}</td></tr>` }).join('')}</table></div></div>
  ${WNEW ? wFormHtml(ents) : ''}
  <div class="c"><h2>Daftar ${WM === 'WWC' ? 'narasumber' : 'kelompok FGD'}</h2>${recs.length ? `<div class="sc"><table><tr><th>Tanggal</th><th>Entitas</th><th>Level</th><th>${WM === 'WWC' ? 'Jabatan / nama' : 'Kelompok / topik'}</th>${WM === 'FGD' ? '<th class="n">Peserta</th>' : ''}<th class="n">Item terisi</th><th></th></tr>
   ${recs.map(r => { const [d, n] = wDone(r), p = n ? d / n * 100 : 0; return `<tr class="${r.id === WSEL ? 'wsel' : ''}"><td>${esc(String(r.tanggal).slice(0, 10))}</td><td>${esc(r.entitas)}</td><td>${esc(r.level)}</td><td>${esc(r.jabatan || '')}${r.nama ? ` <span class="mu">· ${esc(r.nama)}</span>` : ''}</td>${WM === 'FGD' ? `<td class="n">${r.peserta || 1}</td>` : ''}<td class="n" style="min-width:110px"><div class="pb ${p >= 100 ? 'Proaktif' : p > 0 ? 'Terencana' : 'Dasar'}"><i style="width:${p}%"></i></div>${d}/${n}</td><td class="n" style="white-space:nowrap"><button data-wopen="${r.id}">${r.id === WSEL ? 'Dibuka' : 'Nilai'}</button> <button class="s" data-wdel="${r.id}">Hapus</button></td></tr>` }).join('')}</table></div>` : `<div class="empty">Belum ada ${WM === 'WWC' ? 'narasumber' : 'kelompok FGD'} tercatat. Klik <b>+ Tambah</b> di atas untuk memulai.</div>`}</div>
  <div id="wsheet"></div>
  <div class="c"><div class="row"><h2 style="margin:0">Rekap skor ${mn} per item</h2><span style="margin-left:auto" class="row"><span id="wam" class="mu"></span><button id="wapply">Terapkan ke tab Penilaian</button></span></div>
   <div class="mu" style="margin:4px 0 8px">Angka = skor akhir (n = jumlah lembar yang dipakai). Sel kosong = belum ada lembar yang menilai item itu untuk entitas tersebut.</div>
   <details><summary style="cursor:pointer;font-weight:600">Tampilkan tabel rekap (${wItems(WM).length} item)</summary><div class="sc tall" style="margin-top:8px"><table class="tn"><colgroup><col style="width:62px"><col>${entSel.map(() => '<col style="width:78px">').join('')}</colgroup><tr><th class="kd">Kode</th><th class="it">Item</th>${entSel.map(e => `<th class="n">${esc(e.kode)}</th>`).join('')}</tr>
   ${wItems(WM).map(it => `<tr><td class="kd">${it.code}</td><td class="it">${esc(it.name)}</td>${entSel.map(e => { if (it.iup && e.peran !== 'IUP') return '<td class="dis"></td>'; const x = sc[e.kode][it.code]; return `<td class="n">${x ? `<b>${x.s}</b> <span class="mu">n=${x.n}</span>` : ''}</td>` }).join('')}</tr>`).join('')}</table></div></details></div>`;
  wBind(ents, sc);
  if (WSEL) wSheet();
}
const wFormHtml = ents => `<div class="c hero"><h2>${WM === 'WWC' ? 'Narasumber baru' : 'Kelompok FGD baru'}</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
  <div><div class="mu">Tanggal</div><input type="date" id="nf-tg" value="${wToday()}" style="width:100%"></div>
  <div><div class="mu">Entitas</div><select id="nf-en" style="width:100%">${ents.map(e => `<option value="${esc(e.kode)}" ${WENT === e.kode ? 'selected' : ''}>${esc(e.kode)} — ${esc(e.nama)}</option>`).join('')}</select></div>
  <div><div class="mu">Level ${WM === 'WWC' ? 'narasumber' : 'kelompok'}</div><select id="nf-lv" style="width:100%">${W_LEVELS.map(l => `<option value="${l}">${W_LV_LABEL[l]}</option>`).join('')}</select></div>
  <div><div class="mu">${WM === 'WWC' ? 'Jabatan' : 'Nama kelompok / topik'}</div><input id="nf-jb" style="width:100%" placeholder="${WM === 'WWC' ? 'mis. Dept Head Produksi' : 'mis. FGD Pengawas Produksi'}"></div>
  ${WM === 'WWC' ? '<div><div class="mu">Nama (opsional)</div><input id="nf-nm" style="width:100%"></div>' : '<div><div class="mu">Jumlah peserta</div><input type="number" min="1" id="nf-ps" value="6" style="width:100%"></div>'}</div>
  <div class="row"><button id="nf-ok">Simpan &amp; mulai menilai</button><button class="s" id="nf-no">Batal</button><span id="nf-m" class="mu"></span></div></div>`;

function wBind(ents, sc) {
  document.querySelectorAll('[data-wm]').forEach(b => b.onclick = () => { if (WDIRTY && !confirm('Lembar yang dibuka belum disimpan. Pindah metode dan buang perubahan?')) return; WM = b.dataset.wm; WSEL = null; WNEW = false; WDIRTY = false; vWwc() });
  $('#went').onchange = e => { WENT = e.target.value; vWwc() };
  $('#wadd').onclick = () => { WNEW = !WNEW; vWwc(); if (WNEW) $('#nf-jb').focus() };
  if (WNEW) {
    $('#nf-no').onclick = () => { WNEW = false; vWwc() };
    $('#nf-ok').onclick = async () => {
      const r = { id: wNewId(), metode: WM, entitas: $('#nf-en').value, level: $('#nf-lv').value, jabatan: $('#nf-jb').value.trim(), nama: WM === 'WWC' ? $('#nf-nm').value.trim() : '', tanggal: $('#nf-tg').value, peserta: WM === 'FGD' ? Math.max(1, +$('#nf-ps').value || 1) : 1, skor: {}, catatan: {} };
      if (!r.entitas || !r.tanggal) { $('#nf-m').innerHTML = '<span class="er">Tanggal dan entitas wajib diisi.</span>'; return }
      $('#nf-m').textContent = 'Menyimpan…';
      try { await wSave(r); (D.wwc = D.wwc || []).push(r); WSEL = r.id; WNEW = false; WDIRTY = false; vWwc(); document.getElementById('wsheet').scrollIntoView({ behavior: 'smooth' }) } catch (e) { $('#nf-m').innerHTML = `<span class="er">${esc(e.message)}</span>` }
    };
  }
  document.querySelectorAll('[data-wopen]').forEach(b => b.onclick = () => { if (WDIRTY && WSEL !== b.dataset.wopen && !confirm('Lembar yang dibuka belum disimpan. Buang perubahan?')) return; WSEL = b.dataset.wopen; WDIRTY = false; vWwc(); document.getElementById('wsheet').scrollIntoView({ behavior: 'smooth' }) });
  document.querySelectorAll('[data-wdel]').forEach(b => b.onclick = async () => {
    if (!confirm('Hapus lembar ini beserta seluruh skornya?')) return;
    const x = await call({ action: 'deleteWwc', id: b.dataset.wdel }); if (!x.ok) { alert(x.error); return }
    D.wwc = D.wwc.filter(r => r.id !== b.dataset.wdel); if (WSEL === b.dataset.wdel) { WSEL = null; WDIRTY = false } vWwc();
  });
  $('#wapply').onclick = () => wApply(ents, sc);
}

function wSheet() {
  const r = D.wwc.find(x => x.id === WSEL), e = allEnt().find(x => x.kode === r.entitas) || { kode: r.entitas, peran: '' };
  const all = wItems(r.metode, e), its = WFILT ? all.filter(it => wApplies(it, r.metode, r.level)) : all, [d, n] = wDone(r), p = n ? d / n * 100 : 0;
  r.skor = r.skor || {}; r.catatan = r.catatan || {};
  const ind = {}; its.forEach(it => (ind[it.code[0]] = ind[it.code[0]] || []).push(it));
  $('#wsheet').innerHTML = `<div class="c" style="border-color:var(--ac)"><div class="row"><h2 style="margin:0">Lembar ${r.metode === 'WWC' ? 'wawancara' : 'FGD'} — ${esc(r.entitas)} · ${esc(r.level)}${r.jabatan ? ' · ' + esc(r.jabatan) : ''}${r.nama ? ' · ' + esc(r.nama) : ''}</h2>
    <span style="margin-left:auto" class="row"><span id="wsm" class="mu">${WDIRTY ? 'Ada perubahan belum disimpan' : ''}</span><button id="wsave">Simpan lembar</button><button class="s" id="wclose">Tutup</button></span></div>
   <div class="row"><div style="flex:1;min-width:220px"><div class="pb ${p >= 100 ? 'Proaktif' : 'Terencana'}"><i id="wpb" style="width:${p}%"></i></div><span id="wpt">${d} dari ${n} item untuk level ini sudah dinilai</span></div>
    <label><input type="checkbox" id="wfilt" ${WFILT ? 'checked' : ''}> Hanya item sesuai level ini</label><label><input type="checkbox" id="wall" ${WALL ? 'checked' : ''}> Rubrik terbuka semua</label></div>
   ${[1, 2, 3, 4].filter(i => ind[i]).map(i => `<h2 style="margin:14px 0 6px">${i}. ${esc(MASTER.ind[i])}</h2>${ind[i].map(it => wItemHtml(r, it)).join('')}`).join('') || '<div class="empty">Tidak ada item untuk level ini. Matikan filter “Hanya item sesuai level ini” untuk melihat semua item.</div>'}</div>`;
  $('#wclose').onclick = () => { if (WDIRTY && !confirm('Belum disimpan. Tutup dan buang perubahan?')) return; WSEL = null; WDIRTY = false; vWwc() };
  $('#wfilt').onchange = e => { WFILT = e.target.checked; wSheet() };
  $('#wall').onchange = e => { WALL = e.target.checked; wSheet() };
  $('#wsheet').querySelectorAll('[data-ws]').forEach(b => b.onclick = () => {
    const [code, v] = b.dataset.ws.split('|'), cur = r.skor[code]; if (+cur === +v) delete r.skor[code]; else r.skor[code] = +v; WDIRTY = true; wRefreshItem(r, code);
  });
  $('#wsheet').querySelectorAll('[data-wr]').forEach(b => b.onclick = () => { const k = b.dataset.wr; WOPEN[k] = !WOPEN[k]; wRefreshItem(r, k) });
  $('#wsheet').querySelectorAll('[data-wn]').forEach(b => b.onclick = () => { const k = b.dataset.wn; WNOTE[k] = !WNOTE[k]; wRefreshItem(r, k); const t = document.querySelector(`[data-wnt="${k}"]`); if (t) t.focus() });
  $('#wsheet').addEventListener('input', ev => { const t = ev.target; if (!t.dataset.wnt) return; r.catatan[t.dataset.wnt] = t.value; WDIRTY = true; $('#wsm').textContent = 'Ada perubahan belum disimpan'; const b = document.querySelector(`[data-wn="${t.dataset.wnt}"]`); if (b) { b.classList.toggle('has', !!t.value.trim()); b.textContent = t.value.trim() ? '✎' : '+' } });
  $('#wsave').onclick = async () => { $('#wsm').textContent = 'Menyimpan…'; try { await wSave(r); WDIRTY = false; $('#wsm').innerHTML = '<span class="ok">Tersimpan.</span>'; vWwc() } catch (er) { $('#wsm').innerHTML = `<span class="er">${esc(er.message)}</span>` } };
}
function wRefreshItem(r, code) {
  const it = MASTER.items.find(i => i.code === code), el = document.getElementById('wi-' + code); if (!el) return;
  el.outerHTML = wItemHtml(r, it);
  const el2 = document.getElementById('wi-' + code);
  el2.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => { const [c, v] = b.dataset.ws.split('|'); if (+r.skor[c] === +v) delete r.skor[c]; else r.skor[c] = +v; WDIRTY = true; wRefreshItem(r, c) });
  el2.querySelectorAll('[data-wr]').forEach(b => b.onclick = () => { WOPEN[code] = !WOPEN[code]; wRefreshItem(r, code) });
  el2.querySelectorAll('[data-wn]').forEach(b => b.onclick = () => { WNOTE[code] = !WNOTE[code]; wRefreshItem(r, code); const t = document.querySelector(`[data-wnt="${code}"]`); if (t) t.focus() });
  const [d, n] = wDone(r); $('#wpt').textContent = `${d} dari ${n} item untuk level ini sudah dinilai`; $('#wpb').style.width = (n ? d / n * 100 : 0) + '%'; $('#wsm').textContent = WDIRTY ? 'Ada perubahan belum disimpan' : '';
}
function wItemHtml(r, it) {
  const v = +r.skor[it.code] || 0, note = r.catatan[it.code] || '', tg = String((it.tgt || {})[r.metode] || '').replace(/\n/g, ' ').trim(), bukti = String((it.tgt || {}).TD || '');
  return `<div class="wi" id="wi-${it.code}"><div class="row" style="margin:0;align-items:flex-start;flex-wrap:nowrap"><div style="flex:1;min-width:0"><b class="mu">${it.code}</b> ${esc(it.name)}${it.iup ? ' <span class="mu">(khusus IUP)</span>' : ''}${tg ? `<div class="mu" style="font-size:.82rem">Target narasumber: ${esc(tg)}</div>` : ''}</div>
   <div class="sb">${[1, 2, 3, 4, 5].map(n => `<button class="${v === n ? 'on l' + n : ''}" data-ws="${it.code}|${n}" title="${esc(n + '. ' + it.rubric[n - 1])}">${n}</button>`).join('')}</div>
   <div class="row" style="margin:0;flex-wrap:nowrap"><button class="s nb ${note ? 'has' : ''}" data-wn="${it.code}" title="Catatan">${note ? '✎' : '+'}</button><button class="s nb" data-wr="${it.code}" title="Rubrik">Rubrik</button></div></div>
   ${v ? `<div class="wsel-txt"><b>Level ${v}:</b> ${esc(it.rubric[v - 1])}</div>` : ''}
   ${(WOPEN[it.code] || WALL) ? `<div class="rubbox">${it.rubric.map((t, i) => `<div class="${v === i + 1 ? 'cur' : ''}"><b>${i + 1}.</b> ${esc(t)}</div>`).join('')}</div>` : ''}
   ${WNOTE[it.code] || note ? `<textarea data-wnt="${it.code}" rows="2" style="width:100%;margin-top:6px" placeholder="Catatan / bukti dari ${r.metode === 'WWC' ? 'narasumber' : 'diskusi'}…">${esc(note)}</textarea>` : ''}</div>`;
}

async function wApply(ents, sc) {
  const m = WM, rows = [], notes = [];
  let ch = 0, nw = 0;
  ents.forEach(e => Object.entries(sc[e.kode]).forEach(([code, x]) => {
    const k = `${code}|${m}|${e.kode}`, cur = D.skor[k]; if (cur !== x.s) { if (cur != null && cur !== '') ch++; else nw++; rows.push({ item: code, metode: m, entitas: e.kode, skor: x.s, catatan: '' }) }
  }));
  // catatan gabungan per item (hanya bila catatan penilaian belum ada)
  wItems(m).forEach(it => {
    const key = `${it.code}|${m}`; if (D.cat[key]) return;
    const parts = []; wRecs(m).forEach(r => { const t = String((r.catatan || {})[it.code] || '').trim(); if (t && ents.some(e => e.kode === r.entitas)) parts.push(`[${r.entitas}·${r.level}${r.jabatan ? '·' + r.jabatan : ''}] ${t}`) });
    if (parts.length) notes.push({ item: it.code, metode: m, entitas: '_CAT', skor: '', catatan: parts.join(' | ') });
  });
  if (!rows.length && !notes.length) { $('#wam').innerHTML = '<span class="mu">Tidak ada perubahan: skor di tab Penilaian sudah sama.</span>'; return }
  if (!confirm(`Terapkan skor ${m} ke tab Penilaian?\n\n• ${nw} skor baru\n• ${ch} skor lama akan ditimpa\n• ${notes.length} catatan item digabungkan\n\nSkor dapat diubah lagi di tab Penilaian.`)) return;
  $('#wam').textContent = 'Menerapkan…'; const all = [...rows, ...notes];
  for (let i = 0; i < all.length; i += 150) { const x = await call({ action: 'saveScores', rows: all.slice(i, i + 150) }); if (!x.ok) { $('#wam').innerHTML = `<span class="er">${esc(x.error)}</span>`; return } }
  rows.forEach(r => D.skor[`${r.item}|${r.metode}|${r.entitas}`] = r.skor); notes.forEach(r => D.cat[`${r.item}|${r.metode}`] = r.catatan);
  $('#wam').innerHTML = `<span class="ok">Selesai: ${rows.length} skor dan ${notes.length} catatan diterapkan.</span>`;
}
