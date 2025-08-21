// app.js — logic for Devin's Games
// Features: Slots (hold-to-increase w/ acceleration), Blackjack (improved), Math (harder), Typing (stable), customization

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

/* apply saved customization */
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

/* initialize customization UI */
(function setupCustomization() {
  const themeSel = $('#themeSelect');
  const accentPicker = $('#accentPicker');
  const fontSize = $('#fontSize');
  const typingDur = $('#typingDur');

  themeSel.value = S.get('theme','dark');
  accentPicker.value = S.get('accent','#7cf1c8');
  fontSize.value = S.get('fontsize',16);
  typingDur.value = S.get('typingDur',30);

  applyCustom();

  themeSel.addEventListener('change', e => { S.set('theme', e.target.value); applyCustom(); });
  accentPicker.addEventListener('input', e => { S.set('accent', e.target.value); applyCustom(); });
  fontSize.addEventListener('input', e => { S.set('fontsize', Number(e.target.value)); applyCustom(); });
  typingDur.addEventListener('change', e => { S.set('typingDur', Number(e.target.value)); });

  $('#resetCustom').addEventListener('click', ()=>{
    if(confirm('Reset customization to defaults?')){
      ['theme','accent','fontsize','typingDur'].forEach(k => S.del(k));
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
    state.spinning = true;
    msgEl.textContent = 'Spinning...';
    // remove hard limit — allow big numbers
    state.bal = Number(state.bal) - Number(state.bet);
    render();

    // pick results
    const results = [symbols[irnd(0,symbols.length-1)], symbols[irnd(0,symbols.length-1)], symbols[irnd(0,symbols.length-1)]];

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
    state.spinning = false;
  }

  $('#spinBtn').addEventListener('click', spin);

  // Hold-to-increase bet with acceleration.
  function holdAdjust(btn, dir){
    let iv = null, step = 1, accel = 0;
    const change = ()=>{
      // NO limit
      state.bet = Number(state.bet) + dir*step;
      if(state.bet < 1) state.bet = 1; // minimum 1
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
      // show value of visible dealer cards (i.e., excluding first face-down)
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
    if(state.bet > Number.MAX_SAFE_INTEGER) { /* allow very large bets — user asked no limits */ }
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
    // Dealer hits until 17+, but use soft 17 rule: dealer stands on soft 17 as per description
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

  // hold-to-adjust for blackjack bet
  function holdAdjust(btn, dir){
    let iv=null, step=1, accel=0;
    const change = ()=>{
      state.bet = Number(state.bet) + dir*step;
      if(state.bet < 1) state.bet = 1;
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
      // chained two-operator expression: (a op b) op2 c
      const a = irnd(minN, maxN);
      const b = irnd(minN, Math.min(maxN, 20));
      const c = irnd(minN, Math.min(maxN, 20));
      const op1 = ops[irnd(0, ops.length-1)];
      const op2 = ops[irnd(0, ops.length-1)];
      // if division, make it integer-friendly
      let expr = '';
      let ans = 0;
      if(op1 === '/'){
        const ans1 = irnd(1,20);
        const bb = irnd(1,20);
        expr = `${ans1*bb} ÷ ${bb}`;
      } else expr = `${a} ${op1} ${b}`;

      // second op
      if(op2 === '/'){
        const denom = irnd(1,12);
        expr = `(${expr}) ÷ ${denom}`;
      } else expr = `(${expr}) ${op2} ${c}`;

      // Try to evaluate safely by replacing × and ÷
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
   init: set defaults on first load
   ========================= */
(function initDefaults(){
  if(S.get('firstRun', true)){
    S.set('firstRun', false);
    // defaults preserved elsewhere
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
