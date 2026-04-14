const dataUrl = "./data/data.json";
const API_BASE = (() => {
  if (window.__API_BASE__) return window.__API_BASE__;
  const isLocalFiveServer =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const isStaticDevPort = ["5500", "5501", "5502"].includes(window.location.port);
  if (isLocalFiveServer && isStaticDevPort) {
    return "http://127.0.0.1:8000";
  }
  return "/api";
})();
const ONLINE_COUNT_POLL_INTERVAL = 30 * 1000;
const VIEW_KEY = "sqtp_main_view";
const CATEGORY_KEY = "sqtp_active_resource_category";

const state = {
  activeResourceCategory: null,
  resourceData: [],
  resourceCache: {},
  sites: [],
  siteSections: [],
  todos: [],
  laterItems: [],
  isDraggingSite: false,
  pomodoro: {
    isRunning: false,
    mode: "work",
    workSeconds: 25 * 60,
    remaining: 25 * 60,
    timer: null
  }
};


function getClientId() {
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    clientId = "client_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    localStorage.setItem("clientId", clientId);
  }
  return clientId;
}

async function fetchJson(url, options = {}) {
  const headers = options.headers || {};
  headers["X-Client-ID"] = getClientId(); 

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch (error) {
      detail = "";
    }
    throw new Error(`Request failed: ${res.status}${detail ? ` - ${detail}` : ""}`);
  }
  return res.json();
}

const els = {
  brand: document.getElementById("brand-home"),
  siteHeader: document.querySelector(".site-header"),
  homeView: document.getElementById("home-view"),
  resourceCategories: document.getElementById("resource-categories"),
  resourceContainer: document.getElementById("resource-container"),
  siteContainer: document.getElementById("site-container"),
  resourceTitle: document.getElementById("resource-title"),
  resourceSubtitle: document.getElementById("resource-subtitle"),
  openUpload: document.getElementById("open-upload"),
  toggleResourceEdit: document.getElementById("toggle-resource-edit"),
  onlineCount: document.getElementById("online-count"),
  searchInput: document.getElementById("search-input"),
  pomodoroTime: document.getElementById("pomodoro-time"),
  pomodoroMode: document.getElementById("pomodoro-mode"),
  pomodoroToggle: document.getElementById("pomodoro-toggle"),
  studyControlPanel: document.getElementById("study-control-panel"),
  timePicker: document.getElementById("time-picker"),
  timeHours: document.getElementById("time-hours"),
  timeMinutes: document.getElementById("time-minutes"),
  timeSeconds: document.getElementById("time-seconds"),
  addSiteModal: document.getElementById("add-site-modal"),
  openAddSite: document.getElementById("open-add-site"),
  cancelAddSite: document.getElementById("cancel-add-site"),
  saveAddSite: document.getElementById("save-add-site"),
  siteTitle: document.getElementById("site-title"),
  siteUrl: document.getElementById("site-url"),
  siteDesc: document.getElementById("site-desc"),
  resourceContent: document.getElementById("resource-content"),
  headerQuickActions: document.getElementById("header-quick-actions"),
  headerTodoIcon: document.getElementById("btn-todo"),
  headerStudyIcon: document.getElementById("btn-study"),
  bottomSitesBtn: document.getElementById("btn-bottom-sites"),
  bottomPanel: document.getElementById("bottom-panel"),
  bottomPanelHandle: document.getElementById("bottom-panel-handle"),
  bottomBar: document.querySelector(".bottom-bar"),
  roomQuote: document.getElementById("room-quote"),
  globalDrawer: document.getElementById("global-drawer"),
  globalDrawerBackdrop: document.getElementById("global-drawer-backdrop"),
  uploadModal: document.getElementById("upload-modal"),
  uploadModalTitle: document.getElementById("upload-modal-title"),
  uploadTitleLabel: document.getElementById("upload-title-label"),
  cancelUpload: document.getElementById("cancel-upload"),
  saveUpload: document.getElementById("save-upload"),
  uploadTitle: document.getElementById("upload-title"),
  uploadUrl: document.getElementById("upload-url"),
  uploadDesc: document.getElementById("upload-desc"),
  uploadTags: document.getElementById("upload-tags"),
  uploadPlatform: document.getElementById("upload-platform"),
  todoInput: document.getElementById("todo-input"),
  addTodo: document.getElementById("add-todo"),
  todoList: document.getElementById("todo-list"),
  laterList: document.getElementById("later-list"),
  pomodoroTimeDisplay: document.getElementById("pomodoro-time-display"),
  toggleEditMode: document.getElementById("toggle-edit-mode"),
  openFeedback: document.getElementById("open-feedback"),
  feedbackModal: document.getElementById("feedback-modal"),
  feedbackText: document.getElementById("feedback-text"),
  cancelFeedback: document.getElementById("cancel-feedback"),
  submitFeedback: document.getElementById("submit-feedback"),
  feedbackTitle: document.getElementById("feedback-title"),
  feedbackFormGroup: document.getElementById("feedback-form-group"),
  feedbackActions: document.getElementById("feedback-actions"),
  btnExport: document.getElementById("btn-export"),
  btnImport: document.getElementById("btn-import"),
  importFileInput: document.getElementById("import-file-input")
};

const uiState = {
  uploadMode: "upload",
  activePanel: null,
  editingSiteId: null,
  isBottomPanelVisible: false,
  isResourceEditMode: false
};

let onlineCountPollTimer = null;
let bottomPanelTouchStartY = null;

const storage = {
  customSitesKey: "userCustomSites",
  siteSectionsKey: "siteSections",
  siteAssignmentsKey: "siteAssignments",
  roomQuoteKey: "studyRoomQuote",
  todoKey: "todoItems",
  uploadKey: "resourceUploadsByCategory",
  laterKey: "laterStudyList",
  getCustomSites() {
    return JSON.parse(localStorage.getItem(this.customSitesKey) || "[]");
  },
  setCustomSites(data) {
    localStorage.setItem(this.customSitesKey, JSON.stringify(data));
  },
  getSiteSections() {
    const raw = localStorage.getItem(this.siteSectionsKey);
    if (!raw) return [{ id: "default", name: "默认分区" }];
    return JSON.parse(raw);
  },
  setSiteSections(data) {
    localStorage.setItem(this.siteSectionsKey, JSON.stringify(data));
  },
  getSiteAssignments() {
    return JSON.parse(localStorage.getItem(this.siteAssignmentsKey) || "{}");
  },
  setSiteAssignments(data) {
    localStorage.setItem(this.siteAssignmentsKey, JSON.stringify(data));
  },
  getRoomQuote() {
    return localStorage.getItem(this.roomQuoteKey) || "保持节奏，别急。";
  },
  setRoomQuote(value) {
    localStorage.setItem(this.roomQuoteKey, value);
  },
  getTodos() {
    return JSON.parse(localStorage.getItem(this.todoKey) || "[]");
  },
  setTodos(data) {
    localStorage.setItem(this.todoKey, JSON.stringify(data));
  },
  getUploads() {
    return JSON.parse(localStorage.getItem(this.uploadKey) || "{}");
  },
  setUploads(data) {
    localStorage.setItem(this.uploadKey, JSON.stringify(data));
  },
  getLaterList() {
    return JSON.parse(localStorage.getItem(this.laterKey) || "[]");
  },
  setLaterList(data) {
    localStorage.setItem(this.laterKey, JSON.stringify(data));
  }

};

function exportUserData() {
  const keysToExport = [
    "clientId",
    "userCustomSites",
    "siteSortOrder",
    "todoItems",
    "resourceUploadsByCategory",
    "laterStudyList",
    "studyRoomQuote"
  ];

  const data = {};
  keysToExport.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) data[key] = val;
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `sqtp_backup_${date}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function importUserData(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!confirm("导入备份将覆盖当前浏览器中的所有个人数据（待办、网站、私有资源等），确定继续吗？")) {
        els.importFileInput.value = "";
        return;
      }

      Object.keys(data).forEach(key => {
        localStorage.setItem(key, data[key]);
      });

      alert("导入成功！页面即将刷新以应用更改。");
      window.location.reload();
    } catch (err) {
      alert("解析备份文件失败，请确保文件格式正确。");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

async function loadData() {
  let localData = {};
  try {
    localData = await fetchJson(dataUrl);
  } catch (error) {
    localData = {};
  }

  try {
    const subjects = await fetchJson(`${API_BASE}/subjects`);
    state.resourceData = subjects.length ? subjects : (localData.studyResourceCategories || []);
  } catch (error) {
    state.resourceData = localData.studyResourceCategories || [];
  }

  await fetchSiteData(localData.sites || []);
  state.pomodoro.workSeconds = (localData.studyRoom?.pomodoroConfig?.workDuration || 25) * 60;
  state.pomodoro.remaining = state.pomodoro.workSeconds;
  initTimePicker();
  if (els.roomQuote) {
    els.roomQuote.value = storage.getRoomQuote();
  }
  updatePomodoroView();
  await loadLaterItems();
  initCategories();
  startOnlineCountPolling({ immediate: true });
  await loadTodos();
}

function syncHeaderPanelState() {
  const panel = uiState.activePanel;
  const isOpen = Boolean(panel);
  els.headerTodoIcon?.classList.toggle("is-active", panel === "todos");
  els.headerStudyIcon?.classList.toggle("is-active", panel === "study");
  els.headerTodoIcon?.setAttribute("aria-expanded", String(isOpen && panel === "todos"));
  els.headerStudyIcon?.setAttribute("aria-expanded", String(isOpen && panel === "study"));
}

function syncBottomPanelState() {
  const isVisible = uiState.isBottomPanelVisible;
  els.bottomPanel?.classList.toggle("is-open", isVisible);
  els.bottomPanel?.setAttribute("aria-hidden", String(!isVisible));
  els.bottomSitesBtn?.classList.toggle("is-active", isVisible);
  els.bottomSitesBtn?.setAttribute("aria-expanded", String(isVisible));
}

function openBottomPanel({ focusPanel = true } = {}) {
  uiState.isBottomPanelVisible = true;
  closeGlobalDrawer();
  syncBottomPanelState();
  if (focusPanel) {
    els.bottomPanel?.focus({ preventScroll: true });
  }
}

function closeBottomPanel({ restoreTriggerFocus = false } = {}) {
  uiState.isBottomPanelVisible = false;
  syncBottomPanelState();
  if (restoreTriggerFocus) {
    els.bottomSitesBtn?.focus({ preventScroll: true });
  }
}

function toggleBottomPanel() {
  if (uiState.isBottomPanelVisible) {
    closeBottomPanel({ restoreTriggerFocus: true });
    return;
  }
  openBottomPanel({ focusPanel: true });
}

function setGlobalPanel(panelName) {
  const panels = els.globalDrawer?.querySelectorAll(".global-panel") || [];
  panels.forEach((panel) => {
    const isActive = panel.dataset.panel === panelName;
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  });
}

function openGlobalDrawer(panelName) {
  const drawer = document.getElementById("global-drawer");
  if (!drawer || !panelName) return;
  closeBottomPanel();
  uiState.activePanel = panelName;
  drawer.classList.toggle("is-open", true);
  drawer.setAttribute("aria-hidden", "false");
  els.globalDrawerBackdrop?.classList.toggle("is-open", true);
  els.globalDrawerBackdrop?.setAttribute("aria-hidden", "false");
  setGlobalPanel(panelName);
  syncHeaderPanelState();
}

function closeGlobalDrawer() {
  const drawer = document.getElementById("global-drawer");
  if (!drawer) return;
  uiState.activePanel = null;
  drawer.classList.toggle("is-open", false);
  drawer.setAttribute("aria-hidden", "true");
  els.globalDrawerBackdrop?.classList.toggle("is-open", false);
  els.globalDrawerBackdrop?.setAttribute("aria-hidden", "true");
  setGlobalPanel("");
  syncHeaderPanelState();
}

function toggleGlobalDrawer(panelName) {
  const drawer = document.getElementById("global-drawer");
  if (!drawer || !panelName) return;
  const isSamePanel = uiState.activePanel === panelName;
  const isOpen = drawer.classList.contains("is-open");
  if (isOpen && isSamePanel) {
    closeGlobalDrawer();
    return;
  }
  openGlobalDrawer(panelName);
}

function closeAllFloatingPanels() {
  closeGlobalDrawer();
  closeBottomPanel();
}

function initCategories() {
  renderCategoryList(els.resourceCategories, state.resourceData);

  const savedCategory = localStorage.getItem(CATEGORY_KEY);
  const savedView = localStorage.getItem(VIEW_KEY);
  const matchedCategory = state.resourceData.find((item) => String(item.id) === String(savedCategory));

  state.activeResourceCategory = matchedCategory?.id || state.resourceData[0]?.id || null;
  updateActiveNav();
  renderSites();

  if (savedView === "resource" && state.activeResourceCategory) {
    showResourceView();
    renderResources();
    return;
  }
  showHomeView();
}

function syncDesktopLayoutMetrics() {
  const headerHeight = els.siteHeader?.getBoundingClientRect().height;
  if (!headerHeight) return;
  document.documentElement.style.setProperty("--header-runtime-height", `${Math.round(headerHeight)}px`);
}

function setMainView(viewName) {
  const showHome = viewName === "home";
  els.homeView?.classList.toggle("hidden", !showHome);
  els.resourceContent?.classList.toggle("hidden", showHome);
  localStorage.setItem(VIEW_KEY, viewName);
}

function showHomeView() {
  setMainView("home");
}

function showResourceView() {
  setMainView("resource");
}

function handleBrandHomeNavigation() {
  state.activeResourceCategory = null;
  updateActiveNav();
  showHomeView();
}

function handleBrandKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  handleBrandHomeNavigation();
}

function renderCategoryList(container, list) {
  container.innerHTML = "";
  list.forEach((item) => {
    const li = document.createElement("li");
    li.className = "nav-item";
    li.textContent = item.name;
    li.addEventListener("click", () => {
      state.activeResourceCategory = item.id;
      localStorage.setItem(CATEGORY_KEY, String(item.id));
      showResourceView();
      updateActiveNav();
      renderResources();
      els.resourceContent?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    container.appendChild(li);
  });
  updateActiveNav();
}

function updateActiveNav() {
  [...els.resourceCategories.children].forEach((li, index) => {
    const id = state.resourceData[index]?.id;
    li.classList.toggle("active", id === state.activeResourceCategory);
  });
}

function ensureActiveResourceCategory() {
  if (!state.resourceData.length) {
    state.activeResourceCategory = null;
    localStorage.removeItem(CATEGORY_KEY);
    return null;
  }
  const current = state.resourceData.find((c) => c.id === state.activeResourceCategory);
  if (current) {
    localStorage.setItem(CATEGORY_KEY, String(current.id));
    return current;
  }
  state.activeResourceCategory = state.resourceData[0].id;
  localStorage.setItem(CATEGORY_KEY, String(state.activeResourceCategory));
  return state.resourceData[0];
}

async function renderResources() {
  const category = ensureActiveResourceCategory();
  els.resourceTitle.textContent = category?.name || "学科资源";
  if (els.resourceSubtitle) {
    els.resourceSubtitle.textContent = category?.name ? `当前分区：${category.name}` : "按学科分区浏览当前资源";
  }
  if (!category) return;
  
  els.resourceContainer.innerHTML = "";
  
  if (!state.resourceCache[category.id]) {

    els.resourceContainer.innerHTML = "<div class=\"loading-placeholder\">加载中...</div>";
    try {
      const resources = await fetchJson(`${API_BASE}/subjects/${category.id}/resources`);
      state.resourceCache[category.id] = resources.length ? resources : (category.resources || []);
    } catch (error) {
      state.resourceCache[category.id] = category.resources || [];
    }
  }
  
  const uploads = getUploadsForCategory(category?.id);
  const resources = applyResourceFilters([...(uploads || []), ...(state.resourceCache[category.id] || [])]);
  
  els.resourceContainer.innerHTML = "";
  
  els.resourceContainer.classList.toggle("is-editing", uiState.isResourceEditMode);
  
  if (resources.length === 0) {
    els.resourceContainer.innerHTML = "<div class=\"empty-state\" style=\"width: 100%; text-align: center; color: #999; margin-top: 20px;\">暂无资源</div>";
    return;
  }

  resources.forEach((item) => {
    const card = createResourceCard(item);
    els.resourceContainer.appendChild(card);
  });
}

function toggleResourceEditMode(event) {
  event?.stopPropagation();
  uiState.isResourceEditMode = !uiState.isResourceEditMode;
  els.toggleResourceEdit?.setAttribute("aria-pressed", String(uiState.isResourceEditMode));
  renderResources();
}

function toggleEditMode(event) {
  event?.stopPropagation();
  const container = els.siteContainer;
  if (!container) return;
  const isEditMode = !container.classList.contains("is-editing");
  container.classList.toggle("is-editing", isEditMode);
  document.body.dataset.editMode = String(isEditMode);
  uiState.editingSiteId = null;
  els.toggleEditMode?.setAttribute("aria-pressed", String(isEditMode));
  renderSites();
}

async function renameSiteTitle(siteId, nextTitle) {
  const target = state.sites.find((site) => site.id === siteId);
  if (!target) {
    uiState.editingSiteId = null;
    renderSites();
    return false;
  }
  const title = nextTitle.trim();
  if (!title) {
    alert("网站名称不能为空。");
    uiState.editingSiteId = null;
    renderSites();
    return false;
  }
  if (title === target.title) {
    uiState.editingSiteId = null;
    renderSites();
    return true;
  }

  try {
    const updated = await fetchJson(`${API_BASE}/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    state.sites = state.sites.map((site) => (site.id === siteId ? updated : site));
  } catch (error) {
    const customSites = storage.getCustomSites();
    const siteToUpdate = customSites.find(s => s.id === siteId);
    if (siteToUpdate) {
      siteToUpdate.title = title;
      storage.setCustomSites(customSites);
    }
    state.sites = state.sites.map((site) => (site.id === siteId ? { ...site, title } : site));
  }
  uiState.editingSiteId = null;
  renderSites();
  return true;
}

function renderSites() {
  els.siteContainer.innerHTML = "";
  const sites = [...state.sites];
  const keyword = els.searchInput.value.trim();
  const filtered = keyword
    ? sites.filter((item) => item.title.includes(keyword) || (item.description || "").includes(keyword))
    : sites;

  filtered.forEach((site) => {
    els.siteContainer.appendChild(createSiteCard(site));
  });
}

function renderTodos(list) {
  const items = list || [];
  els.todoList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "todo-empty";
    empty.textContent = "暂无待办，先添加一个目标吧。";
    els.todoList.appendChild(empty);
    return;
  }
  items.forEach((todo) => {
    els.todoList.appendChild(createTodoItem(todo));
  });
}

function createTodoItem(todo) {
  const item = document.createElement("div");
  item.className = `todo-item${todo.done ? " done" : ""}`;

  const label = document.createElement("label");
  label.className = "todo-check";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(todo.done);
  checkbox.addEventListener("change", () => toggleTodo(todo.id, checkbox.checked));

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  label.appendChild(checkbox);
  label.appendChild(text);

  const del = document.createElement("button");
  del.className = "remove-later-btn";
  del.setAttribute("aria-label", "移除");
  del.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
  del.addEventListener("click", () => deleteTodo(todo.id));

  item.appendChild(label);
  item.appendChild(del);
  return item;
}

async function addTodo() {
  const text = els.todoInput.value.trim();
  if (!text) return;
  const list = storage.getTodos();
  list.unshift({
    id: `todo_${Date.now()}`,
    text,
    done: false
  });
  storage.setTodos(list);
  state.todos = list;
  els.todoInput.value = "";
  renderTodos(state.todos);
}

async function toggleTodo(todoId, nextDone) {
  const list = storage.getTodos();
  const target = list.find((todo) => todo.id === todoId);
  if (!target) return;
  target.done = nextDone;
  storage.setTodos(list);
  state.todos = list;
  renderTodos(state.todos);
}

async function deleteTodo(todoId) {
  const list = storage.getTodos().filter((todo) => todo.id !== todoId);
  storage.setTodos(list);
  state.todos = list;
  renderTodos(state.todos);
}

function renderLaterList(list) {
  const items = list || [];
  els.laterList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "later-empty";
    empty.textContent = "此处空空如也，试试点击资源卡片的「+」号～";
    els.laterList.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "later-item";
    row.innerHTML = `
      <span class="later-item-title">${item.title}</span>
      <button class="remove-later-btn" data-id="${item.resource_id || item.id}" aria-label="移除" >
        <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;
    row.querySelector("button").addEventListener("click", () => removeFromLaterList(item.resource_id || item.id));
    els.laterList.appendChild(row);
  });
}

function isInLaterList(resourceId) {
  return state.laterItems.some((entry) => entry.resource_id === resourceId || entry.id === resourceId);
}

function setLaterButtonState(button, isAdded) {
  if (!button) return;
  button.classList.toggle("is-added", isAdded);
  button.textContent = isAdded ? "✔" : "+";
  button.setAttribute("aria-label", isAdded ? "已加入稍后再学" : "加入稍后再学");
  button.title = isAdded ? "已加入稍后再学" : "加入稍后再学";
}

function syncResourceCardLaterButton(resourceId, isAdded) {
  if (!els.resourceContainer) return;
  const button = els.resourceContainer.querySelector(`.card[data-resource-id="${resourceId}"] .add-later-btn`);
  setLaterButtonState(button, isAdded);
}

async function addToLaterList(item) {
  if (isInLaterList(item.id)) {
    syncResourceCardLaterButton(item.id, true);
    return true;
  }
  const list = storage.getLaterList();
  if (list.some((entry) => entry.id === item.id)) {
    syncResourceCardLaterButton(item.id, true);
    return true;
  }
  list.unshift({
    id: item.id,
    title: item.title,
    url: item.url || ""
  });
  storage.setLaterList(list);
  state.laterItems = list;
  renderLaterList(state.laterItems);
  syncResourceCardLaterButton(item.id, true);
  return true;
}

async function removeFromLaterList(itemId) {
  const list = storage.getLaterList().filter((item) => item.id !== itemId);
  storage.setLaterList(list);
  state.laterItems = list;
  renderLaterList(state.laterItems);
  syncResourceCardLaterButton(itemId, false);
  return true;
}

async function loadTodos() {
  try {
    state.todos = await fetchJson(`${API_BASE}/todos`);
  } catch (error) {
    state.todos = storage.getTodos();
  }
  renderTodos(state.todos);
}

async function loadLaterItems() {
  try {
    state.laterItems = await fetchJson(`${API_BASE}/later`);
  } catch (error) {
    state.laterItems = storage.getLaterList();
  }
  renderLaterList(state.laterItems);
}

function getUploadsForCategory(categoryId) {
  if (!categoryId) return [];
  const uploads = storage.getUploads();
  return uploads[categoryId] || [];
}

function openUploadModal(mode = "upload") {
  uiState.uploadMode = mode;
  if (mode === "apply") {
    els.uploadModalTitle.textContent = "新建栏目申请";
    els.uploadTitleLabel.textContent = "你要为该栏目上传的第一个内容";
    els.saveUpload.textContent = "保存并提交申请";
  } else {
    els.uploadModalTitle.textContent = "上传学习内容";
    els.uploadTitleLabel.textContent = "标题";
    els.saveUpload.textContent = "保存";
  }
  els.uploadModal.classList.add("show");
}

function closeUploadModal() {
  els.uploadModal.classList.remove("show");
  els.uploadTitle.value = "";
  els.uploadUrl.value = "";
  els.uploadDesc.value = "";
  els.uploadTags.value = "";
  els.uploadPlatform.value = "";
}

async function saveUpload(event) {
  if (event) event.preventDefault();
  const title = els.uploadTitle.value.trim();
  const url = els.uploadUrl.value.trim();
  const category = ensureActiveResourceCategory();
  if (!title || !url || !category) return;
  if (uiState.uploadMode === "apply") {
    closeUploadModal();
    alert("管理员已收到你的新建栏目申请，请耐心等待");
    return;
  }
  const description = els.uploadDesc.value.trim();
  const tagsStr = els.uploadTags.value.trim();

  const tags = tagsStr ? tagsStr.split(/,|，/).map(t => t.trim()).filter(Boolean) : []; 

 
  const uploadsMap = storage.getUploads();
  if (!uploadsMap[category.id]) {
    uploadsMap[category.id] = [];
  }
  
  const newResource = {
    id: `local_res_${Date.now()}`, 
    title: title,
    url: url,
    description: description || null,
    tags: tags,
    client_id: getClientId()
  };
  
  uploadsMap[category.id].unshift(newResource);
  storage.setUploads(uploadsMap);

  closeUploadModal();
  showResourceView();
  updateActiveNav();
  await renderResources();
}

async function renameResource(item, nextTitle) {
  const title = nextTitle.trim();
  const category = ensureActiveResourceCategory();
  if (!category) {
    await renderResources();
    return;
  }
  if (!title || title === item.title) {
    await renderResources();
    return;
  }

  if (String(item.id).startsWith("local_")) {
    const uploadsMap = storage.getUploads();
    if (uploadsMap[category.id]) {
      const target = uploadsMap[category.id].find(r => r.id === item.id);
      if (target) {
        target.title = title;
        storage.setUploads(uploadsMap);
      }
    }
    await renderResources();
    return;
  }

  try {
    await fetchJson(`${API_BASE}/subjects/${category.id}/resources/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    delete state.resourceCache[category.id];
    showResourceView();
    updateActiveNav();
    await renderResources();
  } catch (error) {
    alert(`编辑失败：${error.message}`);
    await renderResources();
  }
}

async function deleteResource(item) {
  if (!confirm(`确定删除「${item.title}」？`)) return;
  const category = ensureActiveResourceCategory();
  if (!category) return;

  if (String(item.id).startsWith("local_")) {
      const uploadsMap = storage.getUploads();
      if (uploadsMap[category.id]) {
        uploadsMap[category.id] = uploadsMap[category.id].filter(r => r.id !== item.id);
        storage.setUploads(uploadsMap);
      }
      
      state.laterItems = state.laterItems.filter((later) => (later.resource_id || later.id) !== item.id);
      renderLaterList(state.laterItems);
      await renderResources();
      return;
    }

  try {
    await fetchJson(`${API_BASE}/subjects/${category.id}/resources/${item.id}`, {
      method: "DELETE"
    });
    delete state.resourceCache[category.id];
    state.laterItems = state.laterItems.filter((later) => (later.resource_id || later.id) !== item.id);
    renderLaterList(state.laterItems);
    showResourceView();
    updateActiveNav();
    await renderResources();
  } catch (error) {
    alert(`删除失败：${error.message}`);
  }
}

function createResourceCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.resourceId = String(item.id);
  const tags = [...(item.tags || [])];
  if (item.platform && !tags.includes(item.platform)) tags.push(item.platform);
  const canEdit = uiState.isResourceEditMode && item.client_id === getClientId();
  const titleHtml = canEdit
    ? `<input class="resource-rename-input" type="text" value="${item.title.replace(/"/g, "&quot;")}" aria-label="编辑资源标题" />`
    : `<h3>${item.title}</h3>`;
  const editActionsHtml = canEdit
    ? `<button class="resource-delete-btn" type="button" aria-label="删除资源">×</button>`
    : "";

  card.innerHTML = `
    <div class="card-top">
      ${titleHtml}
      ${editActionsHtml}
      <button class="later-plus add-later-btn add-to-later-btn" type="button" data-action="later" aria-label="加入稍后再学" title="加入稍后再学">+</button>
    </div>
    <div class="tags">${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    <p class="card-desc">${item.description || ""}</p>
    <button class="btn primary card-open open-resource-btn" type="button" aria-label="立即前往" title="立即前往" data-tooltip="立即前往">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
  const openBtn = card.querySelector(".card-open");
  const laterBtn = card.querySelector("[data-action='later']");
  const renameInput = card.querySelector(".resource-rename-input");
  const deleteBtn = card.querySelector(".resource-delete-btn");
  const inLaterList = isInLaterList(item.id);
  setLaterButtonState(laterBtn, inLaterList);
  openBtn.addEventListener("click", () => window.open(item.url, "_blank"));
  laterBtn.addEventListener("click", async () => {
    if (isInLaterList(item.id)) {
      await removeFromLaterList(item.id);
      return;
    }
    await addToLaterList(item);
  });

  if (renameInput) {
    let submitted = false;
    const submitRename = async () => {
      if (submitted) return;
      submitted = true;
      await renameResource(item, renameInput.value);
    };
    renameInput.addEventListener("click", (event) => event.stopPropagation());
    renameInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await submitRename();
    });
    renameInput.addEventListener("blur", async () => {
      await submitRename();
    });
  }

  deleteBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await deleteResource(item);
  });
  return card;
}

async function deleteSiteById(siteId, title) {
  if (!confirm(`确定删除「${title}」？`)) return;
  const customSites = storage.getCustomSites();
  storage.setCustomSites(customSites.filter((s) => s.id !== siteId));
  state.sites = state.sites.filter((site) => site.id !== siteId);
  renderSites();
}

function createSiteCard(item) {
  const card = document.createElement("div");
  card.className = "card site-card";
  card.setAttribute("draggable", "true");
  card.dataset.siteId = item.id;
  const initial = item.title?.[0] || "站";
  const isEditMode = els.siteContainer?.classList.contains("is-editing") || false;

  const head = document.createElement("div");
  head.className = "site-head";
  const main = document.createElement("div");
  main.className = "site-main";
  const icon = document.createElement("div");
  icon.className = "site-icon";
  icon.textContent = initial;
  main.appendChild(icon);

  const actions = document.createElement("div");
  actions.className = "site-actions";

  if (isEditMode) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "site-rename-input";
    input.value = item.title;
    input.setAttribute("aria-label", "编辑网站名称");
    let submitted = false;
    const submitRename = async () => {
      if (submitted) return;
      submitted = true;
      await renameSiteTitle(item.id, input.value);
    };
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await submitRename();
      }
    });
    input.addEventListener("blur", async () => {
      await submitRename();
    });
    main.appendChild(input);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "site-delete-btn";
    deleteBtn.setAttribute("aria-label", "删除");
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteSiteById(item.id, item.title);
    });

    actions.appendChild(deleteBtn);
  } else {
    const title = document.createElement("h3");
    title.className = "site-title";
    title.textContent = item.title;
    main.appendChild(title);
  }
  head.appendChild(main);
  head.appendChild(actions);
  card.appendChild(head);


  card.addEventListener("click", (e) => {
    if (els.siteContainer?.classList.contains("is-editing")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (state.isDraggingSite || (e.target instanceof Element && e.target.closest(".site-delete-btn"))) return;
    window.open(item.url, "_blank");
  });


  
  card.addEventListener("dragstart", (event) => {
    
    if (els.searchInput.value.trim() !== "" || !els.siteContainer.classList.contains("is-editing")) {
      event.preventDefault();
      return;
    }
    state.isDraggingSite = true;
    state.draggedSiteId = item.id; 
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(item.id));
    card.style.opacity = "0.4"; 
  });

  card.addEventListener("dragend", () => {
    state.isDraggingSite = false;
    state.draggedSiteId = null;
    card.style.opacity = "1";
  });

  
  card.addEventListener("dragover", (event) => {
    if (!els.siteContainer.classList.contains("is-editing")) return;
    event.preventDefault(); 
    event.dataTransfer.dropEffect = "move";
  });

  card.addEventListener("drop", (event) => {
    if (!els.siteContainer.classList.contains("is-editing")) return;
    event.preventDefault();
    
    const draggedId = state.draggedSiteId || event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === item.id) return;

    const oldIndex = state.sites.findIndex(s => s.id === draggedId);
    const newIndex = state.sites.findIndex(s => s.id === item.id);

    if (oldIndex > -1 && newIndex > -1) {
      
      const [movedItem] = state.sites.splice(oldIndex, 1);
      state.sites.splice(newIndex, 0, movedItem);
      
    
      const currentOrder = state.sites.map(s => s.id);
      localStorage.setItem("siteSortOrder", JSON.stringify(currentOrder));
      
      renderSites();
    }
  });
  return card;
}

function setupDropZone(zone, sectionId) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragover");
    const siteId = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/site-id");
    if (!siteId) return;
    assignSite(siteId, sectionId);
  });
}

async function fetchSiteData(fallbackSites) {
  const localCustomSites = storage.getCustomSites();
  try {
    state.siteSections = await fetchJson(`${API_BASE}/sites/sections`);
    const apiSites = await fetchJson(`${API_BASE}/sites`);
    state.sites = [...apiSites, ...localCustomSites];
  } catch (error) {
    state.siteSections = storage.getSiteSections();
    state.sites = [...(fallbackSites || []), ...localCustomSites];
  }
  const savedOrderStr = localStorage.getItem("siteSortOrder");
  if (savedOrderStr) {
    const sortOrder = JSON.parse(savedOrderStr);
    state.sites.sort((a, b) => {
      const indexA = sortOrder.indexOf(a.id);
      const indexB = sortOrder.indexOf(b.id);
      
      const posA = indexA === -1 ? 9999 : indexA;
      const posB = indexB === -1 ? 9999 : indexB;
      return posA - posB;
    });
  }
}

function applyResourceFilters(list) {
  const keyword = els.searchInput.value.trim();
  let result = [...list];

  if (keyword) {
    const searchTerms = keyword.split(/\s+/).filter(Boolean);
    result = list.filter((item) => {
      const targetText = (item.title + " " + (item.description || "")).toLowerCase();
      return searchTerms.every(term => targetText.includes(term.toLowerCase()));
    });
  }

  result.sort((a, b) => getResourceHeatFromItem(b) - getResourceHeatFromItem(a));
  return result;
}

function getResourceHeatFromItem(item) {
  const likeCount = item.like_count ?? 0;
  const commentCount = item.comment_count ?? 0;
  return likeCount + commentCount * 2;
}

function getResourceCreatedAt(item) {
  if (typeof item.createdAt === "number") return item.createdAt;
  const numeric = Number(item.id);
  return Number.isNaN(numeric) ? 0 : numeric;
}

async function initOnlineCount() {
  try {
    const data = await fetchJson(`${API_BASE}/study-room/online`);
    els.onlineCount.textContent = data.currentUsers ?? 0;
  } catch (error) {
    const count = Math.floor(Math.random() * 60) + 20;
    els.onlineCount.textContent = count;
  }
}

function stopOnlineCountPolling() {
  if (!onlineCountPollTimer) return;
  clearInterval(onlineCountPollTimer);
  onlineCountPollTimer = null;
}

function startOnlineCountPolling({ immediate = false } = {}) {
  stopOnlineCountPolling();
  if (immediate && !document.hidden) {
    initOnlineCount();
  }
  if (document.hidden) return;
  onlineCountPollTimer = setInterval(() => {
    initOnlineCount();
  }, ONLINE_COUNT_POLL_INTERVAL);
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopOnlineCountPolling();
    return;
  }
  startOnlineCountPolling({ immediate: true });
}

function setPomodoroToggleIcon(isRunning) {
  if (!els.pomodoroToggle) return;
  if (isRunning) {
    els.pomodoroToggle.setAttribute("aria-label", "暂停");
    els.pomodoroToggle.removeAttribute("title");
    els.pomodoroToggle.removeAttribute("data-tooltip");
    els.pomodoroToggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" fill="currentColor"/>
      </svg>
    `;
    return;
  }
  els.pomodoroToggle.setAttribute("aria-label", "开始");
  els.pomodoroToggle.removeAttribute("title");
  els.pomodoroToggle.removeAttribute("data-tooltip");
  els.pomodoroToggle.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor"/>
    </svg>
  `;
}

function updatePomodoroView() {
  const hours = Math.floor(state.pomodoro.remaining / 3600);
  const minutes = Math.floor((state.pomodoro.remaining % 3600) / 60);
  const seconds = state.pomodoro.remaining % 60;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  els.pomodoroTime.textContent = timeStr;
  if (els.pomodoroTimeDisplay) {
    els.pomodoroTimeDisplay.textContent = timeStr;
  }
  els.pomodoroMode.textContent = "专注中";
  setPomodoroToggleIcon(state.pomodoro.isRunning);
}

function togglePomodoro() {
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.timer);
    state.pomodoro.isRunning = false;
    setPomodoroToggleIcon(false);
    return;
  }
  state.pomodoro.isRunning = true;
  setPomodoroToggleIcon(true);
  state.pomodoro.timer = setInterval(() => {
    if (state.pomodoro.remaining <= 0) {
      clearInterval(state.pomodoro.timer);
      state.pomodoro.isRunning = false;
      state.pomodoro.remaining = 0;
      setPomodoroToggleIcon(false);
      updatePomodoroView();
      return;
    }
    state.pomodoro.remaining -= 1;
    updatePomodoroView();
  }, 1000);
}

function initTimePicker() {
  fillSelect(els.timeHours, 0, 23);
  fillSelect(els.timeMinutes, 0, 59);
  fillSelect(els.timeSeconds, 0, 59);
  setPickerFromSeconds(state.pomodoro.workSeconds);
}

function fillSelect(select, start, end) {
  select.innerHTML = "";
  for (let i = start; i <= end; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = String(i).padStart(2, "0");
    select.appendChild(option);
  }
}

function setPickerFromSeconds(total) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  els.timeHours.value = String(hours);
  els.timeMinutes.value = String(minutes);
  els.timeSeconds.value = String(seconds);
}

function applyTimePicker() {
  const hours = Number(els.timeHours.value);
  const minutes = Number(els.timeMinutes.value);
  const seconds = Number(els.timeSeconds.value);
  if ([hours, minutes, seconds].some((value) => Number.isNaN(value))) return;
  const total = hours * 3600 + minutes * 60 + seconds;
  if (total <= 0) return;
  state.pomodoro.workSeconds = total;
  state.pomodoro.remaining = total;
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.timer);
    state.pomodoro.isRunning = false;
    setPomodoroToggleIcon(false);
  }
  updatePomodoroView();
}

function toggleView() {
  renderResources();
  renderSites();
}

function openAddSiteModal() {
  els.addSiteModal.classList.add("show");
}

function closeAddSiteModal() {
  els.addSiteModal.classList.remove("show");
  els.siteTitle.value = "";
  els.siteUrl.value = "";
  els.siteDesc.value = "";
}

async function saveCustomSite(event) {
  if (event) event.preventDefault();
  const title = els.siteTitle.value.trim();
  const url = els.siteUrl.value.trim();
  if (!title || !url) return;
  const desc = els.siteDesc.value.trim();
  const defaultSection = state.siteSections.find((section) => section.id === "default");
  const sectionId = defaultSection ? defaultSection.id : "default";
  const customSites = storage.getCustomSites();
  const newSite = {
    id: "local-" + Date.now(),
    title,
    url,
    description: desc,
    section_id: sectionId
  };
  customSites.push(newSite);
  storage.setCustomSites(customSites);
  state.sites.push(newSite);
  closeAddSiteModal();
  renderSites();
}

async function assignSite(siteId, sectionId) {
  state.sites = state.sites.map((site) => (
    site.id === siteId ? { ...site, section_id: sectionId } : site
  ));

  const customSites = storage.getCustomSites();
  const target = customSites.find((site) => site.id === siteId);
  if (target) {
    target.section_id = sectionId;
    storage.setCustomSites(customSites);
  }

  renderSites();
}

function bindEvents() {
  const drawer = document.getElementById("global-drawer");
  if (!drawer) {
    console.error("global-drawer element not found");
    return;
  }
  els.openAddSite.addEventListener("click", (event) => {
    event.stopPropagation();
    openAddSiteModal();
  });
  els.toggleEditMode?.addEventListener("click", toggleEditMode);
  els.cancelAddSite.addEventListener("click", closeAddSiteModal);
  els.saveAddSite.addEventListener("click", saveCustomSite);
  els.addTodo?.addEventListener("click", addTodo);
  els.todoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTodo();
  });

  els.openFeedback?.addEventListener("click", () => {
    els.feedbackTitle.textContent = "意见反馈";
    els.feedbackFormGroup.style.display = "flex";
    els.feedbackActions.style.display = "flex";
    els.feedbackText.value = "";
    els.feedbackModal.classList.add("show");
    const oldMsg = document.getElementById("feedback-success-msg");
    if (oldMsg) oldMsg.remove();
  });
  els.cancelFeedback?.addEventListener("click", () => {
    els.feedbackModal.classList.remove("show");
  });
  els.submitFeedback?.addEventListener("click", async() => {
    const text = els.feedbackText.value.trim();
    if (!text) {
      alert("反馈内容不能为空");
      return;
    }

    try {
      await fetchJson(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
      });
    } catch (error) {
      console.error("提交反馈失败，可能是网络问题或处于离线模式", error);
      
    }
    els.feedbackTitle.textContent = "提交成功";
    els.feedbackFormGroup.style.display = "none";
    els.feedbackActions.style.display = "none";

    const successMsg = document.createElement("p");
    successMsg.id = "feedback-success-msg";
    successMsg.style.color = "var(--primary)";
    successMsg.style.margin = "20px 0";
    successMsg.style.textAlign = "center";
    successMsg.textContent = "您的宝贵反馈我们已收到，感谢您的每一个建议！";
    els.feedbackTitle.after(successMsg);
    setTimeout(() => {
      els.feedbackModal.classList.remove("show");
    }, 2500);
  });

  els.cancelUpload.addEventListener("click", closeUploadModal);
  els.saveUpload.addEventListener("click", saveUpload);
  els.openUpload?.addEventListener("click", () => openUploadModal("upload"));
  els.toggleResourceEdit?.addEventListener("click", toggleResourceEditMode);
  els.pomodoroToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePomodoro();
  });
  els.timeHours.addEventListener("change", applyTimePicker);
  els.timeMinutes.addEventListener("change", applyTimePicker);
  els.timeSeconds.addEventListener("change", applyTimePicker);
  els.bottomSitesBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleBottomPanel();
  });
  els.bottomPanelHandle?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeBottomPanel({ restoreTriggerFocus: true });
  });
  els.bottomPanelHandle?.addEventListener("touchstart", (event) => {
    bottomPanelTouchStartY = event.touches?.[0]?.clientY ?? null;
  }, { passive: true });
  els.bottomPanelHandle?.addEventListener("touchend", (event) => {
    if (bottomPanelTouchStartY === null) return;
    const endY = event.changedTouches?.[0]?.clientY ?? bottomPanelTouchStartY;
    const delta = endY - bottomPanelTouchStartY;
    bottomPanelTouchStartY = null;
    if (delta > 48) {
      closeBottomPanel({ restoreTriggerFocus: false });
    }
  }, { passive: true });
  els.headerTodoIcon?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleGlobalDrawer("todos");
  });
  els.headerStudyIcon?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleGlobalDrawer("study");
  });
  els.globalDrawerBackdrop?.addEventListener("click", () => {
    closeAllFloatingPanels();
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const isEditingSites = els.siteContainer?.classList.contains("is-editing");
    if (isEditingSites) {
      
      const clickedInsideCard = target instanceof Element && target.closest('.site-card');
      const clickedEditToggle = els.toggleEditMode?.contains(target);
      
      
      if (!clickedInsideCard && !clickedEditToggle) {
        els.siteContainer.classList.remove("is-editing");
        document.body.dataset.editMode = "false";
        els.toggleEditMode?.setAttribute("aria-pressed", "false");
        uiState.editingSiteId = null;
        renderSites();
      }
    }
    const clickedInsideModal =
      target instanceof Element &&
      Boolean(target.closest(".modal") || target.closest(".modal-card"));
    if (clickedInsideModal) {
      return;
    }
    const clickedInsideFloatingPanel =
      (els.globalDrawer?.contains(target) || false) ||
      (els.headerQuickActions?.contains(target) || false) ||
      (els.bottomPanel?.contains(target) || false) ||
      (els.bottomBar?.contains(target) || false) ||
      (els.addSiteModal?.contains(target) || false) ||
      (els.uploadModal?.contains(target) || false);
    if (!clickedInsideFloatingPanel) {
      closeAllFloatingPanels();
    }

    els.btnExport?.addEventListener("click", exportUserData);
  
    els.btnImport?.addEventListener("click", (e) => {
      e.stopPropagation();
      els.importFileInput?.click();
    });
    
    els.importFileInput?.addEventListener("change", importUserData);
  });
  document.addEventListener("keydown", (event) => {
    if (event.isComposing || event.defaultPrevented) return;
    const target = event.target;
    const isTypingTarget =
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if (isTypingTarget && event.key !== "Escape") return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
      event.preventDefault();
      toggleBottomPanel();
      return;
    }
    if (event.key === "Escape") {
      closeAllFloatingPanels();
    }
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", stopOnlineCountPolling);
  window.addEventListener("resize", syncDesktopLayoutMetrics);
  if (els.roomQuote) {
    els.roomQuote.addEventListener("change", () => {
      storage.setRoomQuote(els.roomQuote.value.trim());
    });
  }
  els.searchInput.addEventListener("input", () => {
    renderResources();
    renderSites();
  });
  els.brand?.addEventListener("click", handleBrandHomeNavigation);
  els.brand?.addEventListener("keydown", handleBrandKeydown);
  syncDesktopLayoutMetrics();
  syncBottomPanelState();
}

loadData();
bindEvents();
