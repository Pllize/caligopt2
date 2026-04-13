// ═══════════════════════════════════════════
// IMAGE PATHS (외부 파일 참조)
// ═══════════════════════════════════════════
const _IMG_BASE = './images/';
window._CHAR_IMG_1_50   = _IMG_BASE + 'char_img_1_50.webp';
window._CHAR_IMG_51_100 = _IMG_BASE + 'char_img_51_100.webp';
window._CHAR_IMG_101    = _IMG_BASE + 'char_img_101.webp';
window._UNPO_IMG_START  = _IMG_BASE + 'placeholder_start.webp';
window._UNPO_IMG_END    = _IMG_BASE + 'placeholder_end.webp';


// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let S = {
  theme:'dark', tab:'dash', mgrSub:'stores',
  distributors:[], stores:[], purchases:[],
  countryPrices: JSON.parse(JSON.stringify(PRICES)),
  rates:{
    JPY:{rate:9.4537, manual:false, updAt:"2026-03-26T16:42:10.568Z"},
    CNY:{rate:218.3126, manual:false, updAt:"2026-03-26T16:42:10.568Z"},
    USD:{rate:1507.7751, manual:false, updAt:"2026-03-26T16:42:10.568Z"},
    TWD:{rate:47.1855, manual:false, updAt:"2026-03-26T16:42:10.568Z"},
    OTHER:{rate:1, manual:true, name:'기타', updAt:null},
  },
  ratesAt:'2026-03-26T17:40:18.345Z',
  filterStatus:'', hideZero:false, purchView:'list',
  calYear: new Date().getFullYear(), calMonth: new Date().getMonth(),
  calDay: null,
  sortBy:'date', sortDir:'desc', sortStore:'', infoSub:'unpo', infoSort:'name', infoUnpoFilter:'all', infoUnpoSearch:'', unpoData:JSON.parse(JSON.stringify(UNPO_DATA)), showProxyAlb:false, schedIdx:0,
  adminUnlocked:false,
  calShowOnline:true, calShowOffline:true,
  hideExpired:true,
  dataAt:'2026-03-27',
};

let _saveTimer=null;
function save(){
  // Debounced save
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer=setTimeout(_doSave, 300);
}
function _doSave(){
  try{
    // Strip image data from unpoData for main key (keeps it small)
    const unpoStripped={};
    if(S.unpoData){
      Object.entries(S.unpoData).forEach(([ak,bnMap])=>{
        if(typeof bnMap!=='object'||Array.isArray(bnMap)) return;
        unpoStripped[ak]={};
        Object.entries(bnMap).forEach(([bn,sets])=>{
          if(!Array.isArray(sets)) return;
          unpoStripped[ak][bn]=sets.map(set=>{const cards=Array.isArray(set)?set:(set.cards||[]);const m=Array.isArray(set)?'':(set.memo||set.note||'');return {memo:m,cards:cards.map(c=>({owned:c.owned||false,note:c.note||''}))};});
        });
      });
    }
    const toSave={...S,adminUnlocked:false,unpoData:unpoStripped};
    localStorage.setItem('plave2_v2',JSON.stringify(toSave));
    // Save user-uploaded images separately (only changed ones)
    _saveUnpoImages();
  }catch(e){}
}
function _saveUnpoImages(){
  try{
    // Only save images that differ from UNPO_DATA (user-uploaded)
    const userImgs={};
    if(S.unpoData){
      Object.entries(S.unpoData).forEach(([ak,bnMap])=>{
        if(typeof bnMap!=='object'||Array.isArray(bnMap)) return;
        Object.entries(bnMap).forEach(([bn,sets])=>{
          if(!Array.isArray(sets)) return;
          sets.forEach((set,si)=>{
            const cards=Array.isArray(set)?set:(set.cards||[]);
            cards.forEach((c,i)=>{
              // Compare against INIT img (handling both flat array and object formats)
              const initSet=UNPO_DATA[ak]?.[bn]?.[si];
              const initCard=Array.isArray(initSet)?initSet[i]:(initSet?.cards?.[i]);
              const initImg=initCard?.img;
              if(c.img && c.img!==initImg){
                if(!userImgs[ak]) userImgs[ak]={};
                if(!userImgs[ak][bn]) userImgs[ak][bn]=[];
                if(!userImgs[ak][bn][si]) userImgs[ak][bn][si]={};
                userImgs[ak][bn][si][i]=c.img;
              }
            });
          });
        });
      });
    }
    localStorage.setItem('plave2_imgs',JSON.stringify(userImgs));
  }catch(e){}
}
function load(){
  // Always reset from latest init data
  S.distributors = JSON.parse(JSON.stringify(DISTRIBUTORS));
  S.stores       = JSON.parse(JSON.stringify(STORES));
  S.countryPrices= JSON.parse(JSON.stringify(PRICES));
  S.rates = {JPY:{rate:9.4537,manual:false,updAt:"2026-03-26T16:42:10.568Z"},
             CNY:{rate:218.3126,manual:false,updAt:"2026-03-26T16:42:10.568Z"},
             USD:{rate:1507.7751,manual:false,updAt:"2026-03-26T16:42:10.568Z"},
             TWD:{rate:47.1855,manual:false,updAt:"2026-03-26T16:42:10.568Z"},
             OTHER:{rate:1,manual:true,name:'기타',updAt:null}};
  S.ratesAt = "2026-03-26T17:40:18.345Z";
  // Restore only user preferences and purchases from localStorage
  // Always initialize unpoData from INIT first (ensures correct structure)
  // Deep copy INIT and normalize ALL sets to {cards:[], memo:''} format
  S.unpoData={};
  Object.entries(UNPO_DATA).forEach(([ak,bnMap])=>{
    S.unpoData[ak]={};
    Object.entries(bnMap).forEach(([bn,sets])=>{
      S.unpoData[ak][bn]=sets.map(set=>Array.isArray(set)
        ?{cards:set.map(c=>({img:c.img||null,note:c.note||'',owned:c.owned||false})),memo:''}
        :{cards:(set.cards||[]).map(c=>({img:c.img||null,note:c.note||'',owned:c.owned||false})),memo:set.memo||set.note||''});
    });
  });
  // Pre-populate multi-set groups
  Object.entries(UNPO_MULTI_SETS).forEach(([ak,bns])=>{
    if(!S.unpoData[ak]) S.unpoData[ak]={};
    Object.keys(bns).forEach(bn=>{
      if(!S.unpoData[ak][bn]){
        const n=bns[bn]||1;
        S.unpoData[ak][bn]=Array.from({length:n},()=>_mkSet());
      } else if(S.unpoData[ak][bn].length < bns[bn]){
        while(S.unpoData[ak][bn].length < bns[bn]) S.unpoData[ak][bn].push(_mkSet());
      }
    });
  });
  try{
    const raw=localStorage.getItem('plave2_v2');
    if(raw){
      const sv=JSON.parse(raw);
      if(sv.purchases)    S.purchases=sv.purchases;
      if(sv.theme)        S.theme=sv.theme;
      if(sv.filterStatus) S.filterStatus=sv.filterStatus;
      if(sv.hideZero)     S.hideZero=sv.hideZero;
      if(sv.calYear)      S.calYear=sv.calYear;
      if(sv.calMonth)     S.calMonth=sv.calMonth;
      // Restore owned/note state from stripped save
      const stripped=sv.unpoData||{};
      Object.entries(stripped).forEach(([ak,bnMap])=>{
        if(typeof bnMap!=='object'||Array.isArray(bnMap)) return;
        if(!S.unpoData[ak]) S.unpoData[ak]={};
        Object.entries(bnMap).forEach(([bn,sets])=>{
          if(!Array.isArray(sets)) return;
          if(!S.unpoData[ak][bn]){
            S.unpoData[ak][bn]=sets.map(s=>{
              const c=Array.isArray(s)?s:(s.cards||[]);
              return {cards:c.map(x=>({img:null,note:x.note||'',owned:x.owned||false})),memo:Array.isArray(s)?'':(s.note||'')};
            });
          } else {
            sets.forEach((sv_set,si)=>{
              const sv_cards=Array.isArray(sv_set)?sv_set:(sv_set.cards||[]);
              const sv_note=Array.isArray(sv_set)?'':(sv_set.memo||sv_set.note||'');
              if(!S.unpoData[ak][bn][si]){
                S.unpoData[ak][bn][si]={cards:sv_cards.map(x=>({img:null,note:x.note||'',owned:x.owned||false})),note:sv_note};
              } else {
                if(sv_note) S.unpoData[ak][bn][si].memo=sv_note;
                const ex=S.unpoData[ak][bn][si];
                const ex_cards=Array.isArray(ex)?ex:(ex.cards||[]);
                sv_cards.forEach((c,i)=>{if(ex_cards[i]){ex_cards[i].owned=c.owned||false;ex_cards[i].note=c.note||'';}});
              }
            });
          }
        });
      });
    }
  }catch(e){}
  // Apply images: INIT embedded + user-uploaded overrides
  try{
    const imgRaw=localStorage.getItem('plave2_imgs');
    const userImgs=imgRaw?JSON.parse(imgRaw):{};
    // INIT images already applied via deepCopy; apply user overrides
    Object.entries(userImgs).forEach(([ak,bnMap])=>{
      Object.entries(bnMap||{}).forEach(([bn,sets])=>{
        Object.entries(sets||{}).forEach(([si,cards])=>{
          Object.entries(cards||{}).forEach(([i,img])=>{
            if(S.unpoData[ak]?.[bn]?.[si]?.[i]) S.unpoData[ak][bn][si][i].img=img;
          });
        });
      });
    });
  }catch(e){}
  applyTheme();
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function rate(cur){if(cur==='KRW')return 1;return S.rates[cur]?.rate||DEF_RATES[cur]||1;}
function toKRW(amt,cur){return Math.round(amt*rate(cur));}
function getStoreCur(store){return COUNTRIES[store.country]?.cur||'KRW';}
function isOvs(store){return COUNTRIES[store.country]?.ovs||false;}
function storePrice(store,albumKey){
  if(store.priceMode==='nosale') return null;
  if(store.priceMode==='custom'){
    if(store.customPrices&&albumKey in store.customPrices) return store.customPrices[albumKey]; // null = 미판매
    return null; // not in customPrices = also 미판매 for custom mode
  }
  return S.countryPrices[store.country]?.[albumKey]??null;
}
function calcTotal(p){
  const store=S.stores.find(s=>s.id===p.storeId);
  if(!store) return 0;
  const cur=getStoreCur(store);
  const discount=p.discount||0;
  if(isOvs(store)){
    const r=rate(cur);
    let fAmt=p.foreignTotal||0;
    if(!fAmt){
      fAmt=(p.items||[]).reduce((sum,it)=>{
        const pr=it.unitPrice>0?it.unitPrice:(storePrice(store,it.type)||0);
        return sum+pr*(it.qty||0);
      },0);
    }
    const base=p.directKrw>0?p.directKrw:Math.round(fAmt*r);
    return Math.max(0, base+(p.intlShip||0)+(p.fwdFee||0)+(p.customs||0)+(p.domShip||0)-discount);
  } else {
    const items=(p.items||[]).reduce((sum,it)=>{
      const pr=it.unitPrice>0?it.unitPrice:(storePrice(store,it.type)||0);
      return sum+pr*(it.qty||0);
    },0);
    return Math.max(0, items+(p.domShip||0)-discount);
  }
}
// 대리구매 분 비용 (직접입력 우선, 없으면 수량 비율 자동계산)
function calcProxyTotal(p){
  if(p.proxyKrw>0) return p.proxyKrw;
  const store=S.stores.find(s=>s.id===p.storeId);
  if(!store)return 0;
  const totalQty=(p.items||[]).reduce((s,it)=>s+(it.qty||0),0);
  if(!totalQty)return 0;
  const proxyQty=(p.items||[]).reduce((s,it)=>s+(it.proxyQty||0),0);
  if(!proxyQty)return 0;
  return Math.round(calcTotal(p)*proxyQty/totalQty);
}
function totalSpend(){return S.purchases.reduce((s,p)=>s+calcTotal(p),0);}
function fKRW(n){if(!n&&n!==0)return '—';return Math.round(n).toLocaleString('ko-KR')+'원';}
function fFor(amt,cur){
  if(amt==null||amt==='')return '—';
  const syms={JPY:'¥',CNY:'¥(元)',USD:'$',TWD:'NT$',KRW:'₩'};
  return (syms[cur]||'')+Number(amt).toLocaleString();
}
function fDate(dt){
  if(!dt)return '';
  try{return new Date(dt).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return dt;}
}
function dDays(dt){
  if(!dt)return null;
  const diff=(new Date(dt)-new Date())/86400000;
  if(diff<0)return Math.floor(diff); // 이미 지난 날짜: floor → 음수
  return Math.ceil(diff);            // 미래 날짜: ceil → 양수
}
function stBadge(st){const s=STATUSES.find(x=>x.k===st)||STATUSES[0];return `<span class="bx ${s.cls}">${s.lb}</span>`;}
function distName(distId){return S.distributors.find(d=>d.id===distId)?.name||'';}
function platName(distId){return distName(distId);} // alias
function storeFull(store){
  if(!store)return '?';
  const dist=distName(store.distId);
  const ctry=COUNTRIES[store.country]?.lb||store.country;
  const lines=[store.name];
  if(dist)lines.push(dist+' · '+ctry);
  else lines.push(ctry);
  return lines;
}
function fmtStoreName(name){
  if(!name)return name;
  return name.replace('[음총]','<span style="color:var(--info);font-size:11px" title="음원총공팀">🎵음총</span>');
}
function storeLabel(store,badge=true){
  if(!store)return '?';
  const [main,sub]=storeFull(store);
  const bx=badge?`<span class="bx ${isOvs(store)?'bx-ovs':'bx-dom'}" style="font-size:10px;margin-right:4px">${isOvs(store)?'해외':'국내'}</span>`:'' ;
  return `<div class="store-full">${bx}<span class="store-full-main">${main}</span><span class="store-full-sub">${sub}</span></div>`;
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
let _tt;
function toast(msg,type='ok'){
  let el=document.getElementById('_toast');
  if(!el){el=document.createElement('div');el.id='_toast';
    el.style.cssText='position:fixed;bottom:70px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:8px;font-size:13px;z-index:9999;transition:opacity .3s;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.4)';
    document.body.appendChild(el);}
  el.textContent=msg;el.style.background=type==='err'?'var(--err)':type==='warn'?'var(--warn)':'var(--ok)';
  el.style.color='#fff';el.style.opacity='1';
  clearTimeout(_tt);_tt=setTimeout(()=>el.style.opacity='0',2800);
}

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
function toggleTheme(){S.theme=S.theme==='dark'?'light':'dark';applyTheme();save();}
function applyTheme(){
  document.documentElement.setAttribute('data-theme',S.theme);
  const b=document.getElementById('theme-btn');
  if(b)b.textContent=S.theme==='dark'?'🌙':'☀️';
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function go(tab){
  S.tab=tab;
  document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('on',el.dataset.tab===tab));
  render();
}
function render(){
  const map={dash:renderDash,purch:renderPurch,cal:renderCal,mgr:renderMgr,info:renderInfo};
  (map[S.tab]||renderDash)();
  // FAB: show + add button only on purch tab
  const fabAdd=document.getElementById('fab-add');
  if(fabAdd) fabAdd.style.display=S.tab==='purch'?'flex':'none';
  // Scroll listener for ↑ button
  const mc=document.getElementById('main');
  if(mc&&!mc._fabListener){
    mc._fabListener=true;
    mc.addEventListener('scroll',()=>{
      const btn=document.getElementById('fab-top');
      if(btn) btn.classList.toggle('show',mc.scrollTop>200);
    },{passive:true});
  }
}

// ═══════════════════════════════════════════
// RATES
// ═══════════════════════════════════════════
async function fetchRates(){
  try{
    const r=await fetch('https://latest.currency-api.pages.dev/v1/currencies/krw.json');
    if(!r.ok)throw new Error();
    const d=await r.json();const kk=d.krw;const now=new Date().toISOString();
    ['JPY','CNY','USD','TWD'].forEach(c=>{
      if(!S.rates[c].manual){
        // API gives: 1 KRW = X foreign → so 1 foreign = 1/X KRW
        S.rates[c].rate=parseFloat((1/kk[c.toLowerCase()]).toFixed(4));
        S.rates[c].updAt=now;
      }
    });
    S.ratesAt=now;save();render();toast('✓ 환율 업데이트');
  }catch(e){
    try{
      const r2=await fetch('https://open.er-api.com/v6/latest/KRW');
      if(!r2.ok)throw new Error();
      const d2=await r2.json();const now=new Date().toISOString();
      ['JPY','CNY','USD','TWD'].forEach(c=>{
        if(!S.rates[c].manual&&d2.rates[c]){
          S.rates[c].rate=parseFloat((1/d2.rates[c]).toFixed(4));
          S.rates[c].updAt=now;
        }
      });
      S.ratesAt=now;save();render();toast('✓ 환율 업데이트');
    }catch(e2){toast('⚠ 환율 자동조회 실패 — 수동입력 이용','warn');}
  }
}
function renderRateRow(){
  const el=document.getElementById('rate-row');if(!el)return;
  el.innerHTML=['JPY','CNY','USD','TWD'].map(c=>{
    const r=S.rates[c];
    return `<div class="rate-chip">${c} <b>${Math.round(r.rate).toLocaleString()}원</b>${r.manual?'<span style="color:var(--warn);font-size:10px"> 수동</span>':''}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function renderDash(){
  const mc=document.getElementById('main');
  const storeWithPurch=new Set(S.purchases.map(p=>p.storeId));

  // ── Spend ──
  const confirmedSpend=S.purchases.filter(p=>(p.status||'waiting')!=='waiting').reduce((s,p)=>s+calcTotal(p),0);
  const waitingSpend  =S.purchases.filter(p=>(p.status||'waiting')==='waiting').reduce((s,p)=>s+calcTotal(p),0);
  const proxySpend    =S.purchases.filter(p=>(p.status||'waiting')!=='waiting').reduce((s,p)=>s+calcProxyTotal(p),0);
  const mySpend       =confirmedSpend-proxySpend;

  // ── Status counts ──
  const bySt={none:0,waiting:0,ordered:0,delivered:0};
  S.stores.forEach(s=>{if(!storeWithPurch.has(s.id))bySt.none++;});
  S.purchases.forEach(p=>{const k=p.status||'waiting';bySt[k]=(bySt[k]||0)+1;});
  const totalPurchasable=S.stores.length;

  // ── Per-store spend ──
  const byStor={};
  S.purchases.forEach(p=>{byStor[p.storeId]=(byStor[p.storeId]||0)+calcTotal(p);});

  // ── Album totals ──
  const byAlb={};ALBUMS.forEach(a=>byAlb[a.k]=0);
  const byAlbProxy={};ALBUMS.forEach(a=>byAlbProxy[a.k]=0);
  S.purchases.forEach(p=>{(p.items||[]).forEach(it=>{
    byAlb[it.type]=(byAlb[it.type]||0)+(it.qty||0);
    byAlbProxy[it.type]=(byAlbProxy[it.type]||0)+(it.proxyQty||0);
  });});
  const hasAnyProxy=Object.values(byAlbProxy).some(v=>v>0);
  const showProxy=S.showProxyAlb&&hasAnyProxy;

  // ── Deadlines ──
  const deadlines=S.stores
    .filter(s=>s.purchaseEnd||s.purchaseEndTxt)
    .map(s=>({s,d:s.purchaseEnd?dDays(s.purchaseEnd):null,hasPurch:storeWithPurch.has(s.id)}))
    .filter(x=>S.hideExpired?x.d===null||x.d>=0:true)
    .sort((a,b)=>{
      if(a.d===null&&b.d===null) return a.s.name.localeCompare(b.s.name,'ko');
      if(a.d===null) return -1; // 소진시까지 → 맨 앞
      if(b.d===null) return 1;
      if(a.d<0&&b.d>=0) return 1;
      if(a.d>=0&&b.d<0) return -1;
      return a.d-b.d;
    });

  // ── Store spend sorted ──
  const storeSorted=Object.entries(byStor).sort((a,b)=>b[1]-a[1]);

  mc.innerHTML=`
  <!-- ① STAT CARDS: 2×2 grid, compact -->
  <div class="stat-row">
    <div class="stat-sm" style="grid-column:span 2">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div class="stat-sm-lb">💰 구매비 (확정)</div>
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span class="stat-sm-v mono" style="color:var(--ac);font-size:24px">${fKRW(confirmedSpend)}</span>
            ${waitingSpend>0?`<span style="font-size:13px;color:var(--warn)">+ 대기 ${fKRW(waitingSpend)}</span>`:''}
          </div>
          ${proxySpend>0?`<div style="display:flex;gap:10px;margin-top:4px;font-size:12px;flex-wrap:wrap">
            <span style="color:var(--tx2)">내 구매 <span class="mono" style="color:var(--tx)">${fKRW(mySpend)}</span></span>
            <span style="color:var(--tx3)">|</span>
            <span style="color:var(--tx2)">대리구매 <span class="mono" style="color:var(--warn)">${fKRW(proxySpend)}</span></span>
          </div>`:''}
          <div class="stat-sm-sub">${S.purchases.length}건 구매 기록</div>
        </div>
        ${(()=>{const tot=Object.values(byAlb).reduce((a,b)=>a+b,0);if(!tot)return '';const img=tot>=101?window._CHAR_IMG_101:tot>=51?window._CHAR_IMG_51_100:window._CHAR_IMG_1_50;return `<img src="${img}" style="width:64px;height:64px;object-fit:contain;image-rendering:pixelated;flex-shrink:0" title="총 ${tot}장">`;})()}
      </div>
    </div>
  </div>


  <!-- ② STATUS STRIP: clickable badges in one row -->
  <div class="status-strip">
    ${STATUSES.map(s=>{
      const cnt=bySt[s.k]||0;
      return `<span class="bx ${s.cls}" style="cursor:${cnt>0?'pointer':'default'};opacity:${cnt>0?1:0.4}"
        onclick="${cnt>0?`showStatusDetail('${s.k}')`:''}">${s.lb} <b>${cnt}</b></span>`;
    }).join('')}

  </div>

  <!-- ③ ALBUM COUNTS: above store spend -->
  <div class="card" style="margin-bottom:12px">
    <div class="card-hdr" style="margin-bottom:8px">
      <div class="card-ttl">💿 앨범별 구매수량</div>
      <div style="display:flex;align-items:center;gap:6px">
        ${hasAnyProxy?`<div class="toggle-pill">
          <button class="${!showProxy?'on':''}" onclick="S.showProxyAlb=false;renderDash()">전체</button>
          <button class="${showProxy?'on':''}" onclick="S.showProxyAlb=true;renderDash()">상세히</button>
        </div>`:''}
        <span style="font-size:11px;color:var(--tx2)">탭 → 조회</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
      ${ALBUMS.map(a=>{
        const total=byAlb[a.k]||0;
        const proxy=byAlbProxy[a.k]||0;
        const mine=total-proxy;
        return `
        <div style="background:var(--sur2);border-radius:var(--r-sm);padding:10px 8px;text-align:center;cursor:${total>0?'pointer':'default'};border:1px solid ${total>0?'var(--bd2)':'var(--bd)'};transition:all .15s"
          onclick="${total>0?`showAlbumDetail('${a.k}')`:''}">
          <div style="font-size:10px;color:var(--tx2);margin-bottom:4px">${a.lb}</div>
          <div class="mono" style="font-weight:700;font-size:18px;color:${total>0?'var(--ac)':'var(--tx3)'}">${total}</div>
          <div style="font-size:10px;color:var(--tx3)">장</div>
          ${showProxy&&proxy>0?`<div style="margin-top:4px;padding-top:4px;border-top:1px dashed var(--bd)">
            <div style="font-size:10px;color:var(--tx2)">내 ${mine}장</div>
            <div style="font-size:10px;color:var(--warn)">대리 ${proxy}장</div>
          </div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;margin-top:4px;border-top:1px solid var(--bd)">
      <span style="font-size:13px;font-weight:600">총계</span>
      <div style="text-align:right">
        <span class="mono" style="font-weight:700;font-size:16px;color:var(--ok)">${Object.values(byAlb).reduce((a,b)=>a+b,0)}장</span>
        ${showProxy?`<div style="font-size:11px;color:var(--warn)">대리 ${Object.values(byAlbProxy).reduce((a,b)=>a+b,0)}장 포함</div>`:''}
      </div>
    </div>
    ${S.purchases.filter(p=>p.owner?.trim()).length>0?`
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">
      <div style="font-size:11px;font-weight:600;color:var(--tx2);margin-bottom:5px">🎁 사다준 목록</div>
      ${[...new Set(S.purchases.filter(p=>p.owner).map(p=>p.owner))].map(ow=>{
        const t=S.purchases.filter(p=>p.owner===ow).reduce((s,p)=>s+calcTotal(p),0);
        return `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
          <span class="bx bx-prx">👤 ${ow}</span><span class="mono">${fKRW(t)}</span>
        </div>`;
      }).join('')}
    </div>`:''
    }
  </div>

  <!-- ② SCHEDULE: tap to cycle all upcoming -->
  ${(()=>{
    const today=new Date();today.setHours(0,0,0,0);
    const upcoming=SCHEDULE.filter(e=>new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(!upcoming.length)return '';
    const si=Math.min(S.schedIdx||0,upcoming.length-1);
    const ev=upcoming[si];
    const d=Math.round((new Date(ev.date)-today)/86400000);
    const isImp=ev.important;
    const dStr=d===0?'오늘!':d===1?'내일':'D-'+d;
    const color=isImp?'var(--ac2)':d<=3?'var(--err)':d<=7?'var(--warn)':'var(--ac)';
    return `<div style="background:${isImp?'rgba(123,95,255,.12)':'var(--sur2)'};border:${isImp?'2px solid var(--ac2)':'1px solid var(--bd)'};border-radius:var(--r-sm);padding:10px 14px;margin-bottom:12px;cursor:pointer;user-select:none" onclick="S.schedIdx=((S.schedIdx||0)+1)%${upcoming.length};renderDash()">
      <div style="font-size:10px;color:var(--tx2);margin-bottom:4px">📅 일정 (${si+1}/${upcoming.length}) <span style="color:var(--tx3)">탭 → 다음</span></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:${color}">${isImp?'🎵 ':''}${ev.label}</div>
          ${ev.time?`<div style="font-size:11px;color:var(--tx2);margin-top:2px">${ev.time}</div>`:''}
          <div style="font-size:11px;color:var(--tx3);margin-top:1px">${ev.date.slice(5).replace('-','/')}</div>
        </div>
        <div style="font-size:22px;font-weight:800;font-family:'Space Grotesk',monospace;color:${color}">${dStr}</div>
      </div>
    </div>`;
  })()}

  <!-- ⑤ DEADLINE: full width, compact, with toggle inside header -->
  <div class="card" style="margin-bottom:12px">
    <div class="card-hdr" style="margin-bottom:6px">
      <div class="card-ttl">⏰ 구매 마감일</div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:11px;color:var(--tx2)">${deadlines.length}건</span>
        <div class="toggle-pill" style="flex-shrink:0">
          <button class="${!S.hideExpired?'on':''}" onclick="S.hideExpired=false;renderDash()">전체</button>
          <button class="${S.hideExpired?'on':''}" onclick="S.hideExpired=true;renderDash()">진행중만</button>
        </div>
      </div>
    </div>
    ${deadlines.length===0?'<div style="color:var(--tx3);font-size:12px;padding:8px 0">마감일 없음</div>':
    `<div style="max-height:200px;overflow-y:auto;-webkit-overflow-scrolling:touch">
      ${deadlines.map(({s,d,hasPurch})=>{
        const color=d===null?'var(--tx2)':d<0?'var(--tx3)':d<=2?'var(--err)':d<=7?'var(--warn)':'var(--ok)';
        const dd=d===null?'소진시까지':d<0?`${Math.abs(d)}일전`:d===0?'오늘!':'D-'+d;
        const sName=s.name.replace('[음총]','').trim();
        const isEum=s.name.includes('[음총]');
        const psCnt=S.purchases.filter(p=>p.storeId===s.id).length;
        return `<div class="dl-compact" style="opacity:${d!==null&&d<0?0.5:1}">
          <div style="flex:1;min-width:0;overflow:hidden;cursor:pointer" onclick="showStoreInfoPopup('${s.id}')">
            <div class="dl-compact-name" title="${sName}" style="text-decoration:underline dotted;text-underline-offset:3px">${sName}</div>
            <div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap;margin-top:2px">
              ${distName(s.distId)?`<span class="bx bx-plt" style="font-size:9px">🏷 ${distName(s.distId)}</span>`:''}
              ${isEum?`<span class="bx bx-plt2" style="font-size:9px;padding:1px 5px">🎵음총</span>`:''}
              ${s.unpoPerk?`<span class="bx bx-pk" style="font-size:9px;padding:1px 5px">⭐미공포</span>`:''}
              ${s.videocall?`<span class="bx" style="font-size:9px;padding:1px 5px;background:rgba(79,126,255,.1);color:var(--ac);border:1px solid var(--ac)">📹영통</span>`:''}
            </div>
          </div>
          <div class="dl-compact-date">${s.purchaseEndTxt||(s.purchaseEnd?s.purchaseEnd.slice(5,10):'')}</div>
          ${hasPurch?`<span class="bx bx-ord" style="font-size:10px;flex-shrink:0">✓${psCnt}</span>`:'<span class="bx bx-none" style="font-size:10px;flex-shrink:0">미구매</span>'}
          <div class="dl-compact-d" style="color:${color}">${dd}</div>
        </div>`;
      }).join('')}
    </div>`}
  </div>
  <!-- ④ STORE SPEND: prominent card list -->
  <div class="card" style="margin-bottom:12px">
    <div class="card-hdr" style="margin-bottom:10px">
      <div class="card-ttl">🏪 판매처별 지출</div>
      <span style="font-size:11px;color:var(--tx2)">탭 → 상세</span>
    </div>
    ${storeSorted.length===0?
      `<div style="color:var(--tx3);font-size:13px;padding:12px 0;text-align:center">구매 기록 없음</div>`:
      `<div class="spend-cards">
        ${storeSorted.map(([sid,amt])=>{
          const store=S.stores.find(x=>x.id===sid);
          const cnt=S.purchases.filter(p=>p.storeId===sid).length;
          const dist=distName(store?.distId);
          const ctry=COUNTRIES[store?.country]?.lb||'';
          const isOvs_=isOvs(store);
          const sName=(store?.name||sid).replace('[음총]','').trim();
          const isEum=(store?.name||'').includes('[음총]');
          const waiting=S.purchases.filter(p=>p.storeId===sid&&(p.status||'waiting')==='waiting').reduce((s,p)=>s+calcTotal(p),0);
          return `<div class="spend-card" id="sc-${sid}" onclick="toggleSpendCard('${sid}')">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;min-width:0">
                <div class="spend-card-name">
                  <span>${sName}</span>
                  ${isEum?`<span class="bx bx-plt2" style="font-size:10px">🎵 음총</span>`:''}
                  <span class="bx ${isOvs_?'bx-ovs':'bx-dom'}" style="font-size:10px">${isOvs_?'해외':'국내'}</span>
                </div>
                <div class="spend-card-meta">
                  ${dist?`<span class="bx bx-plt" style="font-size:10px">🏷 ${dist}</span>`:''}
                  <span>${ctry}</span>
                  <span>${cnt}건</span>
                  ${waiting>0?`<span style="color:var(--warn)">대기 ${fKRW(waiting)}</span>`:''}
                </div>
              </div>
              <div style="text-align:right">
                <div class="spend-card-amt">${fKRW(amt)}</div>
                <div style="font-size:10px;color:var(--tx3);margin-top:2px">탭 ▸</div>
              </div>
            </div>
            <div class="spend-card-detail" id="scd-${sid}">
              ${buildStoreDet(sid)}
            </div>
          </div>`;
        }).join('')}
        <div class="spend-total">
          <span class="spend-total-lb">💰 확정 합계</span>
          <span class="spend-total-v">${fKRW(confirmedSpend)}</span>
        </div>
        ${waitingSpend>0?`<div style="display:flex;justify-content:space-between;padding:6px 2px;font-size:12px;color:var(--warn)">
          <span>⏳ 구매대기 포함 합계</span>
          <span class="mono" style="font-weight:700">${fKRW(confirmedSpend+waitingSpend)}</span>
        </div>`:''}
      </div>`
    }
  </div>


  `;
}

function toggleSpendCard(sid){
  const detail=document.getElementById('scd-'+sid);
  const card=document.getElementById('sc-'+sid);
  if(!detail||!card)return;
  const isOpen=detail.classList.contains('open');
  // Close all others
  document.querySelectorAll('.spend-card-detail.open').forEach(el=>{
    el.classList.remove('open');
    const c=el.closest('.spend-card');
    if(c){c.style.borderColor='';c.querySelector('.spend-card-amt+div').textContent='탭 ▸';}
  });
  if(!isOpen){
    detail.classList.add('open');
    card.style.borderColor='var(--ac)';
    const tapEl=card.querySelector('.spend-card-amt+div');
    if(tapEl)tapEl.textContent='닫기 ▾';
  }
}


function showAlbumDetail(albumKey){
  const a=ALBUMS.find(x=>x.k===albumKey);
  const rows=S.purchases.filter(p=>(p.items||[]).some(i=>i.type===albumKey&&i.qty>0));
  if(!rows.length)return;
  const html=rows.map(p=>{
    const store=S.stores.find(s=>s.id===p.storeId);
    const it=p.items.find(i=>i.type===albumKey);
    const si=STATUSES.find(s=>s.k===(p.status||'waiting'));
    const dist=distName(store?.distId);
    return `<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--bd);flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${(store?.name||'?').replace('[음총]','').trim()}</div>
        ${dist?`<div style="font-size:11px;color:var(--tx2)">${dist} · ${COUNTRIES[store?.country]?.lb||''}</div>`:''}
      </div>
      <span class="mono" style="font-weight:700">${it?.qty||0}장</span>
      <span class="bx ${si?.cls||''}">${si?.lb||'?'}</span>
      ${p.owner?`<span class="bx bx-prx">→ ${p.owner}</span>`:''}
      <button class="btn btn-s btn-xs" onclick="closeM();editP('${p.id}')">수정</button>
    </div>`;
  }).join('');
  const total=rows.reduce((s,p)=>{const it=p.items.find(i=>i.type===albumKey);return s+(it?.qty||0);},0);
  openM(`${a?.lb} — 총 ${total}장`,html);
  document.getElementById('m-foot').innerHTML=`
    ${s.url?`<a href="${s.url}" target="_blank" class="btn btn-p">🔗 구매 링크</a>`:''}
    <button class="btn btn-s" onclick="closeM();addP('${s.id}')">+ 구매추가</button>
    <button class="btn btn-s" onclick="closeM()">닫기</button>`;
}

function toggleStoreDet(sid){
  const row=document.getElementById(`sdet-${sid}`);
  const arr=document.getElementById(`arr-${sid}`);
  if(!row)return;
  const was=row.style.display!=='none';
  document.querySelectorAll('[id^="sdet-"]').forEach(r=>r.style.display='none');
  document.querySelectorAll('[id^="arr-"]').forEach(a=>{if(a)a.textContent='▸';});
  if(!was){row.style.display='';if(arr)arr.textContent='▾';}
}
function buildStoreDet(sid){
  const store=S.stores.find(s=>s.id===sid);
  const ps=S.purchases.filter(p=>p.storeId===sid);
  if(!ps.length)return '<div style="color:var(--tx3)">구매 기록 없음</div>';
  return ps.map(p=>{
    const t=calcTotal(p);const si=STATUSES.find(s=>s.k===(p.status||'waiting'));
    const items=(p.items||[]).filter(i=>i.qty>0).map(i=>ALBUMS.find(a=>a.k===i.type)?.lb+' ×'+i.qty).join(', ')||'—';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);flex-wrap:wrap">
      <span class="bx ${si?.cls||''}">${si?.lb||'?'}</span>
      <span style="flex:1;color:var(--tx2);font-size:13px">${items}</span>
      ${p.owner?`<span class="bx bx-prx">👤 ${p.owner}</span>`:''}
      <span class="mono" style="font-weight:700;color:var(--ac)">${fKRW(t)}</span>
      <button class="btn btn-s btn-xs" onclick="editP('${p.id}')">수정</button>
    </div>`;
  }).join('');
}
function showStatusDetail(stKey){
  const st=STATUSES.find(x=>x.k===stKey);
  let ps;
  if(stKey==='none'){
    const withPurch=new Set(S.purchases.map(p=>p.storeId));
    ps=S.stores.filter(s=>!withPurch.has(s.id)).map(s=>({_isStore:true,store:s}));
  } else {
    ps=S.purchases.filter(p=>(p.status||'waiting')===stKey);
  }
  if(!ps.length)return;
  const html=ps.map(p=>{
    if(p._isStore){
      return `<div style="padding:10px 0;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:8px">
        <span class="bx ${isOvs(p.store)?'bx-ovs':'bx-dom'}">${p.store.name}</span>
        <span style="flex:1;font-size:13px;color:var(--tx2)">구매 기록 없음</span>
        <button class="btn btn-p btn-xs" onclick="closeM();addP('${p.store.id}')">+ 추가</button>
      </div>`;
    }
    const store=S.stores.find(x=>x.id===p.storeId);
    const t=calcTotal(p);
    const items=(p.items||[]).filter(i=>i.qty>0).map(i=>ALBUMS.find(a=>a.k===i.type)?.lb+' ×'+i.qty).join(', ')||'—';
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid var(--bd);flex-wrap:wrap">
      <span class="bx ${isOvs(store)?'bx-ovs':'bx-dom'}">${store?.name||'?'}</span>
      <div style="flex:1"><div style="font-size:13px">${items}</div>${p.owner?`<span class="bx bx-prx" style="margin-top:4px">👤 ${p.owner}</span>`:''}</div>
      <div style="text-align:right"><div class="mono" style="font-weight:700;color:var(--ac)">${fKRW(t)}</div>${p.purchaseDate?`<div style="font-size:11px;color:var(--tx3)">${fDate(p.purchaseDate)}</div>`:''}</div>
      <button class="btn btn-s btn-xs" onclick="closeM();editP('${p.id}')">수정</button>
    </div>`;
  }).join('');
  openM(st.lb+' ('+ps.length+'건)',html);
  document.getElementById('m-foot').innerHTML=`<button class="btn btn-s" onclick="closeM()">닫기</button>`;
}

// ═══════════════════════════════════════════
// PURCHASES
// ═══════════════════════════════════════════
function renderPurch(){
  const mc=document.getElementById('main');
  const fs=S.filterStatus||'';
  const hz=S.hideZero||false;
  const sb=S.sortBy||'date';
  const sd=S.sortDir||'desc';
  const ss=S.sortStore||'';

  let filtered=S.purchases.filter(p=>!fs||(p.status||'waiting')===fs);
  if(ss) filtered=filtered.filter(p=>p.storeId===ss);
  filtered=[...filtered].sort((a,b)=>{
    let av,bv;
    if(sb==='date'){av=a.purchaseDate||'';bv=b.purchaseDate||'';}
    else if(sb==='store'){av=(S.stores.find(s=>s.id===a.storeId)?.name||'');bv=(S.stores.find(s=>s.id===b.storeId)?.name||'');}
    else if(sb==='amount'){av=calcTotal(a);bv=calcTotal(b);}
    else if(sb==='status'){av=STATUSES.findIndex(s=>s.k===(a.status||'waiting'));bv=STATUSES.findIndex(s=>s.k===(b.status||'waiting'));}
    else {av=a.purchaseDate||'';bv=b.purchaseDate||'';}
    if(av<bv)return sd==='asc'?-1:1;
    if(av>bv)return sd==='asc'?1:-1;
    return 0;
  });

  const storeOpts=`<option value="">전체 판매처</option>`+
    [...new Set(S.purchases.map(p=>p.storeId))].map(sid=>S.stores.find(x=>x.id===sid)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(store=>{ const sid=store.id;
      const s=S.stores.find(x=>x.id===sid);
      return `<option value="${sid}" ${ss===sid?'selected':''}>${store.name}</option>`;
    }).join('');

  mc.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <div style="font-size:15px;font-weight:700">🛒 구매기록 (${S.purchases.length}건)</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="addP()">+ 추가</button>
    </div>
  </div>

  <!-- FILTER CHIPS -->
  <div class="chip-row" style="margin-bottom:8px">
    <span class="chip sm ${!fs?'on':''}" onclick="S.filterStatus='';renderPurch()">전체</span>
    ${STATUSES.filter(s=>s.k!=='none').map(s=>`<span class="chip sm ${fs===s.k?'on':''}" onclick="S.filterStatus='${s.k}';renderPurch()">${s.lb}</span>`).join('')}
  </div>

  <!-- SORT BAR -->
  <div class="sort-bar">
    <span class="sort-lbl">정렬:</span>
    ${[['date','날짜'],['store','판매처'],['amount','금액'],['status','상태']].map(([k,lb])=>
      `<span class="chip sm ${sb===k?'on':''}" onclick="S.sortBy='${k}';if(S.sortBy==='${k}')S.sortDir=S.sortDir==='asc'?'desc':'asc';renderPurch()">${lb}${sb===k?(sd==='asc'?' ↑':' ↓'):''}</span>`
    ).join('')}
    <select onchange="S.sortStore=this.value;renderPurch()" style="flex:1;max-width:160px;padding:4px 8px;font-size:12px">${storeOpts}</select>
  </div>

  ${filtered.length===0?`<div class="empty"><div class="empty-ico">🛒</div>구매 기록이 없습니다<br><button class="btn btn-p" style="margin-top:12px" onclick="addP()">+ 첫 구매 추가</button></div>`
  :filtered.map(p=>pCard(p,hz)).join('')}`;
}

function pCard(p,hz){
  const store=S.stores.find(s=>s.id===p.storeId);if(!store)return '';
  const t=calcTotal(p);const pt=calcProxyTotal(p);const ovs=isOvs(store);const cur=getStoreCur(store);
  const dist=distName(store.distId);const ctry=COUNTRIES[store.country]?.lb||store.country;
  let items=p.items||[];if(hz)items=items.filter(i=>i.qty>0);
  const totalQty=items.filter(i=>i.qty>0).reduce((s,i)=>s+(i.qty||0),0);
  const proxyQtyTotal=items.filter(i=>i.qty>0).reduce((s,i)=>s+(i.proxyQty||0),0);
  const st=STATUSES.find(s=>s.k===(p.status||'waiting'));
  const isWaiting=(p.status||'waiting')==='waiting';
  const itemsSummary=items.filter(i=>i.qty>0).map(i=>{
    const a=ALBUMS.find(a=>a.k===i.type);const isPerk=i.type===store.unpoPerk;
    const pq=i.proxyQty||0;
    return `<span class="tag" style="font-size:11px">${a?.lb} ×${i.qty}${pq>0?` <span style="color:var(--warn)">(대리${pq})</span>`:''}${isPerk?' ⭐':''}</span>`;
  }).join('');
  const sName=store.name.replace("[음총]","").trim();
  const isEum=store.name.includes("[음총]");

  return `<div class="pcard${isWaiting?' pcard-waiting':''}">
    <div class="pcard-hdr">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:3px">
          <span class="pcard-store">${sName}</span>
          <span class="bx ${ovs?'bx-ovs':'bx-dom'}" style="font-size:10px">${ctry}</span>
          ${isEum?`<span class="bx bx-plt2" style="font-size:10px">🎵</span>`:''}
          ${dist?`<span class="bx bx-plt" style="font-size:10px">${dist}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${stBadge(p.status||'waiting')}
          ${p.owner?`<span class="bx bx-prx" style="font-size:10px">→ ${p.owner}</span>`:''}
          ${p.buyer?`<span class="bx" style="font-size:10px;background:rgba(34,197,94,.1);color:var(--ok);border:1px solid var(--ok)">↑ ${p.buyer}</span>`:''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="mono" style="font-weight:700;font-size:16px;color:${isWaiting?'var(--warn)':'var(--ac)'}">${fKRW(t)}</div>
        ${pt>0?`<div style="font-size:10px;color:var(--tx3);margin-top:1px">↳ 대리 <span class="mono">${fKRW(pt)}</span></div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;margin-left:4px">
        <button class="iBtn" onclick="editP('${p.id}')" title="수정">✏️</button>
        <button class="iBtn" onclick="delP('${p.id}')" style="color:var(--err)" title="삭제">🗑</button>
      </div>
    </div>
    ${(itemsSummary||proxyQtyTotal>0||ovs||p.deliveryDate||p.domShip||p.discount||p.notes||p.purchaseDate)?`
    <div class="pcard-body">
      ${itemsSummary?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${itemsSummary}</div>`:''}
      ${proxyQtyTotal>0?`<div style="font-size:11px;color:var(--tx2);margin-bottom:6px">↳ 대리 ${proxyQtyTotal}장 <span class="mono" style="color:var(--tx3)">(${fKRW(pt)})</span></div>`:''}
      ${ovs?renderOvsCost(p,store,cur):''}
      ${(p.deliveryDate||(!ovs&&p.domShip)||p.discount||p.notes||p.purchaseDate)?`
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--tx2);${ovs||proxyQtyTotal>0?'margin-top:6px':''}">
        ${p.deliveryDate?`<span>📦 ${p.deliveryDate.slice(5).replace('-','/')}</span>`:''}
        ${!ovs&&p.domShip?`<span>🚚 ${fKRW(p.domShip)}</span>`:''}
        ${p.discount?`<span style="color:var(--ok)">🏷 -${fKRW(p.discount)}</span>`:''}
        ${p.notes?`<span>📝 ${p.notes}</span>`:''}
        ${p.purchaseDate?`<span style="color:var(--tx3)">${fDate(p.purchaseDate)}</span>`:''}
      </div>`:''}
    </div>`:''}
  </div>`;
}

function renderOvsCost(p,store,cur){
  const r=rate(cur);
  let fAmt=p.foreignTotal||0;
  if(!fAmt) fAmt=(p.items||[]).reduce((s,it)=>{const pr=it.unitPrice>0?it.unitPrice:(storePrice(store,it.type)||0);return s+pr*(it.qty||0);},0);
  const base=p.directKrw>0?p.directKrw:Math.round(fAmt*r);
  const parts=[];
  if(fAmt>0)parts.push(`${fFor(fAmt,cur)} × ${Math.round(r).toLocaleString()}원`);
  if(p.intlShip)parts.push(`해외배송 ${fKRW(p.intlShip)}`);
  if(p.fwdFee)parts.push(`배송대행 ${fKRW(p.fwdFee)}`);
  if(p.customs)parts.push(`관세 ${fKRW(p.customs)}`);
  if(p.domShip)parts.push(`국내배송 ${fKRW(p.domShip)}`);
  return parts.length?`<div style="font-size:12px;color:var(--tx2);display:flex;flex-wrap:wrap;gap:6px">${parts.map(x=>`<span class="tag">${x}</span>`).join('')}</div>`:'';
}

// ═══════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════
function renderCal(){
  const mc=document.getElementById('main');
  const y=S.calYear,m=S.calMonth;
  const showOnline=S.calShowOnline!==false;
  const showOffline=S.calShowOffline!==false;
  const MN=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const DOW=['일','월','화','수','목','금','토'];
  const first=new Date(y,m,1).getDay();
  const last=new Date(y,m+1,0).getDate();
  const today=new Date();

  // 기본적으로 오늘 날짜 선택
  if(!S.calDay){
    const ty=today.getFullYear(),tm=today.getMonth();
    if(ty===y&&tm===m){
      S.calDay=`${ty}-${String(tm+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
  }

  // Build event map per day
  const evMap={}; // key=yyyy-mm-dd → [{type,store,purchaseId,label}]
  const storeWithPurch=new Set(S.purchases.map(p=>p.storeId));

  function addEv(ds,ev){
    if(!ds)return;
    const k=ds.slice(0,10);
    if(!evMap[k])evMap[k]=[];
    evMap[k].push(ev);
  }

  S.stores.forEach(s=>{
    if(showOnline && s.purchaseEnd) addEv(s.purchaseEnd,{type:'dl',store:s,label:s.name});
    if(showOffline && s.offlineStart){
      const st=new Date(s.offlineStart),en=s.offlineEnd?new Date(s.offlineEnd):new Date(s.offlineStart);
      for(let d=new Date(st);d<=en;d.setDate(d.getDate()+1)){
        addEv(d.toISOString().slice(0,10),{type:'off',store:s,label:s.name});
      }
    }
  });

  // 구매완료/배송예정 표시 제거됨
  // Fixed release dates (always shown)
  addEv('2026-04-13',{type:'release',label:'DIGITAL RELEASE',color:'var(--ac2)',store:null,fixed:true});
  addEv('2026-04-14',{type:'release',label:'ALBUM RELEASE',color:'var(--ok)',store:null,fixed:true});

  // Build cells
  let cells='';
  const totalCells=Math.ceil((first+last)/7)*7;
  for(let i=0;i<totalCells;i++){
    const dayNum=i-first+1;
    const valid=dayNum>=1&&dayNum<=last;
    const d=valid?new Date(y,m,dayNum):null;
    const ds=valid?`${y}-${String(m+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`:'';
    const isTd=d&&d.toDateString()===today.toDateString();
    const isSel=ds&&ds===S.calDay;
    const evs=valid&&evMap[ds]||[];
    const types=new Set(evs.map(e=>e.type));
    const hasPurch=types.has('pur');

    // Check if any STORE has a purchase (for deadline cells)
    const storeEvs=evs.filter(e=>e.type==='dl'||e.type==='off');
    const anyStorePurch=storeEvs.some(e=>e.store&&storeWithPurch.has(e.store.id));

    // 초동 D-day: Apr 13~20 2026
    const ddayRef=new Date('2026-04-20');
    let ddayLabel='';
    let chodongCls='';
    if(valid){
      const cellDate=new Date(y,m,dayNum);
      const diffDays=Math.round((ddayRef-cellDate)/(1000*60*60*24));
      if(diffDays>=0&&diffDays<=7){
        ddayLabel=diffDays===0?'D-Day':`D-${diffDays}`;
        // Apr 13 = D-7 (digital release)
        if(diffDays===7) chodongCls='chodong-digital';
        // Apr 14 = D-6 (album release) — same highlight style as Apr 13
        else if(diffDays===6) chodongCls='chodong-digital';
        // Apr 20 = D-Day
        else if(diffDays===0) chodongCls='chodong-dday';
        // Apr 15~19 = 초동 기간
        else chodongCls='chodong';
      }
    }

    // Show max 2 event strips in cell
    const releaseEvs=evs.filter(e=>e.type==='release');
    const otherEvs=evs.filter(e=>e.type!=='release');
    const displayEvs=[...releaseEvs,...otherEvs].slice(0,2);
    const strips=displayEvs.map(ev=>{
      const shortName=ev.label.length>7?ev.label.slice(0,7)+'…':ev.label;
      const pfx=ev.type==='dl'?'⏰':ev.type==='off'?'📍':ev.type==='release'?'🎵':'📌';
      return `<div class="cal-ev-strip ${ev.type}">${pfx} ${shortName}</div>`;
    }).join('');
    const more=evs.length>2?`<div style="font-size:8px;color:var(--tx3)">+${evs.length-2}</div>`:'';

    cells+=`<div class="cal-day${!valid?' other-month':''}${isTd?' today':''}${isSel?' selected':''}${evs.length||ddayLabel?' has-ev':''}${chodongCls?' '+chodongCls:''}" onclick="${valid?`selCalDay('${ds}')`:''}" style="${!valid?'pointer-events:none':''}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px">
        <div class="cal-dn" style="${isTd?'color:var(--ac);font-weight:700':''}">${valid?dayNum:''}</div>
        ${ddayLabel?`<span style="font-size:8px;color:${chodongCls==='chodong-digital'?'var(--ac2)':chodongCls==='chodong-album'?'var(--ok)':chodongCls==='chodong-dday'?'var(--err)':'var(--warn)'};font-weight:800">${ddayLabel}</span>`:''}
      </div>
      ${strips}${more}
    </div>`;
  }

  // Day detail
  const dayEvs=S.calDay&&evMap[S.calDay];
  let detailHtml='';
  if(dayEvs){
    const grouped={dl:[],off:[],release:[]};
    dayEvs.forEach(ev=>{const k=ev.type;if(grouped[k])grouped[k].push(ev);});

    detailHtml=`<div class="cal-detail">
      <div style="font-weight:700;font-size:14px;margin-bottom:10px">📅 ${S.calDay}</div>`;

    // Release events (fixed)
    grouped.release.forEach(ev=>{
      detailHtml+=`<div class="cal-detail-ev">
        <div class="cal-detail-head">
          <div class="cal-ev-dot" style="width:8px;height:8px;border-radius:50%;background:var(--ac2);flex-shrink:0"></div>
          <div style="font-weight:700;font-size:15px;color:var(--ac2)">${ev.label} 🎵</div>
        </div>
        <div class="cal-info-row"><span>📅</span><span>PLAVE 4th Mini Album Caligo Pt.2</span></div>
      </div>`;
    });

    // Deadlines
    grouped.dl.forEach(ev=>{
      const s=ev.store;
      const hasPu=storeWithPurch.has(s.id);
      const ps=S.purchases.filter(p=>p.storeId===s.id);
      detailHtml+=`<div class="cal-detail-ev">
        <div class="cal-detail-head">
          <div class="cal-ev-dot" style="width:8px;height:8px;border-radius:50%;background:var(--err);flex-shrink:0"></div>
          <div style="font-weight:600">⏰ 구매 마감 — ${s.name}</div>
          ${hasPu?`<span class="bx bx-ord" style="font-size:10px">구매완료</span>`:'<span class="bx bx-none" style="font-size:10px">미구매</span>'}
        </div>
        ${s.purchaseEndTxt?`<div class="cal-info-row"><span>📋</span><span>${s.purchaseEndTxt}</span></div>`:''}
        ${s.url?`<div class="cal-info-row"><span>🔗</span><a href="${s.url}" target="_blank">구매 링크</a></div>`:''}
        ${ps.length?`<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${ps.map(p=>{
          const si=STATUSES.find(x=>x.k===(p.status||'waiting'));
          const items=(p.items||[]).filter(i=>i.qty>0).map(i=>ALBUMS.find(a=>a.k===i.type)?.lb+' ×'+i.qty).join(', ');
          return `<div style="background:var(--sur2);border-radius:4px;padding:4px 8px;font-size:11px">
            <span class="bx ${si?.cls||''}" style="font-size:10px">${si?.lb}</span> ${items}
            <button class="btn btn-s btn-xs" onclick="editP('${p.id}')" style="margin-left:4px">수정</button>
          </div>`;
        }).join('')}</div>`:''}
        ${!hasPu?`<button class="btn btn-p btn-xs" style="margin-top:6px" onclick="addP('${s.id}')">+ 구매 추가</button>`:''}
      </div>`;
    });

    // Offline events
    grouped.off.forEach(ev=>{
      const s=ev.store;
      const range=s.offlineStart&&s.offlineEnd&&s.offlineStart!==s.offlineEnd?`${s.offlineStart} ~ ${s.offlineEnd}`:s.offlineStart||'';
      detailHtml+=`<div class="cal-detail-ev">
        <div class="cal-detail-head">
          <div class="cal-ev-dot" style="width:8px;height:8px;border-radius:50%;background:var(--pk);flex-shrink:0"></div>
          <div style="font-weight:600">📍 오프라인 이벤트 — ${s.name}</div>
          ${s.offlineLuckyDraw?`<span class="bx bx-pk" style="font-size:10px">🎰 럭드</span>`:''}
        </div>
        ${range?`<div class="cal-info-row"><span>📅</span><span>${range}</span></div>`:''}
        ${s.offlineHours?`<div class="cal-info-row"><span>⏰</span><span>${s.offlineHours}</span></div>`:''}
        ${s.offlineAddress?`<div class="cal-info-row"><span>📍</span><span>${s.offlineAddress}</span></div>`:''}
        ${s.offlineNote?`<div class="cal-info-row"><span>📝</span><span style="white-space:pre-line">${s.offlineNote}</span></div>`:''}
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${s.url?`<a href="${s.url}" target="_blank" class="btn btn-s btn-xs">🔗 링크</a>`:''}
          <button class="btn btn-s btn-xs" onclick="editStore('${s.id}')">✏️ 정보수정</button>
        </div>
      </div>`;
    });



    detailHtml+=`</div>`;
  }

  mc.innerHTML=`<div class="cal-wrap">
    <div class="cal-nav">
      <button class="btn btn-s btn-sm" onclick="calMove(-1)">‹</button>
      <div class="cal-nav-title">${y}년 ${MN[m]}</div>
      <button class="btn btn-s btn-sm" onclick="calMove(1)">›</button>
    </div>
    <div class="cal-toggle-row">
      <span class="chip sm ${showOnline?'on':''}" onclick="S.calShowOnline=!S.calShowOnline;renderCal()">🛍 온라인판매</span>
      <span class="chip sm ${showOffline?'on':''}" onclick="S.calShowOffline=!S.calShowOffline;renderCal()">📍 오프라인</span>
      <span style="display:flex;align-items:center;gap:3px;font-size:11px;color:var(--tx2)">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--ac2);display:inline-block"></span>디지털/앨범발매
      </span>


      <span style="display:flex;align-items:center;gap:3px;font-size:11px;color:var(--warn)">
        <span style="width:7px;height:7px;border-radius:2px;background:rgba(245,158,11,.4);border:1px solid var(--warn);display:inline-block"></span>초동기간
      </span>
      <span style="font-size:11px;color:var(--err);font-weight:700">D-X 초동마감</span>
    </div>
    <div class="cal-grid">
      ${DOW.map((d,i)=>`<div class="cal-dow" style="${i===0?'color:var(--err)':i===6?'color:var(--ac)':''}">${d}</div>`).join('')}
      ${cells}
    </div>
    ${detailHtml}
  </div>`;
}
function calMove(d){
  S.calMonth+=d;
  if(S.calMonth>11){S.calMonth=0;S.calYear++;}
  if(S.calMonth<0){S.calMonth=11;S.calYear--;}
  S.calDay=null;render();
}
function selCalDay(ds){S.calDay=S.calDay===ds?null:ds;render();}

// ═══════════════════════════════════════════
// MANAGE
// ═══════════════════════════════════════════
function renderMgr(){
  const mc=document.getElementById('main');
  const sub=S.mgrSub||'stores';
  // Ensure admin unlock for non-stores subs

  mc.innerHTML=`
  <div class="sub-tabs">
    <div class="sub-tab ${sub==='stores'?'on':''}" onclick="S.mgrSub='stores';renderMgr()">🏪 판매처 / 플랫폼</div>
    <div class="sub-tab ${sub==='prices'?'on':''}" onclick="S.mgrSub='prices';renderMgr()">💰 단가 관리</div>
    <div class="sub-tab ${sub==='rates'?'on':''}" onclick="S.mgrSub='rates';renderMgr()">💱 환율</div>
    <div class="sub-tab ${sub==='unpo'?'on':''}" onclick="S.mgrSub='unpo';renderMgr()">⭐ 미공포 관리</div>
  </div>
  <div id="mgr-sub"></div>`;
  if(sub==='stores') renderMgrStores();
  else if(sub==='prices') renderMgrAdmin('prices');
  else if(sub==='unpo') renderMgrUnpo();
  else renderMgrAdmin('rates');
}

const ADMIN_PW = '1234'; // Change this password
function renderMgrAdmin(mode){
  const el=document.getElementById('mgr-sub');
  if(S.adminUnlocked){
    if(mode==='prices') renderMgrPrices();
    else renderMgrRates();
    el.insertAdjacentHTML('afterbegin',`<div style="display:flex;justify-content:flex-end;margin-bottom:8px">
      <button class="btn btn-s btn-sm" onclick="S.adminUnlocked=false;renderMgr()">🔒 잠금</button>
    </div>`);
  } else {
    el.innerHTML=`<div style="display:flex;justify-content:center;padding:40px 20px">
      <div class="lock-box">
        <div style="font-size:36px;margin-bottom:12px">🔒</div>
        <div style="font-weight:700;margin-bottom:6px">관리자 전용</div>
        <div style="font-size:12px;color:var(--tx2);margin-bottom:16px">${mode==='prices'?'단가 관리':'환율 설정'}는 비밀번호가 필요합니다</div>
        <input type="password" id="admin-pw" placeholder="비밀번호 입력" style="margin-bottom:10px;text-align:center" onkeydown="if(event.key==='Enter')checkAdminPw('${mode}')">
        <button class="btn btn-p" style="width:100%" onclick="checkAdminPw('${mode}')">확인</button>
      </div>
    </div>`;
    setTimeout(()=>document.getElementById('admin-pw')?.focus(),100);
  }
}
function checkAdminPw(mode){
  const pw=document.getElementById('admin-pw')?.value;
  if(pw===ADMIN_PW){S.adminUnlocked=true;renderMgr();}
  else{
    const inp=document.getElementById('admin-pw');
    if(inp){inp.style.borderColor='var(--err)';inp.value='';inp.placeholder='비밀번호가 틀렸습니다';}
  }
}

function renderMgrStores(){
  const el=document.getElementById('mgr-sub');
  el.innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <div style="font-weight:600">판매처 목록 (${S.stores.length}곳) <span style='font-size:11px;color:var(--tx2)'>— ⚙ 관리자 전용</span></div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-s btn-sm" onclick="openDistMgr()">플랫폼 관리</button>
      <button class="btn btn-p btn-sm" onclick="addStore()">+ 판매처 추가</button>
    </div>
  </div>
  ${[...S.stores].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(s=>storeCard(s)).join('')}`;
}

function storeCard(s){
  const ovs=isOvs(s);const cur=getStoreCur(s);
  const days=s.purchaseEnd?dDays(s.purchaseEnd):null;
  const deadline=s.purchaseEndTxt||(s.purchaseEnd?fDate(s.purchaseEnd):'');
  const dcolor=days===null?'var(--tx2)':days<0?'var(--tx3)':days<=2?'var(--err)':days<=7?'var(--warn)':'var(--ok)';
  const activePrices=ALBUMS.filter(a=>storePrice(s,a.k)!=null);
  return `<div class="scard">
    <div style="display:flex;align-items:flex-start;gap:8px">
      <div style="flex:1">
        <div class="scard-name">${s.name.replace("[음총]","").trim()} ${s.name.includes("[음총]")?'<span class="bx bx-plt2" style="font-size:10px">🎵 음총</span>':''}</div>
        <div class="scard-dist">${distName(s.distId)||''}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
          <span class="bx ${ovs?'bx-ovs':'bx-dom'}">${COUNTRIES[s.country]?.lb||s.country}</span>
          
          ${s.priceMode==='nosale'?`<span class="bx" style="background:rgba(239,68,68,.1);color:var(--err);border:1px solid var(--err)">🚫 미판매</span>`:''}
          ${s.unpoPerk?`<span class="bx bx-pk">⭐ ${ALBUMS.find(a=>a.k===s.unpoPerk)?.lb||s.unpoPerk} 미공포</span>`:''}
          ${s.videocall?`<span class="bx" style="background:rgba(79,126,255,.1);color:var(--ac);border:1px solid var(--ac)">📹 영통응모</span>`:''}
          
        </div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-s btn-xs" onclick="editStore('${s.id}')">✏️</button>
        ${s.custom?`<button class="btn btn-d btn-xs" onclick="delStore('${s.id}')">🗑</button>`:''}
      </div>
    </div>
    ${(s.purchaseStart||deadline)?`
    <div style="background:var(--sur2);border-radius:4px;padding:7px 10px;margin-top:8px;font-size:12px">
      <span style="color:var(--tx2)">🛍 구매기간 </span>
      ${s.purchaseStart?`<span style="color:var(--tx2)">${fDate(s.purchaseStart)} ~</span>`:''}
      ${deadline?`<span style="font-weight:600;color:${dcolor}"> ${deadline}${days>=0?' (D-'+days+')':days<0?' (종료)':''}</span>`:''}
    </div>`:''}
    ${s.offlineNote?`
    <div style="background:var(--pk-g);border:1px solid rgba(168,85,247,.2);border-radius:4px;padding:7px 10px;margin-top:6px;font-size:12px">
      <div style="color:var(--pk);font-weight:600;margin-bottom:6px">📍 오프라인${s.offlineLuckyDraw?' 🎰 럭드':''} ${s.offlineStart?`(${s.offlineStart}${s.offlineEnd&&s.offlineEnd!==s.offlineStart?'~'+s.offlineEnd:''})`:''}</div>
      ${s.offlineHours?`<div style="font-size:11px;color:var(--tx2)">⏰ ${s.offlineHours}</div>`:''}
      ${s.offlineAddress?`<div style="font-size:11px;color:var(--tx2)">📍 ${s.offlineAddress}</div>`:''}
      ${s.offlineNote?`<div style="white-space:pre-line;color:var(--tx2);margin-top:3px">${s.offlineNote}</div>`:''}
    </div>`:''}
    ${activePrices.length?`
    <div class="store-prices" style="margin-top:8px">
      ${activePrices.map(a=>{
        const p=storePrice(s,a.k);const isPerk=a.k===s.unpoPerk;
        return `<div class="sp-item ${isPerk?'perk':''}">
          <div class="sp-lb">${a.lb}${isPerk?' ⭐':''}</div>
          <div class="sp-v">${cur==='KRW'?fKRW(p):fFor(p,cur)}</div>
        </div>`;
      }).join('')}
    </div>`:''}
    ${s.url?`<div style="margin-top:8px"><a href="${s.url}" target="_blank" class="btn btn-s btn-xs">🔗 구매 링크</a></div>`:''}
    ${s.memo?`<div style="margin-top:6px;font-size:12px;color:var(--tx2);padding:6px 8px;background:var(--sur2);border-radius:4px;white-space:pre-line">📝 ${s.memo}</div>`:''}
  </div>`;
}

function renderMgrPrices(){
  const el=document.getElementById('mgr-sub');
  let html=`<div class="alert-info">각 국가·통화별 기준 단가입니다.</div>`;
  Object.entries(COUNTRIES).forEach(([code,info])=>{
    const prices=S.countryPrices[code]||{};
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-hdr"><div class="card-ttl">${info.lb} (${info.cur})</div></div>
      <div class="grid g4">
        ${ALBUMS.map(a=>`<div>
          <div class="fl">${a.lb}</div>
          <input type="number" step="0.01" value="${prices[a.k]??''}" placeholder="없음"
            onchange="S.countryPrices['${code}']['${a.k}']=this.value===''?null:parseFloat(this.value);save();renderMgrPrices()">
        </div>`).join('')}
      </div>
    </div>`;
  });
  el.innerHTML=html;
}

function renderMgrRates(){
  const el=document.getElementById('mgr-sub');
  const upd=S.ratesAt?new Date(S.ratesAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'미조회';
  el.innerHTML=`
  <div class="alert-info">마지막 업데이트: ${upd}</div>
  <button class="btn btn-p" style="margin-bottom:14px" onclick="fetchRates()">↻ 실시간 환율 조회</button>
  <div class="grid g2">
    ${['JPY','CNY','USD','TWD','OTHER'].map(c=>{
      const r=S.rates[c];
      const lbs={JPY:'🇯🇵 JPY',CNY:'🇨🇳 CNY',USD:'🇺🇸 USD',TWD:'🇹🇼 TWD',OTHER:'🌐 기타'};
      return `<div class="card">
        <div class="card-hdr">
          <div class="card-ttl">${lbs[c]}</div>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
            <input type="checkbox" ${r.manual?'checked':''} onchange="S.rates['${c}'].manual=this.checked;save();renderMgrRates()" style="width:auto"> 수동
          </label>
        </div>
        ${c==='OTHER'?`<div class="fg"><div class="fl">통화명</div><input type="text" value="${r.name||''}" onchange="S.rates['${c}'].name=this.value;save()"></div>`:''}
        <div class="fg">
          <div class="fl">1 ${c==='OTHER'?r.name||'기타':c} = __ 원</div>
          <input type="number" step="0.01" value="${r.rate}" onchange="S.rates['${c}'].rate=parseFloat(this.value)||0;save()" ${!r.manual?'readonly style="background:var(--sur3);color:var(--tx2)"':''}>
          ${!r.manual?`<div class="fn">${r.updAt?'✓ '+new Date(r.updAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 업데이트':'자동조회 대기'}</div>`:`<div class="fn" style="color:var(--warn)">수동입력 (자동조회 제외)</div>`}
        </div>
        <div style="font-size:12px;color:var(--tx2)">예시: 1,000 = ${fKRW(1000*r.rate)}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ═══════════════════════════════════════════
// PURCHASE MODAL
// ═══════════════════════════════════════════
function addP(preStoreId){
  const p={id:null,storeId:preStoreId||S.stores[0]?.id||'',items:[],status:'waiting',
    domShip:0,foreignTotal:0,directKrw:0,intlShip:0,fwdFee:0,customs:0,
    buyer:'',owner:'',notes:'',purchaseDate:''};
  showPModal(p,false);
}
function editP(id){
  const p=S.purchases.find(x=>x.id===id);
  if(!p)return;
  showPModal(JSON.parse(JSON.stringify(p)),true);
}

function showPModal(p,isEdit){
  window._ep=p;

  const stOpts2=STATUSES.filter(s=>s.k!=='none').map(s=>`<option value="${s.k}" ${(p.status||'waiting')===s.k?'selected':''}>${s.lb}</option>`).join('');

  openM(isEdit?'구매 기록 수정':'구매 기록 추가',`
  <!-- Store picker: grouped by base name -->
  <div class="fg" style="margin-bottom:10px">
    <div class="fl">🏪 판매처 선택 <span class="req">*</span></div>
    <div style="position:relative;margin-bottom:6px">
      <input type="text" id="pf-search" placeholder="판매처 검색..." oninput="_filterStoreList(this.value)"
        style="padding-left:28px;padding-right:8px;border-radius:var(--r-sm)">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none">🔍</span>
    </div>
    <div id="pf-store-list" style="max-height:240px;overflow-y:auto;border:1px solid var(--bd);border-radius:var(--r-sm);background:var(--sur2)"></div>
  </div>

  <!-- Status -->
  <div class="fg">
    <div class="fl">구매 상태</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap" id="pf-status-btns">
      ${STATUSES.filter(s=>s.k!=='none').map(s=>`<button type="button" class="pf-st-btn btn btn-s" data-st="${s.k}" onclick="_selStatus('${s.k}')" style="flex:1;min-width:70px;font-size:12px">${s.lb}</button>`).join('')}
    </div>
    <input type="hidden" id="pf-st" value="${p.status||'waiting'}">
  </div>

  <div id="pf-dyn"></div>
  <div class="divider"></div>
  <div class="fr2 fg">
    <div><div class="fl">사다줄 경우 — 받는 사람</div>
      <input type="text" id="pf-own" value="${p.owner||''}" placeholder="본인 구매시 비워두세요"></div>
    <div><div class="fl">대리구매 받은 경우 — 사준 사람</div>
      <input type="text" id="pf-buy" value="${p.buyer||''}" placeholder="직접 구매시 비워두세요"></div>
  </div>
  <div class="fr2 fg">
    <div><div class="fl">구매일</div><input type="datetime-local" id="pf-dt" value="${p.purchaseDate||''}"></div>
    <div><div class="fl">📦 배송예정일</div>
      <input type="date" id="pf-dd" value="${p.deliveryDate||''}" placeholder="예: 2026-04-25"
        oninput="this.dataset.manual='1'"
        ${p.deliveryDate?'data-manual="1"':'data-manual="0"'}>
      <div class="fn" style="color:var(--tx3)">판매처 기본값 자동 입력 · 수정 시 직접 입력값 사용</div>
    </div>
  </div>
  <div class="fg">
    <div class="fl">메모</div><input type="text" id="pf-nt" value="${p.notes||''}" placeholder="주문번호 등">
  </div>`);

  document.getElementById('m-foot').innerHTML=`
    <button class="btn btn-s" onclick="closeM()">취소</button>
    <button class="btn btn-p" onclick="_saveP()">저장</button>`;

  _buildStoreList('', p.storeId);
  if(p.storeId) _updPForm();
  // Set initial status highlight after render
  setTimeout(()=>_selStatus(p.status||'waiting'),10);
}
function _selStatus(k){
  if(window._ep) window._ep.status=k;
  const hidden=document.getElementById('pf-st');
  if(hidden) hidden.value=k;
  const colors={waiting:'var(--warn)',ordered:'var(--ac)',delivered:'var(--ok)'};
  document.querySelectorAll('.pf-st-btn').forEach(b=>{
    const isSel=b.dataset.st===k;
    const c=colors[b.dataset.st]||'var(--ac)';
    b.style.border=`2px solid ${isSel?c:'var(--bd)'}`;
    b.style.color=isSel?c:'var(--tx2)';
    b.style.fontWeight=isSel?'700':'400';
    b.style.background=isSel?`color-mix(in srgb,${c} 12%,transparent)`:'transparent';
    const lb=STATUSES.find(s=>s.k===b.dataset.st)?.lb||b.dataset.st;
    b.textContent=(isSel?'✓ ':'')+lb;
  });
}

function _getBaseName(name){
  const clean=name.replace('[음총]','').trim();
  return clean.replace(/\s*\([^)]*\)\s*$/, '').trim() || clean;
}

function _buildStoreList(filter, selStoreId){
  const el=document.getElementById('pf-store-list');
  if(!el)return;
  const q=(filter||'').toLowerCase();

  // Group stores by base name
  const groups={};
  const allStores=[...S.stores].filter(s=>s.priceMode!=='nosale').sort((a,b)=>{
    const ba=_getBaseName(a.name), bb=_getBaseName(b.name);
    const na=a.name.replace('[음총]','').trim(), nb=b.name.replace('[음총]','').trim();
    const cmp=ba.localeCompare(bb,'ko');
    return cmp!==0?cmp:na.localeCompare(nb,'ko');
  });

  allStores.forEach(s=>{
    const base=_getBaseName(s.name);
    const sName=s.name.replace('[음총]','').trim();
    const distN=distName(s.distId);
    const ctry=COUNTRIES[s.country]?.lb||s.country;
    const searchStr=(sName+' '+distN+' '+ctry+' '+base).toLowerCase();
    if(q && !searchStr.includes(q)) return;
    if(!groups[base])groups[base]=[];
    groups[base].push(s);
  });

  const baseKeys=Object.keys(groups);
  if(!baseKeys.length){
    el.innerHTML='<div style="padding:14px;text-align:center;color:var(--tx3);font-size:13px">검색 결과 없음</div>';
    return;
  }

  let out='';
  baseKeys.forEach(base=>{
    const ss=groups[base];
    const isSingle=ss.length===1&&_getBaseName(ss[0].name)===ss[0].name.replace('[음총]','').trim();
    const isEumBase=ss.some(s=>s.name.includes('[음총]'));

    if(ss.length===1){
      // Single store: show as one row
      const s=ss[0];
      const sName=s.name.replace('[음총]','').trim();
      const dist=distName(s.distId);
      const ctry=COUNTRIES[s.country]?.lb||s.country;
      const isOvs_=isOvs(s);
      const isEum=s.name.includes('[음총]');
      const sel=s.id===selStoreId;
      out+=`<div class="store-list-item ${sel?'sel':''}" id="sli-${s.id}" onclick="_selPStore('${s.id}')" style="cursor:pointer;padding:9px 12px;border-bottom:1px solid var(--bd);transition:background .1s;${sel?'background:var(--ac-g);border-left:3px solid var(--ac)':''}">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="flex:1;font-size:13px;font-weight:${sel?700:500}">${sName}${isEum?' <span style="font-size:10px;color:var(--info)">🎵</span>':''}</span>
          <span class="bx ${isOvs_?'bx-ovs':'bx-dom'}" style="font-size:10px">${ctry}</span>
          ${dist?`<span class="bx bx-plt" style="font-size:10px">🏷 ${dist}</span>`:''}
        </div>
      </div>`;
    } else {
      // Group header + sub-items
      out+=`<div style="padding:7px 12px 3px;background:var(--sur3);font-size:11px;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:5px">
        ${isEumBase?'<span style="font-size:10px;color:var(--info)">🎵</span>':'🏪'} ${base}
      </div>`;
      ss.forEach(s=>{
        const sName=s.name.replace('[음총]','').trim();
        const subLabel=sName.replace(base,'').replace(/^\s*\(|\)\s*$/g,'').trim()||sName;
        const dist=distName(s.distId);
        const ctry=COUNTRIES[s.country]?.lb||s.country;
        const isOvs_=isOvs(s);
        const sel=s.id===selStoreId;
        out+=`<div class="store-list-item ${sel?'sel':''}" id="sli-${s.id}" onclick="_selPStore('${s.id}')" style="cursor:pointer;padding:8px 12px 8px 20px;border-bottom:1px solid var(--bd);transition:background .1s;${sel?'background:var(--ac-g);border-left:3px solid var(--ac)':''}">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="flex:1;font-size:12px;font-weight:${sel?700:400};color:${sel?'var(--tx)':'var(--tx2)'}">↳ ${subLabel||sName}</span>
            <span class="bx ${isOvs_?'bx-ovs':'bx-dom'}" style="font-size:10px">${ctry}</span>
            ${dist?`<span class="bx bx-plt" style="font-size:10px">🏷 ${dist}</span>`:''}
          </div>
        </div>`;
      });
    }
  });

  el.innerHTML=out;

  // Scroll selected item into view
  if(selStoreId){
    setTimeout(()=>{
      const selEl=document.getElementById('sli-'+selStoreId);
      if(selEl)selEl.scrollIntoView({block:'nearest'});
    },50);
  }
}

function _filterStoreList(q){
  const selStoreId=window._ep?.storeId||'';
  _buildStoreList(q, selStoreId);
}

function _selPStore(sid){
  if(!window._ep)return;
  window._ep.storeId=sid;
  // Update visual selection
  document.querySelectorAll('.store-list-item').forEach(el=>{
    const isSel=el.id==='sli-'+sid;
    el.style.background=isSel?'var(--ac-g)':'';
    el.style.borderLeft=isSel?'3px solid var(--ac)':'';
    const txt=el.querySelector('span[style*="font-weight"]');
    if(txt)txt.style.fontWeight=isSel?700:txt.id?.includes('sub')?400:500;
  });
  const store=S.stores.find(s=>s.id===sid);
  if(store){
    _showPlatRow(store);
    // Auto-fill delivery date from store default if not manually set
    const ddEl=document.getElementById('pf-dd');
    if(ddEl&&ddEl.dataset.manual!=='1'&&store.defDeliveryDate){
      ddEl.value=store.defDeliveryDate;
    }
  }
  _updPForm();
}


function _showPlatRow(store){
  const platRow=document.getElementById('pf-plat-row');
  const platInfo=document.getElementById('pf-plat-info');
  if(!platRow||!platInfo)return;
  const dist=distName(store.distId);
  if(dist){
    platRow.style.display='';
    platInfo.innerHTML=`<span class="bx bx-plt">🏷 ${dist}</span>`;
  } else {
    platRow.style.display='none';
  }
}

function _updPForm(){
  const p=window._ep;if(!p)return;
  const sid=p.storeId;if(!sid)return;
  const store=S.stores.find(s=>s.id===sid);if(!store)return;
  const ovs=isOvs(store);const cur=getStoreCur(store);const r=rate(cur);
  const el=document.getElementById('pf-dyn');if(!el)return;

  // Ensure items array
  if(!p.items||p.items.length===0) p.items=ALBUMS.map(a=>({type:a.k,qty:0,unitPrice:0}));
  ALBUMS.forEach(a=>{if(!p.items.find(i=>i.type===a.k))p.items.push({type:a.k,qty:0,unitPrice:0});});

  const albRows=ALBUMS.map(a=>{
    const isPerk=a.k===store.unpoPerk;
    const sp=storePrice(store,a.k);
    const item=p.items.find(i=>i.type===a.k)||{qty:0,proxyQty:0,unitPrice:0};
    const disabled=sp==null;
    const priceStr=disabled?'취급없음':ovs?fFor(sp,cur)+` ≈ ${fKRW(Math.round(sp*r))}`:fKRW(sp);
    const pqty=item.proxyQty||0;
    const hasProxy=pqty>0;
    const qty=item.qty||0;
    return `<div class="alb-row ${isPerk?'perk':''}" style="${disabled?'opacity:.4':''}">
      <div class="alb-info">
        <div class="alb-name">${a.lb}${isPerk?` <span class="bx bx-pk" style="font-size:10px">미공포</span>`:''}</div>
        <div class="alb-price">${priceStr}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        <div class="qty-ctrl">
          <button type="button" class="qty-btn" onclick="_stepQ('${a.k}',-1)" ${disabled?'disabled':''}>−</button>
          <input type="number" class="qty-in" id="qi-${a.k}" min="0" max="99" value="${qty}" ${disabled?'disabled':''} oninput="_updQ('${a.k}',this.value)">
          <button type="button" class="qty-btn" onclick="_stepQ('${a.k}',1)" ${disabled?'disabled':''}>+</button>
        </div>
        <label id="pqchk-wrap-${a.k}" style="display:${qty>0&&!disabled?'flex':'none'};align-items:center;gap:4px;font-size:11px;color:var(--tx2);cursor:pointer">
          <input type="checkbox" id="pqchk-${a.k}" ${hasProxy?'checked':''} style="width:auto" onchange="_toggleProxyRow('${a.k}')">
          <span>대리구매 포함</span>
        </label>
        <div id="pqrow-${a.k}" style="display:${hasProxy?'flex':'none'};align-items:center;gap:4px;font-size:11px;color:var(--warn)">
          <span>↳ 대리</span>
          <button type="button" class="qty-btn" style="width:22px;height:22px;font-size:14px" onclick="_stepPQ('${a.k}',-1)">−</button>
          <input type="number" class="qty-in" id="pqi-${a.k}" min="0" max="99" value="${pqty}" style="width:38px;font-size:13px" oninput="_updPQ('${a.k}',this.value)">
          <button type="button" class="qty-btn" style="width:22px;height:22px;font-size:14px" onclick="_stepPQ('${a.k}',1)">+</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const ovsSection=ovs?`
  <div style="padding:12px;background:var(--sur3);border-top:1px solid var(--bd)">
    <div class="section-ttl">🌏 해외 비용 (원화 환산)</div>
    <div class="alert-info" style="margin-bottom:10px">💱 1 ${cur} = ${Math.round(r).toLocaleString()}원 · 수량×단가 자동계산, 직접입력 시 우선적용</div>
    <div class="fr2 fg">
      <div><div class="fl">직접 결제금액 (${cur})</div>
        <input type="number" step="0.01" id="pf-ft" value="${p.foreignTotal||''}" placeholder="수량 자동계산" oninput="_ep.foreignTotal=parseFloat(this.value)||0;_updOC()"></div>
      <div><div class="fl">실제 원화 <span style="color:var(--warn);font-size:10px">⚡ 최우선</span></div>
        <input type="number" id="pf-dk" value="${p.directKrw||''}" placeholder="환율 무시" oninput="_ep.directKrw=parseFloat(this.value)||0;_updOC()"></div>
      <div><div class="fl">대리구매분 원화 <span style="font-size:10px;color:var(--tx2)">(직접입력 시)</span></div>
        <input type="number" id="pf-dpk" value="${p.directProxyKrw||''}" placeholder="비율 자동계산" oninput="_ep.directProxyKrw=parseFloat(this.value)||0;_updOC()"></div>
    </div>
    <div class="fr3 fg">
      <div><div class="fl">해외내배송 (원화)</div>
        <input type="number" id="pf-is" value="${p.intlShip||''}" placeholder="0" oninput="_ep.intlShip=parseFloat(this.value)||0;_updOC()">
        ${store.defOvsShip?`<div class="fn">기본 ${fFor(store.defOvsShip,cur)} ≈ ${fKRW(Math.round(store.defOvsShip*r))}</div>`:''}</div>
      <div><div class="fl">배송대행비 (원화)</div>
        <input type="number" id="pf-ff" value="${p.fwdFee||''}" placeholder="0" oninput="_ep.fwdFee=parseFloat(this.value)||0;_updOC()"></div>
      <div><div class="fl">관세 (원화)</div>
        <input type="number" id="pf-cx" value="${p.customs||''}" placeholder="0" oninput="_ep.customs=parseFloat(this.value)||0;_updOC()"></div>
    </div>
    <div class="fr2" style="gap:10px" class="fg">
      <div><div class="fl">국내배송비 (원화)</div>
        <input type="number" id="pf-ds" value="${p.domShip||''}" placeholder="0" oninput="_ep.domShip=parseFloat(this.value)||0;_updOC()"></div>
      <div><div class="fl">🏷 할인금액 (원화)</div>
        <input type="number" id="pf-disc" value="${p.discount||''}" placeholder="0" oninput="_ep.discount=parseFloat(this.value)||0;_updOC()" style="border-color:var(--ok)"></div>
    </div>
    <div class="fr2" style="gap:10px">
      <div><div class="fl">🚚 국내배송비 (원화)</div>
        <input type="number" id="pf-ds2" value="${p.domShip||0}" placeholder="0" oninput="_ep.domShip=parseFloat(this.value)||0;_updOC()"></div>
      <div><div class="fl" style="color:var(--warn)">↳ 대리구매분 비용 (원화)</div>
        <input type="number" id="pf-px" value="${p.proxyKrw||''}" placeholder="직접 입력 또는 자동계산" style="border-color:var(--warn)" oninput="_ep.proxyKrw=parseFloat(this.value)||0;_updOC()">
        <div class="fn" style="color:var(--tx3)">비워두면 수량 비율로 자동 계산</div>
      </div>
    </div>
    <div id="oc-prev"></div>
  </div>`:
  `<div style="padding:12px;border-top:1px solid var(--bd)">
    <div class="fr2" style="gap:10px">
      <div><div class="fl">국내배송비 (원화)</div>
        <input type="number" id="pf-ds" value="${p.domShip!=null?p.domShip:store.defDomShip||0}" placeholder="0" oninput="_ep.domShip=parseFloat(this.value)||0;_updOC()"></div>
      <div><div class="fl">🏷 할인금액 (원화)</div>
        <input type="number" id="pf-disc" value="${p.discount||''}" placeholder="0" oninput="_ep.discount=parseFloat(this.value)||0;_updOC()" style="border-color:var(--ok)"></div>
    </div>
    <div id="oc-prev"></div>
  </div>`;

  el.innerHTML=`<div style="border:1px solid var(--bd);border-radius:var(--r-sm);overflow:hidden;margin-bottom:4px">
    <div style="padding:8px 12px;background:var(--sur2);font-size:12px;font-weight:600;color:var(--tx2)">💿 앨범 수량 (0 = 미구매)</div>
    ${albRows}
    ${ovsSection}
  </div>`;
  _updOC();
}

function _stepQ(type,d){
  const inp=document.getElementById(`qi-${type}`);if(!inp||inp.disabled)return;
  inp.value=Math.max(0,(parseInt(inp.value)||0)+d);
  _updQ(type,inp.value);
}
function _updQ(type,val){
  const p=window._ep;if(!p)return;
  let it=p.items.find(i=>i.type===type);
  if(!it){it={type,qty:0,proxyQty:0,unitPrice:0};p.items.push(it);}
  it.qty=parseInt(val)||0;
  // Show/hide 대리구매 checkbox based on qty
  const chkWrap=document.getElementById(`pqchk-wrap-${type}`);
  if(chkWrap) chkWrap.style.display=it.qty>0?'flex':'none';
  // If qty drops to 0, clear proxy
  if(it.qty===0){
    it.proxyQty=0;
    const chk=document.getElementById(`pqchk-${type}`);
    const row=document.getElementById(`pqrow-${type}`);
    const inp=document.getElementById(`pqi-${type}`);
    if(chk)chk.checked=false;
    if(row)row.style.display='none';
    if(inp)inp.value=0;
  }
  // Also cap proxy qty to new qty
  if(it.proxyQty>it.qty){
    it.proxyQty=it.qty;
    const inp=document.getElementById(`pqi-${type}`);
    if(inp)inp.value=it.proxyQty;
  }
  _updOC();
}
function _stepPQ(type,d){
  const inp=document.getElementById(`pqi-${type}`);if(!inp||inp.disabled)return;
  const p=window._ep;if(!p)return;
  const it=p.items.find(i=>i.type===type);
  const maxQ=it?it.qty:0;
  inp.value=Math.max(0,Math.min(maxQ,(parseInt(inp.value)||0)+d));
  _updPQ(type,inp.value);
}
function _updPQ(type,val){
  const p=window._ep;if(!p)return;
  let it=p.items.find(i=>i.type===type);
  if(!it){it={type,qty:0,proxyQty:0,unitPrice:0};p.items.push(it);}
  const maxQ=it.qty||0;
  it.proxyQty=Math.min(parseInt(val)||0,maxQ);
  const inp=document.getElementById(`pqi-${type}`);
  if(inp)inp.value=it.proxyQty;
  _updOC();
}
function _toggleProxyRow(type){
  const chk=document.getElementById(`pqchk-${type}`);
  const row=document.getElementById(`pqrow-${type}`);
  if(!chk||!row)return;
  if(chk.checked){
    row.style.display='flex';
  } else {
    row.style.display='none';
    // Clear proxy qty when unchecked
    const inp=document.getElementById(`pqi-${type}`);
    if(inp){inp.value=0;}
    _updPQ(type,0);
  }
}
function _updOC(){
  const el=document.getElementById('oc-prev');if(!el)return;
  const p=window._ep;if(!p)return;
  const store=S.stores.find(s=>s.id===p.storeId);if(!store)return;
  const ovs=isOvs(store);
  const cur=getStoreCur(store);const r=rate(cur);

  if(ovs){
    let fAmt=p.foreignTotal||0;
    if(!fAmt) fAmt=(p.items||[]).reduce((s,it)=>{
      const pr=it.unitPrice>0?it.unitPrice:(storePrice(store,it.type)||0);
      return s+pr*(it.qty||0);},0);
    const base=p.directKrw>0?p.directKrw:Math.round(fAmt*r);
    const total=Math.max(0,base+(p.intlShip||0)+(p.fwdFee||0)+(p.customs||0)+(p.domShip||0)-(p.discount||0));
    if(!total){el.innerHTML='';return;}
    el.innerHTML=`<div class="cost-box">
      ${fAmt>0&&!p.directKrw?`<div class="cost-row"><span style="color:var(--tx2)">${fFor(fAmt,cur)} × ${Math.round(r).toLocaleString()}</span><span class="mono">${fKRW(Math.round(fAmt*r))}</span></div>`:''}
      ${p.directKrw>0?`<div class="cost-row"><span style="color:var(--warn)">⚡ 직접입력</span><span class="mono">${fKRW(p.directKrw)}</span></div>`:''}
      ${p.intlShip?`<div class="cost-row"><span style="color:var(--tx2)">해외내배송</span><span class="mono">${fKRW(p.intlShip)}</span></div>`:''}
      ${p.fwdFee?`<div class="cost-row"><span style="color:var(--tx2)">배송대행</span><span class="mono">${fKRW(p.fwdFee)}</span></div>`:''}
      ${p.customs?`<div class="cost-row"><span style="color:var(--tx2)">관세</span><span class="mono">${fKRW(p.customs)}</span></div>`:''}
      ${p.domShip?`<div class="cost-row"><span style="color:var(--tx2)">국내배송</span><span class="mono">${fKRW(p.domShip)}</span></div>`:''}
      ${(p.discount||0)>0?`<div class="cost-row" style="color:var(--ok)"><span>🏷 할인</span><span class="mono">− ${fKRW(p.discount)}</span></div>`:''}
      <div class="cost-row total"><span>예상 합계</span><span class="mono" style="color:var(--ac)">${fKRW(total)}</span></div>
      ${totalQtyOvs>0&&proxyQtyTotalOvs>0?`<div class="cost-row" style="border-top:1px dashed var(--bd);margin-top:4px;padding-top:4px"><span style="color:var(--warn);font-size:12px">↳ 대리구매분</span><span class="mono" style="color:var(--warn)">${fKRW(p.directProxyKrw||Math.round(total*proxyQtyTotalOvs/totalQtyOvs))}</span></div>`:''}
    </div>`;
  } else {
    // Domestic store
    const itemLines=(p.items||[]).filter(i=>(i.qty||0)>0).map(i=>{
      const a=ALBUMS.find(x=>x.k===i.type);
      const sp=storePrice(store,i.type)||0;
      const lineAmt=sp*(i.qty||0);
      const pqty=i.proxyQty||0;
      return {label:a?.lb||i.type, qty:i.qty, pqty, sp, lineAmt};
    });
    const itemTotal=itemLines.reduce((s,l)=>s+l.lineAmt,0);
    const ship=p.domShip!=null?p.domShip:(parseFloat(document.getElementById('pf-ds2')?.value)||parseFloat(document.getElementById('pf-ds')?.value)||0);
    const disc=p.discount!=null?p.discount:(parseFloat(document.getElementById('pf-disc')?.value)||0);
    const total=Math.max(0,itemTotal+ship-disc);
    if(!total&&!itemLines.length){el.innerHTML='';return;}
    const totalQty=itemLines.reduce((s,l)=>s+l.qty,0);
    const proxyQtyTotal=itemLines.reduce((s,l)=>s+l.pqty,0);
    const proxyAmt=totalQty>0?Math.round(total*proxyQtyTotal/totalQty):0;
    el.innerHTML=`<div class="cost-box" style="margin-top:8px">
      ${itemLines.map(l=>`<div class="cost-row">
        <span style="color:var(--tx2)">${l.label} ×${l.qty}${l.pqty>0?` <span style="color:var(--warn);font-size:10px">(대리 ${l.pqty})</span>`:''} @ ${fKRW(l.sp)}</span>
        <span class="mono">${fKRW(l.lineAmt)}</span>
      </div>`).join('')}
      ${ship?`<div class="cost-row"><span style="color:var(--tx2)">🚚 배송비</span><span class="mono">${fKRW(ship)}</span></div>`:''}
      ${disc>0?`<div class="cost-row" style="color:var(--ok)"><span>🏷 할인</span><span class="mono">− ${fKRW(disc)}</span></div>`:''}
      <div class="cost-row total"><span>예상 합계</span><span class="mono" style="color:var(--ac)">${fKRW(total)}</span></div>
      ${proxyAmt>0?`<div class="cost-row" style="border-top:1px dashed var(--bd);margin-top:4px;padding-top:4px">
        <span style="color:var(--warn);font-size:12px">↳ 대리구매분</span>
        <span class="mono" style="color:var(--warn)">${fKRW(proxyAmt)}</span>
      </div>`:''}
    </div>`;
  }
}
function _saveP(){
  const p=window._ep;if(!p)return;
  const sid=p.storeId;
  if(!sid){toast('판매처를 선택해주세요','warn');return;}
  p.status=window._ep?.status||document.getElementById('pf-st')?.value||'waiting';
  p.owner=document.getElementById('pf-own')?.value||'';
  p.buyer=document.getElementById('pf-buy')?.value||'';
  p.notes=document.getElementById('pf-nt')?.value||'';
  p.purchaseDate=document.getElementById('pf-dt')?.value||'';
  p.deliveryDate=document.getElementById('pf-dd')?.value||'';
  p.domShip=parseFloat(document.getElementById('pf-ds')?.value)||0;
  p.discount=parseFloat(document.getElementById('pf-disc')?.value)||0;
  // Save proxyQty per album
  ALBUMS.forEach(a=>{
    const it=p.items.find(i=>i.type===a.k);
    if(it){
      const pqInp=document.getElementById(`pqi-${a.k}`);
      it.proxyQty=pqInp?Math.min(parseInt(pqInp.value)||0,it.qty||0):0;
    }
  });
  const store=S.stores.find(s=>s.id===sid);
  p.proxyKrw=parseFloat(document.getElementById('pf-px')?.value)||0;
  if(isOvs(store)){
    p.foreignTotal=parseFloat(document.getElementById('pf-ft')?.value)||0;
    p.directKrw=parseFloat(document.getElementById('pf-dk')?.value)||0;
    p.directProxyKrw=parseFloat(document.getElementById('pf-dpk')?.value)||0;
    p.intlShip=parseFloat(document.getElementById('pf-is')?.value)||0;
    p.fwdFee=parseFloat(document.getElementById('pf-ff')?.value)||0;
    p.customs=parseFloat(document.getElementById('pf-cx')?.value)||0;
  }
  p.items=(p.items||[]).filter(i=>(i.qty||0)>0);
  if(!p.id){p.id='p'+Date.now();S.purchases.unshift(p);}
  else{const idx=S.purchases.findIndex(x=>x.id===p.id);if(idx>=0)S.purchases[idx]=p;}
  save();closeM();render();toast('저장 완료!');
}
function delP(id){
  if(!confirm('삭제할까요?'))return;
  S.purchases=S.purchases.filter(p=>p.id!==id);save();render();toast('삭제됨');
}

// ═══════════════════════════════════════════
// STORE MODAL
// ═══════════════════════════════════════════
function addStore(){showStoreM({},false);}
function editStore(id){const s=S.stores.find(x=>x.id===id);if(!s)return;showStoreM(JSON.parse(JSON.stringify(s)),true);}
function delStore(id){
  if(!confirm('판매처를 삭제할까요?'))return;
  S.stores=S.stores.filter(s=>s.id!==id);save();renderMgr();
}
function showStoreM(s,isEdit){
  window._es=s;
  const distOpts=[...S.distributors].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(d=>`<option value="${d.id}" ${s.distId===d.id?'selected':''}>${d.name}</option>`).join('');
  const cntOpts=Object.entries(COUNTRIES).map(([k,v])=>`<option value="${k}" ${(s.country||'KR')===k?'selected':''}>${v.lb}</option>`).join('');
  const perkOpts=ALBUMS.map(a=>`<option value="${a.k}" ${s.unpoPerk===a.k?'selected':''}>${a.lb}</option>`).join('');
  openM(isEdit?'판매처 수정':'판매처 추가',`
  <div class="fr2 fg">
    <div><div class="fl">판매처명 <span class="req">*</span></div>
      <input type="text" id="sf-n" value="${s.name?.replace('[음총]','').trim()||''}" placeholder="예: VLAST SHOP"></div>
    <div><div class="fl">🏷 플랫폼 <span style="font-size:10px;color:var(--tx2)">(판매 유통 경로)</span></div>
      <select id="sf-d"><option value="">선택안함</option>${distOpts}</select></div>
  </div>
  <div class="fg">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.3);border-radius:var(--r-sm);font-size:13px">
      <input type="checkbox" id="sf-eum" ${s.name?.includes('[음총]')?'checked':''} style="width:auto">
      🎵 음원총공팀 연계 판매처
      <span style="font-size:11px;color:var(--tx2);margin-left:4px">— 체크 시 [음총] 태그 자동 적용</span>
    </label>
  </div>
  <div class="fg">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:rgba(79,126,255,.08);border:1px solid rgba(79,126,255,.25);border-radius:var(--r-sm);font-size:13px">
      <input type="checkbox" id="sf-vc" ${s.videocall?'checked':''} style="width:auto">
      📹 영상통화 응모 대상 판매처
      <span style="font-size:11px;color:var(--tx2);margin-left:4px">— 체크 시 📹 배지 표시</span>
    </label>
  </div>
  <div class="fr2 fg">
    <div><div class="fl">국가 / 통화</div>
      <select id="sf-c" onchange="_updSF()">${cntOpts}</select></div>
    <div><div class="fl">미공포 지급 앨범</div>
      <select id="sf-pk"><option value="">없음</option>${perkOpts}</select></div>
  </div>
  <div class="fg">
    <div class="fl">단가 설정</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:7px 12px;border:1px solid var(--bd);border-radius:var(--r-sm)">
        <input type="radio" name="pm" value="country" ${(s.priceMode||'country')==='country'?'checked':''} onchange="_updSF()"> 국가 기준 단가
      </label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:7px 12px;border:1px solid var(--bd);border-radius:var(--r-sm)">
        <input type="radio" name="pm" value="custom" ${(s.priceMode==='custom'||s.priceMode==='nosale')?'checked':''} onchange="_updSF()"> 직접 입력
      </label>
    </div>
  </div>
  <div id="sf-cp"></div>
  <div class="fr2 fg">
    <div><div class="fl">구매 시작일</div><input type="datetime-local" id="sf-s" value="${s.purchaseStart||''}"></div>
    <div><div class="fl">구매 마감일</div><input type="datetime-local" id="sf-e" value="${s.purchaseEnd||''}"></div>
  </div>
  <div class="fr2 fg">
    <div><div class="fl">마감일 텍스트 (날짜 대신 표시)</div>
      <input type="text" id="sf-et" value="${s.purchaseEndTxt||''}" placeholder="예: 특전 소진시까지"></div>
    <div><div class="fl">📦 배송예정일 (기본값)</div>
      <input type="date" id="sf-dd" value="${s.defDeliveryDate||''}" placeholder="YYYY-MM-DD">
      <div class="fn">구매기록 추가 시 자동 입력됩니다</div></div>
  </div>
  <div style="background:var(--pk-g);border:1px solid rgba(168,85,247,.2);border-radius:var(--r-sm);padding:12px;margin-bottom:10px">
    <div style="font-weight:600;color:var(--pk);margin-bottom:8px;font-size:13px">📍 오프라인 이벤트</div>
    <div class="fr2 fg">
      <div><div class="fl">시작일</div><input type="date" id="sf-os" value="${s.offlineStart||''}"></div>
      <div><div class="fl">종료일</div><input type="date" id="sf-oe" value="${s.offlineEnd||''}"></div>
    </div>
    <div class="fg"><div class="fl">운영시간</div>
      <input type="text" id="sf-oh" value="${s.offlineHours||''}" placeholder="예: 11:00~20:00 (KST)"></div>
    <div class="fg"><div class="fl">장소 / 주소</div>
      <input type="text" id="sf-oa" value="${s.offlineAddress||''}" placeholder="예: 서울시 성동구 연무장7길 13"></div>
    <div class="fg"><div class="fl">추가 안내 (메모)</div>
      <textarea id="sf-on" rows="2" placeholder="기타 안내사항">${s.offlineNote||''}</textarea></div>
    <div class="fg">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="sf-ld" ${s.offlineLuckyDraw?'checked':''} style="width:auto">
        🎰 럭키드로우 진행
      </label>
    </div>
  </div>
  <div class="fr2 fg">
    <div><div class="fl">기본 배송비 (국내, 원화)</div><input type="number" id="sf-ds" value="${s.defDomShip||0}"></div>
    <div><div class="fl">기본 해외내배송 (현지통화)</div><input type="number" id="sf-os2" value="${s.defOvsShip||0}"></div>
  </div>
  <div class="fg"><div class="fl">구매 URL</div><input type="url" id="sf-u" value="${s.url||''}" placeholder="https://..."></div>
  <div class="fg"><div class="fl">📝 메모 (판매처 관련 참고사항)</div>
    <textarea id="sf-memo" rows="2" placeholder="특이사항, 참고링크 등">${s.memo||''}</textarea></div>`);
  document.getElementById('m-foot').innerHTML=`
    <button class="btn btn-s" onclick="closeM()">취소</button>
    <button class="btn btn-p" onclick="_saveStore(${isEdit})">저장</button>`;
  _updSF();
}
function _updSF(){
  const pm=document.querySelector('input[name="pm"]:checked')?.value||'country';
  const country=document.getElementById('sf-c')?.value||'KR';
  const cur=COUNTRIES[country]?.cur||'KRW';
  const el=document.getElementById('sf-cp');if(!el)return;
  const s=window._es||{};
  if(pm==='custom'){
    el.innerHTML=`<div class="card" style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:8px">단가 설정 (${cur}) — 미판매 체크 시 해당 앨범 제외</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${ALBUMS.map(a=>{
          const isSale=s.customPrices?.[a.k]!=null;
          const isNosale=s.customPrices&&a.k in s.customPrices&&s.customPrices[a.k]==null;
          const checked=isNosale?'checked':'';
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--sur2);border-radius:var(--r-sm);border:1px solid var(--bd)" id="sc-row-${a.k}">
            <span style="font-size:13px;font-weight:500;min-width:90px">${a.lb}</span>
            <div id="sc-price-wrap-${a.k}" style="${isNosale?'display:none;':''}flex:1">
              <input type="number" step="0.01" id="sc-${a.k}" value="${isSale&&!isNosale?s.customPrices[a.k]:''}" placeholder="단가 (${cur})" style="width:100%">
            </div>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--err);white-space:nowrap;flex-shrink:0">
              <input type="checkbox" id="sc-chk-${a.k}" ${checked} style="width:auto" onchange="_toggleAlbumSell('${a.k}')">
              미판매
            </label>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  } else { el.innerHTML=''; }
}
function _toggleAlbumSell(k){
  const chk=document.getElementById(`sc-chk-${k}`);
  const wrap=document.getElementById(`sc-price-wrap-${k}`);
  if(!chk||!wrap)return;
  const nosale=chk.checked; // checked = 미판매
  wrap.style.display=nosale?'none':'';
  if(!nosale) setTimeout(()=>document.getElementById(`sc-${k}`)?.focus(),50);
}
function _saveStore(isEdit){
  const s=window._es;
  const baseName=document.getElementById('sf-n')?.value?.trim();
  if(!baseName){toast('판매처명 입력 필요','warn');return;}
  const isEum=document.getElementById('sf-eum')?.checked||false;
  s.name=isEum?`[음총] ${baseName}`:baseName;
  s.distId=document.getElementById('sf-d')?.value||'';
  s.country=document.getElementById('sf-c')?.value||'KR';
  s.unpoPerk=document.getElementById('sf-pk')?.value||'';
  s.priceMode=document.querySelector('input[name="pm"]:checked')?.value||'country';
  // nosale is legacy - migrate to custom with all null
  if(s.priceMode==='nosale') s.priceMode='custom';
  s.customPrices={};
  if(s.priceMode==='custom'){
    ALBUMS.forEach(a=>{
      const chk=document.getElementById(`sc-chk-${a.k}`);
      const nosale=chk&&chk.checked; // checked = 미판매
      if(nosale){ s.customPrices[a.k]=null; return; }
      const v=parseFloat(document.getElementById(`sc-${a.k}`)?.value);
      s.customPrices[a.k]=isNaN(v)?null:v;
    });
  }
  s.purchaseStart=document.getElementById('sf-s')?.value||'';
  s.purchaseEnd=document.getElementById('sf-e')?.value||'';
  s.purchaseEndTxt=document.getElementById('sf-et')?.value||'';
  s.defDeliveryDate=document.getElementById('sf-dd')?.value||'';
  s.offlineStart=document.getElementById('sf-os')?.value||'';
  s.offlineEnd=document.getElementById('sf-oe')?.value||'';
  s.offlineHours=document.getElementById('sf-oh')?.value||'';
  s.offlineAddress=document.getElementById('sf-oa')?.value||'';
  s.offlineNote=document.getElementById('sf-on')?.value||'';
  s.offlineLuckyDraw=document.getElementById('sf-ld')?.checked||false;
  s.defDomShip=parseFloat(document.getElementById('sf-ds')?.value)||0;
  s.defOvsShip=parseFloat(document.getElementById('sf-os2')?.value)||0;
  s.url=document.getElementById('sf-u')?.value||'';
  s.videocall=document.getElementById('sf-vc')?.checked||false;
  s.memo=document.getElementById('sf-memo')?.value||'';
  s.custom=true;
  if(!isEdit){s.id='cs'+Date.now();S.stores.push(s);}
  else{const idx=S.stores.findIndex(x=>x.id===s.id);if(idx>=0)S.stores[idx]=s;}
  save();closeM();renderMgr();toast('저장 완료!');
}

// DISTRIBUTOR MANAGER
function openDistMgr(){
  const html=`
  <div style="margin-bottom:12px;display:flex;gap:8px">
    <input type="text" id="dist-n" placeholder="플랫폼명" style="flex:1">
    <button class="btn btn-p btn-sm" onclick="_addDist()">+ 추가</button>
  </div>
  <div id="dist-list">
    ${[...S.distributors].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">
      <span style="flex:1">${d.name}</span>
      <button class="btn btn-d btn-xs" onclick="_delDist('${d.id}')">삭제</button>
    </div>`).join('')}
  </div>`;
  openM('플랫폼 관리',html);
  document.getElementById('m-foot').innerHTML=`<button class="btn btn-s" onclick="closeM();renderMgr()">닫기</button>`;
}
function _addDist(){
  const n=document.getElementById('dist-n')?.value?.trim();
  if(!n)return;
  const d={id:'dcs'+Date.now(),name:n};
  S.distributors.push(d);save();
  document.getElementById('dist-n').value='';
  document.getElementById('dist-list').innerHTML+=`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)"><span style="flex:1">${n}</span><button class="btn btn-d btn-xs" onclick="_delDist('${d.id}')">삭제</button></div>`;
}
function _delDist(id){
  if(!confirm('삭제? (이미 연결된 판매처에서 제거됩니다)'))return;
  S.distributors=S.distributors.filter(d=>d.id!==id);
  S.stores.forEach(s=>{if(s.distId===id)s.distId='';});
  save();openDistMgr();
}

// ═══════════════════════════════════════════
// MODAL UTILS
// ═══════════════════════════════════════════
function openM(ttl,body){
  document.getElementById('m-ttl').textContent=ttl;
  document.getElementById('m-body').innerHTML=body;
  document.getElementById('m-foot').innerHTML='';
  document.getElementById('ov').classList.add('open');
  document.getElementById('modal').scrollTop=0;
}
function closeM(){document.getElementById('ov').classList.remove('open');window._ep=null;window._es=null;}
function ovClick(e){if(e.target===document.getElementById('ov'))closeM();}
document.addEventListener('click',function(e){const p=document.getElementById('rate-popup');if(p&&p.classList.contains('open')&&!p.contains(e.target)&&e.target.id!=='rate-icon-btn')p.classList.remove('open');});

// ═══════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════
function exportData(){
  const blob=new Blob([JSON.stringify({v:2,at:new Date().toISOString(),distributors:S.distributors,stores:S.stores,purchases:S.purchases,rates:S.rates,countryPrices:S.countryPrices},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`PLAVE_Caligo2_${new Date().toISOString().slice(0,10)}.json`;a.click();
  toast('✓ 내보내기 완료');
}
function importData(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(d.stores) S.stores=d.stores;
      if(d.purchases) S.purchases=d.purchases;
      if(d.distributors) S.distributors=d.distributors;
      if(d.rates) S.rates={...S.rates,...d.rates};
      if(d.countryPrices) S.countryPrices=d.countryPrices;
      save();render();toast(`✓ 불러오기 완료 (${S.purchases.length}건)`);
    }catch(e2){toast('⚠ 파일 오류','err');}
    inp.value='';
  };r.readAsText(f);
}


// ── SECRET ADMIN ACCESS ──
let _adminTaps=0,_adminTimer=null;
function secretAdminTap(){
  // Also show admin tab if desktop
  const adminBtn=document.getElementById('admin-secret-btn');

  _adminTaps++;
  clearTimeout(_adminTimer);
  if(_adminTaps>=5){_adminTaps=0;S.adminUnlocked=true;S.mgrSub='stores';go('mgr');
    if(adminBtn)adminBtn.style.opacity='1';
    const ba=document.getElementById('bot-admin');if(ba)ba.style.display='';
  }
  else _adminTimer=setTimeout(()=>_adminTaps=0,1500);
}

// ── RATE POPUP ──
function toggleRatePopup(){
  const p=document.getElementById('rate-popup');
  if(!p)return;
  p.classList.toggle('open');
  if(p.classList.contains('open')) renderRatePopup();
}
function renderRatePopup(){
  const p=document.getElementById('rate-popup');
  if(!p)return;
  const upd=S.ratesAt?new Date(S.ratesAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'미조회';
  p.innerHTML=`<div style="font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
    <span>💱 환율</span>
    <button class="btn btn-p btn-xs" onclick="fetchRates().then(()=>renderRatePopup())">↻ 갱신</button>
  </div>
  ${['JPY','CNY','USD','TWD'].map(c=>{
    const r=S.rates[c];
    const lbs={JPY:'🇯🇵 JPY',CNY:'🇨🇳 CNY',USD:'🇺🇸 USD',TWD:'🇹🇼 TWD'};
    return `<div class="rate-row-item"><span>${lbs[c]}</span><b>${Math.round(r.rate).toLocaleString()}원</b></div>`;
  }).join('')}
  <div style="font-size:10px;color:var(--tx3);margin-top:6px">업데이트: ${upd}</div>`;
}

// ── DATA MANAGER ──
function openDataMgr(){
  openM('💾 데이터 관리',`
  <div class="data-section">
    <div class="data-section-ttl">⬇ 내보내기 <span style="font-size:11px;color:var(--ok)">→ 파일로 저장</span></div>
    <p>현재 앱의 <b>구매기록 전체</b>를 JSON 파일로 저장합니다.<br>
    저장된 파일은 다른 기기(폰↔컴퓨터)에서 불러올 수 있고, 백업 용도로도 쓸 수 있어요.</p>
    <button class="btn btn-p" onclick="exportData()">⬇ 내보내기 (파일 저장)</button>
  </div>
  <div class="data-section">
    <div class="data-section-ttl">⬆ 불러오기 <span style="font-size:11px;color:var(--warn)">← 파일에서 복원</span></div>
    <p>이전에 내보낸 JSON 파일을 선택하면 구매기록이 복원됩니다.<br>
    ⚠️ <b>현재 기록이 덮어씌워지므로</b> 먼저 내보내기를 해두세요!</p>
    <button class="btn btn-s" onclick="document.getElementById('imp').click()">⬆ 불러오기 (파일 선택)</button>
  </div>
  <div class="data-section" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2)">
    <div class="data-section-ttl" style="color:var(--err)">💡 크로스 기기 사용 방법</div>
    <p>📱 폰에서 작성 → ⬇ 내보내기 → 파일 공유(카카오톡/이메일 등)<br>
    💻 컴퓨터에서 파일 받은 후 → ⬆ 불러오기<br>
    ✅ 각 기기의 브라우저에 자동 저장되므로 매번 할 필요는 없어요.</p>
  </div>`);
  document.getElementById('m-foot').innerHTML=`<button class="btn btn-s" onclick="closeM()">닫기</button>`;
}



// ── UPDATE LOG ──
const UPDATE_LOG = [
  { date:'2026-04-05', title:'v2.7', items:[
    '사운드웨이브 판매처 추가 (Inventory / 영상통화 포함)',
    '사운드웨이브 미공포 포토카드 이미지 추가',
  ]},
  { date:'2026-04-01', title:'v2.6', items:[
    '미공포 이미지 추가: 이즈위·타워레코드·올리브영·애니메이트·영풍문고',
    '관리탭 이미지 등록 버그 수정 (cards 구조 불일치)',
    '길보드·무신사 세트2 메모 추가 (ASTERUM 433-10)',
  ]},
  { date:'2026-04-01', title:'v2.5', items:[
    '미공포 이미지 업데이트 (HMV·TME·무신사·Weverse)',
    '이즈위 판매처 추가 (중국 / 영통응모)',
    '미공포 뒷면 카드 토글 버튼 지원',
    '판매처 공유 이미지 복사 기능',
    '미공포 검색창 추가',
    '구매링크 항상 표시 개선',
  ]},
  { date:'2026-03-30', title:'v2.4', items:[
    '판매처 업데이트: [음총] HMV/타워레코드 2차 공동구매 추가',
    '공지 팝업 기능 추가 (7일간 보지않기)',
    '대시보드 섹션 순서 변경 (구매비→앨범수량→일정→마감일→판매처)',
    '미공포 세트 메모 (세트 단위로 변경)',
    '해외 대리구매 직접 금액 입력 추가',
    '다수 UI 개선 및 버그 수정',
  ]},
  { date:'2026-03-30', title:'v2.4', items:[
    'HMV·타워레코드 공구플랫폼 2차 판매 정보 추가',
    '미공포 85장 카운트 정상화·초기화 버그 수정',
    '구매탭 카드 가독성 개선 (구매대기 강조)',
    '해외 대리구매 비용 직접 입력 지원',
    '판매처 미판매 앨범 팝업에서 올바르게 숨김 처리',
    '공지사항 팝업 (7일 보지않기)',
    '대시보드 섹션 순서 변경',
  ]},
  { date:'2026-03-30', title:'v2.3', items:[
    '미공포 이미지 버전 인식 업데이트 — INIT 이미지 변경 시 자동 반영',
    '대시보드: 배송완료/미구매 카드 제거',
    '대시보드: 다음 일정 카드 추가 (D-day 표시)',
    'save() 디바운스·localStorage 이미지 분리 최적화',
  ]},
  { date:'2026-03-28', title:'v2.2', items:[
    '대시보드: 상태 바(프로그레스) 제거',
    '상태 단순화: 미구매/구매대기/구매완료/배송완료 4단계 (배송대기·배송중 제거)',
    '캘린더: 구매완료·배송예정 표시 제거',
    '[정보] 탭 신설: 판매처 매트릭스 + 미공포 컬렉션',
  ]},
  { date:'2026-03-28', title:'v2.1', items:[
    '대리구매 입력: 체크박스 체크 시에만 수량 입력 펼쳐짐',
    '대시보드 구매비 카드: 총 구매수량에 따른 캐릭터 이미지 표시 (1-50장/51-100장/101장+)',
  ]},
  { date:'2026-03-28', title:'v2.0', items:[
    '판매처 데이터 업데이트 (26개, 메모/배송예정일/음총/영통 반영)',
    '직접 단가 입력: 판매 default, 미판매 체크박스로 전환',
    '메모 줄바꿈 표시 (white-space:pre-line)',
    '대리구매 수량 입력: 앨범별 대리수량 별도 입력 가능',
    '구매카드/합계 미리보기에 대리구매 수량·비용 분리 표시',
    '대시보드 구매비: 내 구매 / 대리구매 분리 표기',
  ]},
  { date:'2026-03-28', title:'v1.9', items:[
    '판매처 폼: 미판매 라디오 제거 → 직접입력 앨범별 체크로 통합',
    '영상통화 체크박스 → 음총 바로 아래로 이동',
    '판매처에 배송예정일(기본값) 추가 / 구매기록 추가 시 자동 연동',
  ]},
  { date:'2026-03-28', title:'v1.8', items:[
    '구매 마감일: 플랫폼·음총·미공포·영통 배지 한 줄 표시',
    '직접 입력 단가: 앨범별 판매여부 체크박스',
  ]},
  { date:'2026-03-28', title:'v1.7', items:[
    'JS 파싱 버그 수정 (UPDATE_LOG 구조 / 함수 중복)',
    'nosale storePrice null 반환 수정',
    '판매처 📹영통 배지 추가',
  ]},
  { date:'2026-03-28', title:'v1.6', items:[
    '판매처: 음총 체크박스, 미판매 옵션, 배송예정일 캘린더 표시',
    '구매기록: 배송예정일 입력 필드',
    '구매 마감일: 음총·미공포·영통 배지',
  ]},
  { date:'2026-03-28', title:'v1.5', items:[
    'VLAST SHOP 만료 버그(dDays) 수정',
    '앨범별 구매수량 카드 위치 변경',
    '타워레코드/HMV 공구플랫폼 단가 수정',
    '캘린더 초동기간 하이라이트 / 오늘날짜 기본선택',
  ]},
  { date:'2026-03-28', title:'v1.4', items:[
    '뮤직플랜트 판매처 추가',
    '마감일 토글·스크롤 개편',
  ]},
  { date:'2026-03-27', title:'v1.3', items:[
    '판매처 선택 그룹 개편',
    '할인금액 입력 / 마감일 팝업',
    '캘린더 D-Day 카운트다운',
  ]},
  { date:'2026-03-27', title:'v1.2', items:[
    '24개 판매처 업데이트 / 모바일 스크롤 수정',
  ]},
  { date:'2026-03-26', title:'v1.1', items:[
    '관리탭 비밀번호 / 캘린더 토글 / [음총] 표기',
  ]},
  { date:'2026-03-25', title:'v1.0', items:['초기 출시']},
];

function showUpdateLog(){
  const body=`
  <div style="font-size:13px;color:var(--tx2);margin-bottom:14px">
    제작: <b style="color:var(--tx)">@plli_ze</b> &nbsp;·&nbsp; PLAVE Caligo Pt.2 구매 관리기
  </div>
  ${UPDATE_LOG.map(v=>`
    <div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-weight:700;font-size:14px">${v.title}</span>
        <span style="font-size:11px;color:var(--tx3)">${v.date}</span>
      </div>
      <ul style="padding-left:16px">
        ${v.items.map(i=>`<li style="font-size:13px;color:var(--tx2);margin-bottom:3px">${i}</li>`).join('')}
      </ul>
    </div>
  `).join('')}`;
  openM('📋 업데이트 로그', body);
  document.getElementById('m-foot').innerHTML=`<button class="btn btn-s" onclick="closeM()">닫기</button>`;
}

// ── STORE INFO POPUP ──
function showStoreInfoPopup(sid){
  const s=S.stores.find(x=>x.id===sid);
  if(!s)return;
  const dist=distName(s.distId);
  const ctry=COUNTRIES[s.country]?.lb||s.country;
  const cur=getStoreCur(s);
  const days=s.purchaseEnd?dDays(s.purchaseEnd):null;
  const deadlineStr=s.purchaseEndTxt||(s.purchaseEnd?fDate(s.purchaseEnd):'');
  const activePrices=ALBUMS.filter(a=>storePrice(s,a.k)!=null);
  const ps=S.purchases.filter(p=>p.storeId===sid);
  const sName=s.name.replace('[음총]','').trim();
  const isEum=s.name.includes('[음총]');

  const body=`
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
    <span class="bx ${isOvs(s)?'bx-ovs':'bx-dom'}">${ctry}</span>
    ${dist?`<span class="bx bx-plt">🏷 ${dist}</span>`:''}
    ${isEum?`<span class="bx bx-plt2">🎵 음총</span>`:''}
    ${s.unpoPerk?`<span class="bx bx-pk">⭐ ${ALBUMS.find(a=>a.k===s.unpoPerk)?.lb} 미공포</span>`:''}
    ${s.videocall?`<span class="bx" style="background:rgba(79,126,255,.1);color:var(--ac);border:1px solid var(--ac)">📹 영통응모</span>`:''}
    ${s.priceMode==='custom'?`<span class="tag">단가직접입력</span>`:''}
  </div>

  ${(s.purchaseStart||deadlineStr)?`
  <div style="background:var(--sur2);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:13px">
    <div style="font-weight:600;margin-bottom:4px">🛍 구매 기간</div>
    ${s.purchaseStart?`<div style="color:var(--tx2)">시작: ${fDate(s.purchaseStart)}</div>`:''}
    ${deadlineStr?`<div style="font-weight:600;color:${days!==null&&days<=2?'var(--err)':days!==null&&days<=7?'var(--warn)':'var(--tx)'}">
      마감: ${deadlineStr} ${days!==null?(days<0?`(${Math.abs(days)}일 경과)`:days===0?'(오늘!)':`(D-${days})`):''}</div>`:''}
  </div>`:'' }

  ${activePrices.length?`
  <div style="margin-bottom:12px">
    <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px">💰 단가</div>
    <div class="store-prices">
      ${activePrices.map(a=>{
        const p=storePrice(s,a.k);const isPerk=a.k===s.unpoPerk;
        return `<div class="sp-item ${isPerk?'perk':''}">
          <div class="sp-lb">${a.lb}</div>
          <div class="sp-v">${cur==='KRW'?fKRW(p):fFor(p,cur)+' ≈ '+fKRW(Math.round(p*rate(cur)))}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`:'' }

  ${s.offlineNote||s.offlineStart?`
  <div style="background:var(--pk-g);border:1px solid rgba(168,85,247,.2);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:13px">
    <div style="color:var(--pk);font-weight:600;margin-bottom:4px">📍 오프라인${s.offlineLuckyDraw?' 🎰 럭드':''}</div>
    ${s.offlineStart?`<div style="color:var(--tx2)">${s.offlineStart}${s.offlineEnd&&s.offlineEnd!==s.offlineStart?' ~ '+s.offlineEnd:''}</div>`:''}
    ${s.offlineHours?`<div style="color:var(--tx2)">⏰ ${s.offlineHours}</div>`:''}
    ${s.offlineAddress?`<div style="color:var(--tx2)">📍 ${s.offlineAddress}</div>`:''}
    ${s.offlineNote?`<div style="color:var(--tx2);white-space:pre-line;margin-top:4px">${s.offlineNote}</div>`:''}
  </div>`:'' }

  ${s.memo?`<div style="background:var(--sur2);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:13px;color:var(--tx2);white-space:pre-line">📝 ${s.memo}</div>`:''}

  ${s.videocall?`
  <div style="background:rgba(79,126,255,.08);border:1px solid rgba(79,126,255,.3);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:13px">
    <div style="color:var(--ac);font-weight:600">📹 영상통화 응모 대상 판매처</div>
  </div>`:'' }

  ${ps.length?`
  <div>
    <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px">🛒 내 구매 기록 (${ps.length}건)</div>
    ${ps.map(p=>{
      const t=calcTotal(p);const si=STATUSES.find(x=>x.k===(p.status||'waiting'));
      const items=(p.items||[]).filter(i=>i.qty>0).map(i=>ALBUMS.find(a=>a.k===i.type)?.lb+' ×'+i.qty).join(', ')||'—';
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);font-size:13px;flex-wrap:wrap">
        <span class="bx ${si?.cls||''}" style="font-size:10px">${si?.lb||'?'}</span>
        <span style="flex:1;color:var(--tx2)">${items}</span>
        <span class="mono" style="font-weight:700;color:var(--ac)">${fKRW(t)}</span>
        <button class="btn btn-s btn-xs" onclick="closeM();editP('${p.id}')">수정</button>
      </div>`;
    }).join('')}
  </div>`:'' }
  `;

  openM(sName, body);
  document.getElementById('m-foot').innerHTML=`
    ${s.url?`<a href="${s.url}" target="_blank" class="btn btn-p">🔗 구매 링크</a>`:''}
    <button class="btn btn-s" onclick="closeM();addP('${s.id}')">+ 구매추가</button>
    <button class="btn btn-s" onclick="closeM()">닫기</button>`;

}
// ═══════════════════════════════════════════
// INFO TAB
// ═══════════════════════════════════════════
// 미공포 포토카드 데이터 (이미지는 추후 추가)
// S.unpoData[albumKey][baseName] = [[{img,note}x5], [set2]...]
// Sets are per baseName (판매처 그룹), allowing multiple sets per store group
const UNPO_ALBUMS = ['PHOTOBOOK','POCAALBUM','ID_PASS','INVENTORY'];
function _mkSet(){ return {cards:Array.from({length:5},()=>({img:null,note:'',owned:false})),memo:''}; }
function getUnpoSets(albumKey, baseName){
  if(!S.unpoData) S.unpoData={};
  // Migrate old flat/array-of-arrays format
  if(Array.isArray(S.unpoData[albumKey])){
    const ak=S.unpoData[albumKey];
    S.unpoData[albumKey]={'__default__':Array.isArray(ak[0])?ak:[ak]};
  }
  if(!S.unpoData[albumKey]) S.unpoData[albumKey]={};
  const key=baseName||'__default__';
  if(!S.unpoData[albumKey][key]){
    // Use UNPO_MULTI_SETS to determine correct number of sets
    const n=(UNPO_MULTI_SETS[albumKey]&&UNPO_MULTI_SETS[albumKey][key])||1;
    S.unpoData[albumKey][key]=Array.from({length:n},()=>_mkSet());
  }
  return S.unpoData[albumKey][key];
}
function getUnpoData(albumKey){ return getUnpoSets(albumKey,'__default__')[0]; }

function renderInfo(){
  const mc=document.getElementById('main');
  const sub=S.infoSub||'unpo';

  mc.innerHTML=`
  <div class="sub-tabs">
    <div class="sub-tab ${sub==='unpo'?'on':''}" onclick="S.infoSub='unpo';renderInfo()">⭐ 미공포</div>
    <div class="sub-tab ${sub==='matrix'?'on':''}" onclick="S.infoSub='matrix';renderInfo()">📋 판매처 정보</div>
  </div>
  <div id="info-sub"></div>`;

  if(sub==='matrix') renderInfoMatrix();
  else renderInfoUnpo();
}

function renderInfoMatrix(){
  const el=document.getElementById('info-sub');
  if(!el)return;
  const storeWithPurch=new Set(S.purchases.map(p=>p.storeId));
  const sort=S.infoSort||'name';

  // Group stores by base name
  function baseName(n){ return n.replace('[음총]','').trim().replace(/\s*\([^)]*\)\s*$/,'').trim(); }
  const groups={};
  S.stores.forEach(s=>{
    const bn=baseName(s.name);
    if(!groups[bn])groups[bn]=[];
    groups[bn].push(s);
  });

  // Sort groups
  let groupKeys=Object.keys(groups);
  if(sort==='name') groupKeys.sort((a,b)=>a.localeCompare(b,'ko'));
  else if(sort==='platform') groupKeys.sort((a,b)=>{
    const da=distName(groups[a][0].distId)||'zzz';
    const db=distName(groups[b][0].distId)||'zzz';
    return da.localeCompare(db,'ko')||a.localeCompare(b,'ko');
  });
  else if(sort==='deadline') groupKeys.sort((a,b)=>{
    const da=groups[a].map(s=>s.purchaseEnd?dDays(s.purchaseEnd):9999).sort((x,y)=>x-y)[0];
    const db=groups[b].map(s=>s.purchaseEnd?dDays(s.purchaseEnd):9999).sort((x,y)=>x-y)[0];
    return da-db;
  });
  else if(sort==='unpo') groupKeys.sort((a,b)=>{
    const ua=groups[a].some(s=>s.unpoPerk)?1:0;
    const ub=groups[b].some(s=>s.unpoPerk)?1:0;
    return ub-ua||a.localeCompare(b,'ko');
  });

  const sortBtns=[
    {k:'name',lb:'판매처'},
    {k:'platform',lb:'플랫폼'},
    {k:'deadline',lb:'구매기한'},
    {k:'unpo',lb:'미공포'},
    {k:'videocall',lb:'📹영통'},
  ];
  if(sort==='videocall') groupKeys.sort((a,b)=>{
    const va=groups[a].some(s=>s.videocall)?1:0;
    const vb=groups[b].some(s=>s.videocall)?1:0;
    return vb-va||a.localeCompare(b,'ko');
  });

  let rows='';
  groupKeys.forEach(bn=>{
    const ss=groups[bn];
    const rowspan=ss.length;
    ss.forEach((s,idx)=>{
      const sName=s.name.replace('[음총]','').trim();
      const isEum=s.name.includes('[음총]');
      const subLabel=sName===bn?'':(sName.replace(bn,'').replace(/^\s*[\-\(]/,'').replace(/\)\s*$/,'').trim());
      const dist=distName(s.distId);
      const hasPurch=storeWithPurch.has(s.id);
      const d=s.purchaseEnd?dDays(s.purchaseEnd):null;
      const deadlineStr=s.purchaseEndTxt||(s.purchaseEnd?s.purchaseEnd.slice(5,10):'—');
      const dcolor=d===null?'var(--tx2)':d<0?'var(--tx3)':d<=2?'var(--err)':d<=7?'var(--warn)':'var(--ok)';
      const ddStr=d===null?'':(d<0?`<br><span style="color:var(--tx3);font-size:10px">${Math.abs(d)}일전</span>`:d===0?`<br><span style="color:var(--err);font-size:10px">오늘!</span>`:`<br><span style="font-size:10px">D-${d}</span>`);
      const perkAlb=s.unpoPerk?`⭐ ${ALBUMS.find(a=>a.k===s.unpoPerk)?.lb||''}`:'-';

      // Show 음총 in header only if ALL stores in group are 음총; otherwise show per-row
      const allEum=ss.every(x=>x.name.includes('[음총]'));
      const nameCell=idx===0?`<td rowspan="${rowspan}" style="font-weight:700;font-size:13px;vertical-align:top;padding-top:10px;border-right:1px solid var(--bd);cursor:pointer;white-space:nowrap" onclick="showStoreInfoPopup('${s.id}')">
        ${bn}${allEum?` <span class="bx bx-plt2" style="font-size:9px">🎵</span>`:''}
      </td>`:'';

      const rowStyle=idx===0?'':'border-top:1px dashed var(--bd)';
      rows+=`<tr class="tr-click" style="${rowStyle}" onclick="showStoreInfoPopup('${s.id}')">
        ${nameCell}
        <td style="font-size:11px;color:var(--tx2);white-space:nowrap">
          ${subLabel?`<div style="color:var(--tx);font-size:11px">${subLabel}</div>`:''}
          ${dist?`<span>${dist}</span>`:`<span style="color:var(--tx3)">—</span>`}${isEum&&!allEum?`<span class="bx bx-plt2" style="font-size:9px">🎵</span>`:''}
        </td>
        <td style="text-align:center">${hasPurch?`<span class="bx bx-ord" style="font-size:10px">✓</span>`:`<span style="color:var(--tx3);font-size:11px">—</span>`}</td>
        <td style="font-size:11px;white-space:nowrap">
          <span style="color:${dcolor}">${deadlineStr}</span>${ddStr}
        </td>
        <td style="font-size:11px;white-space:nowrap">${perkAlb}</td>
        <td style="text-align:center;font-size:13px">${s.videocall?'📹':'—'}</td>
      </tr>`;
    });
  });

  el.innerHTML=`
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
    <span style="font-size:11px;color:var(--tx2);flex-shrink:0">정렬:</span>
    ${sortBtns.map(b=>`<span class="chip sm ${sort===b.k?'on':''}" onclick="S.infoSort='${b.k}';renderInfoMatrix()">${b.lb}</span>`).join('')}
  </div>
  <div style="font-size:11px;color:var(--tx2);margin-bottom:6px">🎵 = 음원총공팀 연계 판매처</div>
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th style="min-width:80px">판매처</th>
          <th style="min-width:70px">플랫폼</th>
          <th style="text-align:center;min-width:40px">구매</th>
          <th style="min-width:75px">구매기한</th>
          <th style="min-width:80px">미공포</th>
          <th style="text-align:center;min-width:40px">영통</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderInfoUnpo(){
  const el=document.getElementById('info-sub');
  if(!el)return;
  // Returns qty of unpoPerk album bought from this store
  function purchQty(storeId, ak){
    return S.purchases.filter(p=>p.storeId===storeId)
      .reduce((s,p)=>(p.items||[]).filter(i=>i.type===ak).reduce((ss,i)=>ss+(i.qty||0),s),0);
  }
  const hasPurch=id=>S.purchases.some(p=>p.storeId===id);
  const MEMBERS=['예준','노아','밤비','은호','하민'];
  const albumOrder=['PHOTOBOOK','POCAALBUM','ID_PASS','INVENTORY'];
  function baseName(n){ return n.replace('[음총]','').trim().replace(/\s*\([^)]*\)\s*$/,'').trim(); }

  // Build groups: unpoByAlbum[ak] = {baseName:[store,...]}
  const unpoByAlbum={};
  albumOrder.forEach(k=>{ unpoByAlbum[k]={}; });
  S.stores.forEach(s=>{
    if(s.unpoPerk&&unpoByAlbum[s.unpoPerk]){
      const bn=baseName(s.name);
      if(!unpoByAlbum[s.unpoPerk][bn]) unpoByAlbum[s.unpoPerk][bn]=[];
      unpoByAlbum[s.unpoPerk][bn].push(s);
    }
  });

  // Summary counts by owned slots
  let totalCards=0, collectedCards=0;
  albumOrder.forEach(ak=>Object.entries(unpoByAlbum[ak]).forEach(([bn,ss])=>{
    // Skip shared groups to avoid double-counting
    if(UNPO_SHARED.some(s=>s.ak===ak&&s.bn===bn)) return;
    const sets=getUnpoSets(ak,bn);
    sets.forEach(set=>{
      const arr=(Array.isArray(set)?set:(set.cards||[])).slice(0,5); // exclude back card from count
      totalCards+=arr.filter(c=>c!==null&&c!==undefined).length;
      collectedCards+=arr.filter(c=>c&&c.owned).length;
    });
  }));
  const pct=totalCards>0?Math.round(collectedCards/totalCards*100):0;

  // Render 5-card row; owned state tracked per card slot
  function renderCardRow(sets, ak, bn, interactive){
    return sets.map((set,si)=>{const cards=Array.isArray(set)?set:(set.cards||[]);const setMemo=Array.isArray(set)?'':(set.memo||'');return `
    <div style="margin-bottom:${si<sets.length-1?8:0}px">
      ${sets.length>1?`<div style="font-size:10px;color:var(--tx2);font-weight:600;margin-bottom:3px">세트 ${si+1}${setMemo?` — ${setMemo}`:''}</div>`:(setMemo?`<div style="font-size:10px;color:var(--tx2);margin-bottom:3px">${setMemo}</div>`:'')}
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px">
        ${cards.slice(0,5).map((c,i)=>{
          const owned=c.owned||false;
          const clickAttr=interactive?`onclick="_toggleUnpoOwned('${ak}','${bn}',${si},${i})" style="cursor:pointer"`:'';
          return `<div ${clickAttr}>
          <div style="aspect-ratio:55/85;background:var(--sur2);border:1.5px solid ${owned?'var(--ac2)':'var(--bd)'};border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden;${owned?'':'opacity:0.45'}">
            ${c.img?`<img src="${c.img}" style="width:100%;height:100%;object-fit:cover">`:`<div style="color:var(--tx3);font-size:14px">?</div>`}
          </div>
          <div style="font-size:9px;color:${owned?'var(--tx2)':'var(--tx3)'};text-align:center;margin-top:2px;font-weight:500">${MEMBERS[i]}</div>
          ${c.note?`<div style="font-size:9px;color:var(--ac);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.note}">✎ ${c.note}</div>`:''}
          ${interactive?`<div style="text-align:center;margin-top:2px"><span style="font-size:9px;color:${owned?'var(--ok)':'var(--tx3)'}">${owned?'✓ 보유':'미보유'}</span></div>`:''}
        </div>`;}).join('')}
      </div>
      ${cards[5]&&cards[5].img?`
        <div style="margin-top:6px">
          <button type="button" class="btn btn-s" style="font-size:10px;padding:2px 10px" onclick="(e=>{const d=e.target.nextElementSibling;const show=d.style.display==='none';d.style.display=show?'block':'none';e.target.textContent=show?'▲ 뒷면 닫기':'↩ 뒷면 보기'})(event)">↩ 뒷면 보기</button>
          <div style="display:none;margin-top:6px">
            <div style="font-size:10px;color:var(--tx2);font-weight:600;margin-bottom:4px">뒷면</div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:340px">
              <div ${interactive?`onclick="_toggleUnpoOwned('${ak}','${bn}',${si},5)" style="cursor:pointer"`:''}">
                <div style="aspect-ratio:55/85;background:var(--sur2);border:1.5px solid ${cards[5].owned?'var(--ac2)':'var(--bd)'};border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden;${cards[5].owned?'':'opacity:0.45'}">
                  <img src="${cards[5].img}" style="width:100%;height:100%;object-fit:cover">
                </div>
                ${interactive?`<div style="text-align:center;margin-top:2px"><span style="font-size:9px;color:${cards[5].owned?'var(--ok)':'var(--tx3)'}">${cards[5].owned?'✓ 보유':'미보유'}</span></div>`:''}
              </div>
            </div>
          </div>
        </div>`:''}
    </div>`;}).join('');
  }

  el.innerHTML=`
  <div style="background:var(--sur2);border-radius:var(--r-sm);padding:10px 14px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
      <div>
        <div style="font-size:11px;color:var(--tx2)">총 미공포</div>
        <div class="mono" style="font-size:20px;font-weight:700;color:var(--pk)">${totalCards}장</div>
      </div>
      <div style="width:1px;height:32px;background:var(--bd)"></div>
      <div>
        <div style="font-size:11px;color:var(--tx2)">수집완료</div>
        <div class="mono" style="font-size:20px;font-weight:700;color:var(--ok)">${collectedCards}장</div>
      </div>
      <div style="font-size:11px;color:var(--tx2)">${pct}%</div>
    </div>
    <!-- Progress bar: plli runs, TERRY fixed right -->
    <div style="position:relative;display:flex;align-items:center;gap:6px;margin-bottom:6px;padding-right:42px">
      <div style="flex:1;height:10px;border-radius:5px;background:var(--bd);overflow:visible;position:relative">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--ac),var(--pk));border-radius:5px;transition:width .5s"></div>
        <img src="${window._UNPO_IMG_START}" style="position:absolute;left:calc(${pct}% - 14px);top:50%;transform:translateY(-50%);width:28px;height:28px;object-fit:contain;image-rendering:pixelated;transition:left .5s;pointer-events:none;z-index:2">
      </div>
      <img src="${window._UNPO_IMG_END}" style="position:absolute;right:0;top:50%;transform:translateY(-50%);width:38px;height:38px;object-fit:contain;image-rendering:pixelated">
    </div>
    <div style="font-size:11px;color:var(--tx3);font-style:italic;margin-top:2px">
      ${pct>=100?['🏆 모든 미공포 수집 완료','🏆 100% 달성','🏆 숨겨진 업적까지 전부 클리어','🏆 더 이상 모을 것이 없다 (아마도)'][Math.floor(Math.random()*4)]:['플리, 지갑은 괜찮은가요?','이미 돌이킬 수 없는 길을 걷고 있는 거 아닐까.','이미 내 자아를 상실했다. 구매 본능만 남아있을 뿐','아직은 괜찮은 줄 알았는데... 장바구니가 점점 무거워진다','이번엔 진짜 안 사려고 했는데 결제창이 너무 가까워','하나만 사면 될 줄 알았지, 왜 세트가 되어 있지','손이 먼저 움직이고 뇌는 뒤늦게 합류 중','이건 소비가 아니라 투자야... 아마도','통장 잔고를 보지 않는 법을 배웠다','필요 없다고 생각했는데 이미 필요해짐','고민은 배송만 늦출 뿐이라며 스스로를 설득 중','누가 내 카드로 결제했지? (나였음)','장바구니는 담으라고 있는 거잖아... 그렇지?','이건 마지막일지도 몰라서 또 사는 중','하나만이라는 말은 이제 믿지 않는다','이미 돌아가기엔 너무 많이 와버린 느낌','이 정도면 취미가 아니라 생활이다','카드값은 미래의 내가 해결해주겠지','합리화 스킬이 점점 레벨업 중','어차피 살 거였다는 결론에 도달','사고 나서 이유를 만드는 중','이제는 망설이는 시간도 아깝다'][Math.floor(Math.random()*22)]}
    </div>
  </div>
  ${(()=>{const f=S.infoUnpoFilter||'all';return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center"><span style="font-size:11px;color:var(--tx2)">보기:</span><span class="chip sm ${f==='all'?'on':''}" onclick="S.infoUnpoFilter='all';renderInfoUnpo()">전체</span><span class="chip sm ${f==='owned'?'on':''}" onclick="S.infoUnpoFilter='owned';renderInfoUnpo()">수집</span><span class="chip sm ${f==='unowned'?'on':''}" onclick="S.infoUnpoFilter='unowned';renderInfoUnpo()">미수집</span><div style="margin-left:auto;min-width:120px;max-width:180px"><input type="text" placeholder="🔍 판매처 검색" value="${S.infoUnpoSearch||''}" oninput="_unpoSearch(this.value)" style="width:100%;font-size:12px;padding:4px 8px;border:1px solid var(--bd);border-radius:var(--r-sm);background:var(--sur2);color:var(--tx)"></div></div>`;})()}
  ${albumOrder.map(ak=>{
    const groups=unpoByAlbum[ak];
    const groupKeys=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'ko'));
    if(!groupKeys.length) return '';
    const aLabel=ALBUMS.find(a=>a.k===ak)?.lb||ak;
    return `<div style="margin-bottom:24px">
      <div style="font-size:14px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--bd);display:flex;align-items:center;gap:6px">
        <span class="bx bx-pk">⭐ ${aLabel} 미공포</span>
        <span style="font-size:11px;font-weight:400;color:var(--tx2)">${groupKeys.length}개 판매처</span>
      </div>
      ${groupKeys.filter(bn=>{
        const sts=getUnpoSets(ak,bn);const hasAny=sts.some(c=>(Array.isArray(c)?c:c.cards||[]).some(x=>x.owned));
        const f=S.infoUnpoFilter||'all';
        if(f==='owned'&&!hasAny) return false;
        if(f==='unowned'&&hasAny) return false;
        const q=(S.infoUnpoSearch||'').toLowerCase().trim();
        if(q){
          const stores=unpoByAlbum[ak][bn]||[];
          const nameMatch=bn.toLowerCase().includes(q);
          const distMatch=stores.some(s=>distName(s.distId)?.toLowerCase().includes(q));
          if(!nameMatch&&!distMatch) return false;
        }
        return true;
      }).map(bn=>{
        const stores=groups[bn];
        const anyP=stores.some(s=>hasPurch(s.id));
        const purchStores=stores.filter(s=>hasPurch(s.id));
        const sets=getUnpoSets(ak,bn);
        const ownedSlots=sets.reduce((s,c)=>{const arr=(Array.isArray(c)?c:(c.cards||[])).slice(0,5);return s+arr.filter(x=>x.owned).length;},0);
        const totalSlots=sets.reduce((s,c)=>{return s+Math.min((Array.isArray(c)?c:(c.cards||[])).length,5);},0);
        const isComplete=ownedSlots>=totalSlots&&totalSlots>0;
        return `<div style="background:var(--sur);border:2px solid ${ownedSlots>0?'var(--ac2)':'var(--bd)'};border-radius:var(--r);padding:12px 14px;margin-bottom:10px;transition:border-color .2s">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:700">${bn}</span>
            ${stores.map(s=>distName(s.distId)?`<span class="bx bx-plt" style="font-size:10px;cursor:pointer" onclick="event.stopPropagation();showStoreInfoPopup('${s.id}')">🏷 ${distName(s.distId)}</span>`:'').join('')}
            ${ownedSlots>0?`<span class="bx bx-ord" style="font-size:10px">${isComplete?'✓ 수집완료':`${ownedSlots}/${totalSlots}장 수집`}</span>`:`<span class="bx bx-none" style="font-size:10px">미구매</span>`}
          </div>
          ${renderCardRow(sets,ak,bn,true)}
          <div style="border-top:1px solid var(--bd);padding-top:8px;margin-top:10px">
          ${anyP
            ?`<div style="font-size:11px;font-weight:600;color:var(--tx2);margin-bottom:4px">🛒 내 구매 기록</div>
              ${purchStores.map(s=>S.purchases.filter(p=>p.storeId===s.id).map(p=>{
                const si=STATUSES.find(x=>x.k===(p.status||'waiting'));
                const items=(p.items||[]).filter(i=>i.qty>0).map(i=>ALBUMS.find(a=>a.k===i.type)?.lb+' ×'+i.qty).join(', ')||'—';
                return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bd);flex-wrap:wrap;font-size:12px">
                  <span style="flex:1;color:var(--tx2)">${s.name.replace('[음총]','').trim()} — ${items}</span>
                  <span class="bx ${si?.cls||''}" style="font-size:10px">${si?.lb||'?'}</span>
                  <button class="btn btn-s btn-xs" onclick="editP('${p.id}')">수정</button>
                </div>`;
              }).join('')).join('')}`
            :`<div style="font-size:11px;font-weight:600;color:var(--tx2);margin-bottom:4px">🛍 구매 가능 판매처</div>
              ${stores.filter(s=>{const d=s.purchaseEnd?dDays(s.purchaseEnd):null;return d===null||d>=0;}).map(s=>{
                const d=s.purchaseEnd?dDays(s.purchaseEnd):null;
                return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px">
                  <span style="flex:1;color:var(--tx2)">${s.name.replace('[음총]','').trim()}${distName(s.distId)?` (${distName(s.distId)})`:''}</span>
                  ${d!==null?`<span style="font-size:10px;color:var(--warn)">D-${d}</span>`:''}
                  <button class="btn btn-p btn-xs" onclick="addP('${s.id}')">+ 구매</button>
                </div>`;
              }).join('')}`}
          ${stores.some(s=>s.memo)?`<div style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--bd);font-size:11px;color:var(--tx2)">${stores.filter(s=>s.memo).map(s=>{const sName=s.name.replace('[음총]','').trim();const prefix=stores.filter(x=>x.memo).length>1?`<span style="font-weight:600;color:var(--tx)">${sName}</span><br>`:'';return `<div style="margin-bottom:${stores.filter(x=>x.memo).indexOf(s)<stores.filter(x=>x.memo).length-1?6:0}px">${prefix}<span style="white-space:pre-line">📝 ${s.memo}</span></div>`;}).join('')}</div>`:''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('')}`;
}

function renderMgrUnpo(){
  const el=document.getElementById('mgr-sub');
  if(!el)return;
  const albumOrder=['PHOTOBOOK','POCAALBUM','ID_PASS','INVENTORY'];
  const CARD_COUNT=5;

  let html=`
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px">
    <button class="btn btn-s btn-sm" onclick="_exportUnpo()">⬇ JSON 내보내기</button>
    <label class="btn btn-s btn-sm" style="cursor:pointer">⬆ JSON 불러오기<input type="file" accept=".json" style="display:none" onchange="_importUnpo(this)"></label>
  </div>`;

  // Group stores by album+baseName (same as renderInfoUnpo)
  function bnOf(n){ return n.replace('[음총]','').trim().replace(/\s*\([^)]*\)\s*$/,'').trim(); }
  const storesByAlbBn={};
  albumOrder.forEach(ak=>{ storesByAlbBn[ak]={}; });
  S.stores.forEach(s=>{
    if(s.unpoPerk&&storesByAlbBn[s.unpoPerk]){
      const bn=bnOf(s.name);
      if(!storesByAlbBn[s.unpoPerk][bn]) storesByAlbBn[s.unpoPerk][bn]=[];
      storesByAlbBn[s.unpoPerk][bn].push(s);
    }
  });
  albumOrder.forEach(ak=>{
    const aLabel=ALBUMS.find(a=>a.k===ak)?.lb||ak;
    const bnKeys=Object.keys(storesByAlbBn[ak]).sort((a,b)=>a.localeCompare(b,'ko'));
    if(!bnKeys.length) return;
    html+=`<div class="card" style="margin-bottom:14px">
      <div class="card-hdr"><div class="card-ttl">⭐ ${aLabel} 미공포</div></div>
      ${bnKeys.map(bn=>{
        const stores=storesByAlbBn[ak][bn];
        const sets=getUnpoSets(ak,bn);
        return `<div style="border:1px solid var(--bd);border-radius:var(--r-sm);padding:10px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
            <div style="font-weight:600;font-size:13px">${bn} <span style="font-size:11px;font-weight:400;color:var(--tx2)">(${stores.map(s=>distName(s.distId)||s.name.replace('[음총]','').trim()).join(', ')})</span></div>
            <button class="btn btn-s btn-sm" onclick="_addUnpoSet('${ak}','${bn}')">+ 세트 추가</button>
          </div>
          ${sets.map((set,si)=>{const cards=Array.isArray(set)?set:(set.cards||[]);const setNote=Array.isArray(set)?'':(set.memo||''); return `
          <div style="background:var(--sur2);border-radius:var(--r-sm);padding:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px">
              <div style="font-size:11px;font-weight:600;color:var(--tx2)">세트 ${si+1}</div>
              <div style="display:flex;gap:4px">
                ${Object.keys(storesByAlbBn[ak]).filter(k=>k!==bn).length>0?`<select style="font-size:10px;padding:2px 4px;border:1px solid var(--bd);border-radius:3px;background:var(--sur);color:var(--tx2)" onchange="_copyUnpoImages('${ak}','${bn}',${si},this.value);this.value=''"><option value="">🔗 이미지 복사...</option>${Object.keys(storesByAlbBn[ak]).filter(k=>k!==bn).map(k=>`<option value="${k}">${k}</option>`).join('')}</select>`:''}
                ${sets.length>1?`<button class="btn btn-d btn-xs" onclick="_removeUnpoSet('${ak}',${si},'${bn}')">삭제</button>`:''}
              </div>
            </div>
            <input type="text" placeholder="세트 메모 (예: 1차 레드, 2차 블랙)" value="${setNote}" style="font-size:11px;padding:5px 8px;width:100%;margin-bottom:8px;box-sizing:border-box" oninput="_setUnpoSetNote('${ak}',${si},'${bn}',this.value)">
            <div style="display:grid;grid-template-columns:repeat(5,1fr) auto;gap:6px;align-items:start">
              ${cards.slice(0,5).map((c,i)=>`
                <div>
                  <div style="font-size:10px;font-weight:600;color:var(--tx2);margin-bottom:3px;text-align:center">${['예준','노아','밤비','은호','하민'][i]}</div>
                  <div style="aspect-ratio:55/85;background:${c.img?'transparent':'var(--sur2)'};border:1.5px solid var(--bd);border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:4px;cursor:pointer" onclick="document.getElementById('uimg-${ak}-${bn.replace(/[^a-z0-9]/gi,'_')}-${si}-${i}').click()">
                    ${c.img?`<img src="${c.img}" style="width:100%;height:100%;object-fit:cover">`:`<div style="color:var(--tx3);font-size:16px">?</div>`}
                  </div>
                  <input type="file" id="uimg-${ak}-${bn.replace(/[^a-z0-9]/gi,'_')}-${si}-${i}" accept="image/*" style="display:none" onchange="_setUnpoImg2('${ak}',${si},${i},this,'${bn}')">
                  ${c.img?`<button class="btn btn-d btn-xs" style="margin-top:3px;width:100%;font-size:10px" onclick="_clearUnpoImg2('${ak}',${si},${i},'${bn}')">삭제</button>`:''}
                </div>`).join('')}
              ${(()=>{const bc=cards[5]||{img:null,owned:false};return `<div style="border-left:1px dashed var(--bd);padding-left:6px"><div style="font-size:10px;font-weight:600;color:var(--tx3);margin-bottom:3px;text-align:center">뒷면</div><div style="aspect-ratio:55/85;background:${bc.img?'transparent':'var(--sur)'};border:1.5px dashed var(--bd);border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:4px;cursor:pointer" onclick="document.getElementById('uimg2-${ak}-${bn.replace(/[^a-z0-9]/gi,'_')}-${si}-5').click()">${bc.img?`<img src="${bc.img}" style="width:100%;height:100%;object-fit:cover">`:'<div style="color:var(--tx3);font-size:14px">+</div>'}</div><input type="file" id="uimg2-${ak}-${bn.replace(/[^a-z0-9]/gi,'_')}-${si}-5" accept="image/*" style="display:none" onchange="_setUnpoImg2('${ak}',${si},5,this,'${bn}')"><br>${bc.img?`<button class="btn btn-d btn-xs" style="width:100%;font-size:10px" onclick="_clearUnpoImg2('${ak}',${si},5,'${bn}')">삭제</button>`:''}</div>`;})()}
            </div>
          </div>`;}).join('')}
        </div>`;
      }).join('')}
    </div>`;
  });

  el.innerHTML=html;
}


function _copyUnpoImages(ak,toBn,toSi,fromBn){
  if(!fromBn) return;
  const fromSets=getUnpoSets(ak,fromBn);
  const toSets=getUnpoSets(ak,toBn);
  const fromSet=fromSets[toSi]||fromSets[0];
  const toSet=toSets[toSi];
  if(!fromSet||!toSet) return;
  const fromCards=Array.isArray(fromSet)?fromSet:(fromSet.cards||[]);
  const toCards=Array.isArray(toSet)?toSet:(toSet.cards||[]);
  fromCards.forEach((c,i)=>{ if(toCards[i]&&c.img) toCards[i].img=c.img; });
  save();renderMgrUnpo();toast('이미지 복사 완료 ✓');
}
function _setUnpoSetNote(ak,si,bn,val){
  const sets=getUnpoSets(ak,bn||'__default__');
  if(!sets[si])return;
  if(Array.isArray(sets[si])) sets[si]={cards:sets[si],memo:val};
  else sets[si].memo=val;
  save();
}
function _toggleUnpoOwned(ak,bn,si,idx){
  const sets=getUnpoSets(ak,bn);
  const set=sets[si];if(!set)return;
  const cards=Array.isArray(set)?set:(set.cards||set);
  if(cards&&cards[idx]!==undefined){
    cards[idx].owned=!cards[idx].owned;
    save();renderInfo();
  }
}
function _addUnpoSet(ak,bn){
  const sets=getUnpoSets(ak,bn||'__default__');
  sets.push(_mkSet());
  save();renderMgrUnpo();toast('세트 추가됨 ✓');
}
function _removeUnpoSet(ak,si,bn){
  if(!confirm('이 세트를 삭제할까요?'))return;
  const sets=getUnpoSets(ak,bn||'__default__');
  sets.splice(si,1);
  if(!sets.length) sets.push(_mkSet());
  save();renderMgrUnpo();
}
function _setUnpoImg2(ak,si,idx,inp,bn){
  if(!inp.files[0])return;
  const r=new FileReader();
  r.onload=e=>{
    const set=getUnpoSets(ak,bn||'__default__')[si];
    const cards=Array.isArray(set)?set:(set.cards||[]);
    while(cards.length<=idx) cards.push({img:null,note:'',owned:false});
    cards[idx].img=e.target.result;
    if(!Array.isArray(set)) set.cards=cards;
    else getUnpoSets(ak,bn||'__default__')[si]=cards;
    save();renderMgrUnpo();toast('이미지 저장됨 ✓');
  };
  r.readAsDataURL(inp.files[0]);
}
function _setUnpoNote2(ak,si,idx,val,bn){
  const set=getUnpoSets(ak,bn||'__default__')[si];const cards=Array.isArray(set)?set:(set.cards||[]);if(cards[idx])cards[idx].note=val;save();
}
function _clearUnpoImg2(ak,si,idx,bn){
  const set=getUnpoSets(ak,bn||'__default__')[si];
  const cards=Array.isArray(set)?set:(set.cards||[]);
  if(cards[idx]) cards[idx].img=null;
  save();renderMgrUnpo();
}
// Legacy compat
function _setUnpoImg(ak,idx,inp){ _setUnpoImg2(ak,0,idx,inp); }
function _setUnpoNote(ak,idx,val){ _setUnpoNote2(ak,0,idx,val); }
function _clearUnpoImg(ak,idx){ _clearUnpoImg2(ak,0,idx); }

function _exportUnpo(){
  const blob=new Blob([JSON.stringify(S.unpoData,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='unpo_data.json';a.click();
}
function _importUnpo(inp){
  if(!inp.files[0])return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      S.unpoData=JSON.parse(e.target.result);
      save();renderMgr();toast('미공포 데이터 불러오기 완료 ✓');
    }catch(err){toast('JSON 파싱 오류','err');}
  };
  r.readAsText(inp.files[0]);
}


// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
function showNotice(){
  const k='plave2_notice_hide_v10';
  const t=localStorage.getItem(k);
  if(t&&Date.now()<parseInt(t)) return;
  const el=document.getElementById('notice-overlay');
  if(el) el.style.display='flex';
}
var _unpoSearchTimer=null;
function _unpoSearch(v){
  S.infoUnpoSearch=v;
  clearTimeout(_unpoSearchTimer);
  _unpoSearchTimer=setTimeout(renderInfoUnpo,200);
}
function closeNotice(){
  const chk=document.getElementById('notice-hide7');
  if(chk&&chk.checked) localStorage.setItem('plave2_notice_hide_v9',String(Date.now()+7*86400000));
  const el=document.getElementById('notice-overlay');
  if(el) el.style.display='none';
}
function init(){
  load();render();
  setTimeout(showNotice,300);
  const stale=!S.ratesAt||(Date.now()-new Date(S.ratesAt).getTime())>3600000;
  if(stale) fetchRates();
}
init();
