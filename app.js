const ENDPOINT = "https://script.google.com/macros/s/AKfycbyrkdwKORTUg2lexLjRJMmameAAv11nvb-EXjZmqtK8yxhQVwCOKAsOoL0eztFTof-7oQ/exec";
const form = document.querySelector("#registration-form");
const steps = [...document.querySelectorAll(".step")];
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");
const errorBox = document.querySelector("#form-error");
const nextButton = document.querySelector("#next-button");
const backButton = document.querySelector("#back-button");
const submitButton = document.querySelector("#submit-button");

let currentStep = 1;
const answers = {};
const selectedSkills = new Set();
const skillExperience = {};

const skillCategories = {
  "プロジェクト・企画・PM": [
    "PM（プロジェクトマネージャー）", "PMO", "PdM（プロダクトマネージャー）",
    "IT・DXコンサルタント", "業務コンサルタント",
  ],
  開発: [
    "フロントエンドエンジニア", "バックエンドエンジニア",
    "アプリケーションエンジニア", "組込・制御エンジニア",
  ],
  "インフラ・クラウド／ネットワーク": [
    "インフラエンジニア", "クラウドエンジニア", "ネットワークエンジニア",
    "DBエンジニア", "SREエンジニア",
  ],
  セキュリティ: ["セキュリティエンジニア", "情報セキュリティ", "脆弱性診断"],
  "データ・AI": ["データサイエンティスト", "データアナリスト", "機械学習・AIエンジニア"],
  "ITサポート・社内システム": ["社内SE", "テクニカルサポート", "ヘルプデスク", "プリセールス"],
  品質管理: ["QAエンジニア", "テストエンジニア"],
};

const yearOptions = ["1年未満", "1〜3年", "3〜5年", "5〜10年", "10年以上"];

function createChoiceButton(value, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = value;
  button.dataset.value = value;
  button.className = className;
  return button;
}

function renderCategories() {
  const container = document.querySelector("#skill-categories");
  Object.entries(skillCategories).forEach(([category, skills]) => {
    const section = document.createElement("section");
    section.className = "category";
    section.innerHTML = `<h3>${category}</h3><p>該当するものをすべて選択してください。</p>`;
    const choices = document.createElement("div");
    choices.className = "choices multi";
    skills.forEach((skill) => {
      const button = createChoiceButton(skill);
      button.dataset.skill = skill;
      choices.append(button);
    });
    const inlineYears = document.createElement("div");
    inlineYears.className = "skill-inline-years";
    inlineYears.dataset.category = category;
    inlineYears.hidden = true;
    section.append(choices, inlineYears);
    container.append(section);
  });
}

function renderOptions(containerId, values) {
  const container = document.querySelector(containerId);
  values.forEach((value) => container.append(createChoiceButton(value)));
}

function renderSkillYears() {
  Object.entries(skillCategories).forEach(([category, skills]) => {
    const list = document.querySelector(`[data-category="${category}"]`);
    const selectedCategorySkills = skills.filter((skill) => selectedSkills.has(skill));
    list.replaceChildren();
    list.hidden = selectedCategorySkills.length === 0;

    selectedCategorySkills.forEach((skill) => {
      const row = document.createElement("div");
      row.className = "skill-year-row";
      const title = document.createElement("span");
      title.textContent = `${skill}の実務経験年数`;
      const choices = document.createElement("div");
      choices.className = "choices";
      yearOptions.forEach((year) => {
        const button = createChoiceButton(year);
        button.dataset.skillYearFor = skill;
        button.classList.toggle("is-selected", skillExperience[skill] === year);
        choices.append(button);
      });
      row.append(title, choices);
      list.append(row);
    });
  });
}

function updateStep() {
  steps.forEach((step) => step.classList.toggle("is-active", Number(step.dataset.step) === currentStep));
  progressLabel.textContent = `${currentStep} / ${steps.length} ${steps[currentStep - 1].querySelector("h2").textContent}`;
  progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
  backButton.hidden = currentStep === 1;
  nextButton.hidden = currentStep === steps.length;
  submitButton.hidden = currentStep !== steps.length;
  errorBox.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function requiredSelection(name) {
  return Boolean(answers[name] && (Array.isArray(answers[name]) ? answers[name].length : answers[name]));
}

function validateStep() {
  const step = steps[currentStep - 1];
  const inputs = [...step.querySelectorAll("input[required]")];
  const invalidInput = inputs.find((input) => !input.checkValidity());
  if (invalidInput) {
    invalidInput.focus();
    errorBox.textContent = "必須項目を入力してください。";
    return false;
  }

  const requiredByStep = {
    1: ["contactMethod"],
    2: ["skills"],
    3: ["employeeYears", "managementYears", "teamDevelopment", "developmentProcess", "productExperience", "newProject"],
    4: ["currentStatus", "sideJob", "workDays", "workStyle", "igInvolvement"],
  };
  if (!requiredByStep[currentStep].every(requiredSelection)) {
    errorBox.textContent = "必須の選択項目を回答してください。";
    return false;
  }
  if (currentStep === 2 && [...selectedSkills].some((skill) => !skillExperience[skill])) {
    errorBox.textContent = "選択したスキルごとに実務経験年数を選択してください。";
    return false;
  }
  return true;
}

function collectData() {
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    ...data,
    ...answers,
    skills: [...selectedSkills],
    skillExperience,
    submittedAt: new Date().toISOString(),
  };
}

async function submitForm(event) {
  event.preventDefault();
  if (!validateStep()) return;
  submitButton.disabled = true;
  submitButton.textContent = "送信中…";
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(collectData()),
    });
    if (!response.ok) throw new Error("送信に失敗しました。");
    form.hidden = true;
    document.querySelector("#success").hidden = false;
  } catch (error) {
    errorBox.textContent = "送信できませんでした。時間をおいて再度お試しください。";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "登録する";
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-value]");
  if (!button) return;

  const skill = button.dataset.skill;
  if (skill) {
    button.classList.toggle("is-selected");
    if (selectedSkills.has(skill)) {
      selectedSkills.delete(skill);
      delete skillExperience[skill];
    } else {
      selectedSkills.add(skill);
    }
    answers.skills = [...selectedSkills];
    renderSkillYears();
    return;
  }

  const skillYearFor = button.dataset.skillYearFor;
  if (skillYearFor) {
    skillExperience[skillYearFor] = button.dataset.value;
    renderSkillYears();
    return;
  }

  const group = button.closest("[data-single], .multi");
  if (!group) return;
  const name = group.dataset.single;
  if (name) {
    group.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
    answers[name] = button.dataset.value;
    if (name === "contactMethod") {
      document.querySelector("[name='contactMethodOther']").classList.toggle("is-visible", answers[name] === "その他");
    }
  } else {
    button.classList.toggle("is-selected");
    const groupName = group.id === "development-process" ? "developmentProcess"
      : group.id === "work-days" ? "workDays"
        : group.id === "work-style" ? "workStyle" : "igInvolvement";
    answers[groupName] = [...group.querySelectorAll(".is-selected")].map((item) => item.dataset.value);
  }
});

nextButton.addEventListener("click", () => {
  if (validateStep()) {
    currentStep += 1;
    updateStep();
  }
});
backButton.addEventListener("click", () => {
  currentStep -= 1;
  updateStep();
});
form.addEventListener("submit", submitForm);

renderCategories();
renderOptions("#development-process", ["顧客折衝", "要件定義", "基本設計", "詳細設計", "実装", "単体テスト", "結合テスト", "負荷テスト", "脆弱性診断", "総合テスト", "保守・運用"]);
renderOptions("#work-days", ["週1日", "週2日", "週3日", "週4日", "週5日"]);
renderOptions("#work-style", ["フルリモート", "ハイブリッド", "常駐可能", "要相談"]);
renderOptions("#ig-involvement", ["業務委託で案件に参画したい", "イグニッション・ギルドへの転職も検討したい"]);
updateStep();
