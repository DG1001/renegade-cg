'use strict';

/* =========================================================================
   Renegade · Schwerpunkt & Beladung (PWA)
   Daten aus Flug- und Betriebshandbuch RENEGADE, Rev. 2-07, Kap. 3.
   Bezugslinie = Mitte der vorderen Hauptfahrwerksstrebe.
   Massen vor der Bezugslinie -> negativer Hebelarm.
   ========================================================================= */

const STORE_KEY = 'renegade-cg-v1';

// Werkseinstellungen laut Handbuch (editierbar)
const DEFAULTS = {
  name: 'Renegade',
  mtow: 472.5,        // kg  (Kap. 3.3)
  maxBag: 10,         // kg  (Gepäckfach, Kap. 3.3)
  cgFwd: 0.340,       // m   (Schwerpunktgrenzen 3.2)
  cgAft: 0.440,       // m
  emptyCgTarget: 0.215,
  emptyCgTol: 0.040,
  fuelDensity: 0.72,  // kg/l (Mogas, Richtwert)
  // Leerwerte (Beispiel D-MXXX; vom Nutzer mit Wägebericht zu überschreiben)
  emptyMass: 275.0,
  emptyCg: 0.215,
  // Hebelarme [m] der Zuladungspositionen (Tab. 3.1.1.a–c)
  arms: {
    pilot:     1.000,
    pax:       0.300,
    fuel:      0.250,
    collector:-0.600,
    baggage:   1.450
  },
  // eingegebene Zuladung
  loads: { pilot:0, pax:0, fuel:0, collector:0, baggage:0, fuelL:0 },
  // Wägung
  weigh: { left:'', right:'', tail:'', dist:'' }
};

const LOAD_DEFS = [
  { id:'pilot',     name:'Pilot',               note:'Sitz hinten · bei Einsitzig = PIC' },
  { id:'pax',       name:'Passagier',           note:'Sitz vorne' },
  { id:'fuel',      name:'Kraftstoff Hauptank', note:'', fuel:true },
  { id:'collector', name:'Kraftstoff-Sammeltank', note:'vor Bezugslinie' },
  { id:'baggage',   name:'Gepäck',              note:'max. 10 kg', max:'maxBag' }
];

/* ---------- State ---------- */
let S = load();

function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return deepMerge(structuredClone(DEFAULTS), raw);
  }catch(e){ return structuredClone(DEFAULTS); }
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
function deepMerge(base, ov){
  for(const k in ov){
    if(ov[k] && typeof ov[k]==='object' && !Array.isArray(ov[k])) deepMerge(base[k]=base[k]||{}, ov[k]);
    else base[k]=ov[k];
  }
  return base;
}

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const num = v => { const n = parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; };
const fmt = (n,d=2) => isFinite(n) ? n.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}) : '–';

/* ============================ BELADUNG ============================ */
function renderLoadRows(){
  const wrap = $('#loadRows');
  wrap.innerHTML = '';
  LOAD_DEFS.forEach(def => {
    const row = document.createElement('div');
    row.className = 'lrow';
    const arm = S.arms[def.id];
    let inputs = `<div class="field lin">
      <div class="inwrap"><input data-load="${def.id}" type="number" inputmode="decimal" step="0.5" value="${S.loads[def.id]||''}"><i>kg</i></div></div>`;
    if(def.fuel){
      inputs = `<label class="field lin"><span>Liter</span>
          <div class="inwrap"><input data-fuell type="number" inputmode="decimal" step="1" value="${S.loads.fuelL||''}"><i>l</i></div></label>
        <label class="field lin"><span>kg</span>
          <div class="inwrap"><input data-load="fuel" type="number" inputmode="decimal" step="0.5" value="${S.loads.fuel||''}"><i>kg</i></div></label>`;
    }
    row.innerHTML = `<div class="lname"><b>${def.name}</b><small>${def.note?def.note+' · ':''}Hebelarm ${fmt(arm,3)} m</small></div>${inputs}`;
    if(def.fuel) row.style.flexWrap='wrap';
    wrap.appendChild(row);
  });

  wrap.querySelectorAll('input[data-load]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const id = e.target.dataset.load;
      S.loads[id] = num(e.target.value);
      if(id==='fuel'){ // kg manuell -> Liter mitführen
        const lf = wrap.querySelector('input[data-fuell]');
        S.loads.fuelL = S.fuelDensity? +(S.loads.fuel/S.fuelDensity).toFixed(1):0;
        if(lf && document.activeElement!==lf) lf.value = S.loads.fuelL||'';
      }
      compute(); save();
    });
  });
  const lf = wrap.querySelector('input[data-fuell]');
  if(lf) lf.addEventListener('input', e=>{
    S.loads.fuelL = num(e.target.value);
    S.loads.fuel = +(S.loads.fuelL * S.fuelDensity).toFixed(1);
    const kg = wrap.querySelector('input[data-load="fuel"]');
    if(kg) kg.value = S.loads.fuel||'';
    compute(); save();
  });
}

function compute(){
  const em = num($('#emptyMass').value);
  const ec = num($('#emptyCg').value);
  S.emptyMass = em; S.emptyCg = ec;

  const items = [{name:'Leermasse', w:em, arm:ec}];
  LOAD_DEFS.forEach(d=> items.push({name:d.name, w:num(S.loads[d.id]), arm:S.arms[d.id]}));

  let totW=0, totM=0;
  items.forEach(it=>{ totW+=it.w; totM+=it.w*it.arm; });
  const cg = totW>0 ? totM/totW : 0;

  // Ausgabe
  $('#totMass').textContent = fmt(totW,1);
  $('#totCg').textContent   = totW>0 ? fmt(cg,3) : '–';
  $('#massSub').textContent = `MTOW ${fmt(S.mtow,1)} kg`;
  $('#cgSub').textContent   = `${fmt(S.cgFwd,3)} – ${fmt(S.cgAft,3)} m`;

  // Checks
  const errs = [];
  if(totW > S.mtow + 1e-6) errs.push(`Abflugmasse überschritten (+${fmt(totW-S.mtow,1)} kg)`);
  if(totW>0 && cg < S.cgFwd - 1e-9) errs.push(`Schwerpunkt zu weit vorne (${fmt(cg,3)} m)`);
  if(totW>0 && cg > S.cgAft + 1e-9) errs.push(`Schwerpunkt zu weit hinten (${fmt(cg,3)} m)`);
  if(num(S.loads.baggage) > S.maxBag + 1e-6) errs.push(`Gepäck über ${fmt(S.maxBag,0)} kg`);

  const box = $('#statusBox');
  if(totW<=0){ box.className='status'; box.textContent='Werte eingeben …'; }
  else if(errs.length){
    box.className='status bad';
    box.innerHTML = '✖ Nicht innerhalb der Grenzen<ul>'+errs.map(e=>`<li>${e}</li>`).join('')+'</ul>';
  } else {
    box.className='status ok';
    box.textContent='✔ Innerhalb aller Grenzen';
  }

  // Gepäck-Warnfarbe
  document.querySelectorAll('.lrow').forEach(r=>{
    const i=r.querySelector('input[data-load="baggage"]');
    if(i) r.classList.toggle('warnrow', num(i.value)>S.maxBag+1e-6);
  });

  drawGauges(totW, cg);
  drawTable(items, totW, totM, cg);
}

function drawGauges(totW, cg){
  // CG-Hülle: Anzeigebereich = Grenzen + 0,03 m Rand
  const pad = 0.03;
  const lo = S.cgFwd - pad, hi = S.cgAft + pad, span = hi-lo;
  const pct = x => Math.max(0,Math.min(100, (x-lo)/span*100));
  $('#cgBand').style.left  = pct(S.cgFwd)+'%';
  $('#cgBand').style.width = (pct(S.cgAft)-pct(S.cgFwd))+'%';
  $('#tickMin').textContent = fmt(S.cgFwd,3)+' m';
  $('#tickMax').textContent = fmt(S.cgAft,3)+' m';
  $('#cgRangeTxt').textContent = totW>0 ? fmt(cg,3)+' m' : '';
  const mk = $('#cgMarker');
  if(totW>0){ mk.style.display='block'; mk.style.left=pct(cg)+'%'; $('#cgMarkerTxt').textContent=fmt(cg,3); }
  else mk.style.display='none';

  const mp = S.mtow>0 ? totW/S.mtow*100 : 0;
  const fill = $('#massFill');
  fill.style.width = Math.min(100,mp)+'%';
  fill.classList.toggle('over', totW>S.mtow+1e-6);
  $('#massPctTxt').textContent = totW>0 ? Math.round(mp)+' % MTOW' : '';
}

function drawTable(items, totW, totM, cg){
  let h = '<tr><th>Position</th><th>kg</th><th>Hebel m</th><th>Moment mkg</th></tr>';
  items.forEach(it=>{
    if(it.w===0 && it.name!=='Leermasse') return;
    h += `<tr><td>${it.name}</td><td>${fmt(it.w,1)}</td><td>${fmt(it.arm,3)}</td><td>${fmt(it.w*it.arm,2)}</td></tr>`;
  });
  h += `<tr class="sum"><td>Flug</td><td>${fmt(totW,1)}</td><td>${totW>0?fmt(cg,3):'–'}</td><td>${fmt(totM,2)}</td></tr>`;
  $('#momTable').innerHTML = h;
}

/* ============================ WÄGUNG ============================ */
function computeWeigh(){
  const l=num($('#wLeft').value), r=num($('#wRight').value), t=num($('#wTail').value), d=num($('#wDist').value);
  S.weigh={left:$('#wLeft').value,right:$('#wRight').value,tail:$('#wTail').value,dist:$('#wDist').value};
  const mass=l+r+t;
  const cg = mass>0 ? (t*d)/mass : 0;
  $('#wMass').textContent = mass>0?fmt(mass,1):'–';
  $('#wCg').textContent   = (mass>0&&d>0)?fmt(cg,3):'–';
  $('#wCgSub').textContent = `Soll ${fmt(S.emptyCgTarget,3)} ± ${fmt(S.emptyCgTol,3)} m`;
  const box=$('#wStatus');
  if(mass<=0||d<=0){ box.className='status'; box.textContent='Werte eingeben …'; }
  else if(Math.abs(cg-S.emptyCgTarget)<=S.emptyCgTol+1e-9){ box.className='status ok'; box.textContent='✔ Leerschwerpunkt im Sollbereich'; }
  else { box.className='status bad'; box.textContent=`✖ Leerschwerpunkt außerhalb (${fmt(cg,3)} m)`; }
  $('#applyEmpty').dataset.mass=mass; $('#applyEmpty').dataset.cg=cg;
  save();
}

/* ============================ SETTINGS ============================ */
function openSettings(){
  $('#setName').value=S.name; $('#setMtow').value=S.mtow; $('#setMaxBag').value=S.maxBag;
  $('#setCgFwd').value=S.cgFwd; $('#setCgAft').value=S.cgAft; $('#setFuelDensity').value=S.fuelDensity;
  const a=$('#armRows'); a.innerHTML='';
  LOAD_DEFS.forEach(d=>{
    a.insertAdjacentHTML('beforeend',
      `<label class="field"><span>${d.name}</span><div class="inwrap"><input data-arm="${d.id}" type="number" step="0.001" value="${S.arms[d.id]}"><i>m</i></div></label>`);
  });
  $('#settings').hidden=false;
}
function saveSettings(){
  S.name=$('#setName').value||'Renegade';
  S.mtow=num($('#setMtow').value); S.maxBag=num($('#setMaxBag').value);
  S.cgFwd=num($('#setCgFwd').value); S.cgAft=num($('#setCgAft').value);
  S.fuelDensity=num($('#setFuelDensity').value)||0.72;
  document.querySelectorAll('input[data-arm]').forEach(i=> S.arms[i.dataset.arm]=num(i.value));
  $('#acftName').textContent=S.name;
  $('#settings').hidden=true; save(); renderLoadRows(); compute();
}

/* ============================ INIT ============================ */
function init(){
  $('#acftName').textContent=S.name;
  $('#emptyMass').value=S.emptyMass;
  $('#emptyCg').value=S.emptyCg;
  $('#wLeft').value=S.weigh.left; $('#wRight').value=S.weigh.right;
  $('#wTail').value=S.weigh.tail; $('#wDist').value=S.weigh.dist;

  renderLoadRows();
  $('#emptyMass').addEventListener('input', ()=>{compute();save();});
  $('#emptyCg').addEventListener('input', ()=>{compute();save();});
  ['#wLeft','#wRight','#wTail','#wDist'].forEach(s=>$(s).addEventListener('input',computeWeigh));

  // Tabs
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    $('#tab-'+t.dataset.tab).classList.add('active');
  }));

  // Settings
  $('#settingsBtn').addEventListener('click',openSettings);
  $('#closeSettings').addEventListener('click',()=>$('#settings').hidden=true);
  $('#saveSettings').addEventListener('click',saveSettings);
  $('#resetDefaults').addEventListener('click',()=>{
    if(confirm('Alle Einstellungen und Eingaben auf Handbuch-Standard zurücksetzen?')){
      localStorage.removeItem(STORE_KEY); location.reload();
    }
  });

  // Wägung übernehmen
  $('#applyEmpty').addEventListener('click',e=>{
    const m=num(e.target.dataset.mass), c=num(e.target.dataset.cg);
    if(m>0){ S.emptyMass=+m.toFixed(1); S.emptyCg=+c.toFixed(3);
      $('#emptyMass').value=S.emptyMass; $('#emptyCg').value=S.emptyCg;
      compute(); save();
      document.querySelector('.tab[data-tab="load"]').click();
    }
  });

  compute(); computeWeigh();

  // Install prompt
  let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').hidden=false;});
  $('#installBtn').addEventListener('click',async()=>{ if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;$('#installBtn').hidden=true;}});
  window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;$('#installState').textContent='App installiert ✔';});

  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init();
