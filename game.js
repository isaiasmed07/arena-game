const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===================== SUPABASE =====================
const SUPABASE_URL = "https://mujgrjmwfeflvbutmbts.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Aw1vjP0NJ7IOF03qPc39Q_nME8oMMK";

let supabaseClient = null;

// ===================== ESTADO =====================
let gameStarted = false;
let leaderboardInterval = null;

// 🟢 POWER SYSTEM
let powerUp = null;
let powerActive = false;
let powerEndTime = 0;
let nextPowerScore = 600;

// ===================== RESIZE =====================
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// ===================== CONTROLES =====================
let keys = {};
let touch = { x: 0, y: 0, active: false };

// 🏆 BEST LOCAL
let best = localStorage.getItem("bestScore") || 0;
document.getElementById("best").innerText = best;

// ===================== AUTOLOAD USER =====================
window.addEventListener("load", () => {
  const savedName = localStorage.getItem("playerName");
  const savedAvatar = localStorage.getItem("playerAvatar");

  if (savedName) document.getElementById("playerName").value = savedName;
  if (savedAvatar) document.getElementById("playerAvatar").value = savedAvatar;

  loadMenuLeaderboard();
});

// teclado
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// touch
canvas.addEventListener("touchstart", (e) => {
  if (!gameStarted) return;
  const t = e.touches[0];
  touch.x = t.clientX;
  touch.y = t.clientY;
  touch.active = true;
  shoot(t.clientX, t.clientY);
});

canvas.addEventListener("touchmove", (e) => {
  if (!gameStarted) return;
  const t = e.touches[0];
  touch.x = t.clientX;
  touch.y = t.clientY;
});

canvas.addEventListener("touchend", () => {
  touch.active = false;
});

// click PC
canvas.addEventListener("click", e => {
  if (!gameStarted) return;
  shoot(e.clientX, e.clientY);
});

// ===================== GAME DATA =====================
let player = {
  x: 0,
  y: 0,
  size: 20,
  speed: 4,
  hp: 100
};

let bullets = [];
let enemies = [];
let score = 0;

// ===================== SHOOT =====================
function shoot(x, y) {
  const angle = Math.atan2(y - player.y, x - player.x);

  const spread = powerActive ? [-0.25, 0, 0.25] : [0];

  spread.forEach(offset => {
    bullets.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(angle + offset) * 6,
      dy: Math.sin(angle + offset) * 6
    });
  });
}

// ===================== ENEMIES =====================
function spawnEnemy() {
  if (!gameStarted) return;

  const side = Math.random();
  let x, y;

  if (side < 0.5) {
    x = Math.random() * canvas.width;
    y = Math.random() < 0.5 ? 0 : canvas.height;
  } else {
    x = Math.random() < 0.5 ? 0 : canvas.width;
    y = Math.random() * canvas.height;
  }

  enemies.push({
    x,
    y,
    size: 20,
    speed: 1 + score * 0.01
  });
}
setInterval(spawnEnemy, 1000);

// ===================== POWER UP =====================
function spawnPowerUp() {
  powerUp = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 15,
    hp: 50
  };
}

function explodePowerUp(x, y) {
  enemies = enemies.filter(e => {
    return Math.hypot(e.x - x, e.y - y) > 120;
  });
}

// ===================== LEADERBOARD =====================
async function loadGameLeaderboard() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(5);

  const board = document.getElementById("leaderboard");
  if (!board) return;

  board.innerHTML = "<h3>🏆 Top 5</h3>";

  data.forEach((row, index) => {
    const div = document.createElement("div");
    div.innerHTML = `${index + 1}. ${row.name} - ${row.score}`;
    board.appendChild(div);
  });
}

async function loadMenuLeaderboard() {
  if (!window.supabase) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data } = await client
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  const board = document.getElementById("menuLeaderboard");
  if (!board) return;

  board.innerHTML = "<h3>🏆 Ranking Global</h3>";

  data.forEach((row, index) => {
    const div = document.createElement("div");
    div.innerHTML = `#${index + 1} ${row.name} - ${row.score}`;
    board.appendChild(div);
  });
}

// ===================== SAVE =====================
async function saveGlobalScore(finalScore) {
  const name = localStorage.getItem("playerName") || "Player";
  const avatar = localStorage.getItem("playerAvatar") || "🙂";

  if (!supabaseClient) return;

  await supabaseClient.from("leaderboard").insert([
    { name, score: finalScore, avatar }
  ]);
}

// ===================== START =====================
window.startGame = function () {
  const name = document.getElementById("playerName").value || "Player";
  const avatar = document.getElementById("playerAvatar").value || "🙂";

  localStorage.setItem("playerName", name);
  localStorage.setItem("playerAvatar", avatar);

  document.getElementById("startScreen").style.display = "none";

  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    loadGameLeaderboard();
    leaderboardInterval = setInterval(loadGameLeaderboard, 5000);
  }

  gameStarted = true;
  score = 0;
  player.hp = 100;
  bullets = [];
  enemies = [];
  powerUp = null;
  powerActive = false;
  nextPowerScore = 600;

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;

  gameLoop();
};

// ===================== UPDATE =====================
function update() {
  if (!gameStarted) return;

  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  if (touch.active) {
    const angle = Math.atan2(touch.y - player.y, touch.x - player.x);
    player.x += Math.cos(angle) * player.speed;
    player.y += Math.sin(angle) * player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height, player.y));

  if (score >= nextPowerScore && !powerUp) {
    spawnPowerUp();
  }

  if (powerUp) {
    const angle = Math.atan2(powerUp.y - player.y, powerUp.x - player.x);

    powerUp.x += Math.cos(angle) * 2;
    powerUp.y += Math.sin(angle) * 2;

    powerUp.x = Math.max(20, Math.min(canvas.width - 20, powerUp.x));
    powerUp.y = Math.max(20, Math.min(canvas.height - 20, powerUp.y));
  }

  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });

  enemies.forEach(e => {
    let target = player;

    if (powerUp && Math.random() < 0.25) {
      target = powerUp;
    }

    const angle = Math.atan2(target.y - e.y, target.x - e.x);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;

    if (Math.hypot(player.x - e.x, player.y - e.y) < player.size) {
      player.hp -= 1;
    }

    if (powerUp && Math.hypot(powerUp.x - e.x, powerUp.y - e.y) < powerUp.size) {
      powerUp.hp -= 1;
    }
  });

  bullets = bullets.filter(b => {
    let hit = false;

    enemies = enemies.filter(e => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        hit = true;
        score += 10;

        if (score > best) {
          best = score;
          localStorage.setItem("bestScore", best);
          document.getElementById("best").innerText = best;
        }

        return false;
      }
      return true;
    });

    return !hit;
  });

  if (powerUp && Math.hypot(player.x - powerUp.x, player.y - powerUp.y) < 30) {
    powerActive = true;
    powerEndTime = Date.now() + 25000;

    explodePowerUp(powerUp.x, powerUp.y);

    powerUp = null;
    nextPowerScore = score + 400;
  }

  if (powerUp && powerUp.hp <= 0) {
    explodePowerUp(powerUp.x, powerUp.y);
    powerUp = null;
    nextPowerScore = score + 400;
  }

  if (powerActive && Date.now() > powerEndTime) {
    powerActive = false;
  }

  // 🟢 CONTADOR VISUAL
  const powerUI = document.getElementById("powerTimer");
  if (powerActive) {
    const seconds = Math.max(0, Math.floor((powerEndTime - Date.now()) / 1000));
    powerUI.innerText = `Power: ${seconds}s`;
    powerUI.style.display = "block";
  } else {
    powerUI.style.display = "none";
  }

  document.getElementById("score").innerText = score;
  document.getElementById("hp").innerText = player.hp;
}

// ===================== DRAW =====================
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (powerActive) {
    ctx.fillStyle = "rgba(0,255,0,0.25)";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size + 12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

  ctx.fillStyle = "red";
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });

  if (powerUp) {
    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===================== LOOP =====================
async function gameLoop() {
  if (!gameStarted) return;

  update();
  draw();

  if (player.hp > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    alert("Game Over | Score: " + score);
    await saveGlobalScore(score);
    location.reload();
  }
}