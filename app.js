(() => {
  "use strict";
  const TOTAL_MINUTES = 60;
  const $ = (id) => document.getElementById(id);
  const screens = { start: $("start-screen"), quiz: $("quiz-screen"), result: $("result-screen") };
  let bank = null, sessionQuestions = [], index = 0, answers = [], student = null;
  let startedAt = 0, deadline = 0, timerId = null, finished = false;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  async function loadBank() {
    const response = await fetch("./questions.json");
    if (!response.ok) throw new Error("Tidak dapat memuat data soal.");
    bank = await response.json();
    if (bank.multipleChoice.length !== 40 || bank.essay.length !== 5) {
      throw new Error("Bank soal harus berisi 40 pilihan ganda dan 5 esai.");
    }
  }

  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function prepareSession() {
    const pg = shuffle(bank.multipleChoice).map(q => {
      const options = shuffle(Object.entries(q.options).map(([key, text]) => ({
        text, correct: key === q.answer
      })));
      return { ...q, shuffledOptions: options, sessionType: "pg" };
    });
    const essay = shuffle(bank.essay).map(q => ({ ...q, sessionType: "essay" }));
    sessionQuestions = shuffle([...pg, ...essay]);
    answers = Array(sessionQuestions.length).fill(null);
    index = 0;
    finished = false;
    startedAt = Date.now();
    deadline = startedAt + TOTAL_MINUTES * 60 * 1000;
  }

  function showScreen(which) {
    Object.values(screens).forEach(el => el.classList.add("d-none"));
    screens[which].classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startTimer() {
    clearInterval(timerId);
    updateTimer();
    timerId = setInterval(updateTimer, 250);
  }

  function updateTimer() {
    if (finished) return;
    const remaining = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    $("timer").textContent = `${mm}:${ss}`;
    $("timer").parentElement.classList.toggle("urgent", remaining <= 5 * 60 * 1000);
    if (remaining <= 0) finishAssessment(true);
  }

  function renderQuestion() {
    if (finished) return;
    const q = sessionQuestions[index];
    const answered = answers.filter(Boolean).length;
    $("progress-text").textContent = `Soal ${index + 1} dari ${sessionQuestions.length}`;
    $("answered-text").textContent = `Terjawab ${answered} dari ${sessionQuestions.length}`;
    $("progress-bar").style.width = `${(answered / sessionQuestions.length) * 100}%`;
    $("progress-wrap").setAttribute("aria-valuenow", String(answered));
    $("question-type").textContent = q.sessionType === "pg" ? "PILIHAN GANDA" : "ESAI";
    $("difficulty-chip").textContent = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
    $("question-text").textContent = q.question;
    $("feedback-panel").className = "feedback-panel d-none mt-4";
    $("feedback-panel").innerHTML = "";
    $("next-btn").disabled = true;
    $("next-btn").textContent = index === sessionQuestions.length - 1 ? "Lihat Hasil →" : "Soal berikutnya →";
    $("lock-note").textContent = q.sessionType === "pg" ? "Pilih satu jawaban untuk melanjutkan." : "Kirim jawaban untuk mengunci soal ini.";
    $("options-container").innerHTML = "";
    $("options-container").classList.toggle("d-none", q.sessionType !== "pg");
    $("essay-container").classList.toggle("d-none", q.sessionType !== "essay");
    $("essay-answer").value = "";
    $("char-count").textContent = "0/3000";
    $("submit-essay").disabled = false;

    if (q.sessionType === "pg") {
      q.shuffledOptions.forEach((option, optIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-btn";
        button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + optIndex)}</span><span>${escapeHtml(option.text)}</span>`;
        button.addEventListener("click", () => submitChoice(optIndex));
        $("options-container").appendChild(button);
      });
    }
  }

  function submitChoice(optIndex) {
    if (finished || answers[index] !== null) return;
    const q = sessionQuestions[index];
    const option = q.shuffledOptions[optIndex];
    answers[index] = { type:"pg", correct:option.correct, selected:option.text, correctAnswer:q.shuffledOptions.find(o => o.correct).text };
    const buttons = [...$("options-container").querySelectorAll("button")];
    buttons.forEach((button, i) => {
      button.disabled = true;
      if (q.shuffledOptions[i].correct) button.classList.add("correct");
      if (i === optIndex && !option.correct) button.classList.add("incorrect");
    });
    const panel = $("feedback-panel");
    panel.classList.remove("d-none");
    if (option.correct) {
      panel.classList.add("good");
      panel.innerHTML = `<div class="feedback-heading">😊 GOOD JOB!</div><div>Jawabanmu benar.</div><p class="mb-0 mt-2">${escapeHtml(q.explanation)}</p>`;
    } else {
      panel.classList.add("bad");
      panel.innerHTML = `<div class="feedback-heading">😢 Belum tepat</div><div><strong>Jawaban yang benar:</strong> ${escapeHtml(optionText(q, option.correct))}</div><p class="mb-0 mt-2">${escapeHtml(q.explanation)}</p>`;
    }
    $("lock-note").textContent = "Jawaban terkunci.";
    $("next-btn").disabled = false;
    updateProgress();
  }

  function optionText(q, selected) {
    const correct = q.shuffledOptions.find(o => o.correct);
    return correct ? correct.text : selected.text;
  }

  function updateProgress() {
    const answered = answers.filter(Boolean).length;
    $("answered-text").textContent = `Terjawab ${answered} dari ${sessionQuestions.length}`;
    $("progress-bar").style.width = `${(answered / sessionQuestions.length) * 100}%`;
    $("progress-wrap").setAttribute("aria-valuenow", String(answered));
  }

  function gradeEssay(q, text) {
    const normalized = text.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = q.keywords || [];
    const matched = keywords.filter(k => normalized.includes(k.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    const ratio = keywords.length ? matched.length / keywords.length : 0;
    let score = Math.round(ratio * 4);
    if (text.trim().length < 20) score = 0;
    return { score: Math.min(4, score), matched, totalKeywords: keywords.length };
  }

  function submitEssay() {
    if (finished || answers[index] !== null) return;
    const q = sessionQuestions[index];
    const text = $("essay-answer").value.trim();
    if (text.length < 10) {
      $("essay-answer").focus();
      $("essay-answer").classList.add("is-invalid");
      let feedback = $("essay-feedback-validation");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.id = "essay-feedback-validation";
        feedback.className = "text-danger small mt-2";
        feedback.textContent = "Tuliskan jawaban minimal 10 karakter sebelum mengirim.";
        $("essay-container").appendChild(feedback);
      }
      return;
    }
    $("essay-answer").classList.remove("is-invalid");
    $("essay-feedback-validation")?.remove();
    const grading = gradeEssay(q, text);
    answers[index] = { type:"essay", text, score:grading.score, maxScore:4, matched:grading.matched };
    $("essay-answer").disabled = true;
    $("submit-essay").disabled = true;
    const panel = $("feedback-panel");
    panel.className = "feedback-panel essay-feedback mt-4";
    panel.innerHTML = `<div class="feedback-heading">📝 Jawaban tersimpan</div>
      <div>Skor otomatis sementara: <strong>${grading.score}/4</strong>.</div>
      <p class="mt-2 mb-2">Sistem memeriksa kata kunci sebagai estimasi awal. Jawaban dengan makna benar tetapi memakai istilah berbeda bisa mendapat skor rendah; guru perlu meninjau jawaban sebelum menetapkan nilai resmi.</p>
      <details><summary>Lihat contoh jawaban</summary><p class="mt-2">${escapeHtml(q.modelAnswer)}</p></details>
      <p class="mb-0 mt-2"><strong>Konsep yang dinilai:</strong> ${escapeHtml(q.explanation)}</p>`;
    $("lock-note").textContent = "Jawaban esai terkunci.";
    $("next-btn").disabled = false;
    updateProgress();
  }

  function finishAssessment(timeExpired = false) {
    if (finished) return;
    finished = true;
    clearInterval(timerId);
    const elapsedMs = Math.min(Date.now() - startedAt, TOTAL_MINUTES * 60 * 1000);
    const pgAnswers = answers.filter(a => a && a.type === "pg");
    const correct = pgAnswers.filter(a => a.correct).length;
    const wrong = pgAnswers.length - correct;
    const essayScore = answers.filter(a => a && a.type === "essay").reduce((sum, a) => sum + a.score, 0);
    const essayEquivalent = essayScore / 4;
    const totalScore = Math.round(((correct + essayEquivalent) / 45) * 10000) / 100;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsed = `${String(Math.floor(elapsedSeconds/60)).padStart(2,"0")}:${String(elapsedSeconds%60).padStart(2,"0")}`;

    $("final-score").textContent = totalScore.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    $("correct-count").textContent = correct;
    $("wrong-count").textContent = wrong + (40 - pgAnswers.length);
    $("essay-score").textContent = `${essayScore}/20`;
    $("elapsed-time").textContent = elapsed;
    $("result-message").textContent = timeExpired
      ? "Waktu habis. Jawaban yang sudah tersimpan diproses sebagai hasil asesmen."
      : totalScore >= 85 ? "Luar biasa! Pertahankan rasa ingin tahu dan semangat belajarmu. 🌟"
      : totalScore >= 70 ? "Bagus! Tinjau kembali beberapa konsep agar pemahamanmu semakin kuat. 💪"
      : "Terima kasih sudah berusaha. Pelajari kembali pembahasan dan terus berlatih. 🌱";
    $("identity-summary").innerHTML = [
      ["Nama siswa", student.name], ["NIS", student.nis], ["Kelas", student.className]
    ].map(([label,value]) => `<div class="col-12 col-md-4"><div class="identity-cell"><span>${label}</span><strong>${escapeHtml(value)}</strong></div></div>`).join("");
    showScreen("result");
    window.assessmentResult = {
      student, correct, wrong:40-correct, essayScore, totalScore, elapsed,
      timeExpired, answers, sessionQuestions
    };
  }

  function downloadCSV() {
    const r = window.assessmentResult;
    if (!r) return;
    const rows = [
      ["GENIUS ASSESSMENT - HASIL"],
      ["Nama", r.student.name], ["NIS", r.student.nis], ["Kelas", r.student.className],
      ["Pilihan ganda benar", r.correct], ["Pilihan ganda salah/tidak dijawab", r.wrong],
      ["Skor esai otomatis", `${r.essayScore}/20`], ["Nilai akhir", r.totalScore],
      ["Waktu pengerjaan", r.elapsed], ["Waktu habis", r.timeExpired ? "Ya" : "Tidak"],
      [],
      ["ID Soal","Jenis","Pertanyaan","Jawaban Siswa","Status/Skor","Kunci/Contoh Jawaban"]
    ];
    r.sessionQuestions.forEach((q,i) => {
      const a = r.answers[i];
      if (q.sessionType === "pg") {
        rows.push([q.id,"Pilihan ganda",q.question,a?.selected || "Tidak dijawab",a ? (a.correct ? "Benar" : "Salah") : "Tidak dijawab",q.shuffledOptions.find(o=>o.correct)?.text || ""]);
      } else {
        rows.push([q.id,"Esai",q.question,a?.text || "Tidak dijawab",a ? `${a.score}/4 (otomatis)` : "Tidak dijawab",q.modelAnswer]);
      }
    });
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hasil-genius-assessment-${r.student.nis || "siswa"}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  $("identity-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.classList.add("was-validated"); form.querySelector(":invalid")?.focus(); return; }
    student = {
      name: $("student-name").value.trim(),
      nis: $("student-nis").value.trim(),
      className: $("student-class").value.trim()
    };
    if (!student.name || !student.nis || !student.className) {
      form.classList.add("was-validated"); return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await loadBank();
      prepareSession();
      $("welcome-label").textContent = `Semangat, ${student.name}!`;
      showScreen("quiz");
      renderQuestion();
      startTimer();
    } catch (error) {
      alert(`Gagal memulai asesmen: ${error.message}\nPastikan questions.json tersedia di folder yang sama dan jalankan melalui web server.`);
    } finally { button.disabled = false; }
  });

  $("next-btn").addEventListener("click", () => {
    if (finished) return;
    if (answers[index] === null) return;
    if (index >= sessionQuestions.length - 1) finishAssessment(false);
    else { index++; renderQuestion(); window.scrollTo({top:0,behavior:"smooth"}); }
  });
  $("submit-essay").addEventListener("click", submitEssay);
  $("essay-answer").addEventListener("input", () => {
    $("char-count").textContent = `${$("essay-answer").value.length}/3000`;
    $("essay-answer").classList.remove("is-invalid");
  });
  $("download-result").addEventListener("click", downloadCSV);
  $("restart-btn").addEventListener("click", () => {
    clearInterval(timerId);
    student = null; sessionQuestions = []; answers = []; finished = false;
    $("identity-form").reset();
    $("identity-form").classList.remove("was-validated");
    $("essay-answer").disabled = false;
    showScreen("start");
  });
})();