/* ===== Akses kontraktor (mode pembaca per perusahaan) — kartu pengelolaan kunci untuk auditor =====
   Kunci disimpan di Script Properties (VK_<KODE>), bukan di sheet. Akun kontraktor hanya menerima data entitasnya sendiri dari server. */
let VK=null;
function vkCard(){
  const ents=D.Entitas.filter(e=>e.peran!=='IUP'&&e.aktif==='Ya');
  return`<div class="c" id="vk"><h2>Akses kontraktor (mode pembaca per perusahaan)</h2>
  <div class="mu">Beri tiap kontraktor/vendor <b>kunci akses sendiri</b>. Saat masuk dengan kunci itu, kontraktor hanya melihat data <b>perusahaannya saja</b> (Hasil, Progres, dan Dasbor Kuesioner). Penyaringan dilakukan di server: data entitas lain, catatan auditor, nama narasumber, temuan, dan laporan tidak ikut terkirim. Kontraktor tidak bisa mengubah data apa pun. Bagikan kunci lewat jalur yang aman, dan buat ulang kunci bila perlu dicabut.</div>
  <div class="sc" style="margin-top:8px"><table><tr><th>Entitas</th><th>Kunci akses</th><th></th></tr>
  ${ents.length?ents.map(e=>`<tr data-vk="${esc(e.kode)}"><td title="${esc(e.nama)}"><b>${esc(e.kode)}</b> <span class="mu">${esc(e.nama)}</span></td><td class="vkv mu">${VK?'':'memuat…'}</td><td style="white-space:nowrap"><button class="s" data-a="gen"></button> <button class="s" data-a="show">Tampilkan</button> <button class="s" data-a="copy">Salin</button> <button class="g" data-a="del">Cabut</button></td></tr>`).join(''):'<tr><td colspan="3" class="mu">Belum ada kontraktor/vendor aktif. Tambahkan di tabel Entitas lalu simpan.</td></tr>'}</table></div>
  <div class="row"><span id="vkm" class="mu"></span></div></div>`}
function vkPaint(){
  document.querySelectorAll('#vk tr[data-vk]').forEach(tr=>{const k=VK&&VK[tr.dataset.vk];tr.querySelector('.vkv').textContent=k?'••••••••••':'(belum ada kunci)';tr.dataset.shown='';tr.querySelector('[data-a=gen]').textContent=k?'Buat ulang':'Buat kunci';['show','copy','del'].forEach(a=>tr.querySelector(`[data-a=${a}]`).style.display=k?'':'none')})}
async function vkBind(){
  const msg=t=>{const m=$('#vkm');if(m)m.innerHTML=t};
  document.querySelectorAll('#vk tr[data-vk]').forEach(tr=>{const e=tr.dataset.vk;
    tr.querySelector('[data-a=gen]').onclick=async()=>{if(VK&&VK[e]&&!confirm(`Buat ulang kunci ${e}? Kunci lama langsung tidak berlaku.`))return;msg('Menyimpan…');const r=await call({action:'setVendorKey',entitas:e});if(r.ok){VK=r.keys;vkPaint();msg(`<span class="ok">Kunci ${esc(e)} dibuat.</span>`);const t=document.querySelector(`#vk tr[data-vk="${CSS.escape(e)}"]`);t.querySelector('.vkv').textContent=VK[e];t.dataset.shown='1';t.querySelector('[data-a=show]').textContent='Sembunyikan'}else msg(`<span class="er">${esc(/tidak dikenal/i.test(r.error||'')?'Code.gs di server belum diperbarui (Deploy > New version).':r.error)}</span>`)};
    tr.querySelector('[data-a=show]').onclick=()=>{const on=tr.dataset.shown==='1';tr.dataset.shown=on?'':'1';tr.querySelector('.vkv').textContent=on?'••••••••••':VK[e];tr.querySelector('[data-a=show]').textContent=on?'Tampilkan':'Sembunyikan'};
    tr.querySelector('[data-a=copy]').onclick=async()=>{try{await navigator.clipboard.writeText(VK[e]);msg(`<span class="ok">Kunci ${esc(e)} disalin.</span>`)}catch(x){msg('Tidak bisa menyalin otomatis; pakai Tampilkan lalu salin manual.')}};
    tr.querySelector('[data-a=del]').onclick=async()=>{if(!confirm(`Cabut akses kontraktor ${e}? Kunci lama langsung tidak berlaku.`))return;const r=await call({action:'setVendorKey',entitas:e,hapus:true});if(r.ok){VK=r.keys;vkPaint();msg(`Akses ${esc(e)} dicabut.`)}else msg(`<span class="er">${esc(r.error)}</span>`)}});
  const r=await call({action:'listVendorKeys'});
  if(r.ok){VK=r.keys;vkPaint()}else{const m=$('#vkm');if(m)m.innerHTML=`<span class="er">${esc(/tidak dikenal/i.test(r.error||'')?'Code.gs di server belum diperbarui (Deploy > New version).':r.error)}</span>`;document.querySelectorAll('#vk .vkv').forEach(x=>x.textContent='—')}}
