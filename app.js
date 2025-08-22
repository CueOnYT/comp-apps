// app.js — Devin's Games (with shared wallet, shop, shortcuts, 3D drift)
// NO extra config required. Everything is local and uses localStorage.

/* ---------- small helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const irnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const fmt = n => {
  if(typeof n === 'number' && !Number.isFinite(n)) return n.toString();
  try { return Number(n).toLocaleString(); } catch(e) { return String(n); }
};

/* ---------- PERSISTENCE helpers ---------- */
const S = {
  get(k, d){ try{ const v = localStorage.getItem('dg_'+k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ localStorage.setItem('dg_'+k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem('dg_'+k); }
};

/* ---------- WALLET (shared coins) ---------- */
const Wallet = {
  key: 'wallet',
  get(){ return Number(S.get(this.key, 100)); },
  set(v){ v = Math.max(0, Math.floor(Number(v)||0)); S.set(this.key, v); this.render(); return v; },
  credit(amount){ return this.set(this.get() + Math.max(0, Math.floor(amount||0))); },
  canSpend(amount){ return this.get() >= Math.max(0, Math.floor(amount||0)); },
  spend(amount){ amount = Math.max(0, Math.floor(amount||0)); if(!this.canSpend(amount)) return false; this.set(this.get() - amount); return true; },
  render(){ $$('.walletVal').forEach(el => el.textContent = fmt(this.get())); $('#walletVal').textContent = fmt(this.get()); }
};

/* ---------- CUSTOMIZATION ---------- */
function applyCustom() {
  const theme = S.get('theme','dark');
  const accent = S.get('accent','#7cf1c8');
  const font = S.get('fontsize',16);

  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-2', shadeColor(accent, 30));
  document.documentElement.style.fontSize = font + 'px';

  if(theme === 'light') {
    document.documentElement.style.setProperty('--bg','#f3f6fb');
    document.documentElement.style.setProperty('--ink','#071026');
    document.documentElement.style.setProperty('--muted','#4a596e');
  } else {
    document.documentElement.style.setProperty('--bg','#071026');
    document.documentElement.style.setProperty('--ink','#e8f0ff');
    document.documentElement.style.setProperty('--muted','#9fb0d6');
  }
  $('#hudAccent').textContent = accent;
}
function shadeColor(hex, percent) {
  hex = hex.replace('#','');
  const num = parseInt(hex,16);
  let r = (num >> 16) + Math.round(255 * (percent/100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent/100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent/100));
  r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
  return '#'+( (1<<24) + (r<<16) + (g<<8) + b ).toString(16).slice(1);
}

/* init customization UI */
(function setupCustomization() {
  const themeSel = $('#themeSelect');
  const accentPicker = $('#accentPicker');
  const fontSize = $('#fontSize');
  const typingDur = $('#typingDur');

  if(themeSel){
    themeSel.value = S.get('theme','dark');
    accentPicker.value = S.get('accent','#7cf1c8');
    fontSize.value = S.get('fontsize',16);
    typingDur.value = S.get('typingDur',30);

    applyCustom();

    themeSel.addEventListener('change', e => { S.set('theme', e.target.value); applyCustom(); });
    accentPicker.addEventListener('input', e => { S.set('accent', e.target.value); applyCustom(); });
    fontSize.addEventListener('input', e => { S.set('fontsize', Number(e.target.value)); applyCustom(); });
    typingDur.addEventListener('change', e => { S.set('typingDur', Number(e.target.value)); });
  }
})();

/* ---------- Tabs behavior & Shortcuts ---------- */
const tabOrder = ['slots','blackjack','math','typing','game','shop','custom'];
function activateTab(name){
  $$('.tab').forEach(b=>b.removeAttribute('aria-current'));
  const btn = $(`.tab[data-tab="${name}"]`);
  if(btn) btn.setAttribute('aria-current','page');
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'sec-'+name));
}
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=> activateTab(btn.dataset.tab));
});
document.addEventListener('keydown', (e)=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    // Tab switching still allowed with Alt+number
    if(e.altKey && /^[1-7]$/.test(e.key)){
      activateTab(tabOrder[Number(e.key)-1]); e.preventDefault();
    }
    return;
  }
  // number keys switch tabs
  if(/^[1-7]$/.test(e.key)){ activateTab(tabOrder[Number(e.key)-1]); }
  // quick jumps
  if(e.key.toLowerCase()==='g') activateTab('game');
  if(e.key.toLowerCase()==='p') activateTab('shop');
});

/* ---------- SHOP ---------- */
const Shop = {
  items: [
    // Themes
    { id:'theme_neon',  name:'Theme: Neon Night', type:'theme', price:120, data:{bg:'#050510', accent:'#39ffb6'}, desc:'High-contrast neon glow.' },
    { id:'theme_sunset',name:'Theme: Sunset Gold', type:'theme', price:120, data:{bg:'#1c0f0a', accent:'#f7a13d'}, desc:'Warm sunset vibes.' },

    // Slots boosts (consumables)
    { id:'boost_slots_5', name:'Slots Luck +5 spins', type:'boost', price:80,  data:{slotLuck:5},  desc:'Temporarily increases pair chance.' },
    { id:'boost_slots_20',name:'Slots Luck +20 spins',type:'boost', price:200, data:{slotLuck:20}, desc:'Bigger temporary luck boost.' },

    // Drift cosmetics
    { id:'car_red',   name:'Car Skin: Cherry Red', type:'car', price:150, data:{color:'#c6262e', name:'Cherry Red'}, desc:'Sporty and bold.' },
    { id:'car_white', name:'Car Skin: Polar White', type:'car', price:150, data:{color:'#eaeaea', name:'Polar White'}, desc:'Clean and classic.' },
    { id:'trail_cyan',name:'Drift Trail: Cyan',    type:'trail', price:100, data:{color:'#00e5ff'}, desc:'Icy drift trails.' },
    { id:'trail_pink',name:'Drift Trail: Pink',    type:'trail', price:100, data:{color:'#ff4da6'}, desc:'Retro pink trails.' },

    // Typing / Math QoL
    { id:'typing_60', name:'Typing 60s Mode', type:'typing', price:90, data:{dur:60}, desc:'Unlock 60s typing duration permanently.' },
    { id:'math_hard', name:'Math Hard XP',   type:'math', price:70, data:{hardBoost:true}, desc:'Small scoring bonus in hard mode.' },
  ],
  owned(){ return new Set(S.get('owned', [])); },
  grant(id){
    const set = new Set(S.get('owned', [])); set.add(id); S.set('owned', [...set]);
  },
  isOwned(id){ return this.owned().has(id); },
  useBoost(id){
    const boosts = S.get('boosts', {slotLuck:0});
    if(id==='boost_slots_5') boosts.slotLuck += 5;
    if(id==='boost_slots_20') boosts.slotLuck += 20;
    S.set('boosts', boosts);
  },
  equip(item){
    if(item.type==='theme'){
      if(item.data.bg) document.documentElement.style.setProperty('--bg', item.data.bg);
      if(item.data.accent) { S.set('accent', item.data.accent); applyCustom(); }
    }
    if(item.type==='car'){ S.set('car_skin', item.data); $('#hudCar').textContent = item.data.name || 'Custom'; $('#driftCarName').textContent = item.data.name || 'Custom'; }
    if(item.type==='trail'){ S.set('trail_color', item.data.color); }
    if(item.type==='typing'){ S.set('typingDur', item.data.dur || 30); }
    if(item.type==='math'){ S.set('math_hard_boost', !!item.data.hardBoost); }
  },
  render(){
    const grid = $('#shopGrid');
    grid.innerHTML = '';
    const owned = this.owned();

    this.items.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <h4>${item.name}</h4>
        <p class="muted">${item.desc}</p>
        <div><span class="price">Price: ${fmt(item.price)}</span></div>
        <div class="actions">
          <button class="btn buyBtn" data-id="${item.id}">Buy</button>
          <button class="btn ghost equipBtn" data-id="${item.id}">Equip/Use</button>
          <span class="owned">${owned.has(item.id) ? 'Owned' : ''}</span>
        </div>
      `;
      grid.appendChild(div);
    });

    grid.querySelectorAll('.buyBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const item = this.items.find(i=>i.id===id);
        if(this.isOwned(id) && item.type!=='boost'){ alert('Already owned.'); return; }
        if(!Wallet.canSpend(item.price)){ alert('Not enough coins.'); return; }
        Wallet.spend(item.price);
        if(item.type==='boost') this.useBoost(id);
        else this.grant(id);
        this.render();
      });
    });

    grid.querySelectorAll('.equipBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const item = this.items.find(i=>i.id===id);
        if(item.type!=='boost' && !this.isOwned(id)){ alert('Buy it first.'); return; }
        this.equip(item);
      });
    });
  }
};

/* ---------- SLOTS (easier + shared wallet) ---------- */
(function(){
  const symbols = ['🍒','🍋','⭐','🔔','🍇','🍉','🍀'];
  const reels = [$('#reel1'), $('#reel2'), $('#reel3')];
  const balEl = $('#slotsBal'), betEl = $('#slotsBet'), bestEl = $('#slotsBest'), msgEl = $('#slotsMsg'), betDisplay = $('#betDisplay');

  let state = {
    bet: Number(S.get('slots_bet',5)),
    best: Number(S.get('slots_best',0)),
    spinning: false
  };

  function render(){
    balEl.textContent = fmt(Wallet.get());
    betEl.textContent = fmt(state.bet);
    bestEl.textContent = fmt(state.best);
    betDisplay.textContent = fmt(state.bet);
    Wallet.render();
  }
  function save(){
    S.set('slots_bet', state.bet);
    state.best = Math.max(state.best, Wallet.get());
    S.set('slots_best', state.best);
    render();
  }

  function weightedSpinResults(){
    // Make slots a bit easier:
    // Base: random, but we add a chance for a pair/triple
    const boosts = S.get('boosts', {slotLuck:0});
    let luck = 0.18 + Math.min(0.22, (boosts.slotLuck>0?0.18:0)); // base pair chance 18%, +18% when boost active
    let tripleChance = 0.04 + (boosts.slotLuck>0?0.02:0);        // small triple chance buff
    if(boosts.slotLuck>0){ boosts.slotLuck--; S.set('boosts', boosts); }

    const base = ()=> symbols[irnd(0,symbols.length-1)];
    const r1 = base();
    let r2 = base(), r3 = base();

    if(Math.random() < tripleChance){ r2 = r1; r3 = r1; return [r1,r2,r3]; }
    if(Math.random() < luck){ // force a pair by matching either r2 or r3 to r1
      if(Math.random()<0.5) r2 = r1; else r3 = r1;
    }
    return [r1,r2,r3];
  }

  async function spin(){
    if(state.spinning) return;
    const bet = Math.max(1, Math.floor(state.bet));
    if(!Wallet.canSpend(bet)){ msgEl.textContent = 'Not enough coins.'; return; }

    state.spinning = true;
    msgEl.textContent = 'Spinning...';
    Wallet.spend(bet); // deduct upfront, never negative
    render();

    const results = weightedSpinResults();

    // animate
    for(let i=0;i<3;i++){
      const el = reels[i];
      el.classList.add('spin');
      for(let f=0; f<9; f++){
        el.textContent = symbols[irnd(0,symbols.length-1)];
        await new Promise(r=>setTimeout(r, 40 + i*25));
      }
      el.textContent = results[i];
      el.classList.remove('spin');
    }

    // payouts (pairs buffed from 3x to 4x)
    let award = 0;
    const set = new Set(results);
    if(set.size === 1){
      const s = results[0];
      award = (s === '⭐' ? 20 : (s === '🍒' ? 12 : (s === '🍋' ? 8 : 6))) * bet;
      msgEl.textContent = `Triple ${s}! +${fmt(award)}`;
    } else if(set.size === 2){
      award = 4 * bet;
      msgEl.textContent = `Pair! +${fmt(award)}`;
    } else {
      msgEl.textContent = 'No match';
    }

    if(award>0) Wallet.credit(award);
    state.best = Math.max(state.best, Wallet.get());
    save();
    state.spinning = false;
  }

  // Buttons
  $('#spinBtn').addEventListener('click', spin);

  function changeBet(delta){
    state.bet = Math.max(1, Math.floor(state.bet + delta));
    S.set('slots_bet', state.bet);
    render();
  }
  $('#betUp').addEventListener('click', ()=>changeBet(+1));
  $('#betDown').addEventListener('click', ()=>changeBet(-1));

  // Keyboard shortcuts (also global below)
  document.addEventListener('keydown', (e)=>{
    if(!$('#sec-slots').classList.contains('active')) return;
    if(e.key.toLowerCase()==='s') { spin(); }
    if(e.key==='+') changeBet(+1);
    if(e.key==='=') changeBet(+1);
    if(e.key==='-') changeBet(-1);
  });

  render();
})();

/* ---------- BLACKJACK (shared wallet, no negatives) ---------- */
(function(){
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const dealerEl = $('#dealer'), playerEl = $('#player');
  const bankEl = $('#bjBank'), betEl = $('#bjBet'), bestEl = $('#bjBest'), msgEl = $('#bjMsg');
  const pValEl = $('#pVal'), dValEl = $('#dVal'), bjBetDisplay = $('#bjBetDisplay');

  let state = {
    bet: Number(S.get('bj_bet',10)),
    best: Number(S.get('bj_best',0)),
    deck: [], player: [], dealer: [], inRound: false
  };

  function renderTop(){ bankEl.textContent = fmt(Wallet.get()); betEl.textContent = fmt(state.bet); bestEl.textContent = fmt(state.best); bjBetDisplay.textContent = fmt(state.bet); Wallet.render(); }
  function save(){ S.set('bj_bet', state.bet); state.best = Math.max(state.best, Wallet.get()); S.set('bj_best', state.best); renderTop(); }

  function newDeck(){
    state.deck = [];
    suits.forEach(s => ranks.forEach(r => state.deck.push(r + s)));
    for(let i = state.deck.length - 1; i > 0; i--){
      const j = irnd(0, i);
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
  }
  const valueOf = (rank)=> rank==='A'?11:(['J','Q','K'].includes(rank)?10:Number(rank));
  function handValue(hand){
    let total = 0, aces = 0;
    for(const c of hand){
      const r = c.slice(0, -1);
      const v = valueOf(r);
      total += v;
      if(r === 'A') aces++;
    }
    while(total > 21 && aces){ total -= 10; aces--; }
    return total;
  }
  function renderHand(el, hand, hideFirst=false){
    el.innerHTML = '';
    hand.forEach((c,i) => {
      const d = document.createElement('div');
      d.className = 'cardx';
      if(hideFirst && i === 0){ d.classList.add('back'); d.textContent = '🂠'; } else { d.textContent = c; }
      el.appendChild(d);
    });
  }
  function updateVals(revealDealer=false){
    pValEl.textContent = state.player.length ? handValue(state.player) : 0;
    if(revealDealer) dValEl.textContent = state.dealer.length ? handValue(state.dealer) : '?';
    else {
      if(state.dealer.length >= 2){
        const visible = state.dealer.slice(1);
        let sum = 0, aces = 0;
        visible.forEach(c=>{
          const r = c.slice(0,-1);
          const v = valueOf(r);
          sum += v;
          if(r === 'A') aces++;
        });
        while(sum > 21 && aces){ sum -= 10; aces--; }
        dValEl.textContent = sum || '?';
      } else dValEl.textContent = '?';
    }
  }
  function resetRound(){
    state.player = []; state.dealer = []; state.inRound = false;
    renderHand(playerEl, []); renderHand(dealerEl, []); updateVals();
    $('#bjHit').disabled = true; $('#bjStand').disabled = true;
  }
  function checkBlackjack(){
    const pv = handValue(state.player), dv = handValue(state.dealer);
    const pBJ = (state.player.length === 2 && pv === 21);
    const dBJ = (state.dealer.length === 2 && dv === 21);
    if(pBJ || dBJ){
      renderHand(dealerEl, state.dealer, false); updateVals(true);
      if(pBJ && !dBJ){
        const win = Math.round(state.bet * 2.5); // return bet + 1.5x profit
        Wallet.credit(win);
        msgEl.textContent = `Blackjack! You win ${fmt(win - state.bet)} (3:2)`;
      } else if(dBJ && !pBJ){
        msgEl.textContent = 'Dealer has blackjack. You lose.';
      } else {
        Wallet.credit(state.bet); msgEl.textContent = 'Both have blackjack — push.';
      }
      state.inRound = false;
      $('#bjHit').disabled = true; $('#bjStand').disabled = true;
      save();
      return true;
    }
    return false;
  }
  function deal(){
    if(state.inRound) return;
    if(state.bet < 1){ msgEl.textContent = 'Set a bet first'; return; }
    if(!Wallet.canSpend(state.bet)){ msgEl.textContent = 'Not enough coins.'; return; }
    newDeck();
    resetRound();
    Wallet.spend(state.bet);
    save();
    msgEl.textContent = 'Dealt';
    state.inRound = true;

    state.player.push(state.deck.pop(), state.deck.pop());
    state.dealer.push(state.deck.pop(), state.deck.pop());
    renderHand(playerEl, state.player, false);
    renderHand(dealerEl, state.dealer, true);
    updateVals(false);
    setTimeout(()=>{ if(!checkBlackjack()){ $('#bjHit').disabled = false; $('#bjStand').disabled = false; } }, 180);
  }
  function dealerPlay(){
    renderHand(dealerEl, state.dealer, false); updateVals(true);
    while(handValue(state.dealer) < 17){
      state.dealer.push(state.deck.pop());
      renderHand(dealerEl, state.dealer, false);
      updateVals(true);
    }
    const pv = handValue(state.player), dv = handValue(state.dealer);
    let win = 0, msg = '';
    if(dv > 21 || pv > dv){ win = state.bet * 2; msg = `You win +${fmt(win - state.bet)}`; }
    else if(pv === dv){ win = state.bet; msg = 'Push'; }
    else { win = 0; msg = 'Dealer wins'; }
    if(win>0) Wallet.credit(win);
    msgEl.textContent = msg;
    state.inRound = false;
    $('#bjHit').disabled = true; $('#bjStand').disabled = true;
    save();
  }

  $('#bjDeal').addEventListener('click', deal);
  $('#bjHit').addEventListener('click', ()=>{
    if(!state.inRound) return;
    state.player.push(state.deck.pop());
    renderHand(playerEl, state.player, false);
    updateVals(false);
    if(handValue(state.player) > 21){
      renderHand(dealerEl, state.dealer, false); updateVals(true);
      msgEl.textContent = 'Bust!';
      state.inRound = false;
      $('#bjHit').disabled = true; $('#bjStand').disabled = true;
      save();
    }
  });
  $('#bjStand').addEventListener('click', ()=>{ if(!state.inRound) return; dealerPlay(); });

  // bet adjust
  function changeBet(delta){ state.bet = Math.max(1, Math.floor(state.bet + delta)); S.set('bj_bet', state.bet); renderTop(); }
  $('#bjBetUp').addEventListener('click', ()=>changeBet(+1));
  $('#bjBetDown').addEventListener('click', ()=>changeBet(-1));
  document.addEventListener('keydown', (e)=>{
    if(!$('#sec-blackjack').classList.contains('active')) return;
    if(e.key.toLowerCase()==='d') deal();
    if(e.key.toLowerCase()==='h') $('#bjHit').click();
    if(e.key.toLowerCase()==='j') $('#bjStand').click();
    if(e.key==='+') changeBet(+1);
    if(e.key==='=') changeBet(+1);
    if(e.key==='-') changeBet(-1);
  });

  renderTop();
})();

/* ---------- MATH SPRINT ---------- */
(function(){
  const qEl = $('#mathQ'), aEl = $('#mathA'), scoreEl = $('#mathScore'), streakEl = $('#mathStreak'), timeEl = $('#mathTime'), bestEl = $('#mathBest'), msgEl = $('#mathMsg');
  const mAdd = $('#mAdd'), mSub = $('#mSub'), mMul = $('#mMul'), mDiv = $('#mDiv'), mDiff = $('#mDiff');

  let state = { score:0, streak:0, time:60, timer:0, best: Number(S.get('math_best',0)), running:false, answer:null };

  function numberRange(diff){ return diff==='easy'?[1,12] : diff==='medium'?[1,50] : [1,200]; }

  function nextQ(){
    const ops = [];
    if(mAdd.checked) ops.push('+'); if(mSub.checked) ops.push('-'); if(mMul.checked) ops.push('*'); if(mDiv.checked) ops.push('/');
    if(ops.length === 0) ops.push('+');

    const diff = mDiff.value;
    const [minN, maxN] = numberRange(diff);

    if(diff === 'hard' && Math.random() < 0.45){
      const a = irnd(minN, maxN);
      const b = irnd(minN, Math.min(maxN, 20));
      const c = irnd(minN, Math.min(maxN, 20));
      const op1 = ops[irnd(0, ops.length-1)];
      const op2 = ops[irnd(0, ops.length-1)];
      let expr = '';
      if(op1 === '/'){ const ans1 = irnd(1,20); const bb = irnd(1,20); expr = `${ans1*bb} ÷ ${bb}`; } else expr = `${a} ${op1} ${b}`;
      if(op2 === '/'){ const denom = irnd(1,12); expr = `(${expr}) ÷ ${denom}`; } else expr = `(${expr}) ${op2} ${c}`;
      const safeExpr = expr.replace(/×/g,'*').replace(/÷/g,'/');
      let ans=0; try { ans = Math.round(eval(safeExpr)); } catch(e){}
      qEl.textContent = expr + ' = ?';
      state.answer = ans; aEl.value = ''; aEl.focus(); return;
    }

    const op = ops[irnd(0, ops.length-1)];
    let a = irnd(minN, maxN), b = irnd(minN, maxN), text = '', ans = 0;
    if(op === '/'){ b = irnd(1, Math.max(2, Math.min(50,maxN))); ans = irnd(1, Math.max(1, Math.min(50,maxN))); a = ans * b; text = `${a} ÷ ${b} = ?`; }
    else if(op === '*'){ if(diff === 'hard'){ b = irnd(2, Math.min(50,maxN)); } ans = a * b; text = `${a} × ${b} = ?`; }
    else if(op === '+'){ ans = a + b; text = `${a} + ${b} = ?`; }
    else { if(diff !== 'hard' && a < b) [a,b] = [b,a]; ans = a - b; text = `${a} − ${b} = ?`; }

    qEl.textContent = text; state.answer = ans; aEl.value = ''; aEl.focus();
  }
  function tick(){
    state.time--; timeEl.textContent = state.time;
    if(state.time <= 0){
      clearInterval(state.timer); state.timer = 0; state.running = false;
      msgEl.textContent = `Time's up — final ${state.score}`;
      state.best = Math.max(state.best, state.score); S.set('math_best', state.best); bestEl.textContent = state.best;
      // tiny coin bonus
      Wallet.credit(Math.floor(state.score/50));
    }
  }
  $('#mathStart').addEventListener('click', ()=>{
    if(state.running) return;
    state.running = true; state.score = 0; state.streak = 0; state.time = 60;
    scoreEl.textContent = 0; streakEl.textContent = 0; timeEl.textContent = 60; msgEl.textContent = '';
    nextQ();
    if(state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
  });
  $('#mathSubmit').addEventListener('click', ()=>{
    if(!state.running){ msgEl.textContent = 'Press Start'; return; }
    const val = Number($('#mathA').value);
    if(Number.isFinite(val) && val === Number(state.answer)){
      state.streak++;
      const hardBonusOn = S.get('math_hard_boost', false) && mDiff.value==='hard';
      const bonus = (mDiff.value === 'hard') ? (hardBonusOn?14:10) : 2;
      const gain = 10 + (state.streak - 1) * bonus;
      state.score += gain; msgEl.textContent = `Correct +${gain}`;
    } else {
      state.streak = 0; msgEl.textContent = `Wrong — answer ${state.answer}`;
    }
    scoreEl.textContent = state.score; streakEl.textContent = state.streak; nextQ();
  });
  document.addEventListener('keydown', (e)=>{
    if(!$('#sec-math').classList.contains('active')) return;
    if(e.key.toLowerCase()==='m'){ $('#mathStart').click(); }
    if(e.key==='Enter'){ $('#mathSubmit').click(); }
  });
  bestEl.textContent = Number(S.get('math_best',0));
})();

/* ---------- TYPING ---------- */
(function(){
  const samples = [
    'Practice makes progress. Keep your fingers light and your focus steady.',
    'Clear instructions and clean code make everything easier to fix later.',
    'Small daily habits add up to big improvements over time.',
    'Stay calm. Type steady. Let accuracy build your speed.'
  ];
  const textWrap = $('#typingText'), input = $('#typeInput'), wpmEl = $('#typeWpm'), accEl = $('#typeAcc'), timeEl = $('#typeTime'), bestEl = $('#typeBest'), msg = $('#typeMsg');

  let state = {
    text: '',
    pos: 0,
    time: Number(S.get('typingDur',30)),
    timer: null,
    correct: 0,
    total: 0,
    running: false,
    best: Number(S.get('type_best',0))
  };

  function pick(){
    state.text = samples[irnd(0, samples.length-1)];
    state.pos = 0; state.correct = 0; state.total = 0;
    render();
  }
  function render(){
    const before = state.text.slice(0, state.pos);
    const cur = state.text[state.pos] || '';
    const after = state.text.slice(state.pos+1);
    const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    textWrap.innerHTML = `<span class="done">${esc(before)}</span><span class="cur">${esc(cur)}</span>${esc(after)}`;
  }
  function tick(){
    state.time--; timeEl.textContent = state.time;
    const elapsed = Math.max(1, Number(S.get('typingDur',30)) - state.time);
    const wpm = Math.round(((state.total/5) / (elapsed/60)) || 0);
    const acc = state.total ? Math.round((state.correct/state.total)*100) : 100;
    wpmEl.textContent = wpm; accEl.textContent = acc + '%';
    if(state.time <= 0){
      clearInterval(state.timer); state.timer = null; state.running = false;
      msg.textContent = `Done — WPM ${wpm} | Accuracy ${acc}%`;
      state.best = Math.max(state.best, wpm);
      S.set('type_best', state.best); bestEl.textContent = state.best;
      // tiny coins bonus
      Wallet.credit(Math.max(0, Math.floor((wpm-30)/10)));
    }
  }
  $('#typeStart').addEventListener('click', ()=>{
    if(state.running) return;
    state.time = Number(S.get('typingDur',30));
    timeEl.textContent = state.time;
    state.correct = 0; state.total = 0; state.pos = 0; state.running = true;
    pick();
    input.value = '';
    input.focus();
    if(state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
    msg.textContent = '';
  });
  input.addEventListener('keydown', function(e){
    if(!state.running) {
      if(e.key === 'Backspace') e.preventDefault();
      return;
    }
    if(e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); return; }
    if(e.key === 'Backspace'){ e.preventDefault(); if(state.pos > 0) state.pos--; render(); return; }
    if(e.key.length !== 1) return;
    e.preventDefault();
    const ch = e.key;
    state.total++;
    const expected = state.text[state.pos] || '';
    if(ch === expected) state.correct++;
    state.pos++;
    if(state.pos >= state.text.length) pick();
    render();
  });
  document.addEventListener('keydown', (e)=>{
    if(!$('#sec-typing').classList.contains('active')) return;
    if(e.key.toLowerCase()==='t') $('#typeStart').click();
  });
  bestEl.textContent = state.best;
})();

/* ---------- RETRO DRIFT (Three.js) ---------- */
(function(){
  const canvas = $('#driftCanvas');
  const scoreEl = $('#driftScore');
  const bestEl = $('#driftBest');
  const mobileCtrls = $('#mobileCtrls');

  let W = canvas.clientWidth, H = canvas.clientHeight;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x061122);

  const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 1000);
  camera.position.set(0, 18, 22);

  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(10,20,10); scene.add(light);
  scene.add(new THREE.AmbientLight(0x8090ff, 0.35));

  // Ground plane with simple lines
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200, 20, 20),
    new THREE.MeshPhongMaterial({ color: 0x0b1b3a, wireframe: true, opacity:0.25, transparent:true })
  );
  ground.rotation.x = -Math.PI/2; scene.add(ground);

  // Car
  const carColor = (S.get('car_skin', {color:'#ff3d71'})).color || '#ff3d71';
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2,1,4), new THREE.MeshPhongMaterial({ color: new THREE.Color(carColor) }));
  body.position.y = 0.6; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.6,1.8), new THREE.MeshPhongMaterial({ color: 0xffffff }));
  cabin.position.set(0,1.1,-0.4); car.add(cabin);
  scene.add(car);

  $('#driftCarName').textContent = (S.get('car_skin', {name:'Classic'})).name || 'Classic';
  $('#hudCar').textContent = (S.get('car_skin', {name:'Classic'})).name || 'Classic';

  // Cones (drift playground)
  const coneMat = new THREE.MeshPhongMaterial({ color: 0xffa24d });
  for(let i=0;i<20;i++){
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.3,1,12), coneMat);
    m.position.set(irnd(-30,30), 0.5, irnd(-30,30));
    scene.add(m);
  }

  // Trail
  const trailColor = new THREE.Color(S.get('trail_color', '#00ffd5'));
  const trailGeom = new THREE.BufferGeometry();
  const trailPositions = new Float32Array(3*200); // 200 points
  trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailLine = new THREE.Line(trailGeom, new THREE.LineBasicMaterial({ color: trailColor, transparent:true, opacity:0.8 }));
  scene.add(trailLine);
  let trailIndex = 0;

  // Car physics-ish
  const state = { x:0, z:0, rot:0, vx:0, vz:0, steer:0, accel:false, brake:false };
  const keys = {};
  const ACCEL = 0.08, BRAKE = 0.18, MAX_SPEED = 1.2, STEER = 0.035, FRICTION = 0.012, DRIFT = 0.07;

  function updateInput(){
    state.steer = 0;
    if(keys['ArrowLeft'] || keys['a']) state.steer = 1;
    if(keys['ArrowRight'] || keys['d']) state.steer = -1;
    state.accel = !!(keys['ArrowUp'] || keys['w']);
    state.brake = !!(keys[' '] || keys['ArrowDown'] || keys['s']);
  }

  // Mobile buttons
  $('#btnLeft').addEventListener('touchstart', ()=>keys['a']=true);  $('#btnLeft').addEventListener('touchend', ()=>keys['a']=false);
  $('#btnRight').addEventListener('touchstart', ()=>keys['d']=true); $('#btnRight').addEventListener('touchend', ()=>keys['d']=false);
  $('#btnAccel').addEventListener('touchstart', ()=>keys['w']=true); $('#btnAccel').addEventListener('touchend', ()=>keys['w']=false);
  $('#btnBrake').addEventListener('touchstart', ()=>keys[' ']=true); $('#btnBrake').addEventListener('touchend', ()=>keys[' ']=false);

  function onKey(e, down){
    if(!$('#sec-game').classList.contains('active')) return;
    keys[e.key] = down;
  }
  window.addEventListener('keydown', e=>onKey(e,true));
  window.addEventListener('keyup', e=>onKey(e,false));

  // Score (style points grow when sliding sideways)
  let score = 0, best = Number(S.get('drift_best',0));
  bestEl.textContent = best;

  function physics(){
    updateInput();
    // steering affects rotation proportional to speed
    const speed = Math.hypot(state.vx, state.vz);
    state.rot += state.steer * STEER * (0.6 + Math.min(1, speed));

    // forward direction
    const dirX = Math.sin(state.rot);
    const dirZ = Math.cos(state.rot);

    if(state.accel){ state.vx += dirX * ACCEL; state.vz += dirZ * ACCEL; }
    if(state.brake){ state.vx *= (1 - BRAKE); state.vz *= (1 - BRAKE); }

    // drift: apply lateral slide + friction
    const lateralX = state.vz*DRIFT, lateralZ = -state.vx*DRIFT;
    state.vx += lateralX; state.vz += lateralZ;

    // clamp speed
    const sp = Math.hypot(state.vx, state.vz);
    if(sp > MAX_SPEED){ state.vx *= MAX_SPEED/sp; state.vz *= MAX_SPEED/sp; }

    // friction
    state.vx *= (1 - FRICTION); state.vz *= (1 - FRICTION);

    state.x += state.vx; state.z += state.vz;

    car.position.set(state.x, 0, state.z);
    car.rotation.y = state.rot;

    // camera follow
    camera.position.lerp(new THREE.Vector3(state.x - dirX*10, 18, state.z - dirZ*10), 0.1);
    camera.lookAt(car.position);

    // update trail
    trailPositions[trailIndex*3+0] = state.x;
    trailPositions[trailIndex*3+1] = 0.01;
    trailPositions[trailIndex*3+2] = state.z;
    trailIndex = (trailIndex+1) % (trailPositions.length/3);
    trailGeom.attributes.position.needsUpdate = true;

    // style points from sideways motion (bigger drift angle => more points)
    const forwardVX = dirX*sp, forwardVZ = dirZ*sp;
    const side = Math.hypot(state.vx-forwardVX, state.vz-forwardVZ);
    const gain = Math.max(0, side - 0.02) * 3;
    score += gain;
    scoreEl.textContent = Math.floor(score);
    if(score > best){ best = Math.floor(score); S.set('drift_best', best); bestEl.textContent = best; }

    // tiny coin trickle based on style points
    if(Math.floor(score)%100 === 0 && Math.floor(score)>0){
      Wallet.credit(1);
    }
  }

  function resize(){
    const r = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(r.width));
    H = Math.max(240, Math.floor(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W/H; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function animate(){
    requestAnimationFrame(animate);
    physics();
    renderer.render(scene, camera);
  }
  animate();
})();

/* ---------- INIT / SHOP RENDER / HUD ---------- */
(function init(){
  if(S.get('firstRun', true)){
    S.set('firstRun', false);
    S.set('boosts', {slotLuck:0});
  }
  Wallet.render();
  Shop.render();
  $('#mathBest').textContent = fmt(Number(S.get('math_best',0)));
  $('#typeBest').textContent = fmt(Number(S.get('type_best',0)));
  $('#hudAccent').textContent = S.get('accent','#7cf1c8');
})();
