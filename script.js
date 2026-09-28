
(() => {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(a => {
    if (a.getAttribute("href") === current) a.classList.add("active");
    a.addEventListener("click", () => playTone(560, .045));
  });

  const soundBtn = document.getElementById("soundToggle");
  let soundOn = localStorage.getItem("peSound") !== "off";
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;

  function playTone(freq=560, duration=.055){
    if(!soundOn || !AudioCtx) return;
    try{
      ctx = ctx || new AudioCtx();
      if(ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type="sine"; osc.frequency.value=freq;
      gain.gain.setValueAtTime(.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.035,ctx.currentTime+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
      osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+duration+.01);
    }catch(e){}
  }
  function renderSound(){
    if(!soundBtn) return;
    soundBtn.classList.toggle("on",soundOn);
    soundBtn.querySelector(".sound-icon").textContent=soundOn ? "🔊" : "🔇"; soundBtn.querySelector(".sound-label").textContent=soundOn ? "SONIDO: ACTIVADO" : "SONIDO: DESACTIVADO";
    soundBtn.setAttribute("aria-label", soundOn ? "Desactivar sonido" : "Activar sonido");
  }
  if(soundBtn){
    renderSound();
    soundBtn.addEventListener("click",()=>{
      soundOn=!soundOn; localStorage.setItem("peSound",soundOn?"on":"off"); renderSound();
      if(soundOn) playTone(720,.09);
    });
  }
  document.querySelectorAll(".btn,.game-options button").forEach(b=>b.addEventListener("mouseenter",()=>playTone(430,.025)));

  const obs = new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("fade")}),{threshold:.08});
  document.querySelectorAll(".card,section,.topic-visual").forEach(x=>obs.observe(x));

  // Simulador de punto de equilibrio
  const ids=["fixedCost","price","variableCost","unitsSold"];
  const inputs=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
  if(inputs.fixedCost){
    const out={peUnits:document.getElementById("peUnits"),peMoney:document.getElementById("peMoney"),profit:document.getElementById("profit"),status:document.getElementById("status")};
    const chart=document.getElementById("dynamicChart");
    const fmt=n=>Number.isFinite(n)?"L "+n.toLocaleString("es-HN",{maximumFractionDigits:2}):"—";
    function calc(){
      const cf=+inputs.fixedCost.value||0,pv=+inputs.price.value||0,cv=+inputs.variableCost.value||0,u=+inputs.unitsSold.value||0;
      const mc=pv-cv, pe=mc>0?cf/mc:NaN, peMoney=pe*pv, profit=(pv*u)-(cf+cv*u);
      out.peUnits.textContent=Number.isFinite(pe)?pe.toLocaleString("es-HN",{maximumFractionDigits:1}):"—";
      out.peMoney.textContent=Number.isFinite(peMoney)?fmt(peMoney):"—";
      out.profit.textContent=fmt(profit);
      out.status.textContent=profit>0?"Por encima del equilibrio":profit<0?"Por debajo del equilibrio":"En el equilibrio";
      draw(chart,cf,pv,cv,pe);
    }
    function draw(svg,cf,pv,cv,pe){
      if(!svg)return;
      const W=900,H=390,pad=60,maxU=Math.max(1000,(Number.isFinite(pe)?pe:1000)*1.65, (+inputs.unitsSold.value||0)*1.25);
      const rev=u=>pv*u,cost=u=>cf+cv*u,maxY=Math.max(rev(maxU),cost(maxU),1)*1.1;
      const x=u=>pad+(u/maxU)*(W-pad-25), y=v=>(H-45)-(v/maxY)*(H-75);
      let lines=`<line x1="${pad}" y1="${H-45}" x2="${W-25}" y2="${H-45}" stroke="#8da08f"/><line x1="${pad}" y1="30" x2="${pad}" y2="${H-45}" stroke="#8da08f"/>`;
      lines+=`<path d="M ${x(0)} ${y(rev(0))} L ${x(maxU)} ${y(rev(maxU))}" fill="none" stroke="#f2d889" stroke-width="6"/>`;
      lines+=`<path d="M ${x(0)} ${y(cost(0))} L ${x(maxU)} ${y(cost(maxU))}" fill="none" stroke="#86b9e8" stroke-width="6"/>`;
      if(Number.isFinite(pe)&&pe<=maxU){
        lines+=`<line x1="${x(pe)}" y1="${H-45}" x2="${x(pe)}" y2="${y(rev(pe))}" stroke="#7ed19d" stroke-width="3" stroke-dasharray="8 7"/>`;
        lines+=`<circle cx="${x(pe)}" cy="${y(rev(pe))}" r="9" fill="#7ed19d"/>`;
        lines+=`<text x="${Math.min(x(pe)+12,W-190)}" y="${Math.max(y(rev(pe))-12,35)}" fill="#7ed19d" font-size="17" font-weight="800">Equilibrio</text>`;
      }
      lines+=`<text x="${W-180}" y="55" fill="#f2d889" font-size="17">Ingresos</text><text x="${W-180}" y="78" fill="#86b9e8" font-size="17">Costos totales</text><text x="${W/2-70}" y="${H-8}" fill="#c4cec5" font-size="15">Unidades</text>`;
      svg.innerHTML=lines;
    }
    ids.forEach(id=>inputs[id].addEventListener("input",()=>{calc();playTone(510,.02)})); calc();
  }

  // Mini-juego
  const game=document.getElementById("equilibriumGame");
  if(game){
    const q=game.querySelector("#game-question"), opts=game.querySelector("#game-options"), fb=game.querySelector("#game-feedback"), score=game.querySelector("#game-score");
    const questions=[
      {t:"CF = L 5,000, PVU = L 10, CVU = L 5. ¿Cuál es el PE?",a:["500 unidades","1,000 unidades","2,000 unidades","5,000 unidades"],c:1},
      {t:"Si las ventas están por debajo del PE, ¿qué ocurre?",a:["Hay utilidad","No hay costos","Existe pérdida","La utilidad siempre es cero"],c:2},
      {t:"¿Qué representa PVU − CVU?",a:["Costo fijo","Margen de contribución unitario","Ventas totales","Inversión inicial"],c:1},
      {t:"Si PE = 2,000 unidades y se venden 2,500, ¿qué zona representa?",a:["Pérdida","Equilibrio exacto","Utilidad","No se puede saber"],c:2}
    ];
    let idx=0,points=0;
    function render(){
      const item=questions[idx%questions.length]; q.textContent=item.t; opts.innerHTML="";
      item.a.forEach((a,i)=>{const b=document.createElement("button");b.textContent=a;b.onclick=()=>{if(i===item.c){points++;fb.textContent="✓ Correcto. +1 punto";playTone(780,.08)}else{fb.textContent="✦ Revisa la fórmula y vuelve a intentarlo.";playTone(240,.08)}score.textContent=`Puntaje: ${points}`; if(i===item.c)setTimeout(()=>{idx++;render()},650)};opts.appendChild(b)});
    }
    render();
  }
  // Navegación tipo presentación: teclado, transiciones y accesibilidad.
  const pageOrder = ["index.html","01-concepto.html","02-costos.html","02-unidades.html","03-lempiras.html","03-datos-grafico.html","04-formulas.html","04-varias-lineas.html","05-situaciones.html","06-unidades-dinero.html","07-varias-lineas.html","08-ejemplo-milano.html","09-ejercicios.html","11-simulador.html","05-van.html","06-tir.html","10-resumen.html"];
  const here = pageOrder.indexOf(current);
  document.addEventListener("keydown", e=>{
    if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) return;
    if(e.key==="ArrowRight" && here < pageOrder.length-1){ playTone(680,.045); location.href=pageOrder[here+1]; }
    if(e.key==="ArrowLeft" && here > 0){ playTone(500,.045); location.href=pageOrder[here-1]; }
    if(e.key==="Home"){ playTone(600,.035); location.href="index.html"; }
  });

  // Revelado progresivo de tablas, fórmulas y bloques visuales.
  document.querySelectorAll("table, .formula, .result, .image-slot").forEach(el=>{
    el.classList.add("reveal");
    el.addEventListener("mouseenter",()=>playTone(390,.018),{passive:true});
  });

  // Preparación para las imágenes temáticas que se incorporarán posteriormente:
  // cualquier elemento con data-image puede recibir una imagen local sin cambiar la estructura.
  document.querySelectorAll("[data-image]").forEach(el=>{
    const path=el.getAttribute("data-image");
    if(path) el.style.setProperty("--topic-image",`url("${path}")`);
  });

})();
