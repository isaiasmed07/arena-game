const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===================== SPRITE =====================
const playerImage = new Image();
playerImage.src = "./assets/player.png"; // ⚠️ IMPORTANTE: ruta relativa correcta

let spriteLoaded = false;
playerImage.onload = () => {
  spriteLoaded = true;
};
playerImage.onerror = () => {
  console.warn("⚠️ Sprite no encontrado, usando fallback");
};

// tamaño de frame
const FRAME_SIZE = 512;

// dirección
let playerDir = "down";

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

// 🏆 BEST
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

// ===================== INPUT =====================
document.addEventListener("keydown", e => {
  if (!e.key) return;
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", e => {
  if (!e.key) return;
  keys[e.key.toLowerCase()] = false;
});

// click
canvas.addEventListener("click", e => {
  if (!gameStarted) return;
  shoot(e.clientX, e.clientY);
});

// ===================== PLAYER =====================
let player = {
  x: 0,
  y: 0,
  size: 30,
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

// ===================== POWER =====================
function spawnPowerUp() {
  powerUp = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 15,
    hp: 50
  };
}

function explodePowerUp(x, y) {
  enemies = enemies.filter(e =>
    Math.hypot(e.x - x, e.y - y) > 120
  );
}

// ===================== LEADERBOARD =====================
async function loadMenuLeaderboard() {
  try {
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

  } catch (err) {
    console.warn("Leaderboard error:", err);
  }
}

// ===================== START =====================
window.startGame = function () {

  // guardar usuario
  const name = document.getElementById("playerName").value || "Player";
  const avatar = document.getElementById("playerAvatar").value || "🙂";

  localStorage.setItem("playerName", name);
  localStorage.setItem("playerAvatar", avatar);

  document.getElementById("startScreen").style.display = "none";

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

  // movimiento
  if (keys["w"]) { player.y -= player.speed; playerDir = "up"; }
  if (keys["s"]) { player.y += player.speed; playerDir = "down"; }
  if (keys["a"]) { player.x -= player.speed; playerDir = "left"; }
  if (keys["d"]) { player.x += player.speed; playerDir = "right"; }

  // límites
  player.x = Math.max(0, Math.min(canvas.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height, player.y));

  // spawn power
  if (score >= nextPowerScore && !powerUp) {
    spawnPowerUp();
  }

  // bullets
  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });

  // enemigos
  enemies.forEach(e => {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;

    if (Math.hypot(player.x - e.x, player.y - e.y) < player.size) {
      player.hp -= 1;
    }
  });

  // colisiones
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

  // recoger power
  if (powerUp && Math.hypot(player.x - powerUp.x, player.y - powerUp.y) < 30) {
    powerActive = true;
    powerEndTime = Date.now() + 25000;

    explodePowerUp(powerUp.x, powerUp.y);
    powerUp = null;
    nextPowerScore = score + 400;
  }

  // fin power
  if (powerActive && Date.now() > powerEndTime) {
    powerActive = false;
  }

  // 🟢 UI POWER
  const powerUI = document.getElementById("powerUI");

  if (powerActive) {
    const seconds = Math.max(0, Math.floor((powerEndTime - Date.now()) / 1000));

    powerUI.innerText = `⚡ Power: ${seconds}s`;
    powerUI.style.display = "block";

    if (seconds <= 5) {
      powerUI.classList.add("danger");
    } else {
      powerUI.classList.remove("danger");
    }

  } else {
    powerUI.style.display = "none";
    powerUI.classList.remove("danger");
  }

  document.getElementById("score").innerText = score;
  document.getElementById("hp").innerText = player.hp;
}

// ===================== DRAW =====================
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // aura
  if (powerActive) {
    ctx.fillStyle = "rgba(0,255,0,0.25)";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size + 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 🎮 SPRITE o fallback
  if (spriteLoaded) {
    let sx = 0, sy = 0;

    if (playerDir === "down") { sx = 0; sy = 0; }
    if (playerDir === "up") { sx = FRAME_SIZE; sy = 0; }
    if (playerDir === "left") { sx = 0; sy = FRAME_SIZE; }
    if (playerDir === "right") { sx = FRAME_SIZE; sy = FRAME_SIZE; }

    ctx.drawImage(
      playerImage,
      sx, sy, FRAME_SIZE, FRAME_SIZE,
      player.x - player.size,
      player.y - player.size,
      player.size * 2,
      player.size * 2
    );
  } else {
    // fallback círculo
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // balas
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

  // enemigos
  ctx.fillStyle = "red";
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // power
  if (powerUp) {
    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===================== LOOP =====================
function gameLoop() {
  if (!gameStarted) return;

  update();
  draw();

  if (player.hp > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    alert("Game Over | Score: " + score);
    location.reload();
  }
}