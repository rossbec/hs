/*  Script principal pour le simulateur
    - Chart.js pour graphiques
    - html2canvas + jsPDF pour PDF haute résolution
    - Export CSV (Blob download)
*/

/* -------------------------
   Translations (FR / EN)
   ------------------------- */
const translations = {
  fr: {
    slogan: "Un nouvel Horizon pour vos placements",
    mainTitle: "Simulateur d'Intérêt Composé",
    heroP: "Visualisez la croissance potentielle de vos investissements avec notre calculateur professionnel",
    formTitle: "Paramètres d'investissement (en FCFA)",
    labelInitial: "Montant initial",
    labelMonthly: "Contribution mensuelle",
    labelRate: "Taux d'intérêt annuel (%)",
    labelVariance: "Variance du taux (±% ex: 1 = ±1%)",
    labelYears: "Durée (années)",
    labelFreq: "Fréquence de capitalisation",
    btnCalc: "Calculer",
    btnReset: "Réinitialiser",
    btnPDF: "Exporter PDF (haute résolution)",
    btnCSV: "Exporter CSV (détails annuels)",
    fv: "Valeur future",
    tc: "Total contributions",
    ie: "Intérêts gagnés",
    tabArea: "Vue en aires",
    tabLine: "Vue détaillée",
    legal: "Avertissement: Ce calculateur est fourni à titre indicatif uniquement. Les résultats sont des projections basées sur les paramètres saisis et ne constituent pas une garantie de rendement futur. Les performances passées ne préjugent pas des performances futures. Pour des conseils d'investissement personnalisés, veuillez contacter Harvest Asset Management."
  },
  en: {
    slogan: "A new horizon for your investment",
    mainTitle: "Compound Interest Simulator",
    heroP: "Visualize the potential growth of your investments with our professional calculator",
    formTitle: "Investment parameters (in XAF)",
    labelInitial: "Initial amount",
    labelMonthly: "Monthly contribution",
    labelRate: "Annual interest rate (%)",
    labelVariance: "Rate variance (±% e.g. 1 = ±1%)",
    labelYears: "Duration (years)",
    labelFreq: "Compounding frequency",
    btnCalc: "Calculate",
    btnReset: "Reset",
    btnPDF: "Export PDF (high resolution)",
    btnCSV: "Export CSV (annual breakdown)",
    fv: "Future value",
    tc: "Total contributions",
    ie: "Interest earned",
    tabArea: "Area view",
    tabLine: "Detailed view",
    legal: "Warning: Simulations provided are indicative and do not constitute a guarantee of return. Past performance is not indicative of future results. For more advices, please refer to The Harvest Asset Management."
  }
};

/* -------------------------
   Helpers & DOM refs
   ------------------------- */
const $ = id => document.getElementById(id);

// DOM elements collected
const els = {
  langButtons: document.querySelectorAll('.lang-toggle button'),
  slogan: $('slogan'),
  mainTitle: $('main-title'),
  heroP: $('hero-p'),
  formTitle: $('form-title'),
  labelInitial: $('label-initial'),
  labelMonthly: $('label-monthly'),
  labelRate: $('label-rate'),
  labelVariance: $('label-variance'),
  labelYears: $('label-years'),
  labelFreq: $('label-freq'),
  btnCalc: $('calculate'),
  btnReset: $('reset'),
  btnPDF: $('exportPdf'),
  btnCSV: $('exportCsv'),
  fv: $('fv'),
  tc: $('tc'),
  ie: $('ie'),
  tabArea: $('tab-area'),
  tabLine: $('tab-line'),
  legal: $('legal'),
  year: $('year'),
  // analysis
  a_initial: $('a-initial'),
  a_monthly: $('a-monthly'),
  a_rate: $('a-rate'),
  a_variance: $('a-variance'),
  a_years: $('a-years'),
  a_freq: $('a-freq'),
  a_fv: $('a-fv'),
  a_tc: $('a-tc'),
  a_ie: $('a-ie'),
  a_ret: $('a-ret')
};

let lang = 'fr';
function applyLang(l){
  lang = l;
  const t = translations[l];
  els.slogan.textContent = t.slogan;
  els.mainTitle.textContent = t.mainTitle;
  els.heroP.textContent = t.heroP;
  els.formTitle.textContent = t.formTitle;
  els.labelInitial.textContent = t.labelInitial;
  els.labelMonthly.textContent = t.labelMonthly;
  els.labelRate.textContent = t.labelRate;
  els.labelVariance.textContent = t.labelVariance;
  els.labelYears.textContent = t.labelYears;
  els.labelFreq.textContent = t.labelFreq;
  els.btnCalc.textContent = t.btnCalc;
  els.btnReset.textContent = t.btnReset;
  els.btnPDF.textContent = t.btnPDF;
  els.btnCSV.textContent = t.btnCSV;
  document.getElementById('label-fv').textContent = t.fv;
  document.getElementById('label-tc').textContent = t.tc;
  document.getElementById('label-ie').textContent = t.ie;
  els.tabArea.textContent = t.tabArea;
  els.tabLine.textContent = t.tabLine;
  els.legal.textContent = t.legal;

  els.langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === l));
}
els.langButtons.forEach(btn => btn.addEventListener('click', () => applyLang(btn.dataset.lang)));
applyLang(lang);

document.getElementById('year').textContent = new Date().getFullYear();

/* -------------------------
   Maths & Simulation
   ------------------------- */
function freqMap(key){ return { daily:365, monthly:12, quarterly:4, semiannual:2, annual:1 }[key] || 12; }

// simulate returns array of yearly snapshots
function simulate(initial, monthly, annualRatePct, years, freqKey){
  const nPerYear = freqMap(freqKey);
  const totalPeriods = Math.round(years * nPerYear);
  const rPeriod = (annualRatePct/100)/nPerYear;
  let balance = Number(initial) || 0;
  const contribPerPeriod = (Number(monthly)||0) * 12 / nPerYear;
  const snapshots = [];
  for(let p=1;p<=totalPeriods;p++){
    balance += contribPerPeriod;                 // contribution at start of period
    balance *= (1 + rPeriod);                    // interest for period
    if(p % nPerYear === 0){
      const year = p / nPerYear;
      const totalContrib = Number(initial) + (Number(monthly)||0)*12*(year);
      snapshots.push({
        year,
        total: Number(balance.toFixed(2)),
        contributions: Number(totalContrib.toFixed(2)),
        interest: Number((balance - totalContrib).toFixed(2))
      });
    }
  }
  return snapshots;
}

/* -------------------------
   Chart.js setup
   ------------------------- */
const ctx = $('chart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    maintainAspectRatio: true,
    plugins:{
      legend:{display:true, labels:{color:'#e6eef6'}},
      tooltip:{mode:'index', intersect:false}
    },
    scales:{
      x:{ ticks:{color:'#cbd5e1'} },
      y:{ ticks:{color:'#cbd5e1'}, beginAtZero:true }
    }
  }
});

function formatXAF(n){ return Number(n).toLocaleString('fr-FR') + ' FCFA'; }

/* -------------------------
   UI update function
   ------------------------- */
function updateAll(){
  const initial = Number($('initial').value) || 0;
  const monthly = Number($('monthly').value) || 0;
  const rate = Number($('rate').value) || 0;
  const variance = Number($('variance').value) || 0;
  const years = Math.max(1, Number($('years').value) || 1);
  const freq = $('freq').value;

  const lowRate = Math.max(0, rate - variance);
  const highRate = rate + variance;

  const simBase = simulate(initial, monthly, rate, years, freq);
  const simLow = simulate(initial, monthly, lowRate, years, freq);
  const simHigh = simulate(initial, monthly, highRate, years, freq);

  const last = simBase[simBase.length - 1] || { total:0, contributions:0, interest:0 };

  $('fv').textContent = formatXAF(last.total);
  $('tc').textContent = formatXAF(last.contributions);
  $('ie').textContent = formatXAF(last.interest);

  els.a_initial.textContent = initial.toLocaleString();
  els.a_monthly.textContent = monthly.toLocaleString();
  els.a_rate.textContent = rate.toFixed(2);
  els.a_variance.textContent = variance.toFixed(2);
  els.a_years.textContent = years;
  els.a_freq.textContent = $('freq').selectedOptions[0].textContent;
  els.a_fv.textContent = last.total.toLocaleString();
  els.a_tc.textContent = last.contributions.toLocaleString();
  els.a_ie.textContent = last.interest.toLocaleString();
  const rendement = last.contributions ? (((last.total - last.contributions) / last.contributions) * 100) : 0;
  els.a_ret.textContent = rendement.toFixed(2);

  const labels = simBase.map(s => 'Année ' + s.year);
  const dsBase = simBase.map(s => s.total);
  const dsContrib = simBase.map(s => s.contributions);
  const dsInterest = simBase.map(s => s.interest);

  chart.data.labels = labels;
  chart.data.datasets = [
    { label: 'Contributions (base)', data: dsContrib, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.12)', fill:true, tension:0.3, pointRadius:0 },
    { label: 'Intérêts (base)', data: dsInterest, borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.12)', fill:true, tension:0.3, pointRadius:0 },
    { label: 'Valeur totale (neutre)', data: dsBase, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.06)', fill:false, tension:0.2, pointRadius:0 },
    { label: 'Valeur (pessimiste)', data: simLow.map(s=>s.total), borderColor:'#ff6b6b', borderDash:[6,4], fill:false, tension:0.2, pointRadius:0 },
    { label: 'Valeur (optimiste)', data: simHigh.map(s=>s.total), borderColor:'#ffd166', borderDash:[6,4], fill:false, tension:0.2, pointRadius:0 }
  ];
  chart.update();

  // store last simulation in dataset for export CSV convenience
  chart._simSnapshots = { simBase, simLow, simHigh };
}

/* -------------------------
   Events & UX
   ------------------------- */
$('calculate').addEventListener('click', (e) => { e.preventDefault(); updateAll(); });

$('reset').addEventListener('click', () => {
  $('initial').value = 0;
  $('monthly').value = 0;
  $('rate').value = 0;
  $('variance').value = 0;
  $('years').value = 0;
  $('freq').value = 'monthly';
  updateAll();
});

// live updates
['initial','monthly','rate','variance','years','freq'].forEach(id=>{
  document.getElementById(id).addEventListener('input', updateAll);
  document.getElementById(id).addEventListener('change', updateAll);
});

// tabs behavior
$('tab-area').addEventListener('click', ()=>{
  $('tab-area').classList.add('active'); $('tab-line').classList.remove('active');
  chart.data.datasets.forEach((d,i)=>{
    if(i===0||i===1) d.fill = true; else d.fill = false;
  });
  chart.update();
});
$('tab-line').addEventListener('click', ()=>{
  $('tab-line').classList.add('active'); $('tab-area').classList.remove('active');
  chart.data.datasets.forEach((d)=> d.fill = false);
  chart.update();
});

/* -------------------------
   PDF export (high resolution)
   ------------------------- */
$('exportPdf').addEventListener('click', async () => {
  const el = document.querySelector('.wrap');
  const scale = 2; // increase for better resolution
  const canvas = await html2canvas(el, { scale, useCORS:true, allowTaint:true, backgroundColor:null });
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation:'portrait', unit:'pt', format:'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const w = imgWidth * ratio;
  const h = imgHeight * ratio;
  pdf.addImage(imgData, 'PNG', (pdfWidth - w)/2, 20, w, h);
  pdf.save('rapport-simulation-harvest.pdf');
});

/* -------------------------
   CSV export (annual breakdown)
   ------------------------- */
$('exportCsv').addEventListener('click', () => {
  const sim = chart._simSnapshots ? chart._simSnapshots.simBase : null;
  if(!sim || !sim.length){
    alert('Générer d\'abord la simulation (Calculer).');
    return;
  }
  // header
  const headers = ['Année','Montant total (FCFA)','Contributions cumulées (FCFA)','Intérêts (FCFA)'];
  const rows = sim.map(s => [s.year, s.total, s.contributions, s.interest]);
  // build CSV content
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulation-harvest.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* -------------------------
   Init
   ------------------------- */
window.addEventListener('load', () => {
  updateAll();
});
