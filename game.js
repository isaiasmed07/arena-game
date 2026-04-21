const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===================== SUPABASE =====================
const SUPABASE_URL = "https://mujgrjmwfeflvbutmbts.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Aw1vjP0NJ7IOF03qPc39Q_nME8oMMK";

let supabaseClient = null;

// ===================== ESTADO =====================
let gameStarted = false;

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

  bullets.push({
    x: player.x,
    y: player.y,
    dx: Math.cos(angle) * 6,
    dy: Math.sin(angle) * 6
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

// ===================== SUPABASE SAVE =====================
async function saveGlobalScore(finalScore) {
  const name = localStorage.getItem("playerName") || "Player";

  if (!supabaseClient) return;

  const { error } = await supabaseClient.from("leaderboard").insert([
    {
      name: name,
      score: finalScore
    }
  ]);

  if (error) {
    console.log("Error guardando score:", error.message);
  }
}

// ===================== START GAME =====================
window.startGame = function () {
  const name = document.getElementById("playerName").value || "Player";
  const avatar = document.getElementById("playerAvatar").value || "🙂";

  localStorage.setItem("playerName", name);
  localStorage.setItem("playerAvatar", avatar);

  document.getElementById("startScreen").style.display = "none";

  // ⚡ Supabase seguro (evita crash si CDN no carga aún)
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn("Supabase aún no disponible, leaderboard desactivado temporalmente");
  }

  // reset juego
  gameStarted = true;
  score = 0;
  player.hp = 100;
  bullets = [];
  enemies = [];

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

  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });

  enemies.forEach(e => {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;

    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist < player.size) {
      player.hp -= 1;
    }
  });

  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      const dist = Math.hypot(b.x - e.x, b.y - e.y);

      if (dist < e.size) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        score += 10;

        if (score > best) {
          best = score;
          localStorage.setItem("bestScore", best);
          document.getElementById("best").innerText = best;
        }
      }
    });
  });

  document.getElementById("score").innerText = score;
  document.getElementById("hp").innerText = player.hp;
}

// ===================== DRAW =====================
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    if (score > best) {
      localStorage.setItem("bestScore", score);
    }

    location.reload();
  }
}