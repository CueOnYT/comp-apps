// app.js — upgraded: hold-to-change bets, low-poly city drift with joysticks & tire marks,
// shared wallet & shop, permanent James message, no external config required.

/* =================== helpers =================== */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const irnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const fmt = n => {
  if(typeof n === 'number' && !Number.isFinite(n)) return n.toString();
  try { return Number(n).toLocaleString(); } catch(e) { return String(n); }
};

/* ================ storage ================= */
const S = {
  get(k, d){ try{ const v = localStorage.getItem('dg_'+k); return v===null?d:JSON.parse(v); }catch(e){return d;} },
  set(k, v){ localStorage.setItem('dg_'+k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem('dg_'+k); }
};

/* ================ WALLET ================= */
const Wallet = {
  key:'wallet',
  get(){ return Number(S.get(this.key, 100)); },
  set(v){ v = Math.max(0, Math.floor(Number(v)||0)); S.set(this.key, v); this.render(); return v; },
  credit(n){ return this.set(this.get() + Math.max(0, Math.floor(n||0))); },
  canSpend(n){ return this.get() >= Math.max(0, Math.floor(n||0)); },
  spend(n){ n = Math.max(0, Math.floor(n||0)); if(!this.canSpend(n)) return false; this.set(this.get()-n); return true; },
  render(){ $$('.walletVal').forEach(el=>el.textContent = fmt(this.get())); $('#walletVal').textContent = fmt(this.get()); }
};

/* ================ customization ============== */
function shadeColor(hex, percent){
  hex = hex.replace('#','');
  const num = parseInt(hex,16);
  let r=(num>>16)+Math.round(255*(percent/100));
  let g=((num>>8)&0x00FF)+Math.round(255*(percent/100));
  let b=(num&0x0000FF)+Math.round(255*(percent/100));
  r=Math.min(255,r); g=Math.min(255,g); b=Math.min(255,b);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function applyCustom(){
  const accent = S.get('accent','#7cf1c8');
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-2', shadeColor(accent,30));
  $('#hudAccent') && ($('#hudAccent').textContent = accent);
}

/* init custom UI */
(function(){
  const accent = S.get('accent','#7cf1c8');
  $('#accentPicker') && ($('#accentPicker').value = accent);
  applyCustom();
  $('#accentPicker') && $('#accentPicker').addEventListener('input', e=>{ S.set('accent', e.target.value); applyCustom(); });
})();

/* ================ tabs & shortcuts ============= */
const tabOrder = ['slots','blackjack','math','typing','game','shop','custom'];
function activateTab(name){
  $$('.tab').forEach(b=>b.removeAttribute('aria-current'));
  const btn = $(`.tab[data-tab="${name}"]`); if(btn) btn.setAttribute('aria-current','page');
  $$('.panel').forEach(p=>p.classList.toggle('active', p.id === 'sec-'+name));
}
$$('.tab').forEach(btn=>btn.addEventListener('click', ()=>activateTab(btn.dataset.tab)));
document.addEventListener('keydown', (e)=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if(/^[1-7]$/.test(e.key)) activateTab(tabOrder[Number(e.key)-1]);
  if(e.key.toLowerCase()==='g') activateTab('game');
  if(e.key.toLowerCase()==='p') activateTab('shop');
});

/* ================ Shop ================= */
const Shop = {
  items:[
    {id:'theme_neon', name:'Neon Night', price:120, type:'theme', data:{accent:'#39ffb6'}, desc:'Neon glow interface.'},
    {id:'boost_slots_10', name:'Slots Luck ×10', price:140, type:'boost', data:{slotLuck:10}, desc:'Better pair/triple odds for next spins.'},
    {id:'car_red', name:'Car: Cherry', price:150, type:'car', data:{color:'#c6262e', name:'Cherry'}, desc:'Red low-poly skin.'},
    {id:'car_black', name:'Car: Onyx', price:160, type:'car', data:{color:'#111111', name:'Onyx'}, desc:'Sleek black car.'},
    {id:'trail_cyan', name:'Trail: Cyan', price:100, type:'trail', data:{color:'#00e5ff'}, desc:'Shiny cyan tire trail.'},
    {id:'typing_60', name:'Typing 60s Mode', price:90, type:'typing', data:{dur:60}, desc:'Unlock 60s mode permanently.'}
  ],
  ownedSet(){ return new Set(S.get('owned', [])); },
  isOwned(id){ return this.ownedSet().has(id); },
  grant(id){ const s = this.ownedSet(); s.add(id); S.set('owned', [...s]); },
  useBoost(id){ const boosts = S.get('boosts', {slotLuck:0}); if(id==='boost_slots_10') boosts.slotLuck = (boosts.slotLuck||0)+10; S.set('boosts', boosts); },
  equip(item){
    if(item.type==='theme'){ if(item.data.accent) S.set('accent', item.data.accent); applyCustom(); }
    if(item.type==='car'){ S.set('car_skin', item.data); $('#driftCarName').textContent = item.data.name; }
    if(item.type==='trail'){ S.set('trail_color', item.data.color); }
    if(item.type==='typing'){ S.set('typingDur', item.data.dur || 30); }
  },
  render(){
    const grid = $('#shopGrid'); if(!grid) return;
    grid.innerHTML = '';
    const owned = this.ownedSet();
    this.items.forEach(item=>{
      const d = document.createElement('div');
      d.className = 'shop-item';
      d.innerHTML = `<h4>${item.name}</h4><p class="muted">${item.desc}</p><div>Price: <strong class="price">${fmt(item.price)}</strong></div>
        <div class="actions">
          <button class="btn buyBtn" data-id="${item.id}">${owned.has(item.id)?'Buy again':'Buy'}</button>
          <button class="btn ghost equipBtn" data-id="${item.id}">Equip/Use</button>
          <span class="owned">${owned.has(item.id)?'Owned':''}</span>
        </div>`;
      grid.appendChild(d);
    });

    grid.querySelectorAll('.buyBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id; const it = this.items.find(i=>i.id===id);
        if(it.type!=='boost' && this.isOwned(id)){ alert('You already own this item. Use Equip to apply it.'); return; }
        if(!Wallet.canSpend(it.price)){ alert('Not enough coins.'); return; }
        Wallet.spend(it.price);
        if(it.type==='boost') this.useBoost(id); else this.grant(id);
        this.render();
      });
    });
    grid.querySelectorAll('.equipBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id; const it = this.items.find(i=>i.id===id);
        if(it.type!=='boost' && !this.isOwned(id)){ alert('Buy it first.'); return; }
        this.equip(it);
      });
    });
  }
};

/* ================= SLOTS with hold-to-change ================ */
(function(){
  const symbols = ['🍒','🍋','⭐','🔔','🍇','🍉','🍀'];
  const reels = [$('#reel1'), $('#reel2'), $('#reel3')];
  const balEl = $('#slotsBal'), betEl = $('#slotsBet'), bestEl = $('#slotsBest'), msgEl = $('#slotsMsg'), betDisplay = $('#betDisplay');

  let state = { bet: Number(S.get('slots_bet',5)), best: Number(S.get('slots_best',0)), spinning:false };

  function render(){
    balEl.textContent = fmt(Wallet.get());
    betEl.textContent = fmt(state.bet);
    bestEl.textContent = fmt(state.best);
    betDisplay.textContent = fmt(state.bet);
    Wallet.render();
  }

  function weightedResults(){
    const boosts = S.get('boosts', {slotLuck:0});
    let luckExtra = (boosts.slotLuck>0?0.12:0);
    if(boosts.slotLuck>0){ boosts.slotLuck--; S.set('boosts', boosts); }
    const base = ()=> symbols[irnd(0,symbols.length-1)];
    const r1 = base(); let r2 = base(), r3 = base();
    if(Math.random() < 0.06 + luckExtra){ r2 = r1; r3 = r1; return [r1,r2,r3]; }
    if(Math.random() < 0.25 + luckExtra){ if(Math.random()<0.5) r2=r1; else r3=r1; }
    return [r1,r2,r3];
  }

  async function spin(){
    if(state.spinning) return;
    const bet = Math.max(1, Math.floor(state.bet));
    if(!Wallet.canSpend(bet)){ msgEl.textContent = 'Not enough coins.'; return; }
    state.spinning = true; msgEl.textContent = 'Spinning...';
    Wallet.spend(bet); render();

    const results = weightedResults();
    for(let i=0;i<3;i++){
      const el = reels[i]; el.classList.add('spin');
      for(let f=0; f<9; f++){ el.textContent = symbols[irnd(0,symbols.length-1)]; await new Promise(r=>setTimeout(r, 40 + i*25)); }
      el.textContent = results[i]; el.classList.remove('spin');
    }

    let award = 0;
    const set = new Set(results);
    if(set.size===1){ const s=results[0]; award = (s==='⭐'?20:(s==='🍒'?12:(s==='🍋'?8:6)))*bet; msgEl.textContent=`Triple ${s}! +${fmt(award)}`; }
    else if(set.size===2){ award = 4 * bet; msgEl.textContent=`Pair! +${fmt(award)}`; }
    else { msgEl.textContent = 'No match'; }

    if(award>0) Wallet.credit(award);
    state.best = Math.max(state.best, Wallet.get()); S.set('slots_bet', state.bet); S.set('slots_best', state.best);
    render(); state.spinning=false;
  }

  $('#spinBtn').addEventListener('click', spin);

  /* hold-to-change bet (works for betUp / betDown / bj bet too) */
  function makeHold(btn, deltaFn){
    let iv=null, step=1, accel=0, wasNoSelect=false;
    const start = (e)=>{
      e.preventDefault();
      // prevent selection while holding
      document.documentElement.classList.add('no-select'); wasNoSelect=true;
      // first change immediately
      deltaFn();
      iv = setInterval(()=>{
        accel++;
        if(accel%7===0) step *= 2;
        for(let i=0;i<step;i++) deltaFn();
      }, 140);
    };
    const stop = ()=>{
      if(iv) clearInterval(iv); iv=null; step=1; accel=0;
      if(wasNoSelect){ document.documentElement.classList.remove('no-select'); wasNoSelect=false; }
    };
    btn.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('lostpointercapture', stop);
  }

  makeHold($('#betUp'), ()=>{ state.bet = Math.min(Math.max(1, state.bet+1), Math.max(1, Wallet.get())); S.set('slots_bet', state.bet); render(); });
  makeHold($('#betDown'), ()=>{ state.bet = Math.max(1, state.bet-1); S.set('slots_bet', state.bet); render(); });

  // keyboard
  document.addEventListener('keydown', (e)=>{ if(!$('#sec-slots').classList.contains('active')) return; if(e.key.toLowerCase()==='s') spin(); if(e.key==='+') $('#betUp').click(); if(e.key==='-') $('#betDown').click(); });

  render();
})();

/* ================ BLACKJACK with hold-to-change ================ */
(function(){
  const suits=['♠','♥','♦','♣'], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const dealerEl = $('#dealer'), playerEl = $('#player');
  const bankEl = $('#bjBank'), betEl = $('#bjBet'), bjBetDisplay = $('#bjBetDisplay'), msgEl = $('#bjMsg');

  let state={ bet: Number(S.get('bj_bet',10)), deck:[], player:[], dealer:[], inRound:false };

  function renderTop(){ bankEl.textContent = fmt(Wallet.get()); betEl.textContent = fmt(state.bet); bjBetDisplay.textContent = fmt(state.bet); Wallet.render(); }
  function save(){ S.set('bj_bet', state.bet); S.set('bj_best', Math.max(Number(S.get('bj_best',0)), Wallet.get())); renderTop(); }

  function newDeck(){
    state.deck=[]; suits.forEach(s=>ranks.forEach(r=>state.deck.push(r+s)));
    for(let i=state.deck.length-1;i>0;i--){ const j=irnd(0,i); [state.deck[i], state.deck[j]]=[state.deck[j], state.deck[i]]; }
  }
  const valueOf = r => r==='A'?11:(['J','Q','K'].includes(r)?10:Number(r));
  function handValue(h){ let t=0, ac=0; for(const c of h){ const r=c.slice(0,-1); const v=valueOf(r); t+=v; if(r==='A') ac++; } while(t>21 && ac){ t-=10; ac--; } return t; }
  function renderHand(el, hand, hide=false){ el.innerHTML=''; hand.forEach((c,i)=>{ const d=document.createElement('div'); d.className='cardx'; if(hide && i===0){ d.classList.add('back'); d.textContent='🂠'; } else d.textContent=c; el.appendChild(d); }); }
  function updateVals(reveal=false){
    $('#pVal').textContent = state.player.length?handValue(state.player):0;
    if(reveal) $('#dVal').textContent = state.dealer.length?handValue(state.dealer):'?';
    else {
      if(state.dealer.length>=2){
        const visible = state.dealer.slice(1);
        let sum=0, ac=0;
        visible.forEach(c=>{ const r=c.slice(0,-1); const v=valueOf(r); sum+=v; if(r==='A') ac++; });
        while(sum>21 && ac){ sum-=10; ac--; }
        $('#dVal').textContent = sum||'?';
      } else $('#dVal').textContent='?';
    }
  }
  function resetRound(){ state.player=[]; state.dealer=[]; state.inRound=false; renderHand(playerEl,[]); renderHand(dealerEl,[]); updateVals(); $('#bjHit').disabled=true; $('#bjStand').disabled=true; }
  function checkBlackjack(){
    const pv=handValue(state.player), dv=handValue(state.dealer);
    const pBJ = state.player.length===2 && pv===21;
    const dBJ = state.dealer.length===2 && dv===21;
    if(pBJ||dBJ){
      renderHand(dealerEl, state.dealer, false); updateVals(true);
      if(pBJ && !dBJ){ const win = Math.round(state.bet*2.5); Wallet.credit(win); msgEl.textContent = `Blackjack! +${fmt(win-state.bet)} (3:2)`; }
      else if(dBJ && !pBJ) { msgEl.textContent='Dealer has blackjack. You lose.'; }
      else { Wallet.credit(state.bet); msgEl.textContent='Push.'; }
      state.inRound=false; $('#bjHit').disabled=true; $('#bjStand').disabled=true; save(); return true;
    }
    return false;
  }
  function deal(){
    if(state.inRound) return;
    if(state.bet < 1) { msgEl.textContent='Set a bet first'; return; }
    if(!Wallet.canSpend(state.bet)){ msgEl.textContent='Not enough coins.'; return; }
    newDeck(); resetRound(); Wallet.spend(state.bet); save(); msgEl.textContent='Dealt'; state.inRound=true;
    state.player.push(state.deck.pop(), state.deck.pop()); state.dealer.push(state.deck.pop(), state.deck.pop());
    renderHand(playerEl, state.player, false); renderHand(dealerEl, state.dealer, true); updateVals(false);
    setTimeout(()=>{ if(!checkBlackjack()){ $('#bjHit').disabled=false; $('#bjStand').disabled=false; } }, 180);
  }
  function dealerPlay(){
    renderHand(dealerEl, state.dealer, false); updateVals(true);
    while(handValue(state.dealer) < 17){ state.dealer.push(state.deck.pop()); renderHand(dealerEl, state.dealer, false); updateVals(true); }
    const pv=handValue(state.player), dv=handValue(state.dealer);
    let win=0, msg='';
    if(dv>21 || pv>dv){ win = state.bet*2; msg = `You win +${fmt(win-state.bet)}`; }
    else if(pv===dv){ win = state.bet; msg='Push'; }
    else { win = 0; msg='Dealer wins'; }
    if(win>0) Wallet.credit(win);
    msgEl.textContent=msg; state.inRound=false; $('#bjHit').disabled=true; $('#bjStand').disabled=true; save();
  }

  $('#bjDeal').addEventListener('click', deal);
  $('#bjHit').addEventListener('click', ()=>{
    if(!state.inRound) return;
    state.player.push(state.deck.pop()); renderHand(playerEl, state.player, false); updateVals(false);
    if(handValue(state.player) > 21){ renderHand(dealerEl, state.dealer, false); updateVals(true); msgEl.textContent='Bust!'; state.inRound=false; $('#bjHit').disabled=true; $('#bjStand').disabled=true; save(); }
  });
  $('#bjStand').addEventListener('click', ()=>{ if(!state.inRound) return; dealerPlay(); });

  // hold-to-change for bj bet
  function makeHold(btn, deltaFn){
    let iv=null, step=1, accel=0, wasNoSelect=false;
    const start=(e)=>{ e.preventDefault(); document.documentElement.classList.add('no-select'); wasNoSelect=true; deltaFn(); iv=setInterval(()=>{ accel++; if(accel%7===0) step*=2; for(let i=0;i<step;i++) deltaFn(); }, 140); };
    const stop=()=>{ if(iv) clearInterval(iv); iv=null; step=1; accel=0; if(wasNoSelect){ document.documentElement.classList.remove('no-select'); wasNoSelect=false; } };
    btn.addEventListener('pointerdown', start); window.addEventListener('pointerup', stop); btn.addEventListener('pointercancel', stop);
  }
  makeHold($('#bjBetUp'), ()=>{ state.bet = Math.min(Math.max(1, state.bet+1), Math.max(1, Wallet.get())); S.set('bj_bet', state.bet); renderTop(); });
  makeHold($('#bjBetDown'), ()=>{ state.bet = Math.max(1, state.bet-1); S.set('bj_bet', state.bet); renderTop(); });

  document.addEventListener('keydown', (e)=>{ if(!$('#sec-blackjack').classList.contains('active')) return; if(e.key.toLowerCase()==='d') deal(); if(e.key.toLowerCase()==='h') $('#bjHit').click(); if(e.key.toLowerCase()==='j') $('#bjStand').click(); });

  renderTop();
})();

/* ================= MATH ================== (same as earlier but small coin rewards) */
(function(){
  const qEl = $('#mathQ'), aEl = $('#mathA'), scoreEl = $('#mathScore'), streakEl = $('#mathStreak'), timeEl = $('#mathTime'), msgEl = $('#mathMsg');
  const mAdd = $('#mAdd'), mSub = $('#mSub'), mMul = $('#mMul'), mDiv = $('#mDiv'), mDiff = $('#mDiff');

  let state = { score:0, streak:0, time:60, timer:0, running:false, answer:null };

  function numberRange(diff){ if(diff==='easy') return [1,12]; if(diff==='medium') return [1,50]; return [1,200]; }

  function nextQ(){
    const ops=[]; if(mAdd.checked) ops.push('+'); if(mSub.checked) ops.push('-'); if(mMul.checked) ops.push('*'); if(mDiv.checked) ops.push('/');
    if(ops.length===0) ops.push('+');
    const diff = mDiff.value; const [minN,maxN] = numberRange(diff);

    if(diff==='hard' && Math.random()<0.45){
      const a=irnd(minN,maxN), b=irnd(minN,Math.min(maxN,20)), c=irnd(minN,Math.min(maxN,20));
      const op1 = ops[irnd(0, ops.length-1)], op2 = ops[irnd(0, ops.length-1)];
      let expr = (op1==='/'?`${irnd(1,20)*irnd(1,20)} ÷ ${irnd(1,20)}`:`${a} ${op1} ${b}`);
      expr = (op2==='/'?`(${expr}) ÷ ${irnd(1,12)}`:`(${expr}) ${op2} ${c}`);
      const safe = expr.replace(/×/g,'*').replace(/÷/g,'/'); let ans=0; try{ ans = Math.round(eval(safe)); }catch(e){}
      qEl.textContent = expr + ' = ?'; state.answer=ans; aEl.value=''; aEl.focus(); return;
    }

    const op = ops[irnd(0,ops.length-1)]; let a=irnd(minN,maxN), b=irnd(minN,maxN), text='', ans=0;
    if(op==='/'){ b = irnd(1, Math.max(2, Math.min(50,maxN))); ans = irnd(1, Math.max(1, Math.min(50,maxN))); a = ans*b; text = `${a} ÷ ${b} = ?`; }
    else if(op==='*'){ if(diff==='hard') b = irnd(2, Math.min(50,maxN)); ans = a*b; text = `${a} × ${b} = ?`; }
    else if(op==='+'){ ans=a+b; text=`${a} + ${b} = ?`; } else { if(diff!=='hard' && a<b) [a,b]=[b,a]; ans=a-b; text=`${a} − ${b} = ?`; }
    qEl.textContent = text; state.answer = ans; aEl.value=''; aEl.focus();
  }
  function tick(){ state.time--; timeEl.textContent = state.time; if(state.time<=0){ clearInterval(state.timer); state.timer=0; state.running=false; msgEl.textContent=`Time's up — final ${state.score}`; Wallet.credit(Math.floor(state.score/50)); } }

  $('#mathStart').addEventListener('click', ()=>{
    if(state.running) return; state.running=true; state.score=0; state.streak=0; state.time=60; scoreEl.textContent=0; streakEl.textContent=0; timeEl.textContent=60; msgEl.textContent=''; nextQ(); if(state.timer) clearInterval(state.timer); state.timer=setInterval(tick,1000);
  });
  $('#mathSubmit').addEventListener('click', ()=>{
    if(!state.running){ msgEl.textContent='Press Start'; return; }
    const val = Number($('#mathA').value);
    if(Number.isFinite(val) && val===Number(state.answer)){ state.streak++; const bonus = (mDiff.value==='hard')?10:2; const gain = 10 + (state.streak-1)*bonus; state.score += gain; msgEl.textContent=`Correct +${gain}`; }
    else{ state.streak=0; msgEl.textContent=`Wrong — answer ${state.answer}`; }
    scoreEl.textContent=state.score; streakEl.textContent=state.streak; nextQ();
  });
})();

/* ================= TYPING ================= */
(function(){
  const samples = [
    'Practice makes progress. Keep your fingers light and your focus steady.',
    'Clear instructions and clean code make everything easier to fix later.',
    'Small daily habits add up to big improvements over time.',
    'Stay calm. Type steady. Let accuracy build your speed.'
  ];
  const textWrap = $('#typingText'), input = $('#typeInput'), wpmEl = $('#typeWpm'), accEl = $('#typeAcc'), timeEl = $('#typeTime'), msg = $('#typeMsg');

  let state = { text:'', pos:0, time: Number(S.get('typingDur',30)), timer:null, correct:0, total:0, running:false, best:Number(S.get('type_best',0)) };

  function pick(){ state.text = samples[irnd(0,samples.length-1)]; state.pos=0; state.correct=0; state.total=0; render(); }
  function render(){ const before = state.text.slice(0,state.pos); const cur = state.text[state.pos]||''; const after=state.text.slice(state.pos+1); const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); textWrap.innerHTML = `<span class="done">${esc(before)}</span><span class="cur">${esc(cur)}</span>${esc(after)}`; }
  function tick(){ state.time--; timeEl.textContent = state.time; const elapsed = Math.max(1, Number(S.get('typingDur',30)) - state.time); const wpm = Math.round(((state.total/5)/(elapsed/60))||0); const acc = state.total?Math.round((state.correct/state.total)*100):100; wpmEl.textContent = wpm; accEl.textContent = acc+'%'; if(state.time<=0){ clearInterval(state.timer); state.timer=null; state.running=false; msg.textContent = `Done — WPM ${wpm} | Accuracy ${acc}%`; state.best = Math.max(state.best, wpm); S.set('type_best', state.best); Wallet.credit(Math.max(0, Math.floor((wpm-30)/10))); } }

  $('#typeStart').addEventListener('click', ()=>{
    if(state.running) return; state.time = Number(S.get('typingDur',30)); timeEl.textContent = state.time; state.correct=0; state.total=0; state.pos=0; state.running=true; pick(); input.value=''; input.focus(); if(state.timer) clearInterval(state.timer); state.timer=setInterval(tick,1000); msg.textContent=''; });
  input.addEventListener('keydown', function(e){
    if(!state.running){ if(e.key==='Backspace') e.preventDefault(); return; }
    if(e.key==='Tab' || e.key==='Escape'){ e.preventDefault(); return; }
    if(e.key==='Backspace'){ e.preventDefault(); if(state.pos>0) state.pos--; render(); return; }
    if(e.key.length!==1) return;
    e.preventDefault(); const ch = e.key; state.total++; const expected = state.text[state.pos]||''; if(ch===expected) state.correct++; state.pos++; if(state.pos>=state.text.length) pick(); render();
  });
})();

/* =============== DRIFT (Three.js) =============== */
/* Features:
   - low-poly city blocks
   - simple car physics with lateral slip & yaw
   - on-screen dual joysticks (left steer, right accel/brake)
   - tire marks on 2D canvas overlay when slip > threshold
*/

(function(){
  const canvas = $('#driftCanvas');
  const marks = $('#marksCanvas');
  const scoreEl = $('#driftScore');
  const bestEl = $('#driftBest');
  const carNameEl = $('#driftCarName');

  // sync equipped car/trail
  const skin = S.get('car_skin', { color:'#ffdf87', name:'Classic' });
  carNameEl.textContent = skin.name || 'Classic';
  $('#hudCar') && ($('#hudCar').textContent = skin.name || 'Classic');

  // size
  function resizeCanvases(){
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(r.width));
    canvas.height = Math.max(240, Math.floor(r.height || 420));
    marks.width = canvas.width;
    marks.height = canvas.height;
  }
  window.addEventListener('resize', resizeCanvases);

  // Three.js renderer
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  resizeCanvases();
  renderer.setSize(canvas.width, canvas.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071428);

  // camera
  const camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 1000);
  camera.position.set(0, 12, 16);

  // lights
  scene.add(new THREE.AmbientLight(0x9bb4ff, 0.25));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(10, 30, 20);
  scene.add(dir);

  // ground (road + simple grid)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400, 40, 40),
    new THREE.MeshPhongMaterial({ color: 0x0b2038, flatShading:true })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // simple roads: dark rectangles
  const roadMat = new THREE.MeshPhongMaterial({ color: 0x1e2d44 });
  const roads = [];
  function addRoad(x, z, w, l, rot=0){
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, l), roadMat);
    r.position.set(x, 0.05, z);
    r.rotation.y = rot;
    scene.add(r);
    roads.push(r);
  }
  // create a cross-shaped area / grid city
  addRoad(0,0, 30, 300);
  addRoad(0,0, 300, 30);
  for(let i=-3;i<=3;i++){
    addRoad(i*40, -80, 20, 180);
    addRoad(-80, i*40, 20, 180, Math.PI/2);
  }

  // low-poly city blocks (boxes)
  const bmat = new THREE.MeshLambertMaterial({ color:0x223b5c, flatShading:true });
  for(let i=0;i<60;i++){
    const bx = irnd(-180,180), bz = irnd(-180,180);
    // don't place on main roads
    if(Math.abs(bx) < 40 && Math.abs(bz) < 40) continue;
    const h = irnd(4, 28);
    const b = new THREE.Mesh(new THREE.BoxGeometry(irnd(6,18), h, irnd(6,18)), bmat);
    b.position.set(bx, h/2, bz);
    scene.add(b);
  }

  // car (low-poly)
  const carGroup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.6,3.4), new THREE.MeshStandardMaterial({ color: skin.color || '#ffdf87', metalness:0.2, roughness:0.6 }));
  body.position.y = 0.6;
  carGroup.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.4,1.2), new THREE.MeshStandardMaterial({ color:0x111111 }));
  roof.position.set(0, 1.0, -0.2);
  carGroup.add(roof);
  scene.add(carGroup);

  // wheel placeholders
  const wheelGeo = new THREE.BoxGeometry(0.3,0.3,0.5);
  const wheelMat = new THREE.MeshStandardMaterial({ color:0x111111 });
  const wheels = [];
  [[0.8,-0.2,1.1],[ -0.8,-0.2,1.1],[0.8,-0.2,-1.1],[-0.8,-0.2,-1.1]].forEach(p=>{
    const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(p[0], p[1], p[2]); carGroup.add(w); wheels.push(w);
  });

  // trail/tire marks context (2D)
  const markCtx = marks.getContext('2d');
  markCtx.lineWidth = 2;
  markCtx.lineCap = 'round';
  markCtx.strokeStyle = S.get('trail_color', '#00e5ff');

  // world-to-screen helper (three)
  function worldToScreen(vec3){
    const v = vec3.clone(); v.project(camera);
    return { x: (v.x + 1) * 0.5 * canvas.width, y: (-v.y + 1) * 0.5 * canvas.height };
  }

  // physics state (simple dynamic model)
  const phys = {
    pos: new THREE.Vector3(0,0,0),
    vel: new THREE.Vector3(0,0,0),
    forward: new THREE.Vector3(0,0,1),
    angle: 0,    // heading
    steer: 0,    // -1..1
    throttle: 0, // 0..1
    brake: 0     // 0..1
  };

  // controls: keyboard + virtual sticks + mobile buttons
  const keys = {};
  window.addEventListener('keydown', e=>{ keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });

  // mobile buttons
  $('#btnLeft') && $('#btnLeft').addEventListener('pointerdown', ()=>keys['a']=true);
  $('#btnLeft') && $('#btnLeft').addEventListener('pointerup', ()=>keys['a']=false);
  $('#btnRight') && $('#btnRight').addEventListener('pointerdown', ()=>keys['d']=true);
  $('#btnRight') && $('#btnRight').addEventListener('pointerup', ()=>keys['d']=false);
  $('#btnAccel') && $('#btnAccel').addEventListener('pointerdown', ()=>keys['w']=true);
  $('#btnAccel') && $('#btnAccel').addEventListener('pointerup', ()=>keys['w']=false);
  $('#btnBrake') && $('#btnBrake').addEventListener('pointerdown', ()=>keys['s']=true);
  $('#btnBrake') && $('#btnBrake').addEventListener('pointerup', ()=>keys['s']=false);

  // virtual joystick implementation (minimal, single knob inside each stick)
  function setupJoystick(stickEl, onMove){
    if(!stickEl) return null;
    stickEl.innerHTML = '<div class="knob"></div>';
    const knob = stickEl.querySelector('.knob');
    let active=false, id=null, center=null, radius=40;
    function toPos(e){
      let x=e.touches?e.touches[0].clientX:e.clientX;
      let y=e.touches?e.touches[0].clientY:e.clientY;
      return {x, y};
    }
    function down(e){
      active=true; id = e.pointerId || (e.touches && e.touches[0].identifier); stickEl.setPointerCapture && stickEl.setPointerCapture(id);
      center = stickEl.getBoundingClientRect();
      const p = toPos(e);
      moveTo(p.x, p.y);
    }
    function moveTo(px, py){
      if(!active) return;
      const cx = center.left + center.width/2, cy = center.top + center.height/2;
      let dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy);
      if(d > radius){ dx = dx/d*radius; dy = dy/d*radius; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      onMove(dx/radius, dy/radius);
    }
    function move(e){
      if(!active) return; const p = toPos(e); moveTo(p.x, p.y);
    }
    function up(){
      active=false; knob.style.transform='translate(0,0)'; onMove(0,0);
    }
    stickEl.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    // touch fallback
    stickEl.addEventListener('touchstart', down, {passive:false}); window.addEventListener('touchmove', move, {passive:false}); window.addEventListener('touchend', up);
    return { };
  }

  // left stick: steering (-1 .. +1)
  setupJoystick($('#stickLeft'), (nx, ny)=>{ phys.steer = clamp(nx, -1, 1); });
  // right stick: ny positive => throttle, negative => brake
  setupJoystick($('#stickRight'), (nx, ny)=>{ phys.throttle = clamp( (ny>0?ny:0), 0, 1); phys.brake = clamp( (ny<0? -ny:0), 0, 1); });

  // marks drawing state
  let prevMark = null;

  function drawTireMark(worldX, worldZ, width=2, alpha=0.6){
    const p = worldToScreen(new THREE.Vector3(worldX,0,worldZ));
    if(prevMark){
      markCtx.strokeStyle = S.get('trail_color', '#00e5ff');
      markCtx.globalAlpha = alpha;
      markCtx.beginPath();
      markCtx.moveTo(prevMark.x, prevMark.y);
      markCtx.lineTo(p.x, p.y);
      markCtx.lineWidth = width;
      markCtx.stroke();
    }
    prevMark = p;
  }

  // clear marks over time slightly (to avoid infinite accumulation)
  function fadeMarks(){
    markCtx.fillStyle = 'rgba(0,0,0,0.02)';
    markCtx.fillRect(0,0,marks.width, marks.height);
  }

  // physics parameters
  const params = {
    mass: 1200,
    engineForce: 45,
    brakeForce: 60,
    maxSpeed: 6,
    grip: 0.85,
    driftThreshold: 0.6 // sideways velocity threshold to record marks
  };

  // update & render loop
  let last=performance.now();
  let styleScore = 0, best = Number(S.get('drift_best',0));
  bestEl.textContent = best;

  function step(t){
    const dt = Math.min(0.05, (t-last)/1000); last = t;

    // input mapping (keyboard)
    if(keys['a'] || keys['arrowleft']) phys.steer = -1;
    if(keys['d'] || keys['arrowright']) phys.steer = 1;
    if(keys['w'] || keys['arrowup']) phys.throttle = 1;
    if(keys['s'] || keys['arrowdown']) phys.brake = 1;
    if(!keys['a'] && !keys['d'] && !keys['arrowleft'] && !keys['arrowright']) phys.steer = phys.steer * 0.9; // easing when joystick not used
    if(!keys['w'] && !keys['arrowup']) phys.throttle *= 0.9;
    if(!keys['s'] && !keys['arrowdown']) phys.brake *= 0.9;

    // forward vector & yaw update
    phys.angle += phys.steer * 1.6 * dt * (1 + Math.hypot(phys.vel.x, phys.vel.z)/params.maxSpeed);
    const forward = new THREE.Vector3(Math.sin(phys.angle), 0, Math.cos(phys.angle));

    // engine/braking forces
    const accelForce = forward.clone().multiplyScalar(phys.throttle * params.engineForce);
    const brakeForce = phys.brake ? forward.clone().multiplyScalar(-params.brakeForce*phys.brake) : new THREE.Vector3(0,0,0);

    // lateral friction (simulate grip)
    // get lateral velocity (perp to forward)
    const vel = phys.vel.clone();
    const forwardVel = forward.clone().multiplyScalar(vel.dot(forward));
    const lateral = vel.clone().sub(forwardVel); // sideways component
    // apply grip reduction to lateral velocity (drift)
    const lateralFactor = phys.brake>0.6 ? 0.6 : params.grip;
    const lateralCorrection = lateral.clone().multiplyScalar(- (1 - lateralFactor));
    // integrate acceleration
    const net = accelForce.add(brakeForce).add(lateralCorrection);
    const acc = net.clone().multiplyScalar(1 / params.mass);
    phys.vel.add(acc.multiplyScalar(dt*100)); // scale to feel right

    // clamp speed
    const sp = phys.vel.length();
    if(sp > params.maxSpeed){ phys.vel.multiplyScalar(params.maxSpeed/sp); }

    // integrate position
    phys.pos.add(phys.vel.clone().multiplyScalar(dt*60));

    // damping
    phys.vel.multiplyScalar(1 - 0.01*dt*60);

    // update car visuals
    carGroup.position.set(phys.pos.x, 0.5, phys.pos.z);
    carGroup.rotation.y = phys.angle;

    // wheel tilt (visual)
    wheels.forEach((w, i)=>{
      w.rotation.x += phys.vel.length()*0.1;
    });

    // camera follow
    const camTarget = new THREE.Vector3(phys.pos.x - Math.sin(phys.angle)*8, 5 + phys.pos.y*0.2, phys.pos.z - Math.cos(phys.angle)*8);
    camera.position.lerp(camTarget, 0.12);
    camera.lookAt(new THREE.Vector3(phys.pos.x, 0.5, phys.pos.z));

    // tire marks if lateral speed > threshold
    const lateralSpeed = lateral.length();
    if(lateralSpeed > params.driftThreshold){
      // map world pos to screen, draw short segment
      drawTireMark(phys.pos.x - phys.vel.x*0.02, phys.pos.z - phys.vel.z*0.02, Math.min(6, lateralSpeed*8), Math.min(1, lateralSpeed*0.5));
      // earn style points
      styleScore += lateralSpeed * dt * 5;
      scoreEl.textContent = Math.floor(styleScore);
      if(Math.floor(styleScore) > best){ best = Math.floor(styleScore); S.set('drift_best', best); bestEl.textContent = best; }
      // tiny coin trickle for long drifts
      if(Math.floor(styleScore) % 100 === 0 && Math.floor(styleScore)>0) Wallet.credit(1);
    } else {
      prevMark = null;
    }

    // fade marks slowly
    fadeMarks();

    renderer.setSize(canvas.width, canvas.height, false);
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    requestAnimationFrame(step);
  }

  // initial clear & start
  markCtx.clearRect(0,0,marks.width, marks.height);
  last = performance.now();
  requestAnimationFrame(step);

  // pointer to mark prev
  let prevMark = null;

  // save on unload
  window.addEventListener('beforeunload', ()=>{ S.set('drift_best', best); });
})();

/* ======= init + shop render + wallet ======= */
(function init(){
  if(S.get('firstRun', true)){ S.set('firstRun', false); S.set('boosts', {slotLuck:0}); }
  Wallet.render(); Shop.render(); $('#slotsMsg') && ($('#slotsMsg').textContent = $('#slotsMsg').textContent); // keep message
  $('#mathBest') && ($('#mathBest').textContent = fmt(Number(S.get('math_best',0))));
  $('#typeBest') && ($('#typeBest').textContent = fmt(Number(S.get('type_best',0))));
})();
