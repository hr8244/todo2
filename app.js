const STORAGE_KEY = "daily-todos-v1";

/** @typedef {{ id: string, text: string, date: string, completed: boolean, createdAt: number }} Todo */

/** @type {Todo[]} */
let todos = [];

let viewMode = "daily";
/** @type {Date} anchor for navigation */
let anchorDate = startOfDay(new Date());

let editingId = null;
/** @type {string | null} ISO date when list is filtered to one day in week/month view */
let calendarFilterDate = null;

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const els = {
  viewTabs: document.querySelectorAll(".view-tab"),
  prevPeriod: document.getElementById("prevPeriod"),
  nextPeriod: document.getElementById("nextPeriod"),
  goToday: document.getElementById("goToday"),
  periodLabel: document.getElementById("periodLabel"),
  calendarSection: document.getElementById("calendarSection"),
  calendarRoot: document.getElementById("calendarRoot"),
  clearDayFilter: document.getElementById("clearDayFilter"),
  addForm: document.getElementById("addForm"),
  todoDate: document.getElementById("todoDate"),
  todoText: document.getElementById("todoText"),
  todoList: document.getElementById("todoList"),
  emptyState: document.getElementById("emptyState"),
  editDialog: document.getElementById("editDialog"),
  editForm: document.getElementById("editForm"),
  editDate: document.getElementById("editDate"),
  editText: document.getElementById("editText"),
  editCancel: document.getElementById("editCancel"),
};

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateISO(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getWeekStart(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function getWeekEnd(d) {
  const start = getWeekStart(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    todos = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(todos)) todos = [];
  } catch {
    todos = [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todoInRange(todo, mode, anchor) {
  const todoDay = startOfDay(parseDateISO(todo.date));
  if (mode === "daily") {
    return formatDateISO(todoDay) === formatDateISO(anchor);
  }
  if (mode === "weekly") {
    const start = getWeekStart(anchor);
    const end = getWeekEnd(anchor);
    return todoDay >= start && todoDay <= end;
  }
  if (mode === "monthly") {
    return (
      todoDay.getFullYear() === anchor.getFullYear() &&
      todoDay.getMonth() === anchor.getMonth()
    );
  }
  return false;
}

function getVisibleTodos() {
  return todos
    .filter((t) => todoInRange(t, viewMode, anchorDate))
    .filter((t) => !calendarFilterDate || t.date === calendarFilterDate)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt - b.createdAt;
    });
}

function getTodosForDate(iso) {
  return todos
    .filter((t) => t.date === iso)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function isToday(d) {
  return formatDateISO(d) === formatDateISO(new Date());
}

function weekdayClass(d) {
  const day = d.getDay();
  if (day === 0) return "sun";
  if (day === 6) return "sat";
  return "";
}

function renderWeekdayHeader(container) {
  const row = document.createElement("div");
  row.className = "cal-weekdays";
  WEEKDAY_LABELS.forEach((label, i) => {
    const span = document.createElement("span");
    span.className = "cal-weekday";
    if (i === 5) span.classList.add("sat");
    if (i === 6) span.classList.add("sun");
    span.textContent = label;
    row.appendChild(span);
  });
  container.appendChild(row);
}

function buildCalDayButton(date, options) {
  const { otherMonth = false, weekly = false } = options;
  const iso = formatDateISO(date);
  const dayTodos = getTodosForDate(iso);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cal-day";
  if (otherMonth) btn.classList.add("other-month");
  if (isToday(date)) btn.classList.add("today");
  if (calendarFilterDate === iso) btn.classList.add("selected");
  btn.setAttribute("aria-label", `${iso} 할 일 ${dayTodos.length}개`);

  const num = document.createElement("span");
  num.className = `cal-day-num ${weekdayClass(date)}`;
  num.textContent = String(date.getDate());
  btn.appendChild(num);

  if (dayTodos.length > 0) {
    const count = document.createElement("span");
    count.className = "cal-day-count";
    count.textContent = `${dayTodos.length}건`;
    btn.appendChild(count);
  }

  if (weekly) {
    const previewLimit = 2;
    for (let i = 0; i < Math.min(previewLimit, dayTodos.length); i++) {
      const p = document.createElement("p");
      p.className = `cal-day-preview${dayTodos[i].completed ? " done" : ""}`;
      p.textContent = dayTodos[i].text;
      btn.appendChild(p);
    }
  } else if (dayTodos.length > 0) {
    const dots = document.createElement("div");
    dots.className = "cal-dots";
    const allDone = dayTodos.every((t) => t.completed);
    const dotCount = Math.min(dayTodos.length, 4);
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement("span");
      dot.className = `cal-dot${allDone ? " all-done" : ""}`;
      dots.appendChild(dot);
    }
    btn.appendChild(dots);
  }

  btn.addEventListener("click", () => selectCalendarDay(iso));
  return btn;
}

function renderWeeklyCalendar() {
  const root = els.calendarRoot;
  root.innerHTML = "";
  renderWeekdayHeader(root);

  const grid = document.createElement("div");
  grid.className = "cal-grid cal-grid--weekly";
  const start = getWeekStart(anchorDate);
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    grid.appendChild(buildCalDayButton(day, { weekly: true }));
  }
  root.appendChild(grid);
}

function renderMonthlyCalendar() {
  const root = els.calendarRoot;
  root.innerHTML = "";
  renderWeekdayHeader(root);

  const grid = document.createElement("div");
  grid.className = "cal-grid";

  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  let cursor = getWeekStart(first);
  const endPad = getWeekEnd(last);
  while (cursor <= endPad) {
    const inMonth = cursor.getMonth() === month;
    grid.appendChild(
      buildCalDayButton(cursor, { otherMonth: !inMonth, weekly: false })
    );
    cursor = addDays(cursor, 1);
  }
  root.appendChild(grid);
}

function renderCalendar() {
  const show = viewMode === "weekly" || viewMode === "monthly";
  els.calendarSection.classList.toggle("hidden", !show);
  if (!show) {
    els.calendarRoot.innerHTML = "";
    calendarFilterDate = null;
    els.clearDayFilter.classList.add("hidden");
    return;
  }

  if (calendarFilterDate && !todoInRange({ date: calendarFilterDate }, viewMode, anchorDate)) {
    calendarFilterDate = null;
  }

  if (viewMode === "weekly") renderWeeklyCalendar();
  else renderMonthlyCalendar();

  els.clearDayFilter.classList.toggle("hidden", !calendarFilterDate);
}

function selectCalendarDay(iso) {
  calendarFilterDate = calendarFilterDate === iso ? null : iso;
  if (calendarFilterDate) {
    els.todoDate.value = calendarFilterDate;
  }
  render();
}

function formatPeriodLabel() {
  if (viewMode === "daily") {
    return anchorDate.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }
  if (viewMode === "weekly") {
    const start = getWeekStart(anchorDate);
    const end = getWeekEnd(anchorDate);
    const s = start.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    const e = end.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
    });
    return `${s} – ${e}`;
  }
  return anchorDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
}

function formatDisplayDate(iso) {
  return parseDateISO(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function groupByDate(items) {
  /** @type {Map<string, Todo[]>} */
  const map = new Map();
  for (const item of items) {
    const key = item.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function renderTodoItem(todo) {
  const li = document.createElement("li");
  li.className = `todo-item${todo.completed ? " completed" : ""}`;
  li.dataset.id = todo.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "todo-check";
  check.checked = todo.completed;
  check.setAttribute("aria-label", "완료 표시");
  check.addEventListener("change", () => toggleComplete(todo.id));

  const body = document.createElement("div");
  body.className = "todo-body";

  if (viewMode !== "daily") {
    const badge = document.createElement("span");
    badge.className = "todo-date-badge";
    badge.textContent = formatDisplayDate(todo.date);
    body.appendChild(badge);
  }

  const text = document.createElement("p");
  text.className = "todo-text";
  text.textContent = todo.text;
  body.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "todo-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn btn-ghost";
  editBtn.textContent = "수정";
  editBtn.addEventListener("click", () => openEdit(todo.id));

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn btn-danger";
  delBtn.textContent = "삭제";
  delBtn.addEventListener("click", () => deleteTodo(todo.id));

  actions.append(editBtn, delBtn);
  li.append(check, body, actions);
  return li;
}

function render() {
  els.periodLabel.textContent = formatPeriodLabel();
  if (!calendarFilterDate || viewMode === "daily") {
    els.todoDate.value = formatDateISO(anchorDate);
  }
  renderCalendar();

  const visible = getVisibleTodos();
  els.todoList.innerHTML = "";

  if (visible.length === 0) {
    els.emptyState.classList.remove("hidden");
    return;
  }

  els.emptyState.classList.add("hidden");

  if (viewMode === "daily") {
    for (const todo of visible) {
      els.todoList.appendChild(renderTodoItem(todo));
    }
    return;
  }

  const grouped = groupByDate(visible);
  for (const [dateKey, group] of grouped) {
    const heading = document.createElement("li");
    heading.className = "group-heading";
    heading.textContent = formatDisplayDate(dateKey);
    els.todoList.appendChild(heading);

    for (const todo of group) {
      els.todoList.appendChild(renderTodoItem(todo));
    }
  }
}

function setViewMode(mode) {
  viewMode = mode;
  calendarFilterDate = null;
  els.viewTabs.forEach((tab) => {
    const active = tab.dataset.view === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  render();
}

function navigatePeriod(delta) {
  if (viewMode === "daily") {
    anchorDate = addDays(anchorDate, delta);
  } else if (viewMode === "weekly") {
    anchorDate = addDays(anchorDate, delta * 7);
  } else {
    anchorDate = addMonths(anchorDate, delta);
  }
  calendarFilterDate = null;
  render();
}

function goToday() {
  anchorDate = startOfDay(new Date());
  render();
}

function addTodo(text, date) {
  const todo = {
    id: generateId(),
    text: text.trim(),
    date,
    completed: false,
    createdAt: Date.now(),
  };
  todos.push(todo);
  saveTodos();
  render();
}

function deleteTodo(id) {
  if (!confirm("이 할 일을 삭제할까요?")) return;
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

function toggleComplete(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  saveTodos();
  render();
}

function openEdit(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  editingId = id;
  els.editDate.value = todo.date;
  els.editText.value = todo.text;
  els.editDialog.showModal();
  els.editText.focus();
}

function saveEdit() {
  if (!editingId) return;
  const todo = todos.find((t) => t.id === editingId);
  if (!todo) return;
  todo.text = els.editText.value.trim();
  todo.date = els.editDate.value;
  saveTodos();
  editingId = null;
  els.editDialog.close();
  render();
}

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = els.todoText.value;
  const date = els.todoDate.value;
  if (!text.trim() || !date) return;
  addTodo(text, date);
  els.todoText.value = "";
  els.todoText.focus();
});

els.viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => setViewMode(tab.dataset.view));
});

els.prevPeriod.addEventListener("click", () => navigatePeriod(-1));
els.nextPeriod.addEventListener("click", () => navigatePeriod(1));
els.goToday.addEventListener("click", goToday);

els.clearDayFilter.addEventListener("click", () => {
  calendarFilterDate = null;
  render();
});

els.editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveEdit();
});

els.editCancel.addEventListener("click", () => {
  editingId = null;
  els.editDialog.close();
});

loadTodos();
anchorDate = startOfDay(new Date());
els.todoDate.value = formatDateISO(anchorDate);
render();
