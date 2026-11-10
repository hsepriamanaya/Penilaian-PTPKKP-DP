/* ===== Menu Kuesioner: Aturan, Populasi & sampel, Pengisian (Dasbor ada di dashks.js) =====
   Urutan kerja: (1) Aturan: level yang diikutkan, parameter Slovin, daftar departemen
                 (2) Populasi & sampel: basis sampel tiap entitas (per level atau per departemen × level), populasi, target
                 (3) Dasbor: pantau pengisian    (4) Pengisian: hapus pengisian uji/salah */
let KSL=null,KSF='';

/* ---------- (1) Aturan ---------- */
function lvCard(){
  const ents=allEnt();
  const aff=e=>MASTER.items.map(i=>({code:i.code,lost:i.methods.filter(m=>!methPoss(i,m,e)),all:i.methods.every(m=>!methPoss(i,m,e))})).filter(x=>x.lost.length)
  const own=e=>{const v=D.cfg['lvloff_'+e];return v!==undefined&&v!=='*'};
  const cell=(k,l,on)=>`<td class="n"><input type="checkbox" data-lv="${esc(k)}|${l}" ${on?'checked':''} aria-label="${esc(k)} ${l}"></td>`;
  return`<div class="c"><h2>Level yang diikutkan dalam sampel</h2><div class="mu">Hilangkan centang pada level yang <b>tidak dilibatkan</b>. Baris <b>Bawaan umum</b> berlaku untuk semua entitas; ubah centang pada baris sebuah entitas untuk membuat pengecualian khusus entitas itu, misalnya kontraktor tanpa <b>Top Management</b> (direksi/HO). Level yang dimatikan hilang dari pilihan di kuesioner entitas tersebut, dari target sampel, skor kuesioner, dan target narasumber WWC/FGD-nya. Jawaban lama dari level itu tetap tersimpan tetapi tidak dihitung.</div>
  <div class="sc" style="margin-top:8px"><table class="dkh"><tr><th>Entitas</th>${LVALL.map(l=>`<th class="n">${l}</th>`).join('')}<th>Status</th></tr>
   <tr><td><b>Bawaan umum</b></td>${LVALL.map(l=>cell('*',l,lvOn(l))).join('')}<td class="mu">semua entitas yang tidak dikecualikan</td></tr>
   ${ents.map(e=>`<tr><td title="${esc(e.nama)}">${esc(e.kode)}</td>${LVALL.map(l=>cell(e.kode,l,lvOn(l,e.kode))).join('')}<td class="mu">${own(e.kode)?'khusus':'ikut bawaan'}</td></tr>`).join('')}</table></div>
  <div class="row"><button id="lvs">Simpan level</button><span id="lvm" class="mu"></span></div>
  ${ents.map(e=>({e,a:aff(e.kode)})).filter(x=>x.a.length).map(x=>{const na=x.a.filter(i=>i.all).map(i=>i.code),ot=x.a.filter(i=>!i.all).map(i=>i.code+' ('+i.lost.join('/')+')');return`<div class="mu">${esc(x.e.kode)}: ${na.length?`${na.length} item tidak mungkin dinilai dengan metode apa pun sehingga otomatis N/A (<b>${na.join(', ')}</b>)`:''}${na.length&&ot.length?'; ':''}${ot.length?`${ot.length} item kehilangan sebagian metode karena narasumber/penanya tidak ada (<b>${ot.join(', ')}</b>) dan dinilai lewat metode sisanya`:''}.</div>`}).join('')}</div>`}
function lvBind(){
  $('#lvs').onclick=async()=>{
    const offOf=k=>LVALL.filter(l=>{const c=document.querySelector(`[data-lv="${CSS.escape(k+'|'+l)}"]`);return c&&!c.checked}),bad=['*',...allEnt().map(e=>e.kode)].find(k=>offOf(k).length>=LVALL.length);
    if(bad)return $('#lvm').textContent=`Minimal satu level harus diikutkan (${bad==='*'?'bawaan umum':bad}).`;
    const prev={...D.cfg},g=offOf('*'),same=x=>x.length===g.length&&x.every(l=>g.includes(l));
    D.cfg.lvloff=g.join(',');
    allEnt().forEach(e=>{const o=offOf(e.kode),k='lvloff_'+e.kode;if(same(o)){if(D.cfg[k]!==undefined)D.cfg[k]='*'}else D.cfg[k]=o.length?o.join(','):'-'});
    $('#lvm').textContent='Menyimpan…';const r=await cfgSave();if(r.ok)vKsAturan();else{D.cfg=prev;$('#lvm').innerHTML=`<span class="er">${esc(r.error)}</span>`}}}

function vKsAturan(){
  $('#v').innerHTML=`${lvCard()}
  <div class="c"><h2>Parameter perhitungan</h2><div class="mu">Dipakai untuk sampel Slovin, saran narasumber WWC/FGD, dan skor kuesioner.</div><div class="grid" style="margin-top:8px">
   ${inp('moe','Margin of error Slovin (0.05 = 5%)')}${inp('minresp','Minimal responden per kelompok (entitas × level) agar skornya dihitung')}${sel('ksround','Pembulatan skor kuesioner',['Pembulatan biasa','Dibulatkan ke bawah'])}</div>
   <div class="row"><button id="sc3">Simpan parameter</button><span id="cm3" class="mu"></span></div></div>
  <div class="c"><h2>Daftar departemen</h2><div class="mu">Satu departemen per baris. Daftar ini menjadi pilihan di kuesioner dan baris pada tabel populasi/target. Mengubah nama tidak mengubah jawaban yang sudah masuk; departemen lama tetap muncul di dasbor bila sudah punya jawaban, populasi, atau target.</div>
   <textarea id="dkd" rows="9" style="width:min(520px,100%);margin-top:8px">${esc(deptList().join('\n'))}</textarea>
   <div class="row"><button id="dkds">Simpan daftar departemen</button><button class="g" id="dkdr">Kembalikan ke bawaan</button><span id="dkdm" class="mu"></span></div></div>`;
  lvBind();
  $('#sc3').onclick=async()=>{document.querySelectorAll('[data-cf]').forEach(i=>{D.cfg[i.dataset.cf]=i.value});$('#cm3').textContent='Menyimpan…';const r=await cfgSave();const e=$('#cm3');if(e)e.innerHTML=r.ok?'<span class="ok">Tersimpan.</span>':`<span class="er">${esc(r.error)}</span>`};
  const dsave=async list=>{const old=D.cfg.deptlist;D.cfg.deptlist=list.join('|');$('#dkdm').textContent='Menyimpan…';const r=await cfgSave();if(r.ok)vKsAturan();else{D.cfg.deptlist=old;$('#dkdm').innerHTML=`<span class="er">${esc(r.error)}</span>`}};
  $('#dkds').onclick=()=>{const l=[...new Set($('#dkd').value.split('\n').map(x=>x.replace(/\|/g,'/').trim()).filter(Boolean))];if(!l.length)return $('#dkdm').textContent='Isi minimal satu departemen.';dsave(l)};
  $('#dkdr').onclick=()=>{if(confirm('Kembalikan daftar departemen ke bawaan?'))dsave([])}}

/* ---------- (2) Populasi & sampel ---------- */
function ksSummary(e,A,dn,ln){
  const k=e.kode,lv=LVALL.filter(l=>lvOn(l,k)),b=ksBasis(k);let N=0,T=0,W=0,C=0;
  if(b==='dept'){dkDepts(allEnt()).forEach(d=>{const n=A.nd(k,d),t=A.eff(k,d);N+=n;T+=t;W+=t?Math.ceil(t/10):0;C+=t?Math.min(dn[k+'|'+d]||0,t):0})}
  else lv.forEach(l=>{const n=DK.L[k+'|'+l]||0,t=slv(n,moeV());N+=n;T+=t;W+=t?Math.ceil(t/10):0;C+=t?Math.min(ln[k+'|'+l]||0,t):0});
  return{b,N,T,W,C}}
function vKsPop(){
  dkInit();const admin=ROLE==='admin',all=allEnt(),A=mkEff(DK.P,DK.T);
  if(!all.some(e=>e.kode===DK.me))DK.me=all[0]&&all[0].kode;
  const dn={},ln={},tot={};(D.KS_Meta||[]).forEach(m=>{if(!lvOn(m.level,m.entitas))return;dn[m.entitas+'|'+m.departemen]=(dn[m.entitas+'|'+m.departemen]||0)+m.n;ln[m.entitas+'|'+m.level]=(ln[m.entitas+'|'+m.level]||0)+m.n;tot[m.entitas]=(tot[m.entitas]||0)+m.n});
  const rows=all.map(e=>({e,s:ksSummary(e,A,dn,ln)})),G=rows.reduce((a,r)=>({N:a.N+r.s.N,T:a.T+r.s.T,W:a.W+r.s.W,C:a.C+r.s.C,n:a.n+(tot[r.e.kode]||0)}),{N:0,T:0,W:0,C:0,n:0});
  const sum=`<div class="c"><h2>Ringkasan sampel semua entitas</h2><div class="mu">Sampel Slovin (e = ${(moeV()*100).toFixed(0)}%) dan saran narasumber WWC/FGD (10% dari sampel, dibulatkan ke atas) mengikuti basis sampel tiap entitas. ${admin?'Klik baris untuk mengisi atau mengubahnya.':''}</div>
   <div class="sc" style="margin-top:8px"><table class="dkh" id="ksum"><tr><th>Entitas</th><th>Basis sampel</th><th class="n">Populasi (N)</th><th class="n">Sampel / target</th><th class="n">Saran WWC/FGD</th><th class="n">Responden masuk</th><th class="n">Capaian</th></tr>
   ${rows.map(({e,s})=>`<tr data-e="${esc(e.kode)}" ${admin?'style="cursor:pointer"':''} class="${e.kode===DK.me&&admin?'sel':''}"><td title="${esc(e.nama)}"><b>${esc(e.kode)}</b></td><td>${s.b==='dept'?'Departemen × level':'Level jabatan'}</td><td class="n ${s.N?'':'z'}">${s.N||'·'}</td><td class="n">${s.T||'·'}</td><td class="n">${s.W||'·'}</td><td class="n">${tot[e.kode]||0}</td><td class="n ${s.T&&s.C>=s.T?'ok':''}">${s.T?Math.round(s.C/s.T*100)+'%':'—'}</td></tr>`).join('')}
   <tr><th colspan="2">Total</th><th class="n">${G.N||''}</th><th class="n">${G.T||''}</th><th class="n">${G.W||''}</th><th class="n">${G.n}</th><th class="n">${G.T?Math.round(G.C/G.T*100)+'%':''}</th></tr></table></div></div>`;
  if(!admin){$('#v').innerHTML=sum;return}
  const en=DK.me,b=ksBasis(en),lvs=LVALL.filter(l=>lvOn(l,en)),depts=dkDepts(all);
  const lvTable=`<div class="sc"><table class="dkh"><tr><th>Level jabatan</th><th class="n">Populasi (N)</th><th class="n">Sampel Slovin</th><th class="n">Saran WWC/FGD</th><th class="n">Terkumpul</th></tr>
   ${lvs.map(l=>`<tr><td>${esc(l)}</td><td class="n"><input type="number" min="0" step="1" style="width:84px" data-lp="${esc(en)}|${esc(l)}" value="${DK.L[en+'|'+l]||''}" aria-label="Populasi ${esc(l)}"></td><td class="n" data-lsl="${esc(l)}"></td><td class="n" data-lww="${esc(l)}"></td><td class="n">${ln[en+'|'+l]||0}</td></tr>`).join('')}
   <tr><th>Total</th><th class="n" id="lgN"></th><th class="n" id="lgS"></th><th class="n" id="lgW"></th><th class="n">${lvs.reduce((a,l)=>a+(ln[en+'|'+l]||0),0)}</th></tr></table></div>`;
  const pc=(d,l)=>DK.P[en+'|'+d+'|'+l]||'';
  const dpTable=`<div class="mu" style="margin-bottom:6px">Isi <b>jumlah pekerja</b> tiap departemen pada tiap level. Populasi per level yang diturunkan dari tabel ini otomatis dipakai menu Wawancara &amp; FGD, kartu Progres, dan laporan Word. <b>Target manual</b> opsional menggantikan Slovin untuk departemen itu.</div>
   <div class="sc"><table class="dkh"><tr><th>Departemen</th>${lvs.map(l=>`<th class="n">${esc(l)}</th>`).join('')}<th class="n">Populasi (N)</th><th class="n">Sampel Slovin</th><th class="n">Target manual</th><th class="n">Target dipakai</th><th class="n">Saran WWC/FGD</th></tr>
   ${depts.map(d=>`<tr><td>${esc(d)}</td>${lvs.map(l=>`<td class="n"><input type="number" min="0" step="1" style="width:64px" data-pp="${esc(en)}|${esc(d)}|${esc(l)}" value="${pc(d,l)}" aria-label="${esc(d)} ${esc(l)}"></td>`).join('')}
    <td class="n"><b data-nd="${esc(d)}"></b></td><td class="n" data-sl="${esc(d)}"></td><td class="n"><input type="number" min="0" step="1" style="width:64px" data-dt="${esc(en)}|${esc(d)}" value="${DK.T[en+'|'+d]||''}" aria-label="Target manual ${esc(d)}"></td><td class="n"><b data-ef="${esc(d)}"></b></td><td class="n" data-ww="${esc(d)}"></td></tr>`).join('')}
   <tr><th>Total</th>${lvs.map(l=>`<th class="n" data-lt="${esc(l)}"></th>`).join('')}<th class="n" id="dkgN"></th><th class="n" id="dkgS"></th><th></th><th class="n" id="dkgE"></th><th class="n" id="dkgW"></th></tr></table></div>`;
  $('#v').innerHTML=`${sum}<div class="c"><h2>Isi populasi dan sampel: <span style="color:var(--ac)">${esc(en)}</span></h2>
   <div class="row"><b>Entitas</b><select id="dkme">${all.map(e=>`<option value="${esc(e.kode)}" ${e.kode===en?'selected':''}>${esc(e.kode)} — ${esc(e.nama)}</option>`).join('')}</select>
    <b style="margin-left:10px">Basis sampel</b><label><input type="radio" name="bs" value="level" ${b==='level'?'checked':''}> Level jabatan saja</label><label><input type="radio" name="bs" value="dept" ${b==='dept'?'checked':''}> Departemen × level</label></div>
   <div class="mu" style="margin:4px 0 8px">${b==='level'?'Sampel dihitung dari populasi tiap level jabatan (cocok untuk kontraktor yang tidak dipecah per departemen).':'Sampel dihitung per departemen dari tabel silang; populasi per level diturunkan otomatis dari tabel ini.'} Level yang diikutkan diatur di tab Aturan.</div>
   ${b==='level'?lvTable:dpTable}
   <div class="row"><button id="dks">Simpan populasi &amp; sampel</button><button class="s" id="dkr">Batalkan perubahan</button><span id="dkm2" class="mu"></span></div></div>`;
  document.querySelectorAll('#ksum tr[data-e]').forEach(tr=>tr.onclick=()=>{DK.me=tr.dataset.e;vKsPop();window.scrollTo({top:document.querySelector('#dkme').getBoundingClientRect().top+scrollY-90,behavior:'smooth'})});
  $('#dkme').onchange=e=>{DK.me=e.target.value;vKsPop()};
  document.querySelectorAll('[name=bs]').forEach(r=>r.onchange=()=>{D.cfg['ksbasis_'+en]=r.value;DK.dirty=true;DK.bd=true;derivePopDraft();vKsPop();$('#dkm2').textContent='Belum disimpan'});
  const redraw=()=>{ksEdCalc(en,depts,lvs,b)};
  document.querySelectorAll('[data-lp]').forEach(i=>i.oninput=()=>{DK.L[i.dataset.lp]=Math.max(0,Math.floor(+i.value||0));DK.dirty=true;DK.ld=true;$('#dkm2').textContent='Belum disimpan';redraw()});
  document.querySelectorAll('[data-pp]').forEach(i=>i.oninput=()=>{DK.P[i.dataset.pp]=Math.max(0,Math.floor(+i.value||0));DK.dirty=true;DK.pd.add(en);$('#dkm2').textContent='Belum disimpan';redraw()});
  document.querySelectorAll('[data-dt]').forEach(i=>i.oninput=()=>{DK.T[i.dataset.dt]=Math.max(0,Math.floor(+i.value||0));DK.dirty=true;DK.td=true;$('#dkm2').textContent='Belum disimpan';redraw()});
  redraw();
  $('#dkr').onclick=()=>{DK.dirty=false;DK.P=null;DK.T=null;DK.L=null;if(DK.bd){D.cfg={...D.cfg0}}DK.bd=false;dkInit();vKsPop()};
  $('#dks').onclick=async()=>{if(DK.busy)return;DK.busy=true;SAVING++;$('#dks').disabled=true;$('#dkm2').textContent='Menyimpan…';
    let r={ok:true};
    try{
      if(DK.bd)r=await cfgSave();
      if(r.ok&&DK.ld){const rows=Object.keys(DK.L).filter(k=>DK.L[k]>0).map(k=>{const i=k.indexOf('|');return{entitas:k.slice(0,i),level:k.slice(i+1),populasi:DK.L[k]}});r=await call({action:'savePopulasi',rows});if(r.ok)D.PopManual=rows}
      if(r.ok)for(const e of [...DK.pd]){const rows=Object.keys(DK.P).filter(k=>k.startsWith(e+'|')&&DK.P[k]>0).map(k=>{const a=k.split('|');return{departemen:a[1],level:a[2],populasi:DK.P[k]}});r=await call({action:'savePopDept',entitas:e,rows});if(!r.ok)break}
      if(r.ok&&DK.td){const rows=Object.keys(DK.T).filter(k=>DK.T[k]>0).map(k=>{const i=k.indexOf('|');return{entitas:k.slice(0,i),departemen:k.slice(i+1),target:DK.T[k]}});r=await call({action:'saveTargetKs',rows});if(r.ok)D.Target_KS=rows}
    }catch(e){r={ok:false,error:String(e)}}
    DK.busy=false;SAVING--;const bt=$('#dks');if(bt)bt.disabled=false;
    if(r.ok){D.Populasi_Dept=Object.keys(DK.P).filter(k=>DK.P[k]>0).map(k=>{const a=k.split('|');return{entitas:a[0],departemen:a[1],level:a[2],populasi:DK.P[k]}});derivePop(D);DK.dirty=false;DK.pd=new Set();DK.td=false;DK.ld=false;DK.bd=false;vKsPop();const m=$('#dkm2');if(m)m.innerHTML='<span class="ok">Tersimpan.</span>'}
    else{const m=$('#dkm2');if(m)m.innerHTML=`<span class="er">${esc(/tidak dikenal/i.test(r.error||'')?'Code.gs di server belum diperbarui (Deploy > New version).':r.error)}</span>`}}}
function derivePopDraft(){}   // basis hanya memengaruhi tampilan sampai disimpan; populasi turunan dihitung ulang setelah simpan
function ksEdCalc(en,depts,lvs,b){
  const set=(sel,v)=>{const el=document.querySelector(sel);if(el)el.textContent=v===0||v==null?'':v};
  if(b==='level'){let N=0,S=0,W=0;lvs.forEach(l=>{const n=DK.L[en+'|'+l]||0,s=slv(n,moeV()),q=CSS.escape(l);N+=n;S+=s;W+=s?Math.ceil(s/10):0;set(`[data-lsl="${q}"]`,s);set(`[data-lww="${q}"]`,s?Math.ceil(s/10):0)});set('#lgN',N);set('#lgS',S);set('#lgW',W);return}
  const A=mkEff(DK.P,DK.T);let gN=0,gS=0,gE=0,gW=0;const lt={};
  depts.forEach(d=>{const N=A.nd(en,d),sl=slv(N,moeV()),ef=A.eff(en,d),q=CSS.escape(d);gN+=N;gS+=sl;gE+=ef;gW+=ef?Math.ceil(ef/10):0;
    lvs.forEach(l=>lt[l]=(lt[l]||0)+(DK.P[en+'|'+d+'|'+l]||0));
    set(`[data-nd="${q}"]`,N);set(`[data-sl="${q}"]`,sl);set(`[data-ef="${q}"]`,ef);set(`[data-ww="${q}"]`,ef?Math.ceil(ef/10):0)});
  lvs.forEach(l=>set(`[data-lt="${CSS.escape(l)}"]`,lt[l]||0));
  set('#dkgN',gN);set('#dkgS',gS);set('#dkgE',gE);set('#dkgW',gW)}

/* ---------- (4) Pengisian ---------- */
function vKsIsi(){
  $('#v').innerHTML=`<div class="c"><h2>Daftar pengisian kuesioner</h2><div class="mu">Hanya metadata (tanpa jawaban). Gunakan untuk menghapus pengisian uji atau salah input. Jawaban individual tidak ditampilkan.</div><div class="row"><button id="lk">Muat daftar</button><span id="lm" class="mu"></span></div><div id="lt"></div></div>`;
  $('#lk').onclick=async()=>{$('#lm').textContent='Memuat…';const r=await call({action:'listKs'});if(!r.ok){$('#lm').innerHTML=`<span class="er">${esc(r.error)}</span>`;return}KSL=r.rows;$('#lm').textContent=KSL.length+' pengisian';tabelKs()};
  if(KSL){$('#lm').textContent=KSL.length+' pengisian';tabelKs()}}
function tabelKs(){
  const ents=[...new Set(KSL.map(r=>r.entitas))],rows=KSL.filter(r=>!KSF||r.entitas===KSF);
  $('#lt').innerHTML=`<div class="row"><b>Entitas</b><select id="kf"><option value="">Semua</option>${ents.map(e=>`<option ${e===KSF?'selected':''}>${esc(e)}</option>`).join('')}</select>
   <button class="s" id="ka">Pilih semua yang tampil</button><button id="kd" style="background:#c62828;color:#fff">Hapus terpilih</button></div>
   <div class="sc" style="max-height:60vh"><table><tr><th></th><th>Tanggal</th><th>Entitas</th><th>Level</th><th>Departemen</th><th>Jabatan</th><th>Area</th><th class="n">Terjawab</th></tr>
   ${rows.map(r=>`<tr><td><input type="checkbox" data-id="${esc(r.id)}"></td><td>${esc(String(r.tanggal).slice(0,10))}</td><td>${esc(r.entitas)}</td><td>${esc(r.level)}</td><td>${esc(r.departemen)}</td><td>${esc(r.jabatan)}</td><td>${esc(r.area)}</td><td class="n">${r.terjawab}</td></tr>`).join('')}</table></div>`;
  $('#kf').onchange=e=>{KSF=e.target.value;tabelKs()};
  $('#ka').onclick=()=>document.querySelectorAll('#lt [data-id]').forEach(c=>c.checked=true);
  $('#kd').onclick=async()=>{const ids=[...document.querySelectorAll('#lt [data-id]:checked')].map(c=>c.dataset.id);if(!ids.length)return;
    if(!confirm(`Hapus ${ids.length} pengisian kuesioner? Tindakan ini tidak bisa dibatalkan.`))return;
    const r=await call({action:'deleteKs',ids});if(!r.ok){alert(r.error);return}
    KSL=KSL.filter(x=>!ids.includes(x.id));await load();vKsIsi()}}
