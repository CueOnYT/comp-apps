// app.js — Devin's Games
// Updates in this version:
// - Login completely removed
// - Global keyboard shortcuts added
// - New "Game" tab: Retro 3D-style drifting game (pure Canvas, mobile+PC)
// - No-negative-balance betting remains enforced

/* ===== Helpers ===== */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const irnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const fmt = n => Number(n).toLocaleString();

/* ===== Local storage helpers ===== */
const S = {
  get(k, d){ try{ const v = localStorage.getItem('dg_'+k); return v===null?d:JSON.parse(v);}catch(e){return d;} },
  set(k, v){ localStorage.setItem('dg_'+k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem('dg_'+k); }
};

/* ========= Customization ========= */
function shadeColor(hex, percent) {
  hex = hex.replace('#','');
  const num = parseInt(hex,16);
  let r = (num >> 16) + Math.round(255 * (percent/100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent/100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent/100));
  r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
  return '#'+( (1<<24) + (r<<16) + (g<<8) + b ).toString(16).slice(1);
}
function applyCustom() {
  const theme = S.get('theme','dark');
  const accent = S.get('accent','#7cf1c8');
  const font = S.get('fontsize',16);
  const fontFamily = S.get('fontfamily', "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial");
  const bgPattern = S.get('bgpattern','radial');
  const disableAnim = S.get('disableAnim', false);

  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-2', shadeColor(accent, 30));
  document.documentElement.style.fontSize = font + 'px';
  document.documentElement.style.fontFamily = fontFamily;

  if(theme === 'light') {
    document.documentElement.style.setProperty('--bg','#f3f6fb');
    document.documentElement.style.setProperty('--ink','#071026');
    document.documentElement.style.setProperty('--muted','#4a596e');
  } else {
    document.documentElement.style.setProperty('--bg','#071026');
    document.documentElement.style.setProperty('--ink','#e8f0ff');
    document.documentElement.style.setProperty('--muted','#9fb0d6');
  }
  document.body.classList.remove('bg-stripes','bg-flat');
  if(bgPattern === 'stripes') document.body.classList.add('bg-stripes');
  if(bgPattern === 'flat') document.body.classList.add('bg-flat');

  if(disableAnim) document.documentElement.classList.add('no-anim'); else document.documentElement.classList.remove('no-anim');
}
(function setupCustomization(){
  $('#themeSelect').value = S.get('theme','dark');
  $('#accentPicker').value = S.get('accent','#7cf1c8');
  $('#fontSize').value = S.get('fontsize',16);
  $('#typingDur').value = S.get('typingDur',30);
  $('#presetSelect').value = S.get('preset','default');
  $('#fontFamily').value = S.get('fontfamily', "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial");
  $('#bgPattern').value = S.get('bgpattern','radial');
  $('#enableSound').checked = S.get('enableSound', true);
  $('#disableAnim').checked = S.get('disableAnim', false);
  applyCustom();

  $('#themeSelect').addEventListener('change',e=>{ S.set('theme',e.target.value); applyCustom(); });
  $('#accentPicker').addEventListener('input',e=>{ S.set('accent',e.target.value); applyCustom(); });
  $('#fontSize').addEventListener('input',e=>{ S.set('fontsize',Number(e.target.value)); applyCustom(); });
  $('#typingDur').addEventListener('change',e=>{ S.set('typingDur',Number(e.target.value)); });
  $('#presetSelect').addEventListener('change', e=>{
    const v=e.target.value; S.set('preset',v);
    if(v==='ocean'){ S.set('accent','#7cf1c8'); S.set('bgpattern','radial'); }
    else if(v==='sunset'){ S.set('accent','#ffa87d'); S.set('bgpattern','stripes'); }
    else { S.set('accent','#7cf1c8'); S.set('bgpattern','radial'); }
    applyCustom();
    $('#accentPicker').value = S.get('accent');
    $('#bgPattern').value = S.get('bgpattern');
  });
  $('#fontFamily').addEventListener('change',e=>{ S.set('fontfamily',e.target.value); applyCustom(); });
  $('#bgPattern').addEventListener('change',e=>{ S.set('bgpattern',e.target.value); applyCustom(); });
  $('#enableSound').addEventListener('change',e=>{ S.set('enableSound',e.target.checked); });
  $('#disableAnim').addEventListener('change',e=>{ S.set('disableAnim',e.target.checked); applyCustom(); });
})();

/* ========= Tabs + global shortcuts ========= */
function activateTab(name){
  $$('.tab').forEach(b=>b.removeAttribute('aria-current'));
  $$('.tab').find(b=>b.dataset.tab===name)?.setAttribute('aria-current','page');
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'sec-'+name));
}
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>activateTab(btn.dataset.tab));
});

/* Number keys to switch tabs */
window.addEventListener('keydown', (e)=>{
  if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if(e.key==='1') activateTab('game');
  if(e.key==='2') activateTab('slots');
  if(e.key==='3') activateTab('blackjack');
  if(e.key==='4') activateTab('math');
  if(e.key==='5') activateTab('typing');
  if(e.key==='6') activateTab('custom');
});

/* ========= Slots ========= */
(function(){
  const symbols = ['🍒','🍋','⭐','🔔','🍇','🍉','🍀'];
  const reels = [$('#reel1'), $('#reel2'), $('#reel3')];
  const balEl = $('#slotsBal'), betEl = $('#slotsBet'), bestEl = $('#slotsBest'), msgEl = $('#slotsMsg'), betDisplay = $('#betDisplay');

  let state = {
    bal: Number(S.get('slots_bal',100)),
    bet: Number(S.get('slots_bet',5)),
    best: Number(S.get('slots_best',0)),
    spinning: false
  };

  function save(){
    S.set('slots_bal', state.bal);
    S.set('slots_bet', state.bet);
    state.best = Math.max(state.best, state.bal);
    S.set('slots_best', state.best);
    render();
  }
  function render(){
    balEl.textContent = fmt(state.bal);
    betEl.textContent = fmt(state.bet);
    bestEl.textContent = fmt(state.best);
    betDisplay.textContent = fmt(state.bet);
  }

  async function spin(){
    if(state.spinning) return;
    if(Number(state.bet) > Number(state.bal)){
      msgEl.textContent = 'Bet exceeds balance — reduce bet.'; return;
    }
    if(state.bal <= 0){ msgEl.textContent = 'Insufficient balance.'; return; }
    state.spinning = true;
    msgEl.textContent = 'Spinning...';
    state.bal = Number(state.bal) - Number(state.bet);
    render();
    const results = [symbols[irnd(0,symbols.length-1)], symbols[irnd(0,symbols.length-1)], symbols[irnd(0,symbols.length-1)]];
    for(let i=0;i<3;i++){
      const el = reels[i];
      if(!S.get('disableAnim', false)) el.classList.add('spin');
      for(let f=0; f<9; f++){
        el.textContent = symbols[irnd(0,symbols.length-1)];
        await new Promise(r=>setTimeout(r, 40 + i*25));
      }
      el.textContent = results[i];
      el.classList.remove('spin');
    }
    let award = 0;
    const set = new Set(results);
    if(set.size === 1){
      const s = results[0];
      award = (s === '⭐' ? 20 : (s === '🍒' ? 12 : (s === '🍋' ? 8 : 6))) * Number(state.bet);
      msgEl.textContent = `Triple ${s}! +${fmt(award)}`;
    } else if(set.size === 2){
      award = 3 * Number(state.bet);
      msgEl.textContent = `Pair! +${fmt(award)}`;
    } else {
      msgEl.textContent = 'No match';
    }
    state.bal = Number(state.bal) + Number(award);
    state.best = Math.max(state.best, state.bal);
    save();

    if(S.get('enableSound', true)){
      try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; g.gain.value = 0.02;
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.05);
      }catch(e){}
    }
    state.spinning = false;
  }

  $('#spinBtn').addEventListener('click', spin);
  function holdAdjust(btn, dir){
    let iv = null, step = 1, accel = 0;
    const change = ()=>{
      state.bet = Number(state.bet) + dir*step;
      if(state.bet < 1) state.bet = 1;
      state.bet = Math.min(state.bet, Math.max(1, state.bal));
      S.set('slots_bet', state.bet);
      render();
      accel++;
      if(accel % 8 === 0) step = Math.min(1e9, step * 2);
    };
    btn.addEventListener('mousedown', e=>{ e.preventDefault(); change(); iv = setInterval(change, 140); });
    btn.addEventListener('mouseup', ()=>{ clearInterval(iv); iv=null; step=1; accel=0; });
    btn.addEventListener('mouseleave', ()=>{ clearInterval(iv); iv=null; step=1; accel=0; });
    btn.addEventListener('touchstart', e=>{ e.preventDefault(); change(); iv = setInterval(change, 140); }, {passive:false});
    btn.addEventListener('touchend', ()=>{ clearInterval(iv); iv=null; step=1; accel=0; });
  }
  holdAdjust($('#betUp'), +1);
  holdAdjust($('#betDown'), -1);

  /* Keyboard shortcuts for Slots (when Slots tab active) */
  window.addEventListener('keydown', (e)=>{
    if($('#sec-slots').classList.contains('active')){
      if(e.key===' '){ e.preventDefault(); spin(); }
      if(e.key==='+' || e.key==='='){ state.bet = Math.min(state.bet+1, Math.max(1, state.bal)); save(); }
      if(e.key==='-' || e.key==='_'){ state.bet = Math.max(1, state.bet-1); save(); }
    }
  });

  render();
})();

/* ========= Blackjack ========= */
(function(){
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const dealerEl = $('#dealer'), playerEl = $('#player');
  const bankEl = $('#bjBank'), betEl = $('#bjBet'), bestEl = $('#bjBest'), msgEl = $('#bjMsg');
  const pValEl = $('#pVal'), dValEl = $('#dVal'), bjBetDisplay = $('#bjBetDisplay');

  let state = {
    bank: Number(S.get('bj_bank',100)),
    bet: Number(S.get('bj_bet',10)),
    best: Number(S.get('bj_best',0)),
    deck: [], player: [], dealer: [], inRound: false
  };

  function save(){ S.set('bj_bank', state.bank); S.set('bj_bet', state.bet); state.best = Math.max(state.best, state.bank); S.set('bj_best', state.best); renderTop(); }
  function renderTop(){ bankEl.textContent = fmt(state.bank); betEl.textContent = fmt(state.bet); bestEl.textContent = fmt(state.best); bjBetDisplay.textContent = fmt(state.bet); }

  function newDeck(){
    state.deck = [];
    suits.forEach(s => ranks.forEach(r => state.deck.push(r + s)));
    for(let i = state.deck.length - 1; i > 0; i--){
      const j = irnd(0, i);
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
  }

  function valueOf(rank){
    if(['J','Q','K'].includes(rank)) return 10;
    if(rank === 'A') return 11;
    return Number(rank);
  }
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
      if(hideFirst && i === 0){ d.classList.add('back'); d.textContent = '🂠'; }
      else { d.textContent = c; }
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
        const win = Math.round(state.bet * 2.5);
        state.bank += win;
        msgEl.textContent = `Blackjack! You win ${fmt(win - state.bet)} (3:2)`;
      } else if(dBJ && !pBJ){
        msgEl.textContent = 'Dealer has blackjack. You lose.';
      } else {
        state.bank += state.bet; msgEl.textContent = 'Both have blackjack — push.';
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
    if(Number(state.bet) > Number(state.bank)){ msgEl.textContent = 'Bet exceeds bank — reduce bet.'; return; }
    newDeck();
    resetRound();
    state.bank = Number(state.bank) - Number(state.bet);
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
    state.bank = Number(state.bank) + Number(win);
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

  function holdAdjust(btn, dir){
    let iv=null, step=1, accel=0;
    const change = ()=>{
      state.bet = Number(state.bet) + dir*step;
      if(state.bet < 1) state.bet = 1;
      state.bet = Math.min(state.bet, Math.max(1, state.bank));
      S.set('bj_bet', state.bet);
      renderTop();
      accel++;
      if(accel % 8 === 0) step = Math.min(1e12, step*2);
    };
    btn.addEventListener('mousedown', e=>{ e.preventDefault(); change(); iv=setInterval(change,140); });
    btn.addEventListener('mouseup', ()=>{ clearInterval(iv); iv=null; step=1; accel=0; });
    btn.addEventListener('mouseleave', ()=>{ clearInterval(iv); iv=null; step=1; accel=0; });
    btn.addEventListener('touchstart', e=>{ e.preventDefault(); change(); iv=setInterval(change,140); }, {passive:false});
    btn.addEventListener('touchend', ()=>{ clearInterval(iv); iv=null; step=1; accel=0; });
  }
  holdAdjust($('#bjBetUp'), +1);
  holdAdjust($('#bjBetDown'), -1);

  /* Keyboard shortcuts for Blackjack (when Blackjack tab active) */
  window.addEventListener('keydown', (e)=>{
    if($('#sec-blackjack').classList.contains('active')){
      if(e.key.toLowerCase()==='d'){ deal(); }
      if(e.key.toLowerCase()==='h'){ $('#bjHit').click(); }
      if(e.key.toLowerCase()==='s'){ $('#bjStand').click(); }
      if(e.key==='ArrowUp'){ state.bet = Math.min(state.bet+1, Math.max(1, state.bank)); save(); }
      if(e.key==='ArrowDown'){ state.bet = Math.max(1, state.bet-1); save(); }
    }
  });

  renderTop();
})();

/* ========= Math Sprint ========= */
(function(){
  const qEl = $('#mathQ'), aEl = $('#mathA'), scoreEl = $('#mathScore'), streakEl = $('#mathStreak'), timeEl = $('#mathTime'), bestEl = $('#mathBest'), msgEl = $('#mathMsg');
  const mAdd = $('#mAdd'), mSub = $('#mSub'), mMul = $('#mMul'), mDiv = $('#mDiv'), mDiff = $('#mDiff');

  let state = { score:0, streak:0, time:60, timer:0, best: Number(S.get('math_best',0)), running:false, answer:null };

  function numberRange(diff){
    if(diff === 'easy') return [1,12];
    if(diff === 'medium') return [1,50];
    return [1,200];
  }
  function nextQ(){
    const ops = [];
    if(mAdd.checked) ops.push('+');
    if(mSub.checked) ops.push('-');
    if(mMul.checked) ops.push('*');
    if(mDiv.checked) ops.push('/');
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
      if(op1 === '/'){
        const ans1 = irnd(1,20);
        const bb = irnd(1,20);
        expr = `${ans1*bb} ÷ ${bb}`;
      } else expr = `${a} ${op1} ${b}`;
      if(op2 === '/'){
        const denom = irnd(1,12);
        expr = `(${expr}) ÷ ${denom}`;
      } else expr = `(${expr}) ${op2} ${c}`;

      const safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
      let ans = 0; try { ans = Math.round(eval(safeExpr)); } catch(e){ ans = 0; }
      qEl.textContent = expr + ' = ?';
      state.answer = ans;
      aEl.value = ''; aEl.focus();
      return;
    }

    const op = ops[irnd(0, ops.length-1)];
    let a = irnd(minN, maxN);
    let b = irnd(minN, maxN);
    let text = '', ans = 0;
    if(op === '/'){
      b = irnd(1, Math.max(2, Math.min(50,maxN)));
      ans = irnd(1, Math.max(1, Math.min(50,maxN)));
      a = ans * b; text = `${a} ÷ ${b} = ?`;
    } else if(op === '*'){
      if(diff === 'hard'){ b = irnd(2, Math.min(50,maxN)); }
      ans = a * b; text = `${a} × ${b} = ?`;
    } else if(op === '+'){ ans = a + b; text = `${a} + ${b} = ?`; }
    else { if(diff !== 'hard' && a < b) [a,b] = [b,a]; ans = a - b; text = `${a} − ${b} = ?`; }

    qEl.textContent = text;
    state.answer = ans; aEl.value = ''; aEl.focus();
  }
  function tick(){
    state.time--;
    timeEl.textContent = state.time;
    if(state.time <= 0){
      clearInterval(state.timer); state.timer = 0; state.running = false;
      msgEl.textContent = `Time's up — final ${state.score}`;
      state.best = Math.max(state.best, state.score);
      S.set('math_best', state.best);
      bestEl.textContent = state.best;
    }
    if(state.time === 10) timeEl.parentElement.classList.add('danger');
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
      const bonus = (mDiff.value === 'hard') ? 10 : 2;
      const gain = 10 + (state.streak - 1) * bonus;
      state.score += gain;
      msgEl.textContent = `Correct +${gain}`;
    } else {
      state.streak = 0;
      msgEl.textContent = `Wrong — answer ${state.answer}`;
    }
    scoreEl.textContent = state.score; streakEl.textContent = state.streak; nextQ();
  });

  /* Shortcuts for Math tab */
  window.addEventListener('keydown', (e)=>{
    if($('#sec-math').classList.contains('active')){
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); $('#mathSubmit').click(); }
      if(e.key==='Enter' && e.shiftKey){ e.preventDefault(); $('#mathStart').click(); }
    }
  });

  bestEl.textContent = state.best;
})();

/* ========= Typing ========= */
(function(){
  const samples = [
    'Practice makes progress. Keep your fingers light and your focus steady.',
    'Clear instructions and clean code make everything easier to fix later.',
    'Small daily habits add up to big improvements over time.',
    'Stay calm. Type steady. Let accuracy build your speed.',
    'Read the problem first, then write code with intent and tests.'
  ];
  const textWrap = $('#typingText'), input = $('#typeInput'), wpmEl = $('#typeWpm'), accEl = $('#typeAcc'), timeEl = $('#typeTime'), bestEl = $('#typeBest'), msg = $('#typeMsg');

  let state = {
    text: '', pos: 0, time: Number(S.get('typingDur',30)), timer: null,
    correct: 0, total: 0, running: false, best: Number(S.get('type_best',0))
  };

  function pick(){
    state.text = samples[irnd(0, samples.length-1)];
    state.pos = 0; state.correct = 0; state.total = 0; render();
  }
  function render(){
    const before = state.text.slice(0, state.pos);
    const cur = state.text[state.pos] || '';
    const after = state.text.slice(state.pos+1);
    const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    textWrap.innerHTML = `<span class="done">${esc(before)}</span><span class="cur">${esc(cur)}</span>${esc(after)}`;
  }
  function tick(){
    state.time--;
    timeEl.textContent = state.time;
    const elapsed = Math.max(1, Number(S.get('typingDur',30)) - state.time);
    const wpm = Math.round(((state.total/5) / (elapsed/60)) || 0);
    const acc = state.total ? Math.round((state.correct/state.total)*100) : 100;
    wpmEl.textContent = wpm; accEl.textContent = acc + '%';
    if(state.time <= 0){
      clearInterval(state.timer); state.timer = null; state.running = false;
      msg.textContent = `Done — WPM ${wpm} | Accuracy ${acc}%`;
      state.best = Math.max(state.best, wpm);
      S.set('type_best', state.best); bestEl.textContent = state.best;
    }
  }

  $('#typeStart').addEventListener('click', ()=>{
    if(state.running) return;
    state.time = Number(S.get('typingDur',30));
    timeEl.textContent = state.time;
    state.correct = 0; state.total = 0; state.pos = 0; state.running = true;
    pick(); input.value = ''; input.focus();
    if(state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000); msg.textContent = '';
  });

  input.addEventListener('keydown', function(e){
    if(!state.running) { if(e.key === 'Backspace') e.preventDefault(); return; }
    if(e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); return; }
    if(e.key === 'Backspace'){ e.preventDefault(); if(state.pos > 0) state.pos--; render(); return; }
    if(e.key.length !== 1) return;
    e.preventDefault();
    const ch = e.key; state.total++;
    const expected = state.text[state.pos] || '';
    if(ch === expected) state.correct++;
    state.pos++; if(state.pos >= state.text.length) pick(); render();
  });

  /* Shortcut: Enter to start when Typing tab active and input not focused */
  window.addEventListener('keydown', (e)=>{
    if($('#sec-typing').classList.contains('active')){
      if(e.key==='Enter' && !state.running && document.activeElement!==input){
        e.preventDefault(); $('#typeStart').click();
      }
    }
  });

  bestEl.textContent = state.best;
})();

/* ========= Retro Drift Game ========= */
(function(){
  const canvas = $('#driftCanvas');
  const ctx = canvas.getContext('2d');

  // resize to parent while keeping internal resolution nice
  function fitCanvas(){
    const r = canvas.getBoundingClientRect();
    // Keep internal resolution stable for crisp drawing
    const ratio = 16/9;
    let w = r.width;
    let h = w/ratio;
    if(h > window.innerHeight*0.6){ h = Math.floor(window.innerHeight*0.6); w = Math.floor(h*ratio); }
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
  }
  window.addEventListener('resize', fitCanvas); fitCanvas();

  // World / camera settings
  const ROAD_W = 2000;           // world road half width
  const SEG_LEN = 50;            // length of a segment in world units
  const DRAW_DIST = 300;         // how far ahead to draw (world units)
  const LANE_W = ROAD_W*0.9;

  // Player car
  let car = {
    speed: 0,         // world units per frame
    maxSpeed: 240,    // top speed
    accel: 0.45,
    brake: 0.9,
    turn: 0.035,      // steering rate
    x: 0,             // lateral position (center=0)
    drift: 0,         // drift factor 0..1
    yaw: 0            // for visual tilt
  };

  // Track state
  let zCamera = 0;      // forward position along road
  let lap = 0;
  let curve = 0;        // current curvature
  let curveTarget = 0;  // target curvature (smooth changes)
  let hills = 0;        // elevation phase

  // Input
  const keys = { left:0, right:0, gas:0, brake:0, ebrake:0 };
  window.addEventListener('keydown', e=>{
    if($('#sec-game').classList.contains('active')){
      if(['ArrowLeft','a','A'].includes(e.key)) keys.left = 1;
      if(['ArrowRight','d','D'].includes(e.key)) keys.right = 1;
      if(e.key==='ArrowUp' || e.key==='w' || e.key==='W') keys.gas = 1;
      if(e.key==='ArrowDown' || e.key==='s' || e.key==='S') keys.brake = 1;
      if(e.key===' ') { e.preventDefault(); keys.ebrake = 1; }
    }
  });
  window.addEventListener('keyup', e=>{
    if(['ArrowLeft','a','A'].includes(e.key)) keys.left = 0;
    if(['ArrowRight','d','D'].includes(e.key)) keys.right = 0;
    if(e.key==='ArrowUp' || e.key==='w' || e.key==='W') keys.gas = 0;
    if(e.key==='ArrowDown' || e.key==='s' || e.key==='S') keys.brake = 0;
    if(e.key===' ') keys.ebrake = 0;
  });

  // Touch controls
  const pressable = (el, down, up)=>{
    el.addEventListener('touchstart', e=>{ e.preventDefault(); down(); }, {passive:false});
    el.addEventListener('touchend',   e=>{ e.preventDefault(); up(); },   {passive:false});
    el.addEventListener('mousedown',  e=>{ e.preventDefault(); down(); });
    el.addEventListener('mouseup',    e=>{ e.preventDefault(); up(); });
    el.addEventListener('mouseleave', e=>{ up(); });
  };
  pressable($('#btnLeft'),  ()=>keys.left=1,   ()=>keys.left=0);
  pressable($('#btnRight'), ()=>keys.right=1,  ()=>keys.right=0);
  pressable($('#btnGas'),   ()=>keys.gas=1,    ()=>keys.gas=0);
  pressable($('#btnBrake'), ()=>keys.brake=1,  ()=>keys.brake=0);
  pressable($('#btnEbrake'),()=>keys.ebrake=1, ()=>keys.ebrake=0);

  // Projection helper
  function project(x, y, z){
    const camHeight = 1200 + Math.sin(hills)*250; // gentle up/down
    const dz = z - zCamera;
    const scale = 1200 / (dz || 1);
    const px = canvas.width/2 + (x + curve*dz*1.1) * scale;
    const py = canvas.height*0.55 - (y - camHeight) * scale;
    return {x:px, y:py, s:scale};
  }

  // Draw quad
  function quad(c, x1,y1, w1, x2,y2, w2, color){
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x1-w1, y1);
    c.lineTo(x1+w1, y1);
    c.lineTo(x2+w2, y2);
    c.lineTo(x2-w2, y2);
    c.closePath();
    c.fill();
  }

  // Main update/draw
  let lastT=performance.now();
  function loop(t){
    const dt = Math.min(1/30, (t-lastT)/1000); lastT=t;

    // target curvature changes slowly to create corners
    curveTarget += (Math.sin(t*0.0003)+Math.sin(t*0.00017))*0.00002;
    curve += (curveTarget - curve)*0.02;
    hills += 0.5*dt;

    // Speed & drift
    if(keys.gas)   car.speed += car.accel;
    if(keys.brake) car.speed -= car.accel*1.2;
    car.speed = clamp(car.speed, 0, car.maxSpeed);

    // Handbrake amplifies drift and reduces speed
    if(keys.ebrake){ car.drift = Math.min(1, car.drift + 0.08); car.speed *= 0.992; }
    else            { car.drift *= 0.96; }

    // Steering
    let steer = (keys.right - keys.left);
    if(steer !== 0){
      car.yaw += steer * (0.03 + car.drift*0.08);
      car.x += steer * (LANE_W * 0.014) * (0.5 + car.speed/car.maxSpeed) * (1 + car.drift*0.8);
    }
    car.yaw *= 0.9; // ease back

    // Car re-centering & edge friction
    car.x += curve * car.speed * 0.9; // road pushes you on curves
    if(Math.abs(car.x) > LANE_W){ // off road = slow down
      car.speed *= 0.985;
      car.x = clamp(car.x, -LANE_W*1.1, LANE_W*1.1);
    }

    zCamera += car.speed;
    if(zCamera > 100000){ zCamera = 0; lap++; }

    // HUD
    $('#hudSpeed').textContent = Math.round(car.speed*1.8);
    $('#hudDrift').textContent = Math.round(car.drift*100)+'%';
    $('#hudLap').textContent = lap;

    // DRAW
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // sky
    const grd = ctx.createLinearGradient(0,0,0,canvas.height*0.55);
    grd.addColorStop(0,'#0b1630');
    grd.addColorStop(1,'#2d4f8a');
    ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height*0.55);

    // mountains
    ctx.fillStyle = '#0a244a';
    for(let i=0;i<6;i++){
      const baseY = canvas.height*0.55 + i*6;
      ctx.beginPath();
      ctx.moveTo(-50, baseY);
      for(let x=0;x<=canvas.width+50;x+=40){
        const y = baseY - 30 - Math.sin((x*0.005 + i*0.7 + hills*0.3))*20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width+50, baseY); ctx.closePath(); ctx.fill();
    }

    // road
    let z = 0;
    let xPrev=null,yPrev=null,wPrev=null;
    for(let n=0; n<Math.ceil(DRAW_DIST/SEG_LEN); n++){
      const z1 = z + n*SEG_LEN;
      const z2 = z1 + SEG_LEN;

      const p1 = project(0, 0, z1);
      const p2 = project(0, 0, z2);

      const laneW1 = (ROAD_W) * p1.s;
      const laneW2 = (ROAD_W) * p2.s;

      const rumble = n%2===0 ? '#384c7a' : '#2a3d6b';
      const roadColor = n%2===0 ? '#1a294a' : '#152242';
      const lineColor = '#cfd9ff';

      if(p1.y < p2.y) continue; // behind camera or inverted

      // grass
      quad(ctx, canvas.width/2, p1.y, canvas.width, canvas.width/2, p2.y, canvas.width, n%2===0?'#0f1f3b':'#0d1930');
      // rumble strips
      quad(ctx, p1.x, p1.y, laneW1*1.15, p2.x, p2.y, laneW2*1.15, rumble);
      // road
      quad(ctx, p1.x, p1.y, laneW1, p2.x, p2.y, laneW2, roadColor);
      // center line
      if(n%2===0) quad(ctx, p1.x, p1.y, laneW1*0.04, p2.x, p2.y, laneW2*0.04, lineColor);

      // store prev for side posts/trees
      xPrev=p2.x; yPrev=p2.y; wPrev=laneW2;
    }

    // roadside posts (simple)
    ctx.fillStyle = '#9bb4ff';
    for(let i=0;i<12;i++){
      const zz = i*220 + (zCamera%220);
      const p = project(ROAD_W*1.22, 0, zz);
      const h = 6*p.s;
      ctx.fillRect(p.x-2, p.y-h, 4, h);
      const p2 = project(-ROAD_W*1.22, 0, zz);
      ctx.fillRect(p2.x-2, p2.y-h, 4, h);
    }

    // draw car HUD-rectangle at bottom (retro)
    const cx = canvas.width/2 + car.x*0.06;
    const cy = canvas.height*0.82;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(car.yaw*0.2);
    ctx.fillStyle = '#ffdf87';
    ctx.fillRect(-30, -10, 60, 20);                 // body
    ctx.fillStyle = '#222';
    ctx.fillRect(-24, 10, 18, 8); ctx.fillRect(6, 10, 18, 8); // wheels
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-24, -14, 48, 8); // windshield
    ctx.restore();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  $('#driftMsg').textContent = 'Tip: Hold Space (or E-Brake button) to kick the rear out and drift.';
})();

/* ========= Init defaults ========= */
(function initDefaults(){
  if(S.get('firstRun', true)){
    S.set('firstRun', false);
  }
  $('#slotsBal').textContent = fmt(Number(S.get('slots_bal',100)));
  $('#slotsBet').textContent = fmt(Number(S.get('slots_bet',5)));
  $('#slotsBest').textContent = fmt(Number(S.get('slots_best',0)));
  $('#bjBank').textContent = fmt(Number(S.get('bj_bank',100)));
  $('#bjBet').textContent = fmt(Number(S.get('bj_bet',10)));
  $('#bjBest').textContent = fmt(Number(S.get('bj_best',0)));
  $('#mathBest').textContent = fmt(Number(S.get('math_best',0)));
  $('#typeBest').textContent = fmt(Number(S.get('type_best',0)));
})();
