// game.js - Tabuada Hero (separado, robusto e sem dependências externas)
// Salve ao lado do index.html e styles.css

document.addEventListener("DOMContentLoaded", () => {
  // CONFIGURAÇÕES
  const PROFESSOR_EMAIL = "gabrieli.rizzi.cruz@escola.pr.gov.br";
  const TOTAL_LEVELS = 10;

  // REFERÊNCIAS DOM
  const studentEmailEl = document.getElementById("studentEmail");
  const startLevelEl = document.getElementById("startLevel");
  const perLevelSelect = document.getElementById("perLevelSelect");
  const btnStart = document.getElementById("btnStart");
  const gameArea = document.getElementById("gameArea");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const levelEl = document.getElementById("level");
  const questionText = document.getElementById("questionText");
  const answerInput = document.getElementById("answerInput");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnSkip = document.getElementById("btnSkip");
  const feedbackEl = document.getElementById("feedback");
  const perLevelDisplay = document.getElementById("perLevelDisplay");

  const summary = document.getElementById("summary");
  const summaryText = document.getElementById("summaryText");
  const formStudentEmail = document.getElementById("formStudentEmail");
  const formMessage = document.getElementById("formMessage");
  const emailForm = document.getElementById("emailForm");
  const closeSummary = document.getElementById("closeSummary");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const overlayContinue = document.getElementById("overlayContinue");
  const overlayRestart = document.getElementById("overlayRestart");

  // CANVAS
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 820;
  canvas.height = 260;

  // ESTADO DO JOGO
  let state = {
    running: false,
    paused: false,
    studentEmail: "",
    level: 1,
    questionsPerLevel: parseInt(perLevelSelect.value, 10) || 5,
    score: 0,
    lives: 3,
    qIndex: 0,
    questions: [],
    logsCurrentLevel: [], // strings
    currentQuestion: null
  };

  // personagem
  const hero = { x: 60, y: 200, w: 36, h: 36, vy: 0, onGround: true, color: "#ffaf7b" };
  const gravity = 0.8;
  let keys = {};

  // obstáculos (um por questão)
  let obstacles = [];

  // popula select de níveis (1..TOTAL_LEVELS)
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = i;
    startLevelEl.appendChild(o);
  }

  // mostra valor atual de contas por nível
  perLevelDisplay.textContent = state.questionsPerLevel;
  perLevelSelect.addEventListener("change", () => {
    state.questionsPerLevel = parseInt(perLevelSelect.value, 10);
    perLevelDisplay.textContent = state.questionsPerLevel;
  });

  // utilidades
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function generateQuestionsForLevel(n) {
    // Gera multiplicandos sem repetir se possível (1..10 shuffle)
    const pool = Array.from({ length: 10 }, (_, i) => i + 1);
    // embaralha
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const arr = [];
    for (let i = 0; i < state.questionsPerLevel; i++) {
      const a = pool[i % pool.length]; // repetirá se perguntas > 10
      arr.push({ a: a, b: n, answer: a * n, timeStart: null, timeMs: null, result: null });
    }
    return arr;
  }

  function prepareObstacles() {
    obstacles = [];
    const baseX = 420;
    for (let i = 0; i < state.questionsPerLevel; i++) {
      const x = baseX + i * 80 + randInt(-20, 20);
      obstacles.push({ x: x, y: 230, w: 28, h: 40, passed: false, active: false });
    }
  }

  // iniciar nível
  function startLevel(level) {
    state.level = level;
    state.qIndex = 0;
    state.logsCurrentLevel = [];
    state.questions = generateQuestionsForLevel(level);
    prepareObstacles();
    hero.x = 60; hero.y = 200; hero.vy = 0; hero.onGround = true;
    updateHUD();
    state.running = true;
    state.paused = false;
    nextQuestion();
    hideOverlay();
    // mostrar área do jogo
    document.getElementById("intro")?.classList.add("hidden");
    gameArea.classList.remove("hidden");
    summary.classList.add("hidden");
  }

  // próxima pergunta
  function nextQuestion() {
    if (state.qIndex >= state.questions.length) {
      // concluiu nível
      levelComplete();
      return;
    }
    const q = state.questions[state.qIndex];
    q.timeStart = performance.now();
    state.currentQuestion = q;
    // marcar obstáculo ativo
    obstacles.forEach((ob, idx) => ob.active = (idx === state.qIndex));
    questionText.textContent = `Quanto é ${q.a} × ${q.b}?  (conta ${state.qIndex + 1}/${state.questions.length})`;
    answerInput.value = "";
    feedbackEl.textContent = "";
    // foco no input
    setTimeout(() => answerInput.focus(), 100);
  }

  // submissão da resposta
  function submitAnswer() {
    const q = state.currentQuestion;
    if (!q) return;
    const raw = answerInput.value.trim();
    if (raw === "") { feedbackEl.textContent = "Digite uma resposta."; answerInput.focus(); return; }
    const val = Number(raw);
    q.timeMs = performance.now() - q.timeStart;
    const ok = (val === q.answer);
    q.result = ok;
    const line = `${q.a}×${q.b} = ${val} → ${ok ? "✔" : "✘"} (${Math.round(q.timeMs)} ms)`;
    state.logsCurrentLevel.push(line);

    if (ok) {
      // acerto: pular e marcar obstáculo como passado
      hero.vy = -12; hero.onGround = false;
      const ob = obstacles[state.qIndex]; if (ob) ob.passed = true;
      state.score += 10;
      feedbackEl.textContent = "✅ Correto!";
    } else {
      // erro: perder vida
      state.lives = Math.max(0, state.lives - 1);
      hero.vy = -6; hero.onGround = false;
      feedbackEl.textContent = `❌ Errado — resposta: ${q.answer}`;
    }

    updateHUD();
    state.qIndex++;
    // pequeno delay para animação
    setTimeout(() => {
      if (state.lives <= 0) {
        showOverlay("Game Over", "Você ficou sem vidas. Clique Reiniciar para tentar novamente.", false);
        state.running = false;
        return;
      }
      nextQuestion();
    }, 700);
  }

  function skipQuestion() {
    const q = state.currentQuestion;
    if (!q) return;
    q.timeMs = performance.now() - q.timeStart;
    q.result = false;
    const line = `${q.a}×${q.b} = (pulou) → ✘ (${Math.round(q.timeMs)} ms)`;
    state.logsCurrentLevel.push(line);
    state.lives = Math.max(0, state.lives - 1);
    updateHUD();
    state.qIndex++;
    setTimeout(() => {
      if (state.lives <= 0) {
        showOverlay("Game Over", "Você ficou sem vidas. Clique Reiniciar para tentar novamente.", false);
        state.running = false;
        return;
      }
      nextQuestion();
    }, 400);
  }

  function levelComplete() {
    state.running = false;
    // exibe resumo e prepara envio
    showSummary();
  }

  // HUD
  function updateHUD() {
    scoreEl.textContent = state.score;
    livesEl.textContent = state.lives;
    levelEl.textContent = state.level;
  }

  // OVERLAY helpers
  function showOverlay(title, text, canContinue = true) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    overlayContinue.style.display = canContinue ? "inline-block" : "none";
    state.paused = true;
  }
  function hideOverlay() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    state.paused = false;
  }

  overlayContinue.addEventListener("click", () => { hideOverlay(); });
  overlayRestart.addEventListener("click", () => { window.location.reload(); });

  // RESUMO e ENVIO
  function showSummary() {
    gameArea.classList.add("hidden");
    summary.classList.remove("hidden");
    const acertos = state.logsCurrentLevel.filter(l => l.includes("✔")).length;
    const header = `Relatório — Aluno: ${state.studentEmail}\nNível: ${state.level}\nAcertos: ${acertos}/${state.questions.length}\nScore atual: ${state.score}\n\nDetalhes:\n`;
    const body = state.logsCurrentLevel.join("\n");
    const msg = header + body;
    summaryText.textContent = msg;
    formStudentEmail.value = state.studentEmail || "";
    formMessage.value = msg;
  }

  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const aluno = formStudentEmail.value.trim();
    if (!aluno) { alert("Confirme seu e-mail no formulário."); formStudentEmail.focus(); return; }
    const body = formMessage.value || "";
    const subject = `Relatório Tabuada Hero — ${aluno} — Nível ${state.level}`;
    const mailto = `mailto:${PROFESSOR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // abre cliente de e-mail
    window.location.href = mailto;

    // após abrir, avançar para o próximo nível automaticamente (pequeno delay)
    setTimeout(() => {
      if (state.level < TOTAL_LEVELS) {
        state.level++;
        // mantém score e vidas
        startLevel(state.level);
      } else {
        showOverlay("Parabéns!", "Você concluiu todas as tabuadas. Reinicie para jogar novamente.", false);
      }
    }, 600);
  });

  closeSummary.addEventListener("click", () => {
    // volta ao jogo sem enviar
    summary.classList.add("hidden");
    if (state.level <= TOTAL_LEVELS) {
      startLevel(state.level); // reinicia o mesmo nível com novas perguntas
    }
  });

  // CONTROLES teclado (movimento e pausa)
  window.addEventListener("keydown", (e) => {
    const k = e.key;
    keys[k] = true;
    if (k.toLowerCase() === "p") {
      if (!state.paused) showOverlay("Pausado", "Jogo pausado. Pressione Continuar para retornar.", true);
      else hideOverlay();
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  // botões UI
  btnStart.addEventListener("click", () => {
    const email = studentEmailEl.value.trim();
    if (!email) { alert("Digite seu e-mail antes de iniciar."); studentEmailEl.focus(); return; }
    state.studentEmail = email;
    state.score = 0;
    state.lives = 3;
    state.level = parseInt(startLevelEl.value, 10) || 1;
    state.questionsPerLevel = parseInt(perLevelSelect.value, 10);
    perLevelDisplay.textContent = state.questionsPerLevel;
    startLevel(state.level);
    requestAnimationFrame(gameLoop);
  });

  btnSubmit.addEventListener("click", submitAnswer);
  btnSkip.addEventListener("click", skipQuestion);
  answerInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitAnswer(); });

  // FÍSICA / RENDER loop
  function updatePhysics() {
    // controles horizontais
    if (keys["ArrowLeft"] || keys["a"]) { hero.x -= 4; if (hero.x < 10) hero.x = 10; }
    if (keys["ArrowRight"] || keys["d"]) { hero.x += 4; if (hero.x > canvas.width - hero.w - 10) hero.x = canvas.width - hero.w - 10; }
    if ((keys["ArrowUp"] || keys["w"] || keys[" "]) && hero.onGround) { hero.vy = -12; hero.onGround = false; }
    // gravidade
    if (!hero.onGround) {
      hero.vy += gravity;
      hero.y += hero.vy;
      if (hero.y >= 200) { hero.y = 200; hero.vy = 0; hero.onGround = true; }
    }

    // mover obstáculos
    obstacles.forEach((ob, idx) => {
      ob.x -= 2; // velocidade
      // colisão simples quando obstáculo ativo e não passado
      if (ob.active && !ob.passed) {
        if (hero.x + hero.w > ob.x && hero.x < ob.x + ob.w) {
          // se hero está alto suficiente (pulando), considera passado
          if (hero.y < ob.y - ob.h - 6) {
            ob.passed = true;
          } else {
            // choque: perder vida
            ob.passed = true; // evita repetição
            state.lives = Math.max(0, state.lives - 1);
            hero.vy = -6; hero.onGround = false;
            updateHUD();
          }
        }
      }
      // reciclar obstáculo se saiu da tela (mantém ordem)
      if (ob.x < -80) {
        ob.x += 80 * state.questionsPerLevel + randInt(0, 40);
        ob.passed = false;
        ob.active = false;
      }
    });
  }

  function render() {
    // background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#bfe9d8"); sky.addColorStop(1, "#e0f7fa");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ground
    ctx.fillStyle = "#6b8e23";
    ctx.fillRect(0, 230, canvas.width, 30);

    // obstacles
    obstacles.forEach(ob => {
      ctx.fillStyle = ob.passed ? "#9ee2b7" : (ob.active ? "#333" : "#4b5563");
      ctx.fillRect(ob.x, ob.y - ob.h, ob.w, ob.h);
      // decor
      ctx.fillStyle = "#7fd08a";
      ctx.fillRect(ob.x + ob.w / 2 - 2, ob.y - ob.h - 6, 4, 6);
    });

    // hero (quadrado fofo)
    ctx.fillStyle = hero.color;
    roundRect(ctx, hero.x, hero.y - hero.h, hero.w, hero.h, 6, true, false);
    // olhos
    ctx.fillStyle = "#222";
    ctx.fillRect(hero.x + 8, hero.y - hero.h + 8, 6, 6);
    ctx.fillRect(hero.x + hero.w - 14, hero.y - hero.h + 8, 6, 6);
    // sorriso
    ctx.strokeStyle = "#7a3f00"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hero.x + hero.w / 2, hero.y - 10, 8, 0, Math.PI);
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (r === undefined) r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // loop principal
  let lastTime = 0;
  function gameLoop(time = 0) {
    if (!state.running) return;
    const dt = time - lastTime;
    lastTime = time;
    if (!state.paused) {
      updatePhysics();
      render();
    }
    requestAnimationFrame(gameLoop);
  }

  // Atalhos / extras
  window.addEventListener("keydown", (e) => {
    // S para pular pergunta (atalho)
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      skipQuestion();
    }
  });

  // Inicial: configura o comportamento dos botões
  btnSubmit.addEventListener("click", submitAnswer);
  btnSkip.addEventListener("click", skipQuestion);
  answerInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitAnswer(); });

  // Segurança: evita modal aparecer sem motivo (overlay escondido por padrão no HTML/CSS)
  hideOverlay();

  // fim DOMContentLoaded
});
