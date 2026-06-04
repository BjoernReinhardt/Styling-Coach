import { useState, useRef, useCallback } from "react";

const T = {
  de: {
    title: "Stylingcoach", subtitle: "KI-Modeberatung",
    tagline: "Laden Sie Ihr Outfit hoch — wir analysieren Ihren Look und empfehlen passende Teile.",
    upload: "Galerie", camera: "Kamera", analyze: "Jetzt analysieren",
    analyzing: "Analysiere ...", another: "Neues Outfit",
    vibe: "Ihr Vibe", strengths: "Das gefällt uns",
    improvements: "Unsere Empfehlungen", inspo: "Inspiration für Sie",
    verdict: "Unser Fazit", drop: "Foto hier ablegen", or: "oder klicken",
    lang: "EN", shopping: "Shopping-Empfehlungen",
    shoppingDesc: "Passend zu Ihrem Look empfehlen wir:",
    zalando: "Auf Zalando suchen", vestiaire: "Auf Vestiaire suchen",
    error: "Die Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
  },
  en: {
    title: "Stylingcoach", subtitle: "AI Fashion Advisory",
    tagline: "Upload your outfit — we'll analyze your look and recommend matching pieces.",
    upload: "Gallery", camera: "Camera", analyze: "Analyze Now",
    analyzing: "Analyzing ...", another: "New Outfit",
    vibe: "Your Vibe", strengths: "What We Love",
    improvements: "Our Suggestions", inspo: "Inspiration For You",
    verdict: "Our Verdict", drop: "Drop photo here", or: "or click to browse",
    lang: "DE", shopping: "Shopping Recommendations",
    shoppingDesc: "Based on your look, we recommend:",
    zalando: "Search on Zalando", vestiaire: "Search on Vestiaire",
    error: "The analysis could not be completed. Please try again.",
  }
};

const SYSTEM = (lang) => `You are Stylingcoach — a sophisticated, warm fashion AI. Analyze the outfit and respond ONLY as valid JSON (no markdown):
{"score":<1-10>,"vibe":"<2-4 word phrase>","color_palette":"<1 warm sentence>","compliments":["<compliment 1>","<compliment 2>"],"improvements":[{"title":"<title>","tip":"<kind tip>","emoji":"<emoji>"},{"title":"<title>","tip":"<kind tip>","emoji":"<emoji>"},{"title":"<title>","tip":"<kind tip>","emoji":"<emoji>"}],"style_inspo":"<warm suggestion>","final_verdict":"<2 warm sentences>","shopping":[{"item":"<item>","reason":"<why>","zalando_query":"<query>","vestiaire_query":"<query>"},{"item":"<item>","reason":"<why>","zalando_query":"<query>","vestiaire_query":"<query>"},{"item":"<item>","reason":"<why>","zalando_query":"<query>","vestiaire_query":"<query>"}]}
${lang==='de'?'Respond in German. Use formal Sie. Be warm and encouraging.':'Respond in English. Be warm and encouraging.'}`;

function ScoreArc({score}) {
  const r=36,circ=2*Math.PI*r,dash=(score/10)*circ;
  const hue=score>=8?"#00E5A0":score>=6?"#FFD166":"#FF6B6B";
  return (
    <div style={{position:"relative",width:88,height:88,flexShrink:0}}>
      <svg width="88" height="88" style={{transform:"rotate(-90deg)"}}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={hue} strokeWidth="5"
          strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray 1s ease",filter:`drop-shadow(0 0 8px ${hue})`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:26,fontWeight:700,color:hue,lineHeight:1}}>{score}</span>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>/10</span>
      </div>
    </div>
  );
}

function ShoppingCard({item,t}) {
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px 18px",marginBottom:10}}>
      <div style={{color:"#fff",fontSize:14,fontWeight:600,marginBottom:4}}>{item.item}</div>
      <div style={{color:"rgba(255,255,255,0.65)",fontSize:12,lineHeight:1.6,marginBottom:12}}>{item.reason}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <a href={`https://www.zalando.de/catalog/?q=${encodeURIComponent(item.zalando_query)}`} target="_blank" rel="noopener noreferrer"
          style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:8,textDecoration:"none",background:"rgba(255,165,0,0.1)",border:"1px solid rgba(255,165,0,0.3)",color:"#FFA500",fontSize:11,fontWeight:600}}>
          🟠 {t.zalando}
        </a>
        <a href={`https://de.vestiairecollective.com/search/?q=${encodeURIComponent(item.vestiaire_query)}`} target="_blank" rel="noopener noreferrer"
          style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:8,textDecoration:"none",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.3)",color:"#A78BFA",fontSize:11,fontWeight:600}}>
          ♻️ {t.vestiaire}
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [lang,setLang]=useState("de");
  const [image,setImage]=useState(null);
  const [imageData,setImageData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const fileRef=useRef();
  const camRef=useRef();
  const t=T[lang];

  const handleFile=useCallback((file)=>{
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=(e)=>{setImage(e.target.result);setImageData(e.target.result.split(",")[1]);setResult(null);setError(null);};
    reader.readAsDataURL(file);
  },[]);

  const analyze=async()=>{
    if(!imageData)return;
    setLoading(true);setError(null);setResult(null);
    try {
      const res=await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",max_tokens:1200,
          system:SYSTEM(lang),
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:"image/jpeg",data:imageData}},
            {type:"text",text:lang==="de"?"Bitte analysieren Sie mein Outfit.":"Please analyze my outfit."}
          ]}]
        })
      });
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("")||"";
      setResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    } catch{setError(t.error);}
    setLoading(false);
  };

  const reset=()=>{setImage(null);setImageData(null);setResult(null);setError(null);};

  return (
    <div style={{minHeight:"100vh",background:"#0A0A0F",color:"#F0EEE8",fontFamily:"'DM Sans',sans-serif",overflowX:"hidden",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes gradMove{0%{background-position:0%}50%{background-position:100%}100%{background-position:0%}}
        .fade{animation:fadeUp 0.5s ease forwards;opacity:0}
        .f1{animation-delay:.05s}.f2{animation-delay:.12s}.f3{animation-delay:.2s}
        .f4{animation-delay:.28s}.f5{animation-delay:.36s}.f6{animation-delay:.44s}
        .tip{transition:all .2s}.tip:hover{background:rgba(255,255,255,0.05)!important;transform:translateX(3px)}
        .btn{transition:all .2s;cursor:pointer}.btn:hover{opacity:.85;transform:translateY(-1px)}
      `}</style>
      <div style={{position:"fixed",top:-200,left:"50%",transform:"translateX(-50%)",width:700,height:500,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(139,92,246,.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-100,right:-50,width:350,height:350,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(236,72,153,.07) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{maxWidth:560,margin:"0 auto",padding:"32px 20px 80px",position:"relative",zIndex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:44}}>
          <div style={{fontSize:10,letterSpacing:4,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",fontWeight:500}}>{t.subtitle}</div>
          <button className="btn" onClick={()=>{setLang(l=>l==="de"?"en":"de");setResult(null);}}
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"6px 16px",color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:2,fontFamily:"inherit",fontWeight:500}}>{t.lang}</button>
        </div>

        <div style={{marginBottom:40}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(44px,10vw,68px)",fontWeight:700,lineHeight:.95,background:"linear-gradient(135deg,#fff 30%,rgba(255,255,255,.4))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-1,marginBottom:14}}>{t.title}</h1>
          <p style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:300,lineHeight:1.8,maxWidth:360}}>{t.tagline}</p>
        </div>

        {!result?(
          <div>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
              onClick={()=>!image&&fileRef.current.click()}
              style={{border:`1px solid ${dragOver?"rgba(255,255,255,.3)":image?"rgba(139,92,246,.5)":"rgba(255,255,255,.08)"}`,borderRadius:16,padding:image?8:52,textAlign:"center",cursor:image?"default":"pointer",background:"rgba(255,255,255,.015)",transition:"all .3s",marginBottom:14,position:"relative"}}>
              {image?(
                <div style={{position:"relative"}}>
                  <img src={image} alt="outfit" style={{width:"100%",maxHeight:440,objectFit:"contain",borderRadius:12,display:"block"}}/>
                  <button onClick={e=>{e.stopPropagation();reset();}} style={{position:"absolute",top:10,right:10,background:"rgba(10,10,15,.85)",border:"1px solid rgba(255,255,255,.15)",borderRadius:"50%",width:32,height:32,cursor:"pointer",color:"rgba(255,255,255,.8)",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ):(
                <><div style={{fontSize:26,marginBottom:12,opacity:.15}}>↑</div>
                <div style={{color:"rgba(255,255,255,.65)",fontSize:14,marginBottom:4}}>{t.drop}</div>
                <div style={{color:"rgba(255,255,255,.3)",fontSize:11,letterSpacing:1}}>{t.or}</div></>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <button className="btn" onClick={()=>fileRef.current.click()} style={{flex:1,padding:"13px 0",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"rgba(255,255,255,.75)",fontFamily:"inherit",fontWeight:500,fontSize:13}}>{t.upload}</button>
              <button className="btn" onClick={()=>camRef.current.click()} style={{flex:1,padding:"13px 0",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"rgba(255,255,255,.75)",fontFamily:"inherit",fontWeight:500,fontSize:13}}>{t.camera}</button>
            </div>
            {image&&(
              <button className="btn" onClick={analyze} disabled={loading} style={{width:"100%",padding:"16px 0",borderRadius:10,border:"none",background:loading?"rgba(255,255,255,.05)":"linear-gradient(135deg,#8B5CF6,#EC4899,#8B5CF6)",backgroundSize:"200% auto",animation:loading?"none":"gradMove 3s ease infinite",color:loading?"rgba(255,255,255,.3)":"#fff",fontFamily:"inherit",fontWeight:600,fontSize:14,letterSpacing:1,boxShadow:loading?"none":"0 8px 32px rgba(139,92,246,.35)"}}>
                {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:12}}>◆</span>{t.analyzing}</span>:t.analyze}
              </button>
            )}
            {error&&<div style={{marginTop:14,padding:"12px 16px",borderRadius:10,background:"rgba(255,100,100,.07)",border:"1px solid rgba(255,100,100,.2)",color:"rgba(255,150,150,.9)",fontSize:12,textAlign:"center"}}>{error}</div>}
          </div>
        ):(
          <div>
            <div className="fade f1" style={{display:"flex",alignItems:"center",gap:20,padding:"22px 20px",borderRadius:16,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",marginBottom:12}}>
              <ScoreArc score={result.score}/>
              <div style={{flex:1}}>
                <div style={{fontSize:10,letterSpacing:3,color:"rgba(255,255,255,.5)",textTransform:"uppercase",marginBottom:6}}>{t.vibe}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#fff",lineHeight:1.3,marginBottom:8}}>{result.vibe}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.55)",fontStyle:"italic",lineHeight:1.6}}>{result.color_palette}</div>
              </div>
            </div>
            <div className="fade f2" style={{padding:"20px",borderRadius:16,background:"rgba(0,229,160,.04)",border:"1px solid rgba(0,229,160,.12)",marginBottom:12}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#00E5A0",textTransform:"uppercase",marginBottom:14,fontWeight:500}}>{t.strengths}</div>
              {result.compliments?.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:i<result.compliments.length-1?10:0}}>
                  <span style={{color:"#00E5A0",fontSize:10,marginTop:4,flexShrink:0}}>✓</span>
                  <span style={{color:"rgba(255,255,255,.82)",fontSize:13,fontWeight:300,lineHeight:1.7}}>{c}</span>
                </div>
              ))}
            </div>
            <div className="fade f3" style={{marginBottom:12}}>
              <div style={{fontSize:10,letterSpacing:3,color:"rgba(255,255,255,.5)",textTransform:"uppercase",marginBottom:10}}>{t.improvements}</div>
              {result.improvements?.map((tip,i)=>(
                <div key={i} className="tip" style={{padding:"16px 18px",borderRadius:12,marginBottom:8,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderLeft:"2px solid rgba(139,92,246,.6)"}}>
                  <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{tip.emoji}</span>
                    <div>
                      <div style={{color:"#fff",fontSize:13,fontWeight:500,marginBottom:4}}>{tip.title}</div>
                      <div style={{color:"rgba(255,255,255,.68)",fontSize:12,fontWeight:300,lineHeight:1.7}}>{tip.tip}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="fade f4" style={{padding:"18px 20px",borderRadius:16,marginBottom:12,background:"rgba(236,72,153,.04)",border:"1px solid rgba(236,72,153,.12)"}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#EC4899",textTransform:"uppercase",marginBottom:10,fontWeight:500}}>{t.inspo}</div>
              <div style={{color:"rgba(255,255,255,.72)",fontSize:13,fontWeight:300,lineHeight:1.7,fontStyle:"italic"}}>{result.style_inspo}</div>
            </div>
            <div className="fade f5" style={{padding:"22px 20px",borderRadius:16,marginBottom:20,background:"linear-gradient(135deg,rgba(139,92,246,.07),rgba(236,72,153,.07))",border:"1px solid rgba(139,92,246,.18)"}}>
              <div style={{fontSize:10,letterSpacing:3,color:"rgba(255,255,255,.5)",textTransform:"uppercase",marginBottom:12}}>{t.verdict}</div>
              <p style={{color:"rgba(255,255,255,.85)",fontSize:14,fontWeight:300,lineHeight:1.9,fontFamily:"'Playfair Display',serif",fontStyle:"italic"}}>{result.final_verdict}</p>
            </div>
            {result.shopping&&(
              <div className="fade f6" style={{marginBottom:24}}>
                <div style={{fontSize:10,letterSpacing:3,color:"rgba(255,255,255,.5)",textTransform:"uppercase",marginBottom:6,fontWeight:500}}>{t.shopping}</div>
                <p style={{color:"rgba(255,255,255,.55)",fontSize:12,marginBottom:14,lineHeight:1.6}}>{t.shoppingDesc}</p>
                {result.shopping.map((item,i)=><ShoppingCard key={i} item={item} t={t}/>)}
                <div style={{display:"flex",gap:10,marginTop:14}}>
                  <a href="https://www.zalando.de/" target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 0",borderRadius:10,textDecoration:"none",background:"rgba(255,165,0,.07)",border:"1px solid rgba(255,165,0,.2)",color:"#FFA500",fontSize:12,fontWeight:500}}>🟠 Zalando</a>
                  <a href="https://de.vestiairecollective.com/" target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 0",borderRadius:10,textDecoration:"none",background:"rgba(139,92,246,.07)",border:"1px solid rgba(139,92,246,.2)",color:"#A78BFA",fontSize:12,fontWeight:500}}>♻️ Vestiaire</a>
                </div>
              </div>
            )}
            <button className="btn" onClick={reset} style={{width:"100%",padding:"14px 0",borderRadius:10,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"rgba(255,255,255,.55)",fontFamily:"inherit",fontWeight:500,fontSize:13,letterSpacing:1}}>{t.another}</button>
          </div>
        )}
        <div style={{textAlign:"center",marginTop:48,fontSize:10,color:"rgba(255,255,255,.15)",letterSpacing:4,textTransform:"uppercase"}}>STYLINGCOACH</div>
      </div>
    </div>
  );
}
