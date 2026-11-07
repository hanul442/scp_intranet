/* ════ 문서 첨부 사진 ════
   images.py 가 원문에서 모은 d.images([{src,cap}])와 d.img_credits(사진별 출처)를 문서에 붙인다.
   - 본문의 [이미지: 캡션] 자리는 그 사진으로 바꿈 (캡션이 같은 사진)
   - 본문에 자리가 없는 사진은 첫 구획 위 '첨부 사진' 묶음으로
   - 문서 끝에 '사진 출처' 표 (사진마다 라이선스가 다르므로 원문 표기를 그대로)
   사진 파일은 원문 주소(wdfiles.com)에서 바로 불러오며, 못 불러오면 원문 링크로 대신한다. */
const IMG_MARK=/^▣ 이미지 — /;
const capNorm=s=>(s||"").replace(/\s+/g," ").trim();
function photoFig(d, i, extra=""){
  const im=d.images[i], cap=capNorm(im.cap);
  return `<figure class="photo ${extra}" data-pi="${i}">
    <button type="button" class="phframe" data-photo="${i}" aria-label="첨부 사진 ${i+1} 크게 보기"><img src="${esc(im.src)}" alt="${esc(cap||`${d.id} 첨부 사진 ${i+1}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button>
    <figcaption><b>첨부 ${i+1}</b>${cap?`<span>${esc(cap)}</span>`:`<span class="dim2">설명 없음</span>`}</figcaption></figure>`;
}
/* 부록 화면에 자리가 있는 사진 번호들 — [이미지: 캡션] 표시나 캡션과 똑같은 줄 */
function subPhotos(d){
  const used=new Set();
  for(const l of (splitDoc(d).subs||[]).map(s=>s.text||"").join("\n").split("\n")){
    const c=capNorm(l.replace(/^\[이미지: ?(.*)\]$/,"$1"));
    const i=d.images.findIndex((im,k)=>!used.has(k)&&okCap(im.cap)&&capNorm(im.cap)===c); if(i>=0) used.add(i);
  }
  return used;
}
const okCap=c=>capNorm(c).length>=4;
function photoCredits(d){
  const C=d.img_credits||[];
  const lic=`<a href="${d.source}" target="_blank" rel="noopener">원문 문서</a>`;
  return `<div class="phcred" id="photo-credits"><h5>사진 출처</h5>
    ${C.length?`<table class="ftab"><tbody>${C.map(g=>`<tr><th>${esc(g[0][1])}</th><td>${g.slice(1).map(([k,v])=>`<span class="pk">${esc(k)}</span> ${/^https?:\/\//.test(v)?`<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>`:esc(v)}`).join("<br>")||'<span class="fnil">표기 없음</span>'}</td></tr>`).join("")}</tbody></table>`
      :`<p class="dim2">원문에 사진별 출처 표기가 없습니다. 자세한 내용은 ${lic}를 참고하세요.</p>`}
    <p class="dim2">사진의 저작권은 각 저작권자에게 있으며, 위에 적힌 라이선스를 따릅니다. 사진은 ${lic}에서 그대로 불러와 표시합니다.</p></div>`;
}
function docPhotos(key){
  const [id,sub]=key.split("/"), d=SCP[id], doc=$("#content .doc");
  if(!d||!doc||!d.images||!d.images.length||doc.querySelector(".denied")) return;
  const used=new Set();
  const pick=t=>{ const c=capNorm(t); const i=d.images.findIndex((im,k)=>!used.has(k)&&okCap(im.cap)&&capNorm(im.cap)===c); if(i>=0) used.add(i); return i };
  /* 1) 본문 속 [이미지: 캡션] 자리 바꾸기 */
  for(const sp of doc.querySelectorAll(".body span.img")){
    const i=pick(sp.textContent.replace(IMG_MARK,"")); if(i<0) continue;
    const host=sp.closest("figure.fig")||sp;
    host.insertAdjacentHTML("afterend",photoFig(d,i)); host.remove();
  }
  /* 2) 캡션 글이 본문에 그냥 한 줄로 남아 있으면 그 줄을 사진으로 */
  for(const el of doc.querySelectorAll(".body p, .body h5.bh")){
    if(used.size===d.images.length) break;
    const parts=el.innerHTML.split(/<br\s*\/?>/i), tmp=document.createElement("div");
    const k=parts.findIndex(h=>{ tmp.innerHTML=h; return pick(tmp.textContent)>=0 });
    if(k<0) continue;
    const i=[...used].pop(), tag=el.tagName.toLowerCase(), cls=el.className?` class="${el.className}"`:"";
    const wrap=a=>a.length&&a.join("").trim()?`<${tag}${cls}>${a.join("<br>")}</${tag}>`:"";
    el.outerHTML=wrap(parts.slice(0,k))+photoFig(d,i)+wrap(parts.slice(k+1));
  }
  if(sub==null){
    /* 3) 자리가 없는 사진은 첫 구획 위 '첨부 사진' 묶음으로 (부록 화면에서 보일 사진은 빼고) */
    const inSub=subPhotos(d);
    const rest=d.images.map((_,i)=>i).filter(i=>!used.has(i)&&!inSub.has(i));
    const first=doc.querySelector(".sec");
    if(rest.length&&first) first.insertAdjacentHTML("beforebegin",`<section class="phset" aria-label="첨부 사진"><h5>첨부 사진 <small>${rest.length}매</small></h5><div class="phgrid">${rest.map(i=>photoFig(d,i,"tile")).join("")}</div></section>`);
    const at=doc.querySelector(".fend")||doc.querySelector(".attrib");
    if(at) at.insertAdjacentHTML("beforebegin",photoCredits(d));
  } else if(used.size){
    const at=doc.querySelector(".attrib");
    if(at) at.insertAdjacentHTML("beforeend",`<br>사진 출처는 <a href="#${id.toLowerCase()}">상위 문서</a> 끝의 '사진 출처'를 참고하세요.`);
  }
  for(const img of doc.querySelectorAll("figure.photo img")) img.addEventListener("error",()=>photoFail(img,d),{once:true});
}
/* 원문 서버에서 못 불러오면 빈 액자 대신 안내 */
function photoFail(img,d){
  const b=img.closest(".phframe"); if(!b) return;
  b.outerHTML=`<div class="phframe broken"><span>사진을 불러오지 못했습니다</span><a href="${d.source}" target="_blank" rel="noopener">원문에서 보기 ↗</a></div>`;
}
/* 크게 보기 */
function photoView(i){
  const d=SCP[(S.doc||"").split("/")[0]]; if(!d||!d.images||!d.images[i]) return;
  const im=d.images[i], n=d.images.length;
  closePhoto();
  document.body.insertAdjacentHTML("beforeend",`<div class="phview" role="dialog" aria-modal="true" aria-label="${d.id} 첨부 ${i+1}" data-pi="${i}">
    <div class="phvbar"><b>${d.id} · 첨부 ${i+1} / ${n}</b><span class="sp"></span>
      <a class="tb" href="${esc(im.src)}" target="_blank" rel="noopener">원본 파일 ↗</a>
      <button type="button" class="tb" data-phcred="1">사진 출처</button>
      <button type="button" class="tb" data-phclose="1" aria-label="닫기">✕ 닫기</button></div>
    <div class="phvimg">${n>1?`<button type="button" class="phnav prev" data-photo="${(i-1+n)%n}" aria-label="이전 사진">‹</button>`:""}<img src="${esc(im.src)}" alt="${esc(capNorm(im.cap)||"첨부 사진")}" referrerpolicy="no-referrer">${n>1?`<button type="button" class="phnav next" data-photo="${(i+1)%n}" aria-label="다음 사진">›</button>`:""}</div>
    ${im.cap?`<p class="phvcap">${esc(capNorm(im.cap))}</p>`:""}</div>`);
  $(".phview [data-phclose]")?.focus();
}
function closePhoto(){ const v=$(".phview"); if(v) v.remove() }
document.addEventListener("click",e=>{
  const p=e.target.closest("[data-photo]"); if(p){ e.preventDefault(); photoView(+p.dataset.photo); return }
  if(e.target.closest("[data-phcred]")){ closePhoto(); document.getElementById("photo-credits")?.scrollIntoView({behavior:"smooth",block:"start"}); return }
  if(e.target.closest("[data-phclose]")||e.target.classList.contains("phview")){ closePhoto() }
});
document.addEventListener("keydown",e=>{
  const v=$(".phview"); if(!v) return;
  const i=+v.dataset.pi, n=(SCP[(S.doc||"").split("/")[0]]?.images||[]).length;
  if(e.key==="Escape"){ e.stopPropagation(); closePhoto() }
  else if(e.key==="ArrowRight"&&n>1) photoView((i+1)%n);
  else if(e.key==="ArrowLeft"&&n>1) photoView((i-1+n)%n);
},true);
window.addEventListener("hashchange",closePhoto);
