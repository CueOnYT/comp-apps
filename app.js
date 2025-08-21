// ====================== GLOBAL ====================== //
let money = 1000; // starting money
let bet = 10;
let blackjackHand = [];
let blackjackTotal = 0;
let blackjackDealer = [];
let typingIndex = 0;
let typingText = "Type this as fast as you can!";
let typingInput = "";
let mathAnswer = 0;

// DOM Elements
const moneyDisplay = document.getElementById("money");
const betDisplay = document.getElementById("bet");
const blackjackCards = document.getElementById("blackjackCards");
const blackjackTotalDisplay = document.getElementById("blackjackTotal");
const slotsReels = document.querySelectorAll(".reel");
const typingDisplay = document.getElementById("typingText");
const typingInputEl = document.getElementById("typingInput");
const mathQuestion = document.getElementById("mathQuestion");
const mathInput = document.getElementById("mathInput");

// ====================== UTILS ====================== //
function updateHUD() {
  moneyDisplay.textContent = `$${money}`;
  betDisplay.textContent = `$${bet}`;
}

// Prevent debt
function adjustMoney(amount) {
  money += amount;
  if (money < 0) money = 0;
  updateHUD();
}

// Random integer
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ====================== BET BUTTON ====================== //
let betInterval;
document.getElementById("increaseBet").addEventListener("mousedown", () => {
  betInterval = setInterval(() => {
    bet += 10;
    if (bet > money) bet = money;
    updateHUD();
  }, 100);
});
document.getElementById("increaseBet").addEventListener("mouseup", () => clearInterval(betInterval));
document.getElementById("increaseBet").addEventListener("mouseleave", () => clearInterval(betInterval));

// ====================== BLACKJACK ====================== //
const deck = [
  "A", "2","3","4","5","6","7","8","9","10","J","Q","K"
];

function drawCard() {
  return deck[randInt(0, deck.length-1)];
}

function blackjackStart() {
  blackjackHand = [drawCard(), drawCard()];
  blackjackDealer = [drawCard()];
  updateBlackjackDisplay();
}

function blackjackHit() {
  blackjackHand.push(drawCard());
  updateBlackjackDisplay();
}

function blackjackStand() {
  // Dealer logic
  while (getBlackjackTotal(blackjackDealer) < 17) {
    blackjackDealer.push(drawCard());
  }
  checkBlackjackWinner();
}

function getBlackjackTotal(hand) {
  let total = 0;
  let aceCount = 0;
  hand.forEach(card => {
    if (["J","Q","K"].includes(card)) total += 10;
    else if (card === "A") {
      total += 11;
      aceCount++;
    } else total += parseInt(card);
  });
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }
  return total;
}

function updateBlackjackDisplay() {
  blackjackCards.innerHTML = blackjackHand.join(" | ");
  blackjackTotal = getBlackjackTotal(blackjackHand);
  blackjackTotalDisplay.textContent = `Total: ${blackjackTotal}`;
}

// Check winner
function checkBlackjackWinner() {
  const playerTotal = getBlackjackTotal(blackjackHand);
  const dealerTotal = getBlackjackTotal(blackjackDealer);

  if (playerTotal > 21) {
    alert("Bust! You lose!");
    adjustMoney(-bet);
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
    alert("You win!");
    adjustMoney(bet);
  } else if (playerTotal < dealerTotal) {
    alert("Dealer wins!");
    adjustMoney(-bet);
  } else alert("Draw!");
  blackjackStart(); // restart hand
}

// ====================== SLOTS ====================== //
function spinSlots() {
  const symbols = ["🍒","🍋","🍊","🍉","⭐","💎"];
  let result = [];
  slotsReels.forEach(reel => {
    let symbol = symbols[randInt(0, symbols.length-1)];
    reel.textContent = symbol;
    result.push(symbol);
  });
  // Check win
  const first = result[0];
  if (result.every(s => s === first)) {
    alert(`Jackpot! You win ${bet*5}! Thank You James For The Triple 🍋`);
    adjustMoney(bet*5);
  } else if (new Set(result).size <= 2) {
    alert(`Small win! You get ${bet*2}`);
    adjustMoney(bet*2);
  } else adjustMoney(-bet);
}

// ====================== MATH ====================== //
function generateMath() {
  const a = randInt(10,100);
  const b = randInt(10,100);
  const ops = ["+","-","*"];
  const op = ops[randInt(0, ops.length-1)];
  mathAnswer = eval(`${a}${op}${b}`);
  mathQuestion.textContent = `Solve: ${a} ${op} ${b}`;
}

function checkMath() {
  if (parseInt(mathInput.value) === mathAnswer) {
    alert("Correct! You earn your bet.");
    adjustMoney(bet);
  } else {
    alert(`Wrong! The answer was ${mathAnswer}`);
    adjustMoney(-bet);
  }
  mathInput.value = "";
  generateMath();
}

// ====================== TYPING ====================== //
function startTyping() {
  typingDisplay.textContent = typingText;
  typingInputEl.value = "";
}

typingInputEl.addEventListener("input", (e) => {
  typingInput = e.target.value;
  if (typingInput === typingText) {
    alert("Perfect! +Bet");
    adjustMoney(bet);
    startTyping();
  }
});

// ====================== TAB SWITCHING ====================== //
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".section");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.removeAttribute("aria-current"));
    tab.setAttribute("aria-current", "page");
    sections.forEach(sec => sec.classList.remove("active"));
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ====================== INIT ====================== //
updateHUD();
blackjackStart();
generateMath();
startTyping();
