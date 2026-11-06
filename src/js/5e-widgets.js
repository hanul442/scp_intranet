/* ════════════════════════════════════════════
   개인 업무 공간 — 할 일 · 메모 + 대시보드 위젯 설정(표시·순서)
   기록: store "todo_<user>" = [{id,t,done,at}] · "memo_<user>" = {t,at} · "widgets_<user>" = {order,hide}
   ════════════════════════════════════════════ */
const WIDGET_LIST=[["att","근태"],["todo","할 일"],["memo","메모"],["cal","다가오는 일정"],["menu","오늘의 식단"],["bday","오늘의 생일"],["poll","사내 설문"]];
const wKey=()=>"widgets_"+S.user;
function wSet(){
  const s=store.get(wKey(),null)||{}, ids=WIDGET_LIST.map(w=>w[0]);
  const order=(s.order||[]).filter(id=>ids.includes(id)); ids.forEach(id=>{ if(!order.includes(id)) order.push(id) });
  return {order, hide:(s.hide||[]).filter(id=>ids.includes(id))};
}
const todoKey=()=>"todo_"+S.user, todos=()=>store.get(todoKey(),[]), todoSave=a=>store.set(todoKey(),a);
const memoKey=()=>"memo_"+S.user, memo=()=>store.get(memoKey(),{t:"",at:0});

function todoItem(t){
  return `<li class="todo ${t.done?"done":""}"><label><input type="checkbox" data-todo="${t.id}" ${t.done?"checked":""}> <span>${esc(t.t)}</span></label>
    <button type="button" class="tdel" data-tododel="${t.id}" aria-label="삭제" title="삭제">×</button></li>`;
}
const todoForm=()=>`<form class="todoadd" data-todoadd><label class="sr" for="todoin">할 일 추가</label><input id="todoin" maxlength="80" placeholder="할 일 입력 후 Enter" autocomplete="off"><button class="btn" type="submit">추가</button></form>`;
const memoBox=rows=>{const m=memo();return `<label class="sr" for="memoin">메모</label><textarea id="memoin" class="memo" rows="${rows}" maxlength="4000" placeholder="자유롭게 적어 두세요. 자동 저장됩니다.">${esc(m.t)}</textarea>
  <div class="dim2 memost" id="memost">${m.at?`저장됨 ${hm(m.at)}`:"이 기기에만 저장됩니다."}</div>`};

GWW.att=()=>attWidget();
GWW.todo=()=>{ const a=todos(), open=a.filter(t=>!t.done);
  return `<div class="card w"><div class="k"><a href="#notes" class="rowlink">할 일 ${open.length?`<span class="amber">${open.length}</span>`:""} ›</a></div>
    <ul class="todos">${open.slice(0,5).map(todoItem).join("")||`<li class="dim2">남은 할 일이 없습니다.</li>`}</ul>
    ${open.length>5?`<div class="dim2" style="font-size:11px">외 ${open.length-5}건</div>`:""}${todoForm()}</div>` };
GWW.memo=()=>`<div class="card w"><div class="k"><a href="#notes" class="rowlink">메모 ›</a></div>${memoBox(4)}</div>`;

function gwWidgets(){
  const {order,hide}=wSet(), show=order.filter(id=>!hide.includes(id)&&GWW[id]);
  return `<div class="wbar"><span class="dim2">내 위젯</span><button type="button" class="xref" data-wset>위젯 설정</button></div>
  ${show.length?`<div class="widgets">${show.map(id=>GWW[id]()).join("")}</div>`:`<div class="empty">표시할 위젯이 없습니다. <button type="button" class="xref" data-wset>위젯 설정</button>에서 켜십시오.</div>`}`;
}

/* 위젯 설정: 표시 여부 + 위·아래 이동 */
function wsetModal(){
  let {order,hide}=wSet();
  const list=()=>order.map((id,i)=>`<li><label class="chk"><input type="checkbox" data-wid="${id}" ${hide.includes(id)?"":"checked"}> ${WIDGET_LIST.find(w=>w[0]===id)[1]}</label>
    <span><button type="button" class="btn sm" data-wmv="${i},-1" ${i?"":"disabled"} aria-label="위로">↑</button><button type="button" class="btn sm" data-wmv="${i},1" ${i<order.length-1?"":"disabled"} aria-label="아래로">↓</button></span></li>`).join("");
  modal({title:"위젯 설정",html:`<p class="dim" style="margin-bottom:8px">대시보드에 표시할 위젯과 순서를 고르십시오.</p><ul class="wlist" id="wlist">${list()}</ul>`,
    onOpen:back=>{
      const ul=back.querySelector("#wlist");
      ul.addEventListener("change",e=>{const id=e.target.dataset.wid; if(!id) return; hide=e.target.checked?hide.filter(x=>x!==id):[...hide,id]});
      ul.addEventListener("click",e=>{const b=e.target.closest("[data-wmv]"); if(!b) return; const [i,d]=b.dataset.wmv.split(",").map(Number);
        [order[i],order[i+d]]=[order[i+d],order[i]]; ul.innerHTML=list(); const nb=ul.querySelector(`[data-wmv="${i+d},${d}"]`)||ul.querySelector(`[data-wmv="${i+d},${-d}"]`); if(nb) nb.focus()});
    },
    buttons:[{label:"기본값으로",act:c=>{store.set(wKey(),null);c();route();toast("위젯 배치를 기본값으로 되돌렸습니다.")}},
             {label:"취소",act:c=>c()},
             {label:"저장",primary:true,act:c=>{store.set(wKey(),{order,hide});c();route();toast("위젯 설정을 저장했습니다.")}}]});
}

/* ─── 뷰: 메모·할 일 (#notes?f=all|open|done) ─── */
function notes(qs){
  const f=(qs&&qs.get("f"))||"open", a=todos();
  const list=a.filter(t=>f==="all"||(f==="done"?t.done:!t.done)).sort((x,y)=>x.done-y.done||y.at-x.at);
  const n={open:a.filter(t=>!t.done).length,done:a.filter(t=>t.done).length,all:a.length};
  return `<h2 class="ph">메모 · <span>할 일</span></h2>
  <div class="notesgrid">
    <section class="card"><div class="k">할 일</div>
      <div class="tabs">${[["open","남은 일"],["done","완료"],["all","전체"]].map(([k,l])=>`<a href="#notes?f=${k}" class="${f===k?"on":""}">${l} ${n[k]}</a>`).join("")}</div>
      ${todoForm()}
      <ul class="todos big">${list.map(t=>todoItem(t).replace("</label>",`</label><span class="dim2 tat">${fmtDate(t.at).slice(5,16)}</span>`)).join("")||`<li class="empty">${f==="done"?"완료한 일이 없습니다.":f==="open"?"남은 할 일이 없습니다. 위 입력란에 추가하십시오.":"할 일이 없습니다."}</li>`}</ul>
      ${n.done?`<button type="button" class="xref" data-todoclear>완료한 일 ${n.done}건 지우기</button>`:""}
    </section>
    <section class="card"><div class="k">메모</div>${memoBox(14)}</section>
  </div>${docNoteList()}`;
}

let todoRefocus=false, memoTimer=0;
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-todoadd]"); if(!f) return; e.preventDefault();
  const v=f.querySelector("input").value.trim(); if(!v) return;
  todoSave([{id:Date.now().toString(36),t:v,done:false,at:Date.now()},...todos()]); todoRefocus=true; route();
});
document.addEventListener("change",e=>{
  if(e.target.id==="memoin"){ clearTimeout(memoTimer); store.set(memoKey(),{t:e.target.value,at:Date.now()}); return }
  const id=e.target.dataset&&e.target.dataset.todo; if(!id) return;
  todoSave(todos().map(t=>t.id===id?{...t,done:e.target.checked}:t)); if(e.target.checked) toast("할 일을 완료했습니다."); route();
});
document.addEventListener("click",e=>{
  if(e.target.closest("[data-wset]")) return wsetModal();
  const d=e.target.closest("[data-tododel]"); if(d){ todoSave(todos().filter(t=>t.id!==d.dataset.tododel)); route(); return }
  if(e.target.closest("[data-todoclear]")){ todoSave(todos().filter(t=>!t.done)); toast("완료한 일을 지웠습니다."); route() }
});
document.addEventListener("input",e=>{
  if(e.target.id!=="memoin") return; clearTimeout(memoTimer);
  const v=e.target.value; memoTimer=setTimeout(()=>{ const at=Date.now(); store.set(memoKey(),{t:v,at}); const s=$("#memost"); if(s) s.textContent="저장됨 "+hm(at) },500);
});
/* 다시 그린 뒤 할 일 입력란에 포커스 복귀 */
window.addEventListener("hashchange",()=>{todoRefocus=false});
new MutationObserver(()=>{ if(todoRefocus){ todoRefocus=false; const i=$("#todoin"); if(i) i.focus() } }).observe(document.getElementById("content")||document.body,{childList:true});
