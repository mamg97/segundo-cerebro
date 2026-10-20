// Offline audiovisual studio v0: educational storyboard only. No API reads,
// private probabilities, publication or third-party upload.
export const VIDEO_STORIES = Object.freeze([
  {
    id:"metodo", name:"¿Podemos anticipar crisis?", label:"DIVULGACIÓN · NO ES UN PRONÓSTICO",
    scenes:[
      ["¿PODEMOS ANTICIPAR LAS CRISIS?","Preguntas antes que certezas","orb",6.4],
      ["PSICOHISTORIA","Patrones colectivos, no destinos individuales","network",6.2],
      ["DATOS → MODELOS","La fecha de cada fuente importa","pipeline",6.4],
      ["PROBABILIDAD ≠ CERTEZA","El riesgo no determina el futuro","rings",6.3],
      ["¿FUNCIONA?","Comparar con referencias y validar","chart",6.4],
      ["2027 EN OBSERVACIÓN","Investigación exploratoria, sin validación futura","matrix",6.6],
      ["LA PRUEBA ESTÁ EN EL FUTURO","Emitir · Observar · Evaluar","future",6.7]
    ]
  },
  {
    id:"validacion", name:"¿Cómo se valida una predicción?", label:"MÉTODO CIENTÍFICO · DEMOSTRACIÓN",
    scenes:[
      ["¿QUÉ ES UNA BUENA PREDICCIÓN?","No basta con acertar una vez","rings",6.4],
      ["DEFINIR EL FENÓMENO","Qué, dónde y cuándo","pipeline",6.2],
      ["FIJAR LA FECHA","Solo datos disponibles entonces","network",6.4],
      ["REGISTRAR ANTES","La emisión precede al resultado","future",6.3],
      ["CONTRASTAR MODELOS","Siempre frente a una referencia","chart",6.4],
      ["MEDIR ERRORES","Una probabilidad requiere calibración","matrix",6.6],
      ["MEJORAR O REFUTAR","El método vale más que el titular","orb",6.7]
    ]
  }
]);
export const VIDEO_DURATION=45;
export const videoStoryboard = story => story.scenes.map((s,i)=>({
  index:i+1,title:s[0],subtitle:s[1],visual:s[2],duration:s[3]
}));
export function videoStudioCapabilities(env){
  return {preview:!!env?.HTMLCanvasElement,record:!!env?.MediaRecorder&&!!env?.HTMLCanvasElement?.prototype?.captureStream};
}
const COLORS={background:"#05090d",ink:"#f4f7f8",muted:"#aab8c2",cyan:"#99e3ef",faint:"#344c55"};
const LIMIT=VIDEO_DURATION;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function locate(story,t){
  let sum=0;
  for(let i=0;i<story.scenes.length;i++){
    if(t<sum+story.scenes[i][3])return {scene:story.scenes[i],index:i,local:t-sum};
    sum+=story.scenes[i][3];
  }
  return {scene:story.scenes.at(-1),index:story.scenes.length-1,local:story.scenes.at(-1)[3]};
}
function center(ctx,value,y,size=52,color=COLORS.ink,bold=true){
  ctx.fillStyle=color;ctx.textAlign="center";ctx.font=`${bold?650:400} ${size}px Inter, system-ui, sans-serif`;
  ctx.fillText(value,360,y,644);
}
function dot(ctx,x,y,r=3,alpha=1){
  ctx.fillStyle=`rgba(155,224,237,${alpha})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function makeLine(ctx,p,q,alpha=.3){
  ctx.strokeStyle=`rgba(154,216,228,${alpha})`;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();
}
function orbit(ctx,t){
  ctx.save();ctx.translate(360,490);
  for(let k=0;k<3;k++){
    ctx.save();ctx.rotate(k*1.03+t*.018);
    ctx.strokeStyle=`rgba(159,219,232,${.19+k*.11})`;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.ellipse(0,0,228,90,0,0,Math.PI*2);ctx.stroke();
    const a=t*(.2+k*.07)+k*2.1;dot(ctx,228*Math.cos(a),90*Math.sin(a),4,.84);
    ctx.restore();
  }
  ctx.strokeStyle="#5c8e9c";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,160,0,Math.PI*2);ctx.stroke();
  for(let n=0;n<130;n++){
    let a=n*2.39996+t*.015,r=Math.sqrt(n/130)*157;
    dot(ctx,Math.cos(a)*r,Math.sin(a)*r,n%9===0?2.4:1,n%9===0?.8:.27);
  }
  dot(ctx,0,0,6,1);ctx.restore();
}
function network(ctx,t){
  const nodes=Array.from({length:34},(_,i)=>{let a=i*2.39996+t*.015,r=40+195*Math.sqrt(i/34);
    return [360+Math.cos(a)*r,490+Math.sin(a)*r]});
  nodes.forEach((p,i)=>nodes.slice(i+1).forEach(q=>{if(Math.hypot(p[0]-q[0],p[1]-q[1])<100)makeLine(ctx,p,q,.13)}));
  nodes.forEach((p,i)=>dot(ctx,p[0],p[1],i%5===0?3:1.5,i%5===0?.95:.47));
  ctx.strokeStyle="rgba(147,226,238,.7)";ctx.beginPath();ctx.arc(360,490,72,0,Math.PI*2);ctx.stroke();
  center(ctx,"COLECTIVO",502,23,COLORS.cyan);
}
function pipeline(ctx,t){
  const names=["DATOS","FECHAS","MODELOS","PRUEBAS"];
  makeLine(ctx,[98,490],[622,490],.33);
  names.forEach((name,i)=>{
    const x=98+i*(524/3);
    ctx.fillStyle="#101e26";ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,490,23,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(i<=Math.floor(t/1.7))dot(ctx,x,490,6);
    ctx.textAlign="center";ctx.fillStyle=COLORS.muted;ctx.font="600 18px Inter, sans-serif";ctx.fillText(name,x,552);
  });
}
function rings(ctx,t){
  for(let i=0;i<4;i++){
    const radius=75+i*44;
    ctx.beginPath();ctx.arc(360,495,radius,t*.13+i*.7,t*.13+i*.7+Math.PI*.95);
    ctx.strokeStyle=`rgba(159,222,234,${.55-i*.1})`;ctx.lineWidth=3;ctx.stroke();
  }
  center(ctx,"P ≠ 1",508,82);center(ctx,"INCERTIDUMBRE",574,24,COLORS.cyan);
}
function chart(ctx,t){
  for(let i=0;i<5;i++)makeLine(ctx,[100,326+i*84],[622,326+i*84],.14);
  const vals=[.70,.61,.67,.45,.54,.41,.43,.28,.34,.18];
  const points=vals.map((v,i)=>[100+i*58,326+v*330]);
  makeLine(ctx,[100,523],[622,523],.40);
  ctx.beginPath();points.slice(0,Math.max(2,Math.round(clamp(t/5,0,1)*9)+1)).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));
  ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=4;ctx.stroke();
  center(ctx,"GRÁFICO ILUSTRATIVO · SIN DATOS REALES",750,21,COLORS.muted,false);
}
function matrix(ctx,t){
  for(let i=0;i<10;i++)for(let j=0;j<10;j++){
    const k=(Math.sin(i*.9+j*.7+t*.8)+1)/2;
    ctx.fillStyle=`rgba(145,215,228,${.12+.58*k})`;
    ctx.fillRect(136+j*46,294+i*46,31,31);
  }
  center(ctx,"DEMOSTRACIÓN VISUAL",811,23,COLORS.cyan);
}
function future(ctx,t){
  makeLine(ctx,[115,490],[605,490],.48);
  ["EMITIR","OBSERVAR","EVALUAR"].forEach((s,i)=>{
    const x=115+i*245;ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,490,34,0,Math.PI*2);ctx.stroke();
    if(i<=Math.floor(t/2.2))dot(ctx,x,490,5);
    ctx.textAlign="center";ctx.fillStyle=COLORS.muted;ctx.font="600 20px Inter, sans-serif";ctx.fillText(s,x,565);
  });
}
const DRAW={orb:orbit,network,pipeline,rings,chart,matrix,future};
export function drawVideoFrame(ctx,seconds,story=VIDEO_STORIES[0]){
  const t=clamp(seconds,0,LIMIT-.001);
  const {scene,index,local}=locate(story,t);
  ctx.fillStyle=COLORS.background;ctx.fillRect(0,0,720,1280);
  ctx.strokeStyle="rgba(155,215,224,.045)";ctx.lineWidth=1;
  for(let x=0;x<720;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1280);ctx.stroke()}
  for(let y=0;y<1280;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke()}
  ctx.textAlign="left";ctx.font="700 22px Inter, system-ui";ctx.fillStyle=COLORS.ink;ctx.fillText("PSICOHISTORIA",60,105);
  ctx.font="500 16px Inter, system-ui";ctx.fillStyle=COLORS.cyan;ctx.fillText("LABORATORIO · EDICIÓN VISUAL",60,135);
  makeLine(ctx,[60,167],[660,167],.28);
  DRAW[scene[2]](ctx,local);
  makeLine(ctx,[60,875],[660,875],.27);
  const text=scene[0];
  let lines=text.length>26?text.split(/ (?=[^ ]+$)/):[text];
  if(lines.length===1 && text.length>22){
    const words=text.split(" "),part=Math.ceil(words.length/2);
    lines=[words.slice(0,part).join(" "),words.slice(part).join(" ")];
  }
  lines=lines.filter(Boolean);
  lines.forEach((l,i)=>center(ctx,l,969+i*64,l.length>27?38:48));
  center(ctx,scene[1],1039+(lines.length-1)*64,20,COLORS.muted,false);
  ctx.font="600 16px Inter, system-ui";ctx.textAlign="left";ctx.fillStyle=COLORS.cyan;
  ctx.fillText(story.label,60,1197);
  ctx.textAlign="right";ctx.fillStyle=COLORS.ink;ctx.fillText(`${String(index+1).padStart(2,"0")}/07`,660,1197);
  story.scenes.forEach((_,i)=>{
    ctx.fillStyle=i<=index?COLORS.cyan:COLORS.faint;
    ctx.fillRect(60+i*87,1236,79,4);
  });
}
function audioBed(stream){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return ()=>{};
  const audio=new Audio(),dest=audio.createMediaStreamDestination();
  const osc=audio.createOscillator(),gain=audio.createGain();
  osc.type="sine";osc.frequency.value=110;gain.gain.value=.009;
  osc.connect(gain).connect(dest);osc.start();
  dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  return ()=>{try{osc.stop()}catch{};void audio.close()};
}
export function mountResearchVideoStudio(node){
  if(!node)return ()=>{};
  const hasCanvas=typeof HTMLCanvasElement!=="undefined";
  node.innerHTML='<section class="video-studio" aria-label="Estudio audiovisual experimental">'+
    '<header class="video-studio-head"><div><span class="brief-kicker">PSICOHISTORIA / ESTUDIO AUDIOVISUAL</span><h2>De los modelos a las historias visuales.</h2><p>Prototipo educativo, sin datos privados ni IA de pago.</p></div><span class="video-studio-tag">V0 · LOCAL</span></header>'+
    '<div class="video-studio-grid"><div class="video-studio-player"><canvas id="video-studio-canvas" width="720" height="1280" role="img" aria-label="Vista previa de un vídeo vertical científico"></canvas><span>9:16 · 45 segundos · Sin publicación automática</span></div>'+
    '<div class="video-studio-control"><label for="video-studio-story">Guion</label><select id="video-studio-story"></select><div id="video-studio-scenes" class="video-studio-scenes"></div>'+
    '<div class="video-studio-buttons"><button type="button" id="video-studio-preview">▶ Previsualizar</button><button type="button" id="video-studio-export">↓ Crear vídeo</button><button type="button" id="video-studio-stop" disabled>■ Detener</button></div>'+
    '<p class="video-studio-state" id="video-studio-state" role="status" aria-live="polite">Listo para previsualizar. Todo se procesa en este navegador.</p>'+
    '<a id="video-studio-download" download hidden>Descargar vídeo generado</a>'+
    '<details><summary>Alcance científico y formato</summary><p>Los diagramas son ilustraciones sin datos reales. La exportación utiliza MediaRecorder: WebM o MP4 según el navegador. Música ambiental sintética; la narración en voz no está incorporada en esta versión. No hay publicación ni transferencia a servidores.</p></details>'+
    '</div></div></section>';
  const canvas=node.querySelector("canvas"),selector=node.querySelector("select"),
    preview=node.querySelector("#video-studio-preview"),exp=node.querySelector("#video-studio-export"),
    stop=node.querySelector("#video-studio-stop"),status=node.querySelector("#video-studio-state"),
    scenes=node.querySelector("#video-studio-scenes"),download=node.querySelector("#video-studio-download");
  if(!hasCanvas||!canvas?.getContext){status.textContent="Canvas no está disponible en este navegador.";preview.disabled=true;exp.disabled=true;return ()=>{}}
  const ctx=canvas.getContext("2d");if(!ctx){status.textContent="No se pudo iniciar Canvas.";preview.disabled=true;exp.disabled=true;return ()=>{}}
  VIDEO_STORIES.forEach(story=>selector.add(new Option(story.name,story.id)));
  let story=VIDEO_STORIES[0],raf=0,start=0,recorder=null,stream=null,stopAudio=()=>{},blobUrl=null,exporting=false,disposed=false;
  function updateStory(){story=VIDEO_STORIES.find(x=>x.id===selector.value)||VIDEO_STORIES[0];
    scenes.innerHTML=videoStoryboard(story).map(s=>'<div><small>'+String(s.index).padStart(2,"0")+'</small><span>'+s.title+'</span><small>'+s.duration.toFixed(1)+' s</small></div>').join("");
    drawVideoFrame(ctx,0,story);
  }
  function setState(s){if(!disposed)status.textContent=s}
  function stopActive(){
    if(raf)cancelAnimationFrame(raf);raf=0;
    if(recorder?.state==="recording")recorder.stop();
    recorder=null;
    if(stream){stream.getTracks().forEach(track=>track.stop());stream=null}
    stopAudio();stopAudio=()=>{};
    exporting=false;selector.disabled=false;preview.disabled=false;exp.disabled=false;stop.disabled=true;
  }
  function animate(now){
    if(disposed)return;
    const t=clamp((now-start)/1000,0,LIMIT);
    drawVideoFrame(ctx,t,story);
    if(t>=LIMIT){if(exporting){const r=recorder;recorder=null;if(r?.state==="recording")r.stop();stopAudio();stopAudio=()=>{}}
      exporting=false;selector.disabled=false;preview.disabled=false;exp.disabled=false;stop.disabled=true;setState("Vista previa finalizada.");raf=0;return}
    raf=requestAnimationFrame(animate);
  }
  function play(){stopActive();download.hidden=true;start=performance.now();setState("Reproduciendo las siete escenas…");stop.disabled=false;raf=requestAnimationFrame(animate)}
  preview.addEventListener("click",play);
  selector.addEventListener("change",()=>{stopActive();updateStory();download.hidden=true;setState("Guion actualizado. Solo ilustraciones educativas.")});
  stop.addEventListener("click",()=>{stopActive();setState("Detenido por el usuario.")});
  exp.addEventListener("click",()=>{
    stopActive();download.hidden=true;
    const formats=["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
    if(typeof MediaRecorder==="undefined"||!canvas.captureStream){setState("Este navegador no permite grabar Canvas. Prueba Chrome o Safari actualizado.");return}
    const mime=formats.find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime){setState("Este navegador no admite grabación de vídeo local.");return}
    try{
      const parts=[];stream=canvas.captureStream(24);stopAudio=audioBed(stream);
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
      const running=recorder;
      running.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
      running.onerror=()=>setState("Error de grabación. Inténtalo de nuevo.");
      running.onstop=()=>{
        const blob=new Blob(parts,{type:mime});
        if(blobUrl)URL.revokeObjectURL(blobUrl);
        if(!disposed&&blob.size>0){
          blobUrl=URL.createObjectURL(blob);
          download.href=blobUrl;download.download=`psicohistoria_${story.id}.${mime.startsWith("video/mp4")?"mp4":"webm"}`;
          download.hidden=false;setState("Vídeo listo. Descárgalo para guardarlo.");
        }
      };
      running.start(250);
      exporting=true;selector.disabled=true;preview.disabled=true;exp.disabled=true;stop.disabled=false;
      start=performance.now();raf=requestAnimationFrame(animate);
      setState("Grabando 45 segundos en tu navegador. Mantén esta pestaña visible.");
    }catch(error){stopActive();setState("No ha sido posible grabar: "+String(error?.message||"error de navegador").slice(0,90))}
  });
  updateStory();
  return ()=>{disposed=true;stopActive();if(blobUrl)URL.revokeObjectURL(blobUrl)};
}
