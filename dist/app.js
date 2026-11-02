const STORAGE_KEY = "mandalart-v1";
const CENTER = 4;
const outerBoardOrder = [0, 1, 2, 3, 5, 6, 7, 8];

const emptyState = () => ({
  version: 1,
  projectName: "나의 만다라트",
  boards: Array.from({ length: 9 }, () => Array(9).fill("")),
  done: Array.from({ length: 9 }, () => Array(9).fill(false))
});

let state = loadState();
const boardEl = document.querySelector("#mandalart");
const projectNameEl = document.querySelector("#projectName");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const progressTrack = document.querySelector(".progress-track");
const toastEl = document.querySelector("#toast");

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || !Array.isArray(parsed.boards) || parsed.boards.length !== 9) return emptyState();
    return { ...emptyState(), ...parsed };
  } catch { return emptyState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateProgress();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove("show"), 1900);
}

function placeholder(board, cell) {
  if (board === CENTER && cell === CENTER) return "가장 중요한 목표";
  if (board === CENTER) return "핵심 목표";
  if (cell === CENTER) return "핵심 목표";
  return "구체적인 행동";
}

function makeCell(boardIndex, cellIndex) {
  const cell = document.createElement("div");
  const isCore = boardIndex === CENTER;
  const isCenter = cellIndex === CENTER;
  const isAction = !isCore && !isCenter;
  const isSynced = !isCore && isCenter;
  cell.className = `cell ${isCore && isCenter ? "main-goal" : ""} ${isCore && !isCenter ? "pillar" : ""} ${isSynced ? "synced" : ""} ${isAction ? "action-cell" : ""}`;
  if (isAction && state.done[boardIndex][cellIndex]) cell.classList.add("done");

  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.maxLength = 80;
  textarea.placeholder = placeholder(boardIndex, cellIndex);
  textarea.setAttribute("aria-label", `${boardIndex + 1}번 보드 ${cellIndex + 1}번 칸`);
  textarea.value = state.boards[boardIndex][cellIndex] || "";
  if (isSynced) {
    textarea.readOnly = true;
    textarea.tabIndex = -1;
  }
  textarea.addEventListener("input", () => {
    state.boards[boardIndex][cellIndex] = textarea.value;
    if (isCore && !isCenter) syncPillar(cellIndex, textarea.value);
    saveState();
  });
  cell.append(textarea);

  if (isAction) {
    const check = document.createElement("button");
    check.type = "button";
    check.className = "check";
    check.setAttribute("aria-label", "실행 항목 완료 표시");
    check.setAttribute("aria-pressed", String(Boolean(state.done[boardIndex][cellIndex])));
    check.addEventListener("click", () => {
      state.done[boardIndex][cellIndex] = !state.done[boardIndex][cellIndex];
      cell.classList.toggle("done", state.done[boardIndex][cellIndex]);
      check.setAttribute("aria-pressed", String(state.done[boardIndex][cellIndex]));
      saveState();
    });
    cell.append(check);
  }
  return cell;
}

function syncPillar(coreCellIndex, value) {
  const orderIndex = outerBoardOrder.indexOf(coreCellIndex);
  if (orderIndex === -1) return;
  const targetBoard = outerBoardOrder[orderIndex];
  state.boards[targetBoard][CENTER] = value;
  const target = boardEl.querySelector(`[data-board="${targetBoard}"] textarea[data-cell="${CENTER}"]`);
  if (target) target.value = value;
}

function render() {
  boardEl.innerHTML = "";
  for (let b = 0; b < 9; b++) {
    const mini = document.createElement("section");
    mini.className = `mini-board ${b === CENTER ? "core-board" : ""}`;
    mini.dataset.board = b;
    mini.setAttribute("aria-label", b === CENTER ? "중앙 핵심 목표 보드" : `${b + 1}번 실행 보드`);
    for (let c = 0; c < 9; c++) {
      const cell = makeCell(b, c);
      cell.querySelector("textarea").dataset.cell = c;
      mini.append(cell);
    }
    boardEl.append(mini);
  }
  updateProgress();
}

function updateProgress() {
  let completed = 0;
  for (const boardIndex of outerBoardOrder) {
    for (let c = 0; c < 9; c++) if (c !== CENTER && state.done[boardIndex][c]) completed++;
  }
  progressText.textContent = `${completed} / 64`;
  progressBar.style.width = `${(completed / 64) * 100}%`;
  progressTrack.setAttribute("aria-valuenow", String(completed));
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = (state.projectName || "mandalart").replace(/[\\/:*?"<>|]/g, "-");
  link.href = url;
  link.download = `${safeName}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("만다라트를 파일로 저장했습니다.");
}

projectNameEl.value = state.projectName;
projectNameEl.addEventListener("input", () => { state.projectName = projectNameEl.value; saveState(); });
document.querySelector("#exportBtn").addEventListener("click", exportData);
document.querySelector("#importBtn").addEventListener("click", () => document.querySelector("#fileInput").click());
document.querySelector("#fileInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.boards) || imported.boards.length !== 9) throw new Error();
    state = { ...emptyState(), ...imported };
    projectNameEl.value = state.projectName;
    saveState();
    render();
    showToast("만다라트를 불러왔습니다.");
  } catch { showToast("올바른 만다라트 파일이 아닙니다."); }
  event.target.value = "";
});
document.querySelector("#printBtn").addEventListener("click", () => window.print());
document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!window.confirm("작성한 모든 내용을 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;
  state = emptyState();
  projectNameEl.value = state.projectName;
  saveState();
  render();
  showToast("새 만다라트를 시작합니다.");
});

render();

