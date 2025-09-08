document.addEventListener("DOMContentLoaded", () => {
  const PROFESSOR_EMAIL = "gabrieli.rizzi.cruz@escola.pr.gov.br";
  const TOTAL_LEVELS = 10;

  // DOM
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

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 820;
  canvas.height = 260;

  let state = {
    studentEmail: "",
    level: 1,
    questionsPerLevel: 5,
    score: 0,
    lives: 3,
    qIndex: 0,
    questions: [],
    logs: [],
    currentQuestion: null
  };

  const hero = { x: 60, y: 200, w: 36, h: 36, vy: 0, onGround: true };
  const gravity = 0.8;

  // montar opções de nível
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = i;
    startLevelEl.appendChild(o);
  }

  perLevelSelect.addEventListener("change", () => {
    state.questionsPerLevel = parseInt(perLevelSelect.value, 10);
    perLevelDisplay.textContent = state.questionsPerLevel;
  });

  function generateQuestionsForLevel(n) {
    const pool = Array.from({ length: 10 }, (_, i) => i + 1);
    const arr = [];
    for (let i = 0; i < state.questionsPerLevel; i++) {
      const a = pool[i % pool.length];
      arr.push({ a: a, b: n, answer: a * n });
    }
    return arr;
  }

  function startLevel(level) {
    state.level = level;
    state.qIndex = 0;
    state.questions = generateQuestionsForLevel(level);
    state.logs = [];
    hero.x = 60; hero.y = 200; hero.vy = 0; hero.onGround = true;
    updateHUD();
    nextQuestion();
    document.getElementById("intro").classList.add("hidden");
    gameArea.classList.remove("hidden");
    summary.classList.add("hidden");
  }

  function nextQuestion() {
    if (state.qIndex >= state.questions.length) {
      showSummary();
      return;
    }
    const q = state.questions[state.qIndex];
    state.currentQuestion = q;
    questionText.textContent = `Quanto é ${q.a} × ${q.b}? (${state.qIndex + 1}/${state.questions.length})`;
    answerInput.value = "";
    feedbackEl.textContent = "";
    answerInput.focus();
  }

  function submitAnswer() {
    const q = state.currentQuestion;
    if (!q) return;
    const val = Number(answerInput.value.trim());
    const ok = (val === q.answer);
    state.logs.push(`${q.a}×${q.b} = ${val} → ${ok ? "✔" : "✘"}`);
    if (ok) {
      hero.vy = -12;
      state.score += 10;
      feedbackEl.textContent = "✅ Correto!";
    } else {
      state.lives = Math.max(0, state.lives - 1);
      feedbackEl.textContent = `❌ Errado — resposta: ${q.answer}`;
    }
    updateHUD();
    state.qIndex++;
    if (state.lives <= 0) {
      alert("Game Over! Você ficou sem vidas.");
      window.location.reload();
      return;
    }
    setTimeout(nextQuestion, 600);
  }

  function skipQuestion() {
    const q = state.currentQuestion;
    if (!q) return;
    state.logs.push(`${q.a}×${q.b} = (pulou) → ✘`);
    state.lives = Math.max(0, state.lives - 1);
    updateHUD();
    state.qIndex++;
    if (state.lives <= 0) {
      alert("Game Over! Você ficou sem vidas.");
      window.location.reload();
      return;
    }
    nextQuestion();
  }

  function updateHUD() {
    scoreEl.textContent = state.score;
    livesEl.textContent = state.lives;
    levelEl.textContent = state.level;
  }

  function showSummary() {
    gameArea.classList.add("hidden");
    summary.classList.remove("hidden");
    const acertos = state.logs.filter(l => l.includes("✔")).length;
    const resumo = [
      `Aluno: ${state.studentEmail}`,
      `Nível: ${state.level}`,
      `Acertos: ${acertos}/${state.questions.length}`,
      ``,
      ...state.logs
    ].join("\n");
    summaryText.textContent = resumo;
    formStudentEmail.value = state.studentEmail;
    formMessage.value = resumo;
  }

  // email via mailto
  emailForm.addEventListener("submit", e => {
    e.preventDefault();
    const alunoEmail = formStudentEmail.value.trim();
    const corpo = encodeURIComponent(formMessage.value);
    const assunto = encodeURIComponent(`Relatório Tabuada - ${alunoEmail}`);
    const mailto = `mailto:${PROFESSOR_EMAIL}?subject=${assunto}&body=${corpo}`;
    window.location.href = mailto;
  });

  closeSummary.addEventListener("click", () => {
    summary.classList.add("hidden");
    document.getElementById("intro").classList.remove("hidden");
  });

  // eventos
  btnStart.addEventListener("click", () => {
    const email = studentEmailEl.value.trim();
    if (!email) { alert("Digite seu e-mail."); return; }
    state.studentEmail = email;
    const lvl = parseInt(startLevelEl.value, 10);
    state.questionsPerLevel = parseInt(perLevelSelect.value, 10);
    startLevel(lvl);
  });
  btnSubmit.addEventListener("click", submitAnswer);
  btnSkip.addEventListener("click", skipQuestion);

  // animação simples (bichinho pulando)
  function loop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#8ee3f5";
    ctx.fillRect(0,220,canvas.width,40);

    hero.vy += gravity;
    hero.y += hero.vy;
    if (hero.y > 200) { hero.y = 200; hero.vy = 0; hero.onGround = true; }

    ctx.fillStyle = "#ffaf7b";
    ctx.fillRect(hero.x, hero.y, hero.w, hero.h);

    requestAnimationFrame(loop);
  }
  loop();
});
