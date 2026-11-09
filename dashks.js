/* ===== Dasbor Kuesioner: data kuesioner yang masuk, target per departemen, dan kualitas data =====
   Sumber: D.KS_Meta (hitungan pengisian per tanggal/entitas/level/departemen/jabatan/area; tanpa jawaban individual),
   D.Target_KS (target responden per entitas x departemen), D.KS_Rekap (jumlah per entitas x level, dan jumlah/jumlah skor per item). */
const DEPT_DEFAULT=['Angkutan & Stasiun','Technical Service','Produksi','HSE','Plant & Maintenance','HRGA & Security','Land Acquisition, External Relation & CSR','Finance, Accounting & Budgeting','Supply Chain Management','Civil','Government Relations & Reporting','Lainnya'];
const deptList=()=>{const c=String((D&&D.cfg&&D.cfg.deptlist)||'').split('|').map(x=>x.trim()).filter(Boolean);return c.length?c:DEPT_DEFAULT};
let DK={ent:'*',T:null,dirty:false,busy:false};
const DK_DIRTY_FN=()=>DK.dirty;
function dkInit(){if(DK.dirty&&DK.T)return;DK.T={};(D.Target_KS||[]).forEach(r=>DK.T[r.entitas+'|'+r.departemen]=+r.target||0)}
const dkMeta=ents=>{const s=new Set(ents.map(e=>e.kode));return(D.KS_Meta||[]).filter(m=>s.has(m.entitas))};
/* Kemajuan pengumpulan kuesioner untuk kartu Progres: target per departemen bila sudah diisi untuk entitas itu; bila belum, acuan Slovin per level. */
function ksProgress(ents){
  const sl=(N,e)=>Math.ceil(N/(1+N*e*e)),moe=+D.cfg.moe||.05,pop={},cnt={};
  D.Populasi.forEach(p=>pop[p.entitas+'|'+p.level]=+p.populasi||0);D.KS_Rekap.forEach(g=>cnt[g.entitas+'|'+g.level]=g.n);
  const tg={};(D.Target_KS||[]).forEach(r=>tg[r.entitas+'|'+r.departemen]=+r.target||0);
  const dn={};(D.KS_Meta||[]).forEach(m=>{const k=m.entitas+'|'+m.departemen;dn[k]=(dn[k]||0)+m.n});
  let T=0,N=0,dept=0,lvl=0;
  ents.forEach(e=>{const ks=Object.keys(tg).filter(k=>k.startsWith(e.kode+'|')&&tg[k]>0);
    if(ks.length){dept++;ks.forEach(k=>{T+=tg[k];N+=Math.min(dn[k]||0,tg[k])})}
    else{lvl++;LVALL.filter(lvOn).forEach(l=>{const P=pop[e.kode+'|'+l]||0,t=P?sl(P,moe):0,n=cnt[e.kode+'|'+l]||0;T+=t;N+=Math.min(n,t||n)})}});
  return{T,N,dept,lvl}}

const dkDay=d=>{const x=new Date(d+'T00:00:00');return isNaN(x)?d:x.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})};
function dkAgg(M,keyFn){const o={};M.forEach(m=>{const ks=keyFn(m);(Array.isArray(ks)?ks:[ks]).forEach(k=>{if(k===''||k==null)k='(kosong)';o[k]=(o[k]||0)+m.n})});return o}
const dkBarsH=(rows,max,fmt)=>rows.map(([lab,n,t,extra])=>{const p=t?Math.round(n/t*100):null,done=t&&n>=t;
  return`<div class="dkr"><div class="dkl" title="${esc(lab)}">${esc(lab)}</div><div class="dkb" title="${esc(lab)}: ${n}${t?' dari target '+t:''}"><i style="width:${max?Math.min(100,n/max*100):0}%"></i>${t?`<u style="left:${Math.min(100,t/max*100)}%"></u>`:''}</div><div class="dkv">${fmt?fmt(n,t,p,done):`<b>${n}</b>${t?` / ${t} · ${p}%${done?' ✓':''}`:''}`}${extra||''}</div></div>`}).join('');

function dkTrend(M,totalT){
  const days=[...new Set(M.map(m=>m.tanggal))].sort();if(!days.length)return'<div class="mu">Belum ada pengisian.</div>';
  const a=new Date(days[0]+'T00:00:00'),b=new Date(days[days.length-1]+'T00:00:00'),all=[];
  for(let d=new Date(a);d<=b&&all.length<400;d.setDate(d.getDate()+1))all.push(d.toISOString().slice(0,10));
  const per={};M.forEach(m=>per[m.tanggal]=(per[m.tanggal]||0)+m.n);
  const v=all.map(d=>per[d]||0);let c=0;const cum=v.map(x=>c+=x);
  const W=620,H=170,L=34,R=10,Tp=10,B=24,iw=W-L-R,ih=H-Tp-B,nice=x=>{x=Math.max(2,x);if(x<=10)return Math.ceil(x/2)*2;if(x<=100)return Math.ceil(x/10)*10;const st=Math.pow(10,Math.floor(Math.log10(x)))/5;return Math.ceil(x/st)*st};
  const xl=i=>L+(all.length===1?iw/2:i*iw/(all.length-1)),tk=[...new Set([0,Math.floor((all.length-1)/2),all.length-1])];
  const grid=(mx)=>[0,.5,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${Tp+ih*(1-f)}" y2="${Tp+ih*(1-f)}" class="dkg"/><text x="${L-6}" y="${Tp+ih*(1-f)+4}" text-anchor="end" class="dkt">${Math.round(mx*f)}</text>`).join('');
  const xs=tk.map(i=>`<text x="${xl(i)}" y="${H-6}" text-anchor="${i===0?'start':i===all.length-1?'end':'middle'}" class="dkt">${dkDay(all[i])}</text>`).join('');
  const m1=nice(Math.max(...v)),bw=Math.max(2,Math.min(22,iw/all.length-2));
  const bars=v.map((x,i)=>`<rect x="${xl(i)-bw/2}" y="${Tp+ih*(1-x/m1)}" width="${bw}" height="${Math.max(0,ih*x/m1)}" rx="2" class="dkf"><title>${dkDay(all[i])}: ${x} pengisian</title></rect>`).join('');
  const m2=nice(Math.max(c,totalT||0)),pts=cum.map((x,i)=>`${xl(i).toFixed(1)},${(Tp+ih*(1-x/m2)).toFixed(1)}`).join(' ');
  const dots=cum.length<=40?cum.map((x,i)=>`<circle cx="${xl(i)}" cy="${Tp+ih*(1-x/m2)}" r="3" class="dkd"><title>${dkDay(all[i])}: kumulatif ${x}</title></circle>`).join(''):'';
  const tl=totalT?`<line x1="${L}" x2="${W-R}" y1="${Tp+ih*(1-totalT/m2)}" y2="${Tp+ih*(1-totalT/m2)}" class="dkT"/><text x="${W-R}" y="${Tp+ih*(1-totalT/m2)-5}" text-anchor="end" class="dkt dkTx">target ${totalT}</text>`:'';
  return`<div class="dk2"><div><div class="mu dkcap">Pengisian per hari</div><svg viewBox="0 0 ${W} ${H}" class="dksvg" role="img" aria-label="Pengisian per hari">${grid(m1)}${bars}${xs}</svg></div>
  <div><div class="mu dkcap">Kumulatif${totalT?' terhadap target':''}</div><svg viewBox="0 0 ${W} ${H}" class="dksvg" role="img" aria-label="Pengisian kumulatif">${grid(m2)}${tl}<polyline points="${pts}" class="dkp"/>${dots}${xs}</svg></div></div>`}

function dkCsv(ents,depts){
  const M=dkMeta(ents),n={};M.forEach(m=>{const k=m.entitas+'|'+m.departemen;n[k]=(n[k]||0)+m.n});
  const rows=[['Entitas','Departemen','Terkumpul','Target','Persen']];
  ents.forEach(e=>depts.forEach(d=>{const x=n[e.kode+'|'+d]||0,t=DK.T[e.kode+'|'+d]||0;if(x||t)rows.push([e.kode,d,x,t||'',t?Math.round(x/t*100)+'%':''])}));
  dl('rekap_kuesioner_per_departemen.csv','﻿'+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n'),'text/csv')}

function vDks(){
  dkInit();const admin=ROLE==='admin',all=activeEnt(),ok=D.KS_Meta!==undefined;
  if(DK.ent!=='*'&&!all.some(e=>e.kode===DK.ent))DK.ent='*';
  const ents=DK.ent==='*'?all:all.filter(e=>e.kode===DK.ent);
  $('#v').innerHTML=`<style>
  .dks{--s1:#2a78d6;--tr:#e4e8ee;--gr:#e9edf3}
  :root[data-theme=dark] .dks{--s1:#3987e5;--tr:#2a3752;--gr:#22304d}
  @media(prefers-color-scheme:dark){:root:not([data-theme=light]) .dks{--s1:#3987e5;--tr:#2a3752;--gr:#22304d}}
  .dkr{display:grid;grid-template-columns:minmax(120px,230px) minmax(120px,1fr) minmax(110px,170px);gap:12px;align-items:center;padding:5px 0}
  .dkl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:550}
  .dkb{position:relative;height:12px;background:var(--tr);border-radius:0 6px 6px 0;overflow:visible}
  .dkb i{display:block;height:100%;background:var(--s1);border-radius:0 5px 5px 0;min-width:0}
  .dkb u{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--tx);opacity:.75;text-decoration:none}
  .dkv{font-variant-numeric:tabular-nums;white-space:nowrap}.dkv b{font-weight:700}
  .dksvg{width:100%;height:auto;display:block}.dkg{stroke:var(--gr);stroke-width:1}.dkt{fill:var(--mu);font-size:11px}.dkTx{fill:var(--tx)}
  .dkf{fill:var(--s1)}.dkp{fill:none;stroke:var(--s1);stroke-width:2;stroke-linejoin:round}.dkd{fill:var(--s1);stroke:var(--card);stroke-width:2}.dkT{stroke:var(--tx);stroke-width:1.5;stroke-dasharray:5 4;opacity:.7}
  .dk2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}.dkcap{margin-bottom:4px}
  .dk3{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}.dk3>.c{margin:0}
  .dkh td,.dkh th{vertical-align:middle}.dkh td.n{text-align:center;min-width:56px}.dkh input{padding:4px 8px}.dkh td.z{color:var(--mu)}
  .dkleg{display:flex;gap:16px;flex-wrap:wrap;margin:2px 0 8px;font-size:.85rem;color:var(--mu)}.dkleg span::before{content:"";display:inline-block;vertical-align:middle;margin-right:6px}
  .dkleg .a::before{width:14px;height:10px;background:var(--s1);border-radius:2px}.dkleg .b::before{width:2px;height:14px;background:var(--tx);opacity:.75}
  @media(max-width:700px){.dkr{grid-template-columns:1fr;gap:3px;padding:8px 0}}
  </style><div class="dks">
  ${ok?'':'<div class="c er"><b>Code.gs belum diperbarui.</b> Tempel Code.gs terbaru di Apps Script lalu Deploy &gt; New version agar data dasbor tersedia.</div>'}
  <div class="row" style="margin:0 0 4px"><b>Entitas</b><select id="dke"><option value="*">Semua dalam cakupan (${all.length})</option>${all.map(e=>`<option value="${esc(e.kode)}" ${e.kode===DK.ent?'selected':''}>${esc(e.kode)} — ${esc(e.nama)}</option>`).join('')}</select>
   <span class="mu">Hanya menampilkan data kuesioner yang masuk. Jawaban individual tidak ditampilkan; diperbarui otomatis tiap 60 detik <span id="dkt"></span></span><span class="sp"></span><button class="s" id="dkx">Unduh rekap (CSV)</button></div>
  <div id="dkp"></div>
  ${admin?`<div class="c" id="dkm"></div>`:''}
  <div id="dkq"></div></div>`;
  $('#dke').onchange=e=>{DK.ent=e.target.value;vDks()};$('#dkx').onclick=()=>dkCsv(ents,dkDepts(ents));
  if(admin)dkMatrix(all);
  dkPaint(ents)}

const dkDepts=ents=>{const base=deptList(),seen=new Set(base),extra=[];
  [...(D.KS_Meta||[]).map(m=>m.departemen),...Object.keys(DK.T||{}).map(k=>k.slice(k.indexOf('|')+1))].forEach(d=>{if(d&&!seen.has(d)){seen.add(d);extra.push(d)}});return base.concat(extra)};

/* Matriks target (admin): baris = departemen, kolom = entitas. Mengetik langsung memperbarui grafik tanpa menyusun ulang matriks. */
function dkMatrix(all){
  const depts=dkDepts(all),box=$('#dkm');
  box.innerHTML=`<h2>Target responden per departemen</h2><div class="mu">Isi jumlah responden yang ditargetkan untuk tiap departemen pada tiap entitas (kosong atau 0 = tidak ditargetkan). Grafik di atas langsung mengikuti angka yang diketik; tekan <b>Simpan target</b> agar tersimpan. Entitas yang belum diisi targetnya memakai acuan Slovin per level pada kartu Progres Penilaian.</div>
  <div class="sc" style="margin-top:8px"><table class="dkh"><tr><th>Departemen</th>${all.map(e=>`<th class="n" title="${esc(e.nama)}">${esc(e.kode)}</th>`).join('')}<th class="n">Total</th></tr>
  ${depts.map(d=>`<tr data-d="${esc(d)}"><td>${esc(d)}</td>${all.map(e=>`<td class="n"><input type="number" min="0" step="1" style="width:72px" data-dt="${esc(e.kode)}|${esc(d)}" value="${DK.T[e.kode+'|'+d]||''}" aria-label="Target ${esc(d)} ${esc(e.kode)}"></td>`).join('')}<td class="n"><b data-rt="${esc(d)}"></b></td></tr>`).join('')}
  <tr><th>Total</th>${all.map(e=>`<th class="n" data-ct="${esc(e.kode)}"></th>`).join('')}<th class="n" id="dkgt"></th></tr></table></div>
  <div class="row"><button id="dks">Simpan target</button><button class="s" id="dkr">Batalkan perubahan</button><span id="dkm2" class="mu"></span></div>
  <details style="margin-top:10px"><summary><b>Daftar departemen</b> <span class="mu">— juga menjadi pilihan di kuesioner</span></summary>
   <div class="mu" style="margin:6px 0">Satu departemen per baris. Mengubah nama tidak mengubah jawaban yang sudah masuk; departemen lama tetap muncul di dasbor bila sudah punya jawaban atau target.</div>
   <textarea id="dkd" rows="9" style="width:min(520px,100%)">${esc(deptList().join('\n'))}</textarea>
   <div class="row"><button class="s" id="dkds">Simpan daftar departemen</button><button class="g" id="dkdr">Kembalikan ke bawaan</button><span id="dkdm" class="mu"></span></div></details>`;
  box.querySelectorAll('[data-dt]').forEach(i=>i.oninput=()=>{const v=Math.max(0,Math.floor(+i.value||0));DK.T[i.dataset.dt]=v;DK.dirty=true;dkPaint(dkCur());dkSums(all,depts);$('#dkm2').textContent='Belum disimpan'});
  dkSums(all,depts);
  $('#dkr').onclick=()=>{DK.dirty=false;dkInit();vDks()};
  $('#dks').onclick=async()=>{if(DK.busy)return;DK.busy=true;SAVING++;$('#dks').disabled=true;$('#dkm2').textContent='Menyimpan…';
    const rows=Object.keys(DK.T).filter(k=>DK.T[k]>0).map(k=>{const i=k.indexOf('|');return{entitas:k.slice(0,i),departemen:k.slice(i+1),target:DK.T[k]}});
    let r;try{r=await call({action:'saveTargetKs',rows})}catch(e){r={ok:false,error:String(e)}}
    DK.busy=false;SAVING--;const b=$('#dks');if(b)b.disabled=false;
    if(r.ok){D.Target_KS=rows;DK.dirty=false;const m=$('#dkm2');if(m)m.innerHTML='<span class="ok">Tersimpan.</span>'}
    else{const m=$('#dkm2');if(m)m.innerHTML=`<span class="er">${esc(/tidak dikenal/i.test(r.error||'')?'Code.gs di server belum diperbarui (Deploy > New version).':r.error)}</span>`}};
  const dsave=async list=>{const old=D.cfg.deptlist;D.cfg.deptlist=list.join('|');$('#dkdm').textContent='Menyimpan…';const r=await cfgSave();if(r.ok)vDks();else{D.cfg.deptlist=old;$('#dkdm').innerHTML=`<span class="er">${esc(r.error)}</span>`}};
  $('#dkds').onclick=()=>{const l=[...new Set($('#dkd').value.split('\n').map(x=>x.replace(/\|/g,'/').trim()).filter(Boolean))];if(!l.length)return $('#dkdm').textContent='Isi minimal satu departemen.';dsave(l)};
  $('#dkdr').onclick=()=>{if(confirm('Kembalikan daftar departemen ke bawaan?'))dsave([])}}
function dkSums(all,depts){
  let g=0;depts.forEach(d=>{let s=0;all.forEach(e=>s+=DK.T[e.kode+'|'+d]||0);g+=s;const el=document.querySelector(`[data-rt="${CSS.escape(d)}"]`);if(el)el.textContent=s||''});
  all.forEach(e=>{let s=0;depts.forEach(d=>s+=DK.T[e.kode+'|'+d]||0);const el=document.querySelector(`[data-ct="${CSS.escape(e.kode)}"]`);if(el)el.textContent=s||''});const t=$('#dkgt');if(t)t.textContent=g||''}
const dkCur=()=>{const all=activeEnt();return DK.ent==='*'?all:all.filter(e=>e.kode===DK.ent)};

/* Bagian dasbor yang dihitung ulang setiap kali target atau data berubah */
function dkPaint(ents){
  const box=$('#dkp'),qb=$('#dkq');if(!box||!qb)return;
  const M=dkMeta(ents),depts=dkDepts(ents),tg=DK.T,adm=ROLE==='admin',pct=(a,b)=>b?Math.round(a/b*100):0;
  const dn={},en={};M.forEach(m=>{const k=m.entitas+'|'+m.departemen;dn[k]=(dn[k]||0)+m.n;en[m.entitas]=(en[m.entitas]||0)+m.n});
  const total=M.reduce((a,m)=>a+m.n,0);
  let T=0,N=0,dOk=0,dT=0;const drows=depts.map(d=>{let n=0,t=0;ents.forEach(e=>{n+=dn[e.kode+'|'+d]||0;t+=tg[e.kode+'|'+d]||0});T+=t;N+=t?Math.min(...[n,t]):0;if(t){dT++;if(n>=t)dOk++}return[d,n,t]}).filter(r=>r[1]||r[2]);
  const noT=ents.filter(e=>!depts.some(d=>tg[e.kode+'|'+d]>0));
  const days=[...new Set(M.map(m=>m.tanggal))].sort(),last=days.length?days[days.length-1]:null,wk=new Date();wk.setDate(wk.getDate()-6);const wks=wk.toISOString().slice(0,10);
  const w7=M.filter(m=>m.tanggal>=wks).reduce((a,m)=>a+m.n,0);
  const ew=ents.filter(e=>en[e.kode]).length,sisa=T?Math.max(0,T-N):0;
  const kpi=(l,v,s,c)=>`<div class="c"><div class="mu">${l}</div><div class="k ${c||''}">${v}</div><div class="mu">${s}</div></div>`;
  const mx=Math.max(1,...drows.map(r=>Math.max(r[1],r[2]))),ex=ents.map(e=>[e.kode,en[e.kode]||0,depts.reduce((a,d)=>a+(tg[e.kode+'|'+d]||0),0)]),mxe=Math.max(1,...ex.map(r=>Math.max(r[1],r[2])));
  const lv=Object.entries(dkAgg(M,m=>m.level)).sort((a,b)=>b[1]-a[1]),ar=Object.entries(dkAgg(M,m=>String(m.area).split(';').map(x=>x.trim()).filter(Boolean))).sort((a,b)=>b[1]-a[1]),
    jb=adm?Object.entries(dkAgg(M,m=>m.jabatan)).sort((a,b)=>b[1]-a[1]).slice(0,10):[];
  const simple=(rows)=>{const m=Math.max(1,...rows.map(r=>r[1]));return dkBarsH(rows.map(r=>[r[0],r[1],0]),m,(n)=>`<b>${n}</b> <span class="mu">· ${pct(n,total)}%</span>`)};
  const heat=`<div class="sc"><table class="dkh"><tr><th>Departemen</th>${ents.map(e=>`<th class="n" title="${esc(e.nama)}">${esc(e.kode)}</th>`).join('')}<th class="n">Total</th></tr>
   ${depts.filter(d=>drows.some(r=>r[0]===d)).map(d=>`<tr><td>${esc(d)}</td>${ents.map(e=>{const n=dn[e.kode+'|'+d]||0,t=tg[e.kode+'|'+d]||0,r=t?Math.min(1,n/t):n?.35:0;
     return`<td class="n ${n||t?'':'z'}" style="background:color-mix(in srgb,var(--s1) ${Math.round(r*40)}%,transparent)" title="${esc(e.kode)} · ${esc(d)}: ${n}${t?' dari target '+t:''}">${n||t?n+(t?'/'+t+(n>=t?' ✓':''):''):'·'}</td>`}).join('')}<td class="n"><b>${drows.find(r=>r[0]===d)[1]}</b></td></tr>`).join('')}
   <tr><th>Total</th>${ents.map(e=>`<th class="n">${en[e.kode]||0}</th>`).join('')}<th class="n">${total}</th></tr></table></div><div class="mu" style="margin-top:6px">Sel berisi terkumpul/target. Warna makin pekat makin dekat ke target; ✓ = target tercapai; titik = belum ada.</div>`;
  box.innerHTML=`<div class="grid" style="margin-top:12px">
   ${kpi('Responden masuk',total,ents.length>1?`${ew} dari ${ents.length} entitas sudah mengisi`:'entitas ini')}
   ${kpi('Capaian target',T?pct(N,T)+'%':'—',T?`${N} dari target ${T} responden${DK.dirty?' · belum disimpan':''}`:'Target departemen belum diisi',T&&N<T?'er':T?'ok':'')}
   ${kpi('Departemen tercapai',dT?`${dOk}<span class="mu" style="font-size:1rem"> / ${dT}</span>`:'—',dT?`${dT-dOk} departemen masih kurang`:'belum ada target')}
   ${kpi('7 hari terakhir',w7,last?`pengisian terakhir ${dkDay(last)}${T&&w7?` · sisa ±${Math.ceil(sisa/Math.max(1,w7/7))} hari bila laju sama`:''}`:'belum ada pengisian')}</div>
   <div class="c"><h2>Responden per departemen</h2><div class="dkleg"><span class="a">Terkumpul</span><span class="b">Target</span></div>
    ${drows.length?dkBarsH(drows.sort((a,b)=>b[1]-a[1]||b[2]-a[2]),mx):'<div class="mu">Belum ada pengisian atau target.</div>'}
    ${noT.length&&T?`<div class="mu" style="margin-top:8px">Entitas tanpa target departemen (${noT.map(e=>esc(e.kode)).join(', ')}) tidak ikut dalam capaian di atas.</div>`:''}</div>
   <div class="dk3"><div class="c"><h2>Responden per entitas</h2><div class="dkleg"><span class="a">Terkumpul</span><span class="b">Total target departemen</span></div>${dkBarsH(ex,mxe)}</div>
    <div class="c"><h2>Menurut level jabatan</h2>${lv.length?simple(lv):'<div class="mu">Belum ada data.</div>'}</div></div>
   <div class="c"><h2>Tren pengisian</h2>${dkTrend(M,T)}</div>`;
  const rk=(D.KS_Rekap||[]).filter(g=>ents.some(e=>e.kode===g.entitas)),minr=+D.cfg.minresp||1,lvs=LVALL.filter(lvOn);
  const kk=typeof KS_ITEMS!=='undefined'?KS_ITEMS:[];
  const avg=adm?kk.map(it=>{const cells=ents.map(e=>{let s=0,c=0;rk.filter(g=>g.entitas===e.kode&&it.levels.includes(String(g.level).toUpperCase())&&lvOn(g.level)).forEach(g=>{s+=g.sum[it.code]||0;c+=g.cnt[it.code]||0});return c?s/c:null});return{it,cells}}):[];
  qb.innerHTML=`<div class="dk3" style="margin-top:14px"><div class="c"><h2>Area kerja responden</h2><div class="mu" style="margin-bottom:6px">Responden boleh memilih lebih dari satu area, sehingga jumlah bisa melebihi total responden.</div>${ar.length?simple(ar.slice(0,12)):'<div class="mu">Belum ada data.</div>'}</div>
    ${adm?`<div class="c"><h2>Jabatan rinci (10 teratas)</h2>${jb.length?simple(jb):'<div class="mu">Belum ada data.</div>'}</div>`:''}</div>
   <div class="c"><h2>Matriks entitas × departemen</h2>${heat}</div>
   <div class="c"><h2>Kecukupan data untuk skor</h2><div class="mu" style="margin-bottom:6px">Skor kuesioner per item hanya dihitung dari kelompok entitas × level yang minimal berisi <b>${minr}</b> responden (Pengaturan &gt; minimal responden per kelompok). Merah = belum dihitung.</div>
    <div class="sc"><table class="dkh"><tr><th>Entitas</th>${lvs.map(l=>`<th class="n">${esc(l)}</th>`).join('')}</tr>${ents.map(e=>`<tr><td>${esc(e.kode)}</td>${lvs.map(l=>{const g=rk.find(x=>x.entitas===e.kode&&x.level===l),n=g?g.n:0;return`<td class="n ${n<minr?'er':'ok'}" title="${n<minr?'Belum cukup: tidak dihitung ke skor':'Dihitung ke skor'}">${n}</td>`}).join('')}</tr>`).join('')}</table></div></div>
   ${adm?`<div class="c"><h2>Rata-rata jawaban per item <span class="mu" style="font-weight:400">(skala 1–5, sementara)</span></h2><div class="mu" style="margin-bottom:6px">Rata-rata dari semua responden yang menjawab item tersebut pada entitas terpilih (menggabungkan level yang relevan). Hanya terlihat oleh auditor.</div>
    <div class="sc" style="max-height:420px"><table class="dkh"><tr><th>Item</th>${ents.map(e=>`<th class="n">${esc(e.kode)}</th>`).join('')}</tr>${avg.map(a=>`<tr><td title="${esc(a.it.name)}"><b>${esc(a.it.code)}</b> <span class="mu">${esc(String(a.it.name).slice(0,60))}</span></td>${a.cells.map(v=>`<td class="n ${v==null?'z':''}" ${v==null?'':`style="background:color-mix(in srgb,var(--s1) ${Math.round((v-1)/4*45)}%,transparent)"`}>${v==null?'·':v.toFixed(2)}</td>`).join('')}</tr>`).join('')}</table></div></div>`:''}`}

/* Muat ulang otomatis saat dasbor dibuka, kecuali ada target yang sedang diedit */
setInterval(()=>{if(KEY&&D&&TAB==='dks'&&!document.hidden&&!hasUnsaved()&&!window._pl){window._pl=1;load().then(r=>{window._pl=0;if(r.ok&&TAB==='dks'&&!hasUnsaved()){vDks();const e=$('#dkt');if(e)e.textContent='· '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}}).catch(()=>{window._pl=0})}},60000);
