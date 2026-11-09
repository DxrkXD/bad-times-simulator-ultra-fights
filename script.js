const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const bossSelect = document.getElementById('bossSelect');
const bossNameEl = document.getElementById('bossName');
const bossDescriptionEl = document.getElementById('bossDescription');
const bossHpFill = document.getElementById('bossHpFill');
const statusText = document.getElementById('statusText');

const arena = {
  left: 80,
  top: 60,
  width: 460,
  height: 400,
};

const bosses = [
  {
    name: 'Ultra Sans',
    color: '#9bff8b',
    hp: 220,
    description: 'A cosmic, impossible version of the judge of the underground. He always sees the next move before you make it.',
  },
  {
    name: 'Papyrus',
    color: '#f7d563',
    hp: 200,
    description: 'The steadfast skeleton who turns determination into an unhinged wall of homemade attack patterns.',
  },
  {
    name: 'Gaster',
    color: '#9d7dff',
    hp: 260,
    description: 'A forgotten, distorting force of the void, bending reality with strange geometry and impossible angles.',
  },
  {
    name: 'Asgore',
    color: '#ff7f50',
    hp: 230,
    description: 'The king of the underground swings with heavy, relentless power and a thunderous final shield.',
  },
];

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const player = {
  x: 180,
  y: canvas.height / 2,
  size: 16,
  speed: 260,
  invuln: 0,
  hp: 20,
};

let game = {
  running: false,
  phase: 0,
  lastTime: 0,
  elapsed: 0,
  attackTimer: 0,
  bossIndex: 0,
  boss: null,
  bullets: [],
  bones: [],
  sparkles: [],
  playerHitFlash: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateBossInfo(index) {
  const boss = bosses[index];
  bossNameEl.textContent = boss.name;
  bossDescriptionEl.textContent = boss.description;
  bossHpFill.style.width = '100%';
}

function resetGame() {
  const boss = bosses[game.bossIndex];
  game.running = true;
  game.phase = 0;
  game.elapsed = 0;
  game.attackTimer = 0;
  game.bullets = [];
  game.bones = [];
  game.sparkles = [];
  game.playerHitFlash = 0;
  player.invuln = 0;
  player.x = 180;
  player.y = canvas.height / 2;
  player.hp = 20;
  game.boss = { ...boss, currentHp: boss.hp, x: canvas.width - 170, y: canvas.height / 2 };
  statusText.textContent = `${boss.name} attacks!`;
  bossHpFill.style.width = '100%';
}

function switchBoss(index) {
  game.bossIndex = Number(index);
  updateBossInfo(game.bossIndex);
  if (game.running) resetGame();
}

function spawnBurst(cx, cy, color, count = 16, speed = 200) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const vel = speed * (0.7 + Math.random() * 0.8);
    game.bullets.push({
      x: cx,
      y: cy,
      r: 6,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel,
      color,
    });
  }
}

function spawnRain() {
  const boss = game.boss;
  for (let i = 0; i < 16; i += 1) {
    const x = 80 + Math.random() * 440;
    const speed = 180 + Math.random() * 120;
    game.bullets.push({
      x,
      y: -20,
      r: 7,
      vx: 0,
      vy: speed,
      color: boss.color,
    });
  }
}

function spawnSpiral() {
  const boss = game.boss;
  const total = 18;
  for (let i = 0; i < total; i += 1) {
    const angle = (Math.PI * 2 * i) / total + game.elapsed * 0.018;
    const speed = 130;
    game.bullets.push({
      x: boss.x,
      y: boss.y,
      r: 7,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: boss.color,
    });
  }
}

function spawnArcs() {
  const boss = game.boss;
  const base = Math.PI * 0.5;
  for (let i = 0; i < 14; i += 1) {
    const angle = base + (Math.PI * i) / 7 + game.elapsed * 0.006;
    const speed = 340;
    game.bullets.push({
      x: boss.x,
      y: boss.y,
      r: 7,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: boss.color,
    });
  }
}

function spawnBones() {
  const boss = game.boss;
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const y = 70 + i * 55;
    game.bones.push({
      x: boss.x - 210 + i * 12,
      y,
      w: 120,
      h: 12,
      vx: -190,
      vy: 0,
      color: boss.color,
    });
  }
}

function triggerAttackPattern() {
  if (!game.running) return;

  const pattern = Math.floor(game.elapsed / 2.8) % 4;
  if (pattern === 0) spawnRain();
  if (pattern === 1) spawnSpiral();
  if (pattern === 2) spawnArcs();
  if (pattern === 3) spawnBones();

  const boss = bosses[game.bossIndex];
  statusText.textContent = `${boss.name} uses ${['Rain', 'Spiral', 'Arc', 'Bones'][pattern]}!`;
}

function handlePlayerInput(delta) {
  let dx = 0;
  let dy = 0;

  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  const length = Math.hypot(dx, dy) || 1;
  player.x += (dx / length) * player.speed * delta;
  player.y += (dy / length) * player.speed * delta;

  player.x = clamp(player.x, arena.left + 18, arena.left + arena.width - 18);
  player.y = clamp(player.y, arena.top + 18, arena.top + arena.height - 18);
}

function hitPlayer(damage) {
  if (player.invuln > 0) return;

  player.invuln = 0.8;
  player.hp -= damage;
  game.playerHitFlash = 0.2;

  if (player.hp <= 0) {
    game.running = false;
    statusText.textContent = 'You Died';
    spawnBurst(player.x, player.y, '#ff4f72', 30, 260);
  }
}

function updateBullets(delta) {
  const newBullets = [];
  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;

    const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
    if (dist < bullet.r + player.size / 2) {
      hitPlayer(1);
      continue;
    }

    if (
      bullet.x < -40 ||
      bullet.x > canvas.width + 40 ||
      bullet.y < -40 ||
      bullet.y > canvas.height + 40
    ) {
      continue;
    }

    newBullets.push(bullet);
  }
  game.bullets = newBullets;
}

function updateBones(delta) {
  const newBones = [];
  for (const bone of game.bones) {
    bone.x += bone.vx * delta;
    const playerRect = {
      x: player.x - player.size / 2,
      y: player.y - player.size / 2,
      w: player.size,
      h: player.size,
    };
    const boneRect = { x: bone.x, y: bone.y, w: bone.w, h: bone.h };

    const overlap =
      playerRect.x < boneRect.x + boneRect.w &&
      playerRect.x + playerRect.w > boneRect.x &&
      playerRect.y < boneRect.y + boneRect.h &&
      playerRect.y + playerRect.h > boneRect.y;

    if (overlap) {
      hitPlayer(2);
    }

    if (bone.x + bone.w > -30 && bone.x < canvas.width + 60) {
      newBones.push(bone);
    }
  }
  game.bones = newBones;
}

function updateSparkles(delta) {
  game.sparkles = game.sparkles.filter((spark) => {
    spark.life -= delta;
    spark.x += spark.vx * delta;
    spark.y += spark.vy * delta;
    return spark.life > 0;
  });
}

function damageBoss() {
  if (!game.running) return;

  const boss = game.boss;
  boss.currentHp -= 1;
  bossHpFill.style.width = `${(boss.currentHp / bosses[game.bossIndex].hp) * 100}%`;

  game.sparkles.push({
    x: boss.x,
    y: boss.y,
    vx: (Math.random() - 0.5) * 80,
    vy: (Math.random() - 0.5) * 80,
    life: 0.5,
    color: boss.color,
  });

  if (boss.currentHp <= 0) {
    game.running = false;
    statusText.textContent = `${boss.name} is down!`;
    spawnBurst(boss.x, boss.y, boss.color, 30, 260);
  }
}

function updateBoss(delta) {
  if (!game.running) return;

  game.elapsed += delta;
  game.attackTimer += delta;
  player.invuln = Math.max(0, player.invuln - delta);
  game.playerHitFlash = Math.max(0, game.playerHitFlash - delta);

  if (game.attackTimer >= 2.3) {
    game.attackTimer = 0;
    triggerAttackPattern();
  }

  const boss = game.boss;
  boss.x += Math.sin(game.elapsed * 1.7) * 15 * delta;
  boss.y += Math.cos(game.elapsed * 2.1) * 10 * delta;

  if (Math.random() < 0.035) {
    game.sparkles.push({
      x: boss.x + (Math.random() - 0.5) * 60,
      y: boss.y + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 160,
      vy: (Math.random() - 0.5) * 160,
      life: 0.6,
      color: boss.color,
    });
  }

  if (Math.random() < 0.085) {
    damageBoss();
  }
}

function drawArena() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#120d1e');
  gradient.addColorStop(1, '#0a0b12');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(arena.left, arena.top, arena.width, arena.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(0, arena.top + 60);
  ctx.lineTo(canvas.width, arena.top + 60);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(arena.left, arena.top, arena.width, arena.height);
}

function drawBoss() {
  const boss = game.boss;
  if (!boss) return;

  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.fillStyle = boss.color;
  ctx.shadowBlur = 18;
  ctx.shadowColor = boss.color;

  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.fillRect(-18, -10, 12, 12);
  ctx.fillRect(6, -10, 12, 12);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-12, -7, 4, 4);
  ctx.fillRect(12, -7, 4, 4);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 12, 10, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const glow = player.invuln > 0 ? '#fff' : '#6ae9ff';
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = glow;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (player.invuln > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets() {
  for (const bullet of game.bullets) {
    ctx.save();
    ctx.fillStyle = bullet.color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBones() {
  for (const bone of game.bones) {
    ctx.fillStyle = game.boss.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = game.boss.color;
    ctx.fillRect(bone.x, bone.y, bone.w, bone.h);
  }
}

function drawSparkles() {
  for (const spark of game.sparkles) {
    ctx.fillStyle = spark.color;
    ctx.globalAlpha = Math.max(0, spark.life * 1.2);
    ctx.fillRect(spark.x, spark.y, 4, 4);
    ctx.globalAlpha = 1;
  }
}

function drawHud() {
  const boss = game.boss;
  if (!boss) return;

  ctx.fillStyle = '#eaf3ff';
  ctx.font = '18px sans-serif';
  ctx.fillText(`${boss.name} HP`, 20, 30);

  const barX = 20;
  const barY = 38;
  const barW = 250;
  const barH = 18;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(barX, barY, barW, barH);
  const fillW = barW * (boss.currentHp / bosses[game.bossIndex].hp);
  ctx.fillStyle = '#ff536d';
  ctx.fillRect(barX, barY, fillW, barH);

  ctx.fillText(`Soul HP: ${player.hp}`, 20, canvas.height - 22);
  ctx.fillStyle = '#fff';
}

function render() {
  drawArena();
  drawBoss();
  drawBones();
  drawBullets();
  drawPlayer();
  drawSparkles();
  drawHud();

  if (game.playerHitFlash > 0) {
    ctx.fillStyle = `rgba(255, 80, 100, ${game.playerHitFlash * 0.8})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function tick(timestamp) {
  if (!game.lastTime) game.lastTime = timestamp;
  const delta = (timestamp - game.lastTime) / 1000;
  game.lastTime = timestamp;

  if (game.running) {
    handlePlayerInput(delta);
    updateBoss(delta);
    updateBullets(delta);
    updateBones(delta);
    updateSparkles(delta);
  }

  render();
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') input.left = true;
  if (key === 'arrowright' || key === 'd') input.right = true;
  if (key === 'arrowup' || key === 'w') input.up = true;
  if (key === 'arrowdown' || key === 's') input.down = true;
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') input.left = false;
  if (key === 'arrowright' || key === 'd') input.right = false;
  if (key === 'arrowup' || key === 'w') input.up = false;
  if (key === 'arrowdown' || key === 's') input.down = false;
});

startBtn.addEventListener('click', () => {
  resetGame();
});

bossSelect.addEventListener('change', (event) => {
  switchBoss(event.target.value);
});

updateBossInfo(game.bossIndex);
resetGame();
requestAnimationFrame(tick);

