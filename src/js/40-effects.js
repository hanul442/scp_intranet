/* ════ 문서별 실시간 연출 ════ */
function docEffects(id){
  const body=()=>Array.from(document.querySelectorAll("#content .doc .body"));
  switch(id){
    case "SCP-096": { // 너무 오래 보고 있으면
      later(()=>{ feedPush("SCP-096 격리실 카메라 — 단말 0x3F1A 로 피드 전환","amber"); $("#content").insertAdjacentHTML("afterbegin",`<div class="notice danger">경고: 본 문서 열람 시간 초과. 격리실 영상 피드가 귀하의 단말로 전환됩니다. 화면을 보지 마십시오.</div>`) },22000);
      later(()=>{ glitch(2); SFX.burst() },29000);
      later(()=>{ const e=$("#eyes"); e.innerHTML="귀하는 SCP-096의 얼굴을 보지 않았습니다.<br><span class='dim2'>귀하는 SCP-096의 얼굴을 보지 않았습니다.</span>"; e.classList.add("on"); SFX.burst(); feedPush("SCP-096 격리 실패 — 대상 이동 중 — 목표 좌표: NODE 0x3F1A","red"); $("#topalert").classList.add("on"); later(()=>{e.classList.remove("on");glitch(1);$("#topalert").classList.remove("on");feedPush("SCP-096 격리 복구 — 사상자 집계 중","amber")},2600) },31000);
      break }
    case "SCP-173": { // 입력이 8초간 없으면 = 눈을 깜빡임
      let last=Date.now(); const bump=()=>last=Date.now();
      ["mousemove","keydown","scroll","click"].forEach(e=>listen(e,bump,true));
      every(()=>{ if(Date.now()-last>8000){ last=Date.now(); SFX.scrape(); feedPush("SCP-173 격리실 — 위치 변경 감지 (관측 공백 8초)","red"); body().forEach(b=>{b.classList.add("shift");setTimeout(()=>b.classList.remove("shift"),140)}); $("#content").insertAdjacentHTML("afterbegin",`<div class="notice danger">경고: 단말 활동 없음 8초. 관측이 끊어진 동안 SCP-173의 위치가 변경되었습니다. 거리: <span class="hi">${rnd(1,6)}m</span> → 이전 ${rnd(7,14)}m</div>`) } },1000);
      break }
    case "SCP-055": { // 읽은 것부터 잊어버림
      later(()=>{ const bs=body(); bs.forEach((b,i)=>later(()=>{ b.classList.add("decay","fade-out"); later(()=>{ b.innerHTML=`<span class="dim2">[이 구역의 내용은 귀하가 방금 읽었습니다. 무엇이었는지 적어보십시오.]</span>`; b.classList.remove("fade-out") },1300) }, i*4000)) },12000);
      later(()=>{ const h=$("#content .doc h1"); if(h) h.textContent="SCP-███"; feedPush(`${S.user} 열람 기록 — (항목 없음)`,"") },28000);
      break }
    case "SCP-106": { // 글자가 부식됨
      later(()=>{ feedPush("SCP-106 격리실 — 단말 캐비닛 하부 부식 감지","amber");
        every(()=>{ const bs=body(); if(!bs.length) return; const b=pick(bs); const nodes=[]; const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()) if(n.nodeValue.trim().length>3) nodes.push(n);
          if(!nodes.length) return; const t=pick(nodes); const i=rnd(0,t.nodeValue.length-2); const ch=pick(["▒","░","▓","·"," "]); t.nodeValue=t.nodeValue.slice(0,i)+ch+t.nodeValue.slice(i+1) },120) },9000);
      later(()=>$("#content").insertAdjacentHTML("afterbegin",`<div class="notice danger">문서 무결성 저하 — 원인: 격리실 7 에서 발생한 부식성 물질이 단말 저장 매체에 도달함. 문서를 닫으십시오.</div>`),20000);
      break }
    case "SCP-2521": { // 문자가 회수됨
      later(()=>{ every(()=>{ const t=$("#t2521"); if(!t) return; const words=t.textContent.trim().split(/\s+/); if(words.length<=1){ t.innerHTML=`<span class="dim2">●●|●●●●●|●●|●</span>`; return } const k=rnd(0,words.length-1); words.splice(k,1); t.textContent=words.join(" "); SFX.tick() },350) },4000);
      later(()=>{ const n=$("#p2521"); if(n) n.innerHTML=`<span class="dim2">●● ●●●|●● ●|●●●● ●●|●</span>`; feedPush("SCP-2521 — 단말 0x3F1A 문자 데이터 회수 진행 중","red") },9000);
      break }
    case "SCP-3125": {
      later(()=>{ feedPush(`${S.user} 열람 기록 삭제 — SCP-3125`,""); const t=$("#t3125"); if(t) t.textContent="" },6000);
      later(()=>{ const t=$("#t3125"); if(t) t.innerHTML=`<span class="red">여기에 무언가가 있습니다. 귀하는 그것을 볼 수 없습니다. 그것은 귀하를 볼 수 있습니다.</span>` },12000);
      later(()=>{ const t=$("#t3125"); if(t) t.textContent=""; glitch(1) },15000);
      break }
  }
}

/* ════ 오디오 (WebAudio 합성, 외부 파일 없음) ════ */
const SFX=(()=>{
  let ctx=null, master=null, hum=null, on=false;
  function init(){ if(ctx) return; ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain(); master.gain.value=0.6; master.connect(ctx.destination) }
  function noise(dur,vol,hp=800,lp=6000){ if(!on) return; const b=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
    const s=ctx.createBufferSource(); s.buffer=b; const f1=ctx.createBiquadFilter(); f1.type="highpass"; f1.frequency.value=hp; const f2=ctx.createBiquadFilter(); f2.type="lowpass"; f2.frequency.value=lp; const g=ctx.createGain(); g.gain.value=vol; s.connect(f1).connect(f2).connect(g).connect(master); s.start() }
  function startHum(){ const o=ctx.createOscillator(); o.type="sawtooth"; o.frequency.value=50; const o2=ctx.createOscillator(); o2.type="sine"; o2.frequency.value=100.3;
    const f=ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=140; const g=ctx.createGain(); g.gain.value=0.0; o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); g.gain.linearRampToValueAtTime(0.07,ctx.currentTime+2);
    // 바람/환풍기 노이즈
    const b=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const s=ctx.createBufferSource(); s.buffer=b; s.loop=true; const nf=ctx.createBiquadFilter(); nf.type="lowpass"; nf.frequency.value=300; const ng=ctx.createGain(); ng.gain.value=0.025; s.connect(nf).connect(ng).connect(master); s.start();
    hum={g,ng} }
  return {
    toggle(){ init(); on=!on; if(on){ ctx.resume(); if(!hum) startHum(); else{hum.g.gain.value=0.07;hum.ng.gain.value=0.025} } else if(hum){ hum.g.gain.value=0; hum.ng.gain.value=0 } $("#audiobtn").textContent=on?"♪ 음향 ON":"♪ 음향 OFF"; $("#audiobtn").classList.toggle("on",on); $("#audiobtn").setAttribute("aria-pressed",on); return on },
    key(){ noise(0.03,0.25,1500,7000) },
    tick(){ noise(0.02,0.15,2500,9000) },
    burst(){ noise(0.45,0.5,200,4000); if(on){ const o=ctx.createOscillator(); o.type="square"; o.frequency.value=rnd(60,90); const g=ctx.createGain(); g.gain.value=0.12; o.connect(g).connect(master); o.start(); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5); o.stop(ctx.currentTime+0.5) } },
    scrape(){ noise(0.9,0.3,300,1500) },
    get on(){return on}
  };
})();
$("#audiobtn").addEventListener("click",()=>SFX.toggle());
document.addEventListener("keydown",e=>{ if(SFX.on && e.key.length===1) SFX.key() });

