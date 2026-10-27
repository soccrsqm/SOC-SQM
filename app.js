/* SQM COMMAND CENTER — Google Sheets JSONP client
 * Source schema: Code.gs response {success, headers, data, total, updatedAt}
 * MTTD source: MTTD 1 (terhadap Initial Posting)
 */
const GOOGLE_SHEETS_API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
const PAGE_SIZE = 10;
const COLORS = {cyan:"#15d9ff",blue:"#178fff",green:"#00e6ad",red:"#ff537b",orange:"#ffb340",purple:"#b58aff"};

let allRows = [];
let filteredRows = [];
let currentPage = 1;
const charts = {};
const $ = id => document.getElementById(id);

const aliases = {
  sqdt:["SQDT","SQDT NUMBER","SQDT ID","NUMBER OF SQDT","TICKET","INCIDENT ID"],
  date:["DATE/TIME","DATE TIME","DATE","SQDT DATE","TANGGAL","INITIAL POSTING","TIME OPEN","OPEN DATE"],
  severity:["SEVERITY","SQDT SEVERITY"],
  status:["STATUS","STATUS SQDT"],
  rca:["RCA","ROOT CAUSE","ROOT CAUSE ANALYSIS","RCA COMPLETE","RCA COMPLATE"],
  mttr:["MTTR","MTTR (JAM)"],
  mttd:["MTTD 1 (TERHADAP INITIAL POSTING)","MTTD 1","MTTD 1 (TERHADAP INITIAL POSTING) (JAM)","MTTD"],
  traffic:["TRAFFIC LOSS (TB) TOTAL","TRAFFIC LOSS (TB)","TRAFFIC LOSS","TRAFFIC LOSS TOTAL"],
  ceso:["ACHIEVEMENT CESO","ACHIEVEMENT CESO (%)","CESO"]
};

function normKey(v){return String(v??"").trim().toUpperCase().replace(/[_-]+/g," ").replace(/\s+/g," ");}
function getValue(row,field){
  const wanted=aliases[field].map(normKey);
  for(const [k,v] of Object.entries(row)){if(wanted.includes(normKey(k)))return v;}
  return "";
}
function toNumber(value){
  if(typeof value==="number")return value;
  let s=String(value??"").trim().replace(/\s/g,"").replace(/%|TB|jam/gi,"");
  if(!s||s==="-"||s==="—")return NaN;
  if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");
  else if(s.includes(","))s=s.replace(",",".");
  const n=Number(s);return Number.isFinite(n)?n:NaN;
}
function parseDate(value){
  if(value instanceof Date)return value;
  const s=String(value??"").trim();if(!s)return null;
  let m=s.match(/SQDT[-_ ]?(\d{4})(\d{2})(\d{2})/i);
  if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  const d=new Date(s);return isNaN(d.getTime())?null:d;
}
function formatDate(d){return d&&!isNaN(d.getTime())?d.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"—";}
function fmt(n,d=1){return Number.isFinite(n)?n.toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";}
function avg(rows,k){const a=rows.map(r=>r[k]).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;}
function sum(rows,k){return rows.reduce((s,r)=>s+(Number.isFinite(r[k])?r[k]:0),0);}
function pct(n,t){return t?(n/t*100).toFixed(1)+"%":"0.0%";}
function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(message){const el=$("toast");if(!el){console.log(message);return;}el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),4500);}

function normalizeRow(row){
  const sqdt=String(getValue(row,"sqdt")??"").trim();
  const date=parseDate(getValue(row,"date"))||parseDate(sqdt);
  const rawStatus=String(getValue(row,"status")??"").trim();
  let status=rawStatus;
  if(/\bOPEN\b|IN PROGRESS|ONGOING/i.test(rawStatus))status="Open";
  else if(/CLOSE|RESOLVED|COMPLETE/i.test(rawStatus))status="Closed";
  let severity=String(getValue(row,"severity")??"").trim().toUpperCase()||"Unknown";
  const rca=String(getValue(row,"rca")??"").trim()||"Not specified";
  return {...row,_sqdt:sqdt,_date:date,_severity:severity,_status:status||"Unknown",_rca:rca,
    _mttr:toNumber(getValue(row,"mttr")),
    _mttd:toNumber(getValue(row,"mttd")),
    _traffic:toNumber(getValue(row,"traffic")),
    _ceso:toNumber(getValue(row,"ceso"))};
}
function dedupe(rows){
  const seen=new Set();
  return rows.filter(r=>{const id=r._sqdt||JSON.stringify(r);if(seen.has(id))return false;seen.add(id);return true;});
}

function loadData(){
  if(!GOOGLE_SHEETS_API_URL||GOOGLE_SHEETS_API_URL.includes("PASTE_YOUR")){
    $("connectionStatus").textContent="URL belum diatur";
    toast("Isi GOOGLE_SHEETS_API_URL di app.js dengan URL Web App /exec.");
    return Promise.reject(new Error("URL Google Apps Script belum diatur."));
  }
  const btn=$("refreshBtn");if(btn){btn.disabled=true;btn.textContent="Loading…";}
  $("connectionStatus").textContent="Connecting…";
  return new Promise((resolve,reject)=>{
    const callback="sqmCallback_"+Date.now()+"_"+Math.floor(Math.random()*10000);
    const script=document.createElement("script");let finished=false;
    const timeout=setTimeout(()=>finish(new Error("Timeout. Periksa deployment Apps Script dan izin akses.")),30000);
    function finish(error,result){
      if(finished)return;finished=true;clearTimeout(timeout);delete window[callback];script.remove();
      if(btn){btn.disabled=false;btn.textContent="↻ Refresh data";}
      if(error){console.error("Google Sheets:",error);$("connectionStatus").textContent="Connection error";toast("Gagal membaca data: "+error.message);reject(error);return;}
      try{
        if(!result||result.success!==true)throw new Error(result?.error||"Respons API tidak berhasil.");
        if(!Array.isArray(result.data))throw new Error("Respons API tidak memiliki array data.");
        console.log("Google Sheets headers:",result.headers,"total:",result.total);
        allRows=dedupe(result.data.map(normalizeRow).filter(r=>r._sqdt));
        if(result.data.length&&allRows.length===0)throw new Error("Data terbaca tetapi kolom SQDT tidak ditemukan. Cocokkan nama header.");
        populateRCA();setDefaultDates();applyFilters();
        $("connectionStatus").textContent="Connected · "+allRows.length+" records";
        $("lastUpdated").textContent="Last update: "+(result.updatedAt?new Date(result.updatedAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID"));
        toast(allRows.length.toLocaleString("id-ID")+" SQDT berhasil dimuat.");resolve(result);
      }catch(e){$("connectionStatus").textContent="Data error";toast(e.message);reject(e);}
    }
    window[callback]=result=>finish(null,result);
    script.onerror=()=>finish(new Error("Web App gagal diakses. Periksa URL /exec dan akses deployment."));
    const sep=GOOGLE_SHEETS_API_URL.includes("?")?"&":"?";
    script.src=GOOGLE_SHEETS_API_URL+sep+"callback="+encodeURIComponent(callback)+"&_="+Date.now();
    document.head.appendChild(script);
  });
}

function dateInput(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function setDefaultDates(){
  const dates=allRows.map(r=>r._date).filter(Boolean).sort((a,b)=>a-b);if(!dates.length)return;
  const end=dates[dates.length-1],start=new Date(end);start.setDate(start.getDate()-29);
  const compareEnd=new Date(start);compareEnd.setDate(compareEnd.getDate()-1);
  const compareStart=new Date(compareEnd);compareStart.setDate(compareStart.getDate()-29);
  [["dateStart",start],["dateEnd",end],["compareStart",compareStart],["compareEnd",compareEnd]].forEach(([id,d])=>{if($(id)&&!$(id).value)$(id).value=dateInput(d);});
}
function populateRCA(){
  const select=$("rca"),previous=select.value;
  const values=[...new Set(allRows.map(r=>r._rca).filter(Boolean))].sort();
  select.innerHTML='<option value="All">All RCA</option>'+values.map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
  if(values.includes(previous))select.value=previous;
}
function dateRange(a,b){return {start:$(a).value?new Date($(a).value+"T00:00:00"):null,end:$(b).value?new Date($(b).value+"T23:59:59"):null};}
function filterRows(rows,includeDates=true){
  const sev=$("severity").value,status=$("status").value,rca=$("rca").value,search=$("search").value.trim().toLowerCase();
  let out=rows.filter(r=>(sev==="All"||r._severity===sev)&&(status==="All"||r._status.toLowerCase()===status.toLowerCase())&&(rca==="All"||r._rca===rca)&&(!search||r._sqdt.toLowerCase().includes(search)));
  if(includeDates){const {start,end}=dateRange("dateStart","dateEnd");if(start)out=out.filter(r=>r._date&&r._date>=start);if(end)out=out.filter(r=>r._date&&r._date<=end);}
  return out;
}
function applyFilters(){
  filteredRows=filterRows(allRows,true);currentPage=1;renderDashboard(filteredRows);
  let compare=[];
  if($("compareToggle").checked){const {start,end}=dateRange("compareStart","compareEnd");compare=filterRows(allRows,false);if(start)compare=compare.filter(r=>r._date&&r._date>=start);if(end)compare=compare.filter(r=>r._date&&r._date<=end);}
  renderTrend(filteredRows,compare);
  $("compareSummary").textContent=$("compareToggle").checked?`Current ${filteredRows.length} SQDT · Compare ${compare.length} SQDT`:`Compare disabled · ${filteredRows.length} SQDT`;
}

function renderDashboard(rows){
  const open=rows.filter(r=>r._status==="Open").length,closed=rows.filter(r=>r._status==="Closed").length;
  const mttr=avg(rows,"_mttr"),mttd=avg(rows,"_mttd"),traffic=sum(rows,"_traffic"),ceso=avg(rows,"_ceso");
  $("kpiTotal").textContent=rows.length.toLocaleString("id-ID");$("kpiOpen").textContent=open.toLocaleString("id-ID");$("kpiClosed").textContent=closed.toLocaleString("id-ID");
  $("openShare").textContent=pct(open,rows.length)+" dari total";$("closedShare").textContent=pct(closed,rows.length);
  $("openBar").style.width=pct(open,rows.length);$("closedBar").style.width=pct(closed,rows.length);
  $("kpiMttr").innerHTML=`${fmt(mttr)} <small>jam</small>`;$("kpiMttd").innerHTML=`${fmt(mttd)} <small>jam</small>`;
  $("kpiTraffic").innerHTML=`${fmt(traffic)} <small>TB</small>`;$("kpiCeso").textContent=Number.isFinite(ceso)?fmt(ceso)+"%":"—";
  $("cesoBar").style.width=Math.max(0,Math.min(100,Number.isFinite(ceso)?ceso:0))+"%";
  $("cesoRecords").textContent=rows.filter(r=>Number.isFinite(r._ceso)).length+" records";
  renderSeverity(rows);renderStatus(rows);renderRCAChart(rows);renderTime(rows);renderTraffic(rows);renderTable(rows);
}
function chart(id,type,data,options={}){
  if(!window.Chart||!$(id))return;if(charts[id])charts[id].destroy();
  const defaults={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#9fc1d8",boxWidth:10,font:{size:10}}},tooltip:{backgroundColor:"#07182b",borderColor:"#155477",borderWidth:1}},scales:type==="doughnut"?{}:{x:{ticks:{color:"#81a6c1",font:{size:9}},grid:{color:"#153047"}},y:{beginAtZero:true,ticks:{color:"#81a6c1",font:{size:9}},grid:{color:"#153047"}}}};
  charts[id]=new Chart($(id),{type,data,options:{...defaults,...options,plugins:{...defaults.plugins,...(options.plugins||{})}});
}
function renderSeverity(rows){
  const sev=["P1","P2","P3","L1","L2"];
  $("severityCards").innerHTML=sev.map(s=>{const n=rows.filter(r=>r._severity===s).length;return `<div class="severity-card"><div><div class="sev-name sev-${s.toLowerCase()}">${s}</div><small>${pct(n,rows.length)} dari SQDT terfilter</small></div><strong>${n}</strong></div>`;}).join("");
}
function renderStatus(rows){
  const o=rows.filter(r=>r._status==="Open").length,c=rows.filter(r=>r._status==="Closed").length;
  chart("statusChart","doughnut",{labels:["Open","Closed"],datasets:[{data:[o,c],backgroundColor:[COLORS.red,COLORS.green],borderColor:"#07182b",borderWidth:3,hoverOffset:5}]},{cutout:"70%"});
  $("statusFoot").textContent=`Open ${o} (${pct(o,rows.length)}) · Closed ${c} (${pct(c,rows.length)})`;
}
function renderRCAChart(rows){
  const counts={};rows.forEach(r=>counts[r._rca]=(counts[r._rca]||0)+1);
  const e=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  chart("rcaChart","bar",{labels:e.map(x=>x[0].length>22?x[0].slice(0,21)+"…":x[0]),datasets:[{label:"SQDT",data:e.map(x=>x[1]),backgroundColor:COLORS.cyan,borderRadius:4}]},{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{color:"#81a6c1"},grid:{color:"#153047"}},y:{ticks:{color:"#9fc1d8",font:{size:9}},grid:{display:false}}}});
}
function renderTime(rows){
  const a=avg(rows,"_mttr"),b=avg(rows,"_mttd");
  chart("timeChart","bar",{labels:["MTTR","MTTD 1"],datasets:[{label:"Average (jam)",data:[Number.isFinite(a)?a:0,Number.isFinite(b)?b:0],backgroundColor:[COLORS.orange,COLORS.purple],borderRadius:5,barThickness:32}]});
}
function groupDate(rows,field){
  const grouped={};rows.forEach(r=>{if(!r._date)return;const k=dateInput(r._date);grouped[k]=(grouped[k]||0)+(Number.isFinite(r[field])?r[field]:0);});
  return grouped;
}
function renderTraffic(rows){
  const g=groupDate(rows,"_traffic"),e=Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
  chart("trafficChart","bar",{labels:e.map(x=>{const d=new Date(x[0]+"T00:00:00");return d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"});}),datasets:[{label:"Traffic Loss (TB)",data:e.map(x=>x[1]),backgroundColor:COLORS.cyan,borderRadius:3}]});
}
function renderTrend(current,compare){
  const a=groupDate(current,"_mttr"); // overwritten below with SQDT count by date
  function counts(rows){const g={};rows.forEach(r=>{if(r._date){const k=dateInput(r._date);g[k]=(g[k]||0)+1;}});return g;}
  const c=counts(current),p=counts(compare),keys=[...new Set([...Object.keys(c),...Object.keys(p)])].sort().slice(-30);
  chart("trendChart","line",{labels:keys.map(k=>new Date(k+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short"})),datasets:[{label:"Current",data:keys.map(k=>c[k]||0),borderColor:COLORS.cyan,backgroundColor:"#15d9ff22",fill:true,tension:.35,pointRadius:2},{label:"Compare",data:keys.map(k=>p[k]||0),borderColor:COLORS.purple,borderDash:[5,4],fill:false,tension:.35,pointRadius:1}]});
}
function renderTable(rows){
  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));currentPage=Math.min(currentPage,pages);
  const start=(currentPage-1)*PAGE_SIZE,subset=rows.slice(start,start+PAGE_SIZE);
  $("rowCount").textContent=rows.length.toLocaleString("id-ID")+" rows";
  $("pageLabel").textContent=`Page ${currentPage} / ${pages}`;
  $("tableSummary").textContent=`Showing ${rows.length?start+1:0}–${Math.min(start+PAGE_SIZE,rows.length)} of ${rows.length} records`;
  $("tableBody").innerHTML=subset.length?subset.map((r,i)=>`<tr><td>${start+i+1}</td><td>${escapeHTML(r._sqdt)}</td><td>${formatDate(r._date)}</td><td><span class="tag tag-${r._severity.toLowerCase()}">${escapeHTML(r._severity)}</span></td><td><span class="tag ${r._status==="Open"?"tag-open":"tag-closed"}">${escapeHTML(r._status)}</span></td><td title="${escapeHTML(r._rca)}">${escapeHTML(r._rca)}</td><td>${fmt(r._mttr)}</td><td>${fmt(r._mttd)}</td><td>${fmt(r._traffic)}</td><td>${Number.isFinite(r._ceso)?fmt(r._ceso)+"%":"—"}</td></tr>`).join(""):'<tr><td colspan="10" class="empty">Tidak ada data sesuai filter.</td></tr>';
}
function exportCSV(){
  const header=["SQDT","Date","Severity","Status","RCA","MTTR","MTTD 1 (terhadap Initial Posting)","Traffic Loss (TB)","Achievement CESO"];
  const rows=filteredRows.map(r=>[r._sqdt,r._date?dateInput(r._date):"",r._severity,r._status,r._rca,r._mttr,r._mttd,r._traffic,r._ceso]);
  const csv=[header,...rows].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="sqm-command-center-filtered.csv";a.click();URL.revokeObjectURL(url);
}
$("applyBtn").addEventListener("click",applyFilters);
$("resetBtn").addEventListener("click",()=>{$("severity").value="All";$("status").value="All";$("rca").value="All";$("search").value="";$("compareToggle").checked=true;["dateStart","dateEnd","compareStart","compareEnd"].forEach(id=>$(id).value="");setDefaultDates();applyFilters();});
$("refreshBtn").addEventListener("click",()=>loadData().catch(()=>{}));
$("exportBtn").addEventListener("click",exportCSV);
$("prevBtn").addEventListener("click",()=>{if(currentPage>1){currentPage--;renderTable(filteredRows);}});
$("nextBtn").addEventListener("click",()=>{if(currentPage<Math.ceil(filteredRows.length/PAGE_SIZE)){currentPage++;renderTable(filteredRows);}});
$("search").addEventListener("input",applyFilters);
$("compareToggle").addEventListener("change",applyFilters);
["severity","status","rca","dateStart","dateEnd","compareStart","compareEnd"].forEach(id=>$(id).addEventListener("change",applyFilters));
loadData().catch(()=>{});
