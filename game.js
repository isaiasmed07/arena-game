const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 📱 Resize responsive
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// 👆 Controles
let keys = {};
let touch = { x: 0, y: 0, active: false };

// 🏆 BEST SCORE (localStorage)
let best = localStorage.getItem("bestScore") || 0;
document.getElementById("best").innerText = best;

// teclado (PC)
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// touch (móvil)
canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  touch.x = t.clientX;
  touch.y = t.clientY;
  touch.active = true;

  shoot(t.clientX, t.clientY);
});

canvas.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  touch.x = t.clientX;
  touch.y = t.clientY;
});

canvas.addEventListener("touchend", () => {
  touch.active = false;
});

// 🔫 PC click shoot
canvas.addEventListener("click", e => {
  shoot(e.clientX, e.clientY);
});

// ---------------- GAME DATA ----------------
let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  speed: 4,
  hp: 100
};

let bullets = [];
let enemies = [];
let score = 0;

// 🔫 disparo
function shoot(x, y) {
  const angle = Math.atan2(y - player.y, x - player.x);

  bullets.push({
    x: player.x,
    y: player.y,
    dx: Math.cos(angle) * 6,
    dy: Math.sin(angle) * 6
  });
}

// 👾 enemigos
function spawnEnemy() {
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

// ---------------- UPDATE ----------------
function update() {
  // 🧠 movimiento PC
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // 📱 movimiento móvil (hacia el dedo)
  if (touch.active) {
    const angle = Math.atan2(touch.y - player.y, touch.x - player.x);
    player.x += Math.cos(angle) * player.speed;
    player.y += Math.sin(angle) * player.speed;
  }

  // 🔫 balas
  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });

  // 👾 enemigos
  enemies.forEach(e => {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;

    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist < player.size) {
      player.hp -= 1;
    }
  });

  // 💥 colisiones
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      const dist = Math.hypot(b.x - e.x, b.y - e.y);

      if (dist < e.size) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        score += 10;

        // 🏆 actualizar best score en tiempo real
        if (score > best) {
          best = score;
          localStorage.setItem("bestScore", best);
          document.getElementById("best").innerText = best;
        }
      }
    });
  });

  // UI
  document.getElementById("score").innerText = score;
  document.getElementById("hp").innerText = player.hp;
}

// ---------------- DRAW ----------------
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 👤 jugador
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  // 🔫 balas
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, 5, 5);
  });

  // 👾 enemigos
  ctx.fillStyle = "red";
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------------- LOOP ----------------
function gameLoop() {
  update();
  draw();

  if (player.hp > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    alert("Game Over | Score: " + score);

    // 🏆 guardar récord final
    if (score > best) {
      localStorage.setItem("bestScore", score);
    }

    location.reload();
  }
}

gameLoop();