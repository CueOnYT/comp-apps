// app.js — logic for Devin's Games (complete, ready-to-run)
// All features run locally (no external configuration required).
// Includes: login (local), leaderboards (localStorage), customization, improved games, no negative balances.

/* small helpers */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const irnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const fmt = n => {
  if(typeof n === 'number' && !Number.isFinite(n)) return n.toString();
  try { return Number(n).toLocaleString(); } catch(e) { return String(n); }
};

/* === PERSISTENCE helpers === */
const S = {
  get(k, d){ try{ const v = localStorage.getItem('dg_'+k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ localStorage.setItem('dg_'+k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem('dg_'+k); }
};

/* -------------------------
   AUTH (local simple sign-in)
   ------------------------- */
function currentUser(){ return S.get('user', {name: null}); }
function updateUserUI(){
  const u = currentUser();
  if(u && u.name){
    $('#currentUser').textContent = `Signed in: ${u.name}`;
    $('#signInBtn').textContent = 'Sign out';
  } else {
    $('#currentUser').textContent = 'Not signed in';
    $('#signInBtn').textContent = 'Sign in';
  }
}
$('#signInBtn').addEventListener('click', ()=>{
  const u = currentUser();
  if(u && u.name){
    if(confirm('Sign out?')) { S.del('user'); updateUserUI(); }
  } else {
    $('#signinModal').setAttribute('aria-hidden','false');
    $('#signinName').value = '';
    $('#signinName').focus();
  }
});
$('#cancelSignin').addEventListener('click', ()=>{ $('#signinModal').setAttribute('aria-hidden','true'); });
$('#doSignin').addEventListener('click', ()=>{
  const name = $('#signinName').value.trim();
  if(!name){ alert('Enter a display name'); $('#signinName').focus(); return; }
  S.set('user', {name: name});
  $('#signinModal').setAttribute('aria-hidden','true');
  updateUserUI();
});
updateUserUI();

/* =========================
   CUSTOMIZATION
   ========================= */
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

  // background patterns
  document.body.classList.remove('bg-stripes','bg-flat');
  if(bgPattern === 'stripes') document.body.classList.add('bg-stripes');
  if(bgPattern === 'flat') document.body.classList.add('bg-flat');

  if(disableAnim) document.documentElement.classList.add('no-anim'); else document.documentElement.classList.remove('no-anim');
}

/* initialize customization UI */
(function setupCustomization() {
  const themeSel = $('#themeSelect');
  const accentPicker = $('#accentPicker');
  const fontSize = $('#fontSize');
  const typingDur = $('#typingDur');
  const preset = $('#presetSelect');
  const fontFamily = $('#fontFamily');
  const bgPattern = $('#bgPattern');
  const enableSound = $('#enableSound');
  const disableAnim = $('#disableAnim');

  themeSel.value = S.get('theme','dark');
  accentPicker.value = S.get('accent','#7cf1c8');
  fontSize.value = S.get('fontsize',16);
  typingDur.value = S.get('typingDur',30);
  preset.value = S.get('preset','default');
  fontFamily.value = S.get('fontfamily', "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial");
  bgPattern.value = S.get('bgpattern','radial');
  enableSound.checked = S.get('enableSound', true);
  disableAnim.checked = S.get('disableAnim', false);

  applyCustom();

  themeSel.addEventListener('change', e => { S.set('theme', e.target.value); applyCustom(); });
  accentPicker.addEventListener('input', e => { S.set('accent', e.target.value); applyCustom(); });
  fontSize.addEventListener('input', e => { S.set('fontsize', Number(e.target.value)); applyCustom(); });
  typingDur.addEventListener('change', e => { S.set('typingDur', Number(e.target.value)); });
  preset.addEventListener('change', e=>{
    const v = e.target.value;
    S.set('preset', v);
    if(v === 'ocean'){ S.set('accent','#7cf1c8'); S.set('bgpattern','radial'); }
    else if(v === 'sunset'){ S.set('accent','#ffa87d'); S.set('bgpattern','stripes'); }
    else { S.set('accent','#7cf1c8'); S.set('bgpattern','radial'); }
    applyCustom();
    $('#accentPicker').value = S.get('accent');
    $('#bgPattern').value = S.get('bgpattern');
  });
  fontFamily.addEventListener('change', e => { S.set('fontfamily', e.target.value); applyCustom(); });
  bgPattern.addEventListener('change', e => { S.set('bgpattern', e.target.value); applyCustom(); });
  enableSound.addEventListener('change', e => { S.set('enableSound', e.target.checked); });
  disableAnim.addEventListener('change', e => { S.set('disableAnim', e.target.checked); applyCustom(); });

  $('#resetCustom').addEventListener('click', ()=>{
    if(confirm('Reset customization to defaults?')){
      ['theme','accent','fontsize','typingDur','preset','fontfamily','bgpattern','enableSound','disableAnim'].forEach(k => S.del(k));
      location.reload();
    }
  });
})();

/* === Tabs behavior === */
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab').forEach(b=>b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current','page');
    const t = btn.dataset.tab;
    $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'sec-'+t));
  });
});

/* =========================
   SLOTS
   ========================= */
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
      msgEl.textContent = 'Bet exceeds balance — reduce bet.';
      return;
    }
    if(state.bal <= 0){
      msgEl.textContent = 'Insufficient balance.';
      return;
    }
    state.spinning = true;
    msgEl.textContent = 'Spinning...';
    // subtract bet (won't go below 0 because bet <= bal)
    state.bal = Number(state.bal) - Number(state.bet);
    render();

    // pick results
    const results = [symbols[irnd(0,symbols.length-1)], symbols[irnd(0,symbols.length-1)], symbols[irnd(0,symbols.length-1)]];

    // animate
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

    // sound
    if(S.get('enableSound', true)){
      try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500 + Math.min(2000, state.bet), ctx.currentTime);
        const g = ctx.createGain();
        g.gain.value = 0.02;
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.05);
      }catch(e){}
    }

    state.spinning = false;
  }

  $('#spinBtn').addEventListener('click', spin);

  // Hold-to-increase bet with acceleration, but clamp to balance
  function holdAdjust(btn, dir){
    let iv = null, step = 1, accel = 0;
    const change = ()=>{
      state.bet = Number(state.bet) + dir*step;
      if(state.bet < 1) state.bet = 1;
      // clamp: bet must be at most balance (but minimum 1)
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

  $('#resetSlots').addEventListener('click', ()=>{
    if(confirm('Reset slots balance to 100?')) {
      state.bal = 100; state.bet = 5; save(); msgEl.textContent = 'Balance reset';
    }
  });

  render();
})();

/* =========================
   BLACKJACK
   ========================= */
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
    while(total > 21 && aces){
      total -= 10; aces--;
    }
    return total;
  }

  function renderHand(el, hand, hideFirst=false){
    el.innerHTML = '';
    hand.forEach((c,i) => {
      const d = document.createElement('div');
      d.className = 'cardx';
      if(hideFirst && i === 0){
        d.classList.add('back'); d.textContent = '🂠';
      } else {
        d.textContent = c;
      }
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
        const win = Math.round(state.bet * 2.5); // return +1.5x profit
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
    // Prevent dealing if bet exceeds bank
    if(Number(state.bet) > Number(state.bank)){
      msgEl.textContent = 'Bet exceeds bank — reduce bet.';
      return;
    }
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
    if(dv > 21 || pv > dv){
      win = state.bet * 2; msg = `You win +${fmt(win - state.bet)}`;
    } else if(pv === dv){
      win = state.bet; msg = 'Push';
    } else { win = 0; msg = 'Dealer wins'; }
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

  // hold-to-adjust for blackjack bet (clamp to bank)
  function holdAdjust(btn, dir){
    let iv=null, step=1, accel=0;
    const change = ()=>{
      state.bet = Number(state.bet) + dir*step;
      if(state.bet < 1) state.bet = 1;
      // clamp to bank so you can't bet more than you have
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

  $('#bjReset').addEventListener('click', ()=>{
    if(confirm('Reset bank to 100?')) {
      state.bank = 100; state.bet = 10; save(); msgEl.textContent = 'Bank reset';
    }
  });

  renderTop();
})();

/* =========================
   MATH SPRINT (harder)
   ========================= */
(function(){
  const qEl = $('#mathQ'), aEl = $('#mathA'), scoreEl = $('#mathScore'), streakEl = $('#mathStreak'), timeEl = $('#mathTime'), bestEl = $('#mathBest'), msgEl = $('#mathMsg');
  const mAdd = $('#mAdd'), mSub = $('#mSub'), mMul = $('#mMul'), mDiv = $('#mDiv'), mDiff = $('#mDiff');

  let state = { score:0, streak:0, time:60, timer:0, best: Number(S.get('math_best',0)), running:false, answer:null };

  function numberRange(diff){
    if(diff === 'easy') return [1,12];
    if(diff === 'medium') return [1,50];
    return [1,200];
  }

  // generate problems; hard mode may produce chained problems like (a * b) + c
  function nextQ(){
    const ops = [];
    if(mAdd.checked) ops.push('+');
    if(mSub.checked) ops.push('-');
    if(mMul.checked) ops.push('*');
    if(mDiv.checked) ops.push('/');
    if(ops.length === 0) ops.push('+');

    const diff = mDiff.value;
    const [minN, maxN] = numberRange(diff);

    // choose whether to make a chained problem if hard
    if(diff === 'hard' && Math.random() < 0.45){
      const a = irnd(minN, maxN);
      const b = irnd(minN, Math.min(maxN, 20));
      const c = irnd(minN, Math.min(maxN, 20));
      const op1 = ops[irnd(0, ops.length-1)];
      const op2 = ops[irnd(0, ops.length-1)];
      let expr = '';
      let ans = 0;
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
      try { ans = Math.round(eval(safeExpr)); } catch(e){ ans = 0; }
      qEl.textContent = expr + ' = ?';
      state.answer = ans;
      aEl.value = '';
      aEl.focus();
      return;
    }

    // single op
    const op = ops[irnd(0, ops.length-1)];
    let a = irnd(minN, maxN);
    let b = irnd(minN, maxN);
    let text = '', ans = 0;
    if(op === '/'){
      b = irnd(1, Math.max(2, Math.min(50,maxN)));
      ans = irnd(1, Math.max(1, Math.min(50,maxN)));
      a = ans * b;
      text = `${a} ÷ ${b} = ?`;
    } else if(op === '*'){
      if(diff === 'hard'){ b = irnd(2, Math.min(50,maxN)); }
      ans = a * b; text = `${a} × ${b} = ?`;
    } else if(op === '+'){ ans = a + b; text = `${a} + ${b} = ?`; }
    else { if(diff !== 'hard' && a < b) [a,b] = [b,a]; ans = a - b; text = `${a} − ${b} = ?`; }

    qEl.textContent = text;
    state.answer = ans;
    aEl.value = '';
    aEl.focus();
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
    scoreEl.textContent = state.score;
    streakEl.textContent = state.streak;
    nextQ();
  });

  $('#mathReset').addEventListener('click', ()=>{
    if(confirm('Reset math best?')){ S.set('math_best', 0); bestEl.textContent = 0; }
  });

  bestEl.textContent = state.best;
})();

/* =========================
   TYPING test (robust)
   ========================= */
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
      S.set('type_best', state.best);
      bestEl.textContent = state.best;
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

  // Robust input: accept normal typing, support backspace (move back), do NOT rely on value property length.
  input.addEventListener('keydown', function(e){
    if(!state.running) {
      if(e.key === 'Backspace') e.preventDefault();
      return;
    }
    // ignore control/shift keys
    if(e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); return; }

    // backspace
    if(e.key === 'Backspace'){
      e.preventDefault();
      if(state.pos > 0) state.pos--;
      render();
      return;
    }

    // only process character keys
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

  $('#typeReset').addEventListener('click', ()=>{
    if(confirm('Reset best WPM?')){ S.set('type_best', 0); bestEl.textContent = 0; }
  });

  bestEl.textContent = state.best;
})();

/* =========================
   Leaderboards (local-only)
   ========================= */
(function(){
  // store structure: { slots: [{name, score, t}], blackjack: [...], math: [...], typing: [...] }
  const LB_KEY = 'leaderboards_v1';
  function readLB(){ return S.get('lb_data', { slots: [], blackjack: [], math: [], typing: [] }); }
  function writeLB(obj){ S.set('lb_data', obj); }

  function submitScore(game, name, score){
    if(!name) return { ok:false, msg:'Sign in to submit' };
    const data = readLB();
    if(!data[game]) data[game] = [];
    data[game].push({ name, score: Number(score), t: Date.now() });
    // keep only top 100 entries to avoid unlimited growth
    data[game].sort((a,b)=>b.score - a.score || a.t - b.t);
    data[game] = data[game].slice(0,100);
    writeLB(data);
    return { ok:true };
  }

  function getTop(game, count=10){
    const data = readLB();
    return (data[game] || []).slice(0, count);
  }

  // UI
  const lbList = $('#lbList'), lbGame = $('#lbGame'), refreshBtn = $('#refreshLb'), submitBtn = $('#submitLb');

  function renderLB(){
    const game = lbGame.value;
    const top = getTop(game, 10);
    lbList.innerHTML = '';
    if(top.length === 0) {
      lbList.innerHTML = '<li class="muted">No scores yet</li>';
      return;
    }
    top.forEach((e, i)=>{
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${e.name} — ${fmt(e.score)}`;
      lbList.appendChild(li);
    });
  }

  refreshBtn.addEventListener('click', renderLB);

  submitBtn.addEventListener('click', ()=>{
    const u = currentUser();
    if(!u || !u.name){ if(confirm('You are not signed in. Sign in now?')) { $('#signinModal').setAttribute('aria-hidden','false'); } return; }
    const name = u.name;
    // pick game and corresponding score
    const g = lbGame.value;
    let score = 0;
    if(g === 'slots') score = Number(S.get('slots_bal',100));
    else if(g === 'blackjack') score = Number(S.get('bj_bank',100));
    else if(g === 'math') score = Number(S.get('math_best',0));
    else if(g === 'typing') score = Number(S.get('type_best',0));
    const res = submitScore(g, name, score);
    if(res.ok){ alert('Score submitted!'); renderLB(); } else alert(res.msg || 'Error');
  });

  // initial render
  renderLB();

  // switch game -> render
  lbGame.addEventListener('change', renderLB);
})();

/* =========================
   init: set defaults on first load
   ========================= */
(function initDefaults(){
  if(S.get('firstRun', true)){
    S.set('firstRun', false);
    // sensible defaults already set elsewhere
  }
  // populate UI elements that reflect stored values
  $('#slotsBal').textContent = fmt(Number(S.get('slots_bal',100)));
  $('#slotsBet').textContent = fmt(Number(S.get('slots_bet',5)));
  $('#slotsBest').textContent = fmt(Number(S.get('slots_best',0)));
  $('#bjBank').textContent = fmt(Number(S.get('bj_bank',100)));
  $('#bjBet').textContent = fmt(Number(S.get('bj_bet',10)));
  $('#bjBest').textContent = fmt(Number(S.get('bj_best',0)));
  $('#mathBest').textContent = fmt(Number(S.get('math_best',0)));
  $('#typeBest').textContent = fmt(Number(S.get('type_best',0)));
})();
