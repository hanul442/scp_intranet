/* ════════════════════════════════════════════
   문서 개인 메모 — 문서마다 본인만 보는 메모 (자동 저장)
   기록: store "dnote_<user>" = {문서id: {t, at}}
   ════════════════════════════════════════════ */
const dnKey=()=>"dnote_"+S.user, dnAll=()=>store.get(dnKey(),{});
function dnSave(id,t){ const A=dnAll(); if(t.trim()) A[id]={t,at:Date.now()}; else delete A[id]; store.set(dnKey(),A); return A[id] }
function docNoteBox(id){
  const n=dnAll()[id];
  return `<details class="dnote" ${n?"open":""}><summary>내 메모 ${n?`<span class="dim2">· ${fmtDate(n.at).slice(0,16)}</span>`:`<span class="dim2">· 이 문서에 나만 보는 메모 남기기</span>`}</summary>
    <label class="sr" for="dnin">${id} 메모</label><textarea id="dnin" class="memo" rows="4" maxlength="3000" data-dn="${id}" placeholder="격리 절차 요점, 관련 문서 번호, 할 일 등. 다른 직원에게는 보이지 않습니다.">${esc(n?n.t:"")}</textarea>
    <div class="dim2 memost" id="dnst">${n?"자동 저장됨":"입력하면 자동 저장됩니다."}</div></details>`;
}
/* 메모를 남긴 문서 목록 (#notes 화면 아래) */
function docNoteList(){
  const L=Object.entries(dnAll()).filter(([id])=>SCP[id]).sort((a,b)=>b[1].at-a[1].at);
  return `<h3 class="ph" style="margin-top:24px">문서 <span>메모</span> ${L.length?`<span class="dim2" style="font-size:12px">${L.length}건</span>`:""}</h3>
  ${L.length?`<table><tr><th>항목</th><th>메모</th><th class="hm">수정</th></tr>${L.map(([id,n])=>`<tr class="row" data-href="#${id.toLowerCase()}"><td style="white-space:nowrap">${rowLink("#"+id.toLowerCase(),id)}<div>${badge(SCP[id])}</div></td>
    <td class="dim dnprev">${esc(n.t.slice(0,140))}${n.t.length>140?"…":""}</td><td class="dim2 hm" style="white-space:nowrap">${fmtDate(n.at).slice(0,16)}</td></tr>`).join("")}</table>`
  :`<div class="empty">메모를 남긴 문서가 없습니다. 문서 아래 '내 메모'를 펼쳐 적으면 여기에 모입니다.</div>`}`;
}
let dnTimer=0;
function dnFlush(el){ clearTimeout(dnTimer); const n=dnSave(el.dataset.dn,el.value); const s=$("#dnst"); if(s) s.textContent=n?"저장됨 "+fmtDate(n.at).slice(11,16):"메모를 지웠습니다." }
document.addEventListener("input",e=>{ const el=e.target; if(!el.dataset||!el.dataset.dn) return; clearTimeout(dnTimer); dnTimer=setTimeout(()=>dnFlush(el),500) });
document.addEventListener("change",e=>{ const el=e.target; if(el.dataset&&el.dataset.dn) dnFlush(el) });
