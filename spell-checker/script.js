(() => {
  const $ = (id) => document.getElementById(id);

  const inputText = $("inputText");
  const charCount = $("charCount");
  const inputStatus = $("inputStatus");
  const perfectOptions = $("perfectOptions");
  const checkButton = $("checkButton");
  const retryButton = $("retryButton");
  const copyButton = $("copyButton");
  const resultCard = $("resultCard");
  const resultTitle = $("resultTitle");
  const resultGuide = $("resultGuide");
  const resultBody = $("resultBody");
  const resultText = $("resultText");
  const score = $("score");
  const meterValue = $("meterValue");
  const meterFill = $("meterFill");
  const levelHelp = $("levelHelp");
  const toast = $("toast");

  let selectedLevel = "normal";
  let latestPlainResult = "";

  const levels = {
    light: { chance: 0.30, max: 3, fallbackChance: 0.35, obviousChance: 0.28, visiblePerfect: 98, score: [97, 99], help: "아주 신중하게 완벽해집니다." },
    normal: { chance: 0.56, max: 7, fallbackChance: 0.72, obviousChance: 0.55, visiblePerfect: 100, score: [98, 100], help: "이 정도면 꽤 믿어도 될 것 같아요." },
    extreme: { chance: 0.82, max: 12, fallbackChance: 0.96, obviousChance: 0.84, visiblePerfect: 103, score: [99, 100], help: "완벽함을 조금 넘어선 상태입니다." }
  };

  const rules = [
    [/같이/g, "가치"], [/괜찮/g, "괜찬"], [/됐/g, "됬"], [/돼요/g, "되요"], [/돼/g, "되"],
    [/안 돼/g, "안되"], [/안돼/g, "안되"], [/안녕하세요/g, "않녕하세요"], [/않아/g, "안아"], [/안 하고/g, "않 하고"],
    [/금세/g, "금새"], [/며칠/g, "몇일"], [/웬일/g, "왠일"], [/왠지/g, "웬지"], [/오랜만/g, "오랫만"],
    [/설레/g, "설래"], [/희한/g, "희안"], [/역할/g, "역활"], [/어이없/g, "어의없"], [/왠만/g, "웬만"],
    [/갔다/g, "갓다"], [/왔다/g, "왓다"], [/먹으러/g, "먹으로"], [/보러/g, "볼러"], [/하려고/g, "할려고"],
    [/되려고/g, "될려고"], [/할게/g, "할께"], [/갈게/g, "갈께"], [/볼게/g, "볼께"], [/할 수/g, "할수"],
    [/될 수/g, "될수"], [/할 때/g, "할때"], [/갈 때/g, "갈때"], [/것 같/g, "거 같"], [/것이다/g, "것 이다"],
    [/때문에/g, "때매"], [/바라/g, "바래"], [/맞춤법/g, "맞춤뻡"], [/문법/g, "문뻡"], [/정확/g, "정학"],
    [/친구/g, "칭구"], [/진짜/g, "진자"], [/조금/g, "쪼금"], [/많이/g, "마니"]
  ];

  const obviousRules = [
    ["있습니다", "있읍니다"], ["없습니다", "없읍니다"], ["했습니다", "했읍니다"], ["합니다", "함니다"],
    ["됩니다", "됌니다"], ["입니다", "임니다"], ["좋습니다", "조습니다"], ["그렇습니다", "그렇읍니다"],
    ["맞습니다", "맏습니다"], ["알겠습니다", "알겟습니다"], ["있어요", "잇어요"], ["없어요", "업서요"],
    ["좋아요", "조아요"], ["맞아요", "마자요"]
  ];

  const extraRules = [
    ["습니다", "읍니다"], ["입니다", "임니다"], ["합니다", "함니다"], ["있어", "잇어"],
    ["없어", "업서"], ["좋아", "조아"], ["많이", "마니"], ["진짜", "진자"], ["조금", "쪼금"]
  ];

  inputText.addEventListener("input", () => {
    charCount.textContent = inputText.value.length;
    inputStatus.textContent = inputText.value.trim() ? "아주 꼼꼼하게 읽어볼 준비가 됐어요." : "문장을 기다리고 있어요.";
  });

  perfectOptions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-level]");
    if (!button) return;
    selectedLevel = button.dataset.level;
    perfectOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.level === selectedLevel)));
    const config = levels[selectedLevel];
    meterValue.textContent = `${config.visiblePerfect}%`;
    meterFill.style.width = `${Math.min(config.visiblePerfect, 100)}%`;
    levelHelp.textContent = config.help;
  });

  checkButton.addEventListener("click", runCheck);
  retryButton.addEventListener("click", runCheck);

  copyButton.addEventListener("click", async () => {
    if (!latestPlainResult) return;
    try { await navigator.clipboard.writeText(latestPlainResult); }
    catch (_) {
      const temp = document.createElement("textarea");
      temp.value = latestPlainResult;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }
    showToast("완벽한 문장을 복사했습니다.");
  });

  function runCheck() {
    const original = inputText.value.trim();
    if (!original) {
      showToast("교정할 문장을 먼저 입력해 주세요.");
      inputText.focus();
      return;
    }
    checkButton.disabled = true;
    checkButton.querySelector("span").textContent = "완벽하게 교정 중…";
    inputStatus.textContent = "국어사전을 엄청 많이 보는 척하는 중…";

    window.setTimeout(() => {
      const result = makeResult(original, selectedLevel);
      latestPlainResult = result.plain;
      resultText.innerHTML = result.html;
      score.textContent = randomInt(levels[selectedLevel].score[0], levels[selectedLevel].score[1]);

      const titles = ["완벽하게 교정했습니다.", "더 이상 손볼 곳이 없네요.", "문장이 아주 정확해졌습니다.", "이 정도면 국어사전도 만족할 겁니다."];
      const guides = ["문법, 띄어쓰기, 맞춤법을 종합적으로 분석했습니다.", "아주 세심하게 확인했습니다. 아마도요.", "수정이 필요한 부분을 정확하게 손봤습니다.", "이제 안심하고 그대로 사용하셔도 될 것 같습니다."];

      resultTitle.textContent = titles[Math.floor(Math.random() * titles.length)];
      resultGuide.textContent = guides[Math.floor(Math.random() * guides.length)];
      resultBody.hidden = false;
      resultCard.dataset.state = "done";
      resultCard.classList.remove("pop");
      void resultCard.offsetWidth;
      resultCard.classList.add("pop");
      checkButton.disabled = false;
      checkButton.querySelector("span").textContent = "맞춤법 검사하기";
      inputStatus.textContent = "검사가 끝났어요. 꽤 자신 있습니다.";
    }, 480);
  }

  function makeResult(text, levelName) {
    const config = levels[levelName];
    let working = text;
    const changed = [];
    const shuffled = [...rules].sort(() => Math.random() - 0.5);

    for (const [pattern, wrong] of shuffled) {
      if (changed.length >= config.max) break;
      if (Math.random() > config.chance) continue;
      let used = false;
      working = working.replace(pattern, (matched) => {
        if (used || changed.length >= config.max) return matched;
        used = true;
        const token = makeToken(changed.length);
        changed.push(wrong);
        return token;
      });
    }

    if (changed.length < config.max && Math.random() < config.obviousChance) {
      const obviousCandidates = obviousRules.filter(([correct]) => working.includes(correct));
      if (obviousCandidates.length) {
        const shuffledObvious = [...obviousCandidates].sort(() => Math.random() - 0.5);
        const obviousCount = levelName === "extreme" ? Math.min(3, shuffledObvious.length) : 1;
        for (let i = 0; i < obviousCount && changed.length < config.max; i++) {
          const [correct, wrong] = shuffledObvious[i];
          const token = makeToken(changed.length);
          working = working.replace(correct, token);
          changed.push(wrong);
        }
      }
    }

    if (changed.length < config.max && Math.random() < config.fallbackChance) {
      const candidates = extraRules.filter(([correct]) => working.includes(correct));
      if (candidates.length) {
        const shuffledExtra = [...candidates].sort(() => Math.random() - 0.5);
        const extraCount = levelName === "extreme" ? Math.min(3, shuffledExtra.length) : levelName === "normal" ? Math.min(2, shuffledExtra.length) : 1;
        for (let i = 0; i < extraCount && changed.length < config.max; i++) {
          const [correct, wrong] = shuffledExtra[i];
          const token = makeToken(changed.length);
          working = working.replace(correct, token);
          changed.push(wrong);
        }
      }
    }

    let plain = working;
    let html = escapeHtml(working);
    changed.forEach((value, index) => {
      const token = makeToken(index);
      plain = plain.replace(token, value);
      html = html.replace(token, `<span class="changed">${escapeHtml(value)}</span>`);
    });
    return { plain, html, count: changed.length };
  }

  function makeToken(index) { return `___SPELL_CHANGE_${index}___`; }
  function escapeHtml(value) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1700);
  }
})();
