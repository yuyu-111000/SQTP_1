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


// ── Auth ─────────────────────────────────────────

function getToken() {
  return localStorage.getItem("authToken");
}

function setToken(token) {
  localStorage.setItem("authToken", token);
}

function clearToken() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setAuthUser(user) {
  localStorage.setItem("authUser", JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const user = getAuthUser();
  return user && user.is_admin;
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch { return null; }
}

let _lastAuthState = null;

function updateAuthUI() {
  const area = document.getElementById('header-auth-area');
  if (!area) return;
  const loggedIn = isLoggedIn();
  const admin = isAdmin();
  const user = getAuthUser();

  // Skip if auth state hasn't changed (prevents redundant DOM mutations)
  const stateKey = `${loggedIn}-${admin}-${user?.username || ''}`;
  if (stateKey === _lastAuthState) return;
  _lastAuthState = stateKey;

  if (loggedIn) {
    let html = '';
    if (admin) html += '<span class="header-admin-badge">管理员</span>';
    html += `<span class="header-username">${user.username}</span>`;
    if (admin) {
      html += `<button class="btn ghost btn-sm" id="btn-admin-panel" title="管理面板"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>`;
    }
    html += `<button class="btn ghost btn-sm" id="btn-logout" title="退出登录"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>`;
    area.innerHTML = html;

    document.getElementById('btn-admin-panel')?.addEventListener('click', (e) => { e.stopPropagation(); openAdminPanel(); });
    document.getElementById('btn-logout')?.addEventListener('click', logout);
  } else {
    area.innerHTML = '<button class="btn ghost btn-sm" id="btn-show-login">登录</button>';
    document.getElementById('btn-show-login')?.addEventListener('click', () => {
      document.getElementById('auth-modal').classList.add('show');
      resetUserPanel();
    });
  }

  // Toggle upload + edit buttons
  const displayVal = loggedIn ? '' : 'none';
  const ids = ['open-upload', 'toggle-resource-edit', 'toggle-edit-mode', 'open-add-site'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.style.display !== displayVal) el.style.display = displayVal;
  });

  // Toggle quick-add subject (admin only)
  const quickAdd = document.getElementById('quick-add-subject');
  if (quickAdd) quickAdd.style.display = admin ? '' : 'none';

  // Hide feedback + apply buttons for admin
  const fbBtn = document.getElementById('open-feedback-btn');
  const applyBtn = document.getElementById('open-admin-apply-btn');
  const fbDisplay = admin ? 'none' : '';
  if (fbBtn) fbBtn.style.display = fbDisplay;
  if (applyBtn) applyBtn.style.display = fbDisplay;
}

function logout() {
  clearToken();
  updateAuthUI();
  document.getElementById('auth-modal').classList.remove('show');
}

// ── END Auth ─────────────────────────────────────


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

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let detail = "";
    try {
      const text = await res.text();
      // Try to extract detail from JSON error response
      try {
        const parsed = JSON.parse(text);
        detail = parsed.detail || text;
      } catch {
        detail = text;
      }
    } catch (error) {
      detail = `请求失败 (${res.status})`;
    }
    // 401 with token = session expired. Clear token but don't modify UI here —
    // let the caller decide how to handle it (avoids race conditions in loadData)
    if (res.status === 401 && token) {
      clearToken();
      throw new Error("AUTH_EXPIRED");
    }
    throw new Error(detail || `请求失败 (${res.status})`);
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
  saveUpload: document.getElementById("save-upload"),
  uploadTitle: document.getElementById("upload-title"),
  uploadUrl: document.getElementById("upload-url"),
  uploadDesc: document.getElementById("upload-desc"),
  uploadTags: document.getElementById("upload-tags"),
  uploadPlatform: document.getElementById("upload-platform"),
  todoInput: document.getElementById("todo-input"),
  todoList: document.getElementById("todo-list"),
  laterList: document.getElementById("later-list"),
  pomodoroTimeDisplay: document.getElementById("pomodoro-time-display"),
  toggleEditMode: document.getElementById("toggle-edit-mode"),
  feedbackModal: document.getElementById("feedback-modal"),
  feedbackText: document.getElementById("feedback-text"),
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

let loadDataRunning = false;

async function loadData() {
  if (loadDataRunning) return;
  loadDataRunning = true;

  let authExpired = false;
  const safeFetch = async (url, opts = {}) => {
    try {
      return await fetchJson(url, opts);
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') authExpired = true;
      throw e;
    }
  };

  try {
    let localData = {};
    try {
      localData = await safeFetch(dataUrl);
    } catch (error) {
      localData = {};
    }

    try {
      const subjects = await safeFetch(`${API_BASE}/subjects`);
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
    initOnlineCount();
    await loadTodos();
  } finally {
    loadDataRunning = false;
    if (authExpired) {
      updateAuthUI();
    }
  }
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
    els.resourceContainer.innerHTML = "<div class=\"loading-placeholder\">加载中...</div>";
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
      els.resourceContainer.innerHTML = "<div class=\"loading-placeholder\">加载中...</div>";
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
  del.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteTodo(todo.id);
  });

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
    row.style.cursor = "pointer";
    row.innerHTML = `
      <span class="later-item-title">${item.title}</span>
      <button class="remove-later-btn" data-id="${item.resource_id || item.id}" aria-label="移除" >
        <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;
    row.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromLaterList(item.resource_id || item.id);
    });
    row.addEventListener("click", () => navigateToLaterResource(item));
    els.laterList.appendChild(row);
  });
}

async function navigateToLaterResource(entry) {
  const resourceId = entry.resource_id || entry.id;
  const subjectId = entry.subject_id;

  // Find the subject
  let targetSubjectId = subjectId;
  if (!targetSubjectId) {
    // Fallback: search caches for the resource
    for (const [catId, resources] of Object.entries(state.resourceCache)) {
      if (resources.some((r) => String(r.id) === String(resourceId))) {
        targetSubjectId = catId;
        break;
      }
    }
  }

  if (!targetSubjectId) {
    // Still not found — try to just remove it
    await removeFromLaterList(resourceId);
    return;
  }

  // Switch to the target subject
  state.activeResourceCategory = targetSubjectId;
  localStorage.setItem(CATEGORY_KEY, String(targetSubjectId));
  updateActiveNav();

  // Show resource view with loading placeholder
  els.resourceContainer.innerHTML = "<div class=\"loading-placeholder\">加载中...</div>";
  showResourceView();

  // Force refresh the cache to ensure the resource is in the list
  delete state.resourceCache[targetSubjectId];
  await renderResources();

  // Scroll to and flash the resource card
  setTimeout(() => {
    const card = els.resourceContainer.querySelector(`[data-resource-id="${resourceId}"]`);
    if (card) {
      card.scrollIntoView({ block: "center", behavior: "smooth" });
      card.classList.add("later-flash");
      card.addEventListener("animationend", () => {
        card.classList.remove("later-flash");
      }, { once: true });
    }
  }, 300);

  // Remove from later list
  await removeFromLaterList(resourceId);
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
    url: item.url || "",
    subject_id: item.subject_id || state.activeResourceCategory || ""
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
    els.saveUpload.textContent = "保存并提交申请";
  } else {
    els.uploadModalTitle.textContent = "上传学习内容";
    els.saveUpload.textContent = "保存";
  }
  els.uploadModal.classList.add("show");
}

function closeUploadModal() {
  els.uploadModal.classList.remove("show");
  els.uploadTitle.value = "";
  els.uploadUrl.value = "";
  els.uploadDesc.value = "";
  const detDesc = document.getElementById("upload-detailed-desc");
  if (detDesc) detDesc.value = "";
  els.uploadTags.value = "";
  els.uploadPlatform.value = "";
  document.getElementById("url-extract-status").textContent = "";
}

async function extractUrlMeta(url) {
  const statusEl = document.getElementById("url-extract-status");
  statusEl.textContent = "正在提取网页信息...";
  try {
    const data = await fetchJson(`${API_BASE}/subjects/extract-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (data.title) els.uploadTitle.value = data.title;
    if (data.description) els.uploadDesc.value = data.description;
    statusEl.textContent = "信息已自动填充，可手动修改";
  } catch (e) {
    statusEl.textContent = "无法自动提取，请手动填写";
  }
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
  const detailedDescEl = document.getElementById("upload-detailed-desc");
  const detailedDescription = detailedDescEl ? detailedDescEl.value.trim() : "";
  const tagsStr = els.uploadTags.value.trim();
  const platform = els.uploadPlatform.value.trim();

  const tags = tagsStr ? tagsStr.split(/,|，/).map(t => t.trim()).filter(Boolean) : [];

  // If logged in, submit via API
  if (isLoggedIn()) {
    try {
      await fetchJson(`${API_BASE}/subjects/${category.id}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          description: description || null,
          detailed_description: detailedDescription || null,
          tags: tags.join(","),
          platform: platform || null,
          visibility: "public",
        }),
      });
    } catch (e) {
      alert("上传失败: " + e.message);
      return;
    }
  } else {
    // Fallback to localStorage for non-logged-in users
    const uploadsMap = storage.getUploads();
    if (!uploadsMap[category.id]) {
      uploadsMap[category.id] = [];
    }
    const newResource = {
      id: `local_res_${Date.now()}`,
      title: title,
      url: url,
      description: description || null,
      detailed_description: detailedDescription || null,
      tags: tags,
      platform: platform || null,
      client_id: getClientId(),
      status: "approved",
      visibility: "public",
    };
    uploadsMap[category.id].unshift(newResource);
    storage.setUploads(uploadsMap);
  }

  delete state.resourceCache[category.id];
  closeUploadModal();
  els.resourceContainer.innerHTML = "<div class=\"loading-placeholder\">加载中...</div>";
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
    els.resourceContainer.innerHTML = "<div class=\"loading-placeholder\">加载中...</div>";
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

  // Status badge
  let badgeHtml = "";
  if (item.status === "pending") {
    badgeHtml = '<span class="resource-badge pending">审核中</span>';
  } else if (item.status === "rejected") {
    badgeHtml = '<span class="resource-badge rejected">已拒绝</span>';
  } else if (item.visibility === "private") {
    badgeHtml = '<span class="resource-badge private">私有</span>';
  }

  const authUser = getAuthUser();
  const canEdit = uiState.isResourceEditMode && (
    item.submitter_id === authUser?.id ||
    (isAdmin() && item.client_id === "default")
  );
  const titleHtml = canEdit
    ? `<input class="resource-rename-input" type="text" value="${item.title.replace(/"/g, "&quot;")}" aria-label="编辑资源标题" />`
    : `<h3>${item.title}${badgeHtml}</h3>`;
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
    <button class="btn primary card-open open-resource-btn" type="button" aria-label="预览资源" title="预览资源" data-tooltip="预览资源">
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
  openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openPreviewModal(item);
  });
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

// ── Auth UI handlers ─────────────────────────────────

let userAuthMode = 'login'; // 'login' or 'register'

function initAuthUI() {
  // Tab switching
  document.querySelectorAll('.auth-modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.authTab;
      document.querySelectorAll('.auth-modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-modal-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.querySelector(`[data-auth-panel="${tabName}"]`);
      if (panel) panel.classList.add('active');
      document.querySelectorAll('.auth-error').forEach(e => e.textContent = '');
      // Reset user panel to login mode when switching
      resetUserPanel();
    });
  });

  // User panel: unified login-then-register flow
  document.getElementById('user-auth-submit').addEventListener('click', async () => {
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const errEl = document.getElementById('user-auth-error');
    errEl.textContent = '';

    if (!username || !password) { errEl.textContent = '请填写用户名和密码'; return; }

    if (userAuthMode === 'register') {
      // Register flow
      const confirm = document.getElementById('user-password-confirm').value;
      if (password !== confirm) { errEl.textContent = '两次密码不一致'; return; }
      try {
        const data = await fetchJson(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        setToken(data.access_token);
        setAuthUser(data.user);
        onLoginSuccess();
      } catch (e) {
        errEl.textContent = e.message;
      }
      return;
    }

    // Login flow: try login first
    try {
      const data = await fetchJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      setToken(data.access_token);
      setAuthUser(data.user);
      onLoginSuccess();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('用户不存在') || msg.includes('404')) {
        // User doesn't exist — offer to register
        showRegisterMode('账号不存在，输入确认密码即可注册');
      } else if (msg.includes('密码错误') || msg.includes('401')) {
        errEl.textContent = '密码错误，请重试';
      } else {
        errEl.textContent = msg;
      }
    }
  });

  // Admin login
  document.getElementById('admin-auth-submit').addEventListener('click', async () => {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    const errEl = document.getElementById('admin-auth-error');
    if (!username || !password) { errEl.textContent = '请填写管理员账号和密码'; return; }
    errEl.textContent = '';
    try {
      const data = await fetchJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!data.user.is_admin) {
        errEl.textContent = '该账号不是管理员，请使用用户入口';
        return;
      }
      setToken(data.access_token);
      setAuthUser(data.user);
      onLoginSuccess();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('用户不存在') || msg.includes('404')) {
        errEl.textContent = '管理员账号不存在';
      } else if (msg.includes('密码错误') || msg.includes('401')) {
        errEl.textContent = '管理员密码错误';
      } else {
        errEl.textContent = msg;
      }
    }
  });

  // Reset to login mode when username or password changes
  document.getElementById('user-username').addEventListener('input', resetUserPanel);
  document.getElementById('user-password').addEventListener('input', resetUserPanel);
}

function showRegisterMode(hint) {
  userAuthMode = 'register';
  document.getElementById('user-confirm-group').style.display = '';
  document.getElementById('user-auth-submit').textContent = '注册';
  document.getElementById('user-auth-hint').style.display = '';
  document.getElementById('user-auth-hint').innerHTML = `${hint} · <a href="#" id="back-to-login" style="color:var(--primary);cursor:pointer">返回登录</a>`;
  document.getElementById('back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    resetUserPanel();
  });
}

function resetUserPanel() {
  userAuthMode = 'login';
  document.getElementById('user-confirm-group').style.display = 'none';
  document.getElementById('user-auth-submit').textContent = '登录';
  document.getElementById('user-auth-hint').style.display = 'none';
  document.getElementById('user-auth-hint').innerHTML = '';
  document.getElementById('user-password-confirm').value = '';
  document.getElementById('user-auth-error').textContent = '';
}

function onLoginSuccess() {
  document.getElementById('auth-modal').classList.remove('show');
  updateAuthUI();
  loadData();
}

// ── Preview modal ────────────────────────────────────

function openPreviewModal(item) {
  // Store url on DOM
  const jumpBtn = document.getElementById('preview-jump');
  if (jumpBtn) jumpBtn.dataset.url = item.url;

  document.getElementById('preview-title').textContent = item.title || '';
  document.getElementById('preview-desc').textContent = item.description || '';

  // Detailed description
  const detDescEl = document.getElementById('preview-detailed-desc');
  if (detDescEl) {
    detDescEl.textContent = item.detailed_description || '暂无详细介绍';
  }

  // Image
  const imgEl = document.getElementById('preview-image');
  const placeholder = document.getElementById('preview-cover-placeholder');
  if (item.og_image) {
    imgEl.src = item.og_image;
    imgEl.style.display = '';
    if (placeholder) placeholder.style.display = 'none';
  } else {
    imgEl.style.display = 'none';
    if (placeholder) placeholder.style.display = '';
  }

  // Meta
  const metaEl = document.getElementById('preview-meta');
  let metaHtml = '';
  if (item.platform) metaHtml += `<span>平台：${item.platform}</span>`;
  if (item.tags && item.tags.length) {
    metaHtml += '<span>' + item.tags.map(t => `<span class="tag">${t}</span>`).join(' ') + '</span>';
  }
  metaEl.innerHTML = metaHtml;

  document.getElementById('preview-modal').classList.add('show');
}

// ── Admin panel ──────────────────────────────────────

function openAdminPanel() {
  document.getElementById('admin-panel-modal').classList.add('show');
  loadAdminReviewList();
  loadAdminUsersList();
}

async function loadAdminReviewList() {
  const listEl = document.getElementById('admin-review-list');
  listEl.innerHTML = '<p style="font-size:12px">加载中...</p>';
  try {
    const items = await fetchJson(`${API_BASE}/admin/pending-resources`);
    if (!items.length) {
      listEl.innerHTML = '<p style="font-size:12px;color:var(--text-secondary)">暂无待审批资源</p>';
      return;
    }
    listEl.innerHTML = items.map(item => `
      <div class="admin-review-item">
        <div class="review-info">
          <h4>${item.title}</h4>
          <p>${item.url}</p>
          <p style="margin-top:2px">${item.description || ''} | 平台: ${item.platform || '-'} | 提交者: ${item.submitter_id || '-'}</p>
        </div>
        <div class="admin-review-actions">
          <button class="btn primary btn-sm" onclick="reviewResource('${item.id}','approved')">通过</button>
          <button class="btn ghost btn-sm" onclick="reviewResource('${item.id}','rejected')">拒绝</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = '<p style="font-size:12px;color:#e53e3e">加载失败</p>';
  }
}

async function reviewResource(resourceId, status) {
  try {
    await fetchJson(`${API_BASE}/admin/resources/${resourceId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadAdminReviewList();
  } catch (e) {
    alert('操作失败: ' + e.message);
  }
}

async function loadAdminUsersList() {
  const listEl = document.getElementById('admin-users-list');
  const appListEl = document.getElementById('admin-applications-list');
  listEl.innerHTML = '<p style="font-size:12px">加载中...</p>';
  try {
    const users = await fetchJson(`${API_BASE}/auth/admin/users`);
    listEl.innerHTML = users.map(u => `
      <div class="admin-user-item">
        <span><strong>${u.username}</strong> ${u.is_admin ? '<span class="resource-badge" style="background:#2b5ecf;color:#fff">管理员</span>' : ''} | 注册: ${u.created_at ? new Date(u.created_at*1000).toLocaleDateString() : '-'}</span>
        ${!u.is_admin ? `<button class="btn ghost btn-sm" onclick="promoteUser('${u.id}')">提升为管理员</button>` : ''}
      </div>
    `).join('');

    // Applications
    try {
      const apps = await fetchJson(`${API_BASE}/auth/admin/applications`);
      appListEl.innerHTML = apps.length ? apps.map(a => `
        <div class="admin-user-item">
          <span>${a.username || a.user_id} | 理由: ${a.reason || '-'} | 状态: ${a.status}</span>
          ${a.status === 'pending' ? `
            <div style="display:flex;gap:4px">
              <button class="btn primary btn-sm" onclick="handleApplication('${a.id}','approve')">通过</button>
              <button class="btn ghost btn-sm" onclick="handleApplication('${a.id}','reject')">拒绝</button>
            </div>
          ` : ''}
        </div>
      `).join('') : '<p style="font-size:12px;color:var(--text-secondary)">暂无管理员申请</p>';
    } catch(e) { appListEl.innerHTML = ''; }
  } catch (e) {
    listEl.innerHTML = '<p style="font-size:12px;color:#e53e3e">加载失败</p>';
  }
}

async function promoteUser(userId) {
  try {
    await fetchJson(`${API_BASE}/auth/admin/users/${userId}/promote`, { method: 'POST' });
    loadAdminUsersList();
  } catch (e) { alert('操作失败'); }
}

async function handleApplication(appId, action) {
  try {
    await fetchJson(`${API_BASE}/auth/admin/applications/${appId}/${action}`, { method: 'POST' });
    loadAdminUsersList();
  } catch (e) { alert('操作失败'); }
}

// ── Subject management (admin) ──────────────────────

// Guard: force admin modal open via inline style (higher priority than CSS class)
function holdAdminModal() {
  const modal = document.getElementById('admin-panel-modal');
  if (!modal || !modal.classList.contains('show')) return null;
  // Lock with inline style — survives classList changes
  modal.style.display = 'flex';
  return modal;
}
function restoreAdminModal(modal) {
  if (!modal) return;
  // Keep show class and clear inline override so CSS takes over again
  modal.classList.add('show');
  modal.style.display = '';
}

// Incremental sidebar updates — avoids innerHTML wipe that causes flicker
function addSidebarSubject(s) {
  const container = els.resourceCategories;
  const li = document.createElement('li');
  li.className = 'nav-item';
  li.textContent = s.name;
  li.addEventListener('click', () => {
    state.activeResourceCategory = s.id;
    localStorage.setItem(CATEGORY_KEY, s.id);
    els.resourceContainer.innerHTML = '<div class="loading-placeholder">加载中...</div>';
    showResourceView();
    updateActiveNav();
    renderResources();
    els.resourceContent?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  container.appendChild(li);
  updateActiveNav();
}

function updateSidebarSubject(oldId, s) {
  const container = els.resourceCategories;
  for (const li of container.children) {
    // Match by index in state.resourceData since li has no data attr
    const idx = [...container.children].indexOf(li);
    if (state.resourceData[idx]?.id === oldId) {
      li.textContent = s.name;
      // Replace click handler with new id
      const newLi = li.cloneNode(true);
      newLi.addEventListener('click', () => {
        state.activeResourceCategory = s.id;
        localStorage.setItem(CATEGORY_KEY, s.id);
        els.resourceContainer.innerHTML = '<div class="loading-placeholder">加载中...</div>';
        showResourceView();
        updateActiveNav();
        renderResources();
        els.resourceContent?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      li.replaceWith(newLi);
      break;
    }
  }
  updateActiveNav();
}

function removeSidebarSubject(sid) {
  const container = els.resourceCategories;
  for (const li of container.children) {
    const idx = [...container.children].indexOf(li);
    if (state.resourceData[idx]?.id === sid) {
      li.remove();
      break;
    }
  }
  updateActiveNav();
}

function makeSubjectRowHTML(s) {
  return `
    <div class="admin-review-item" id="subject-row-${s.id}">
      <div class="review-info subject-display">
        <span><strong>${s.name}</strong> <span style="color:var(--text-secondary);font-size:11px">ID: ${s.id}</span></span>
      </div>
      <div class="review-info subject-edit" style="display:none;flex:1;gap:6px;align-items:center">
        <input class="subject-edit-id" value="${s.id}" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-secondary);color:var(--text-primary)" />
        <input class="subject-edit-name" value="${s.name.replace(/"/g, '&quot;')}" style="flex:1;padding:4px 6px;font-size:12px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-secondary);color:var(--text-primary)" />
        <button class="btn primary btn-sm subject-save-btn">保存</button>
        <button class="btn ghost btn-sm subject-cancel-btn">取消</button>
      </div>
      <div class="admin-review-actions subject-actions">
        <button class="btn ghost btn-sm edit-subject-btn" data-sid="${s.id}">编辑</button>
        <button class="btn ghost btn-sm delete-subject-btn" data-sid="${s.id}" style="color:#e53e3e">删除</button>
      </div>
    </div>`;
}

function bindSubjectRowEvents(row) {
  const sid = row.id.replace('subject-row-', '');
  row.querySelector('.edit-subject-btn')?.addEventListener('click', () => {
    row.querySelector('.subject-display').style.display = 'none';
    row.querySelector('.subject-edit').style.display = '';
    row.querySelector('.subject-actions').style.display = 'none';
  });
  row.querySelector('.subject-cancel-btn')?.addEventListener('click', () => {
    row.querySelector('.subject-display').style.display = '';
    row.querySelector('.subject-edit').style.display = 'none';
    row.querySelector('.subject-actions').style.display = '';
  });
  row.querySelector('.subject-save-btn')?.addEventListener('click', async () => {
    const modal = holdAdminModal();
    const oldId = sid;
    const newId = row.querySelector('.subject-edit-id').value.trim();
    const newName = row.querySelector('.subject-edit-name').value.trim();
    if (!newId || !newName) return;
    try {
      await fetchJson(`${API_BASE}/admin/subjects/${oldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, name: newName }),
      });
      // Update state (before DOM so incremental helpers see correct data)
      const idx = state.resourceData.findIndex(c => c.id === oldId);
      if (idx >= 0) {
        state.resourceData[idx] = { ...state.resourceData[idx], id: newId, name: newName };
      }
      if (state.activeResourceCategory === oldId) {
        state.activeResourceCategory = newId;
        localStorage.setItem(CATEGORY_KEY, newId);
      }
      updateSidebarSubject(oldId, { id: newId, name: newName });
      // Replace this row with updated HTML
      const updated = { id: newId, name: newName };
      const temp = document.createElement('div');
      temp.innerHTML = makeSubjectRowHTML(updated);
      const newRow = temp.firstElementChild;
      row.replaceWith(newRow);
      bindSubjectRowEvents(newRow);
    } catch (e) { /* stay in edit mode */ }
    restoreAdminModal(modal);
  });
  row.querySelector('.delete-subject-btn')?.addEventListener('click', async () => {
    if (row.classList.contains('delete-confirming')) {
      const modal = holdAdminModal();
      try {
        await fetchJson(`${API_BASE}/admin/subjects/${sid}`, { method: 'DELETE' });
        // Update state (before DOM)
        state.resourceData = state.resourceData.filter(c => c.id !== sid);
        if (state.activeResourceCategory === sid) {
          state.activeResourceCategory = state.resourceData[0]?.id || null;
          if (state.activeResourceCategory) localStorage.setItem(CATEGORY_KEY, state.activeResourceCategory);
        }
        removeSidebarSubject(sid);
        row.remove();
      } catch (e) { /* show error */ }
      restoreAdminModal(modal);
    } else {
      row.classList.add('delete-confirming');
      const btn = row.querySelector('.delete-subject-btn');
      btn.textContent = '确认删除';
      btn.style.color = '#fff';
      btn.style.background = '#e53e3e';
      btn.style.borderRadius = '4px';
      btn.style.padding = '2px 8px';
      setTimeout(() => {
        if (row.classList.contains('delete-confirming')) {
          row.classList.remove('delete-confirming');
          btn.textContent = '删除';
          btn.style.color = '#e53e3e';
          btn.style.background = '';
          btn.style.borderRadius = '';
          btn.style.padding = '';
        }
      }, 3000);
    }
  });
}

async function loadAdminSubjectsList() {
  const listEl = document.getElementById('admin-subjects-list');
  listEl.innerHTML = '<p style="font-size:12px">加载中...</p>';
  try {
    const subjects = await fetchJson(`${API_BASE}/admin/subjects`);
    if (!subjects.length) {
      listEl.innerHTML = '<p style="font-size:12px;color:var(--text-secondary)">暂无学科，请添加</p>';
      return;
    }
    listEl.innerHTML = subjects.map(makeSubjectRowHTML).join('');
    listEl.querySelectorAll('.admin-review-item').forEach(bindSubjectRowEvents);
  } catch (e) {
    listEl.innerHTML = '<p style="font-size:12px;color:#e53e3e">加载失败</p>';
  }
}

async function addSubject() {
  const idEl = document.getElementById('admin-subject-id');
  const nameEl = document.getElementById('admin-subject-name');
  const msgEl = document.getElementById('admin-subject-msg');
  const id = idEl.value.trim();
  const name = nameEl.value.trim();
  if (!id || !name) { msgEl.textContent = '学科ID和名称为必填项'; return; }
  if (!/^[a-z][a-z0-9_]*$/.test(id)) { msgEl.textContent = 'ID只能含小写字母、数字、下划线，字母开头'; return; }
  msgEl.textContent = '';
  const modal = holdAdminModal();
  try {
    const newSubject = await fetchJson(`${API_BASE}/admin/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    idEl.value = '';
    nameEl.value = '';
    state.resourceData.push(newSubject);
    addSidebarSubject(newSubject);
    // Append to admin list in-place
    const listEl = document.getElementById('admin-subjects-list');
    const placeholder = listEl.querySelector('p');
    if (placeholder) placeholder.remove();
    const temp = document.createElement('div');
    temp.innerHTML = makeSubjectRowHTML(newSubject);
    listEl.appendChild(temp.firstElementChild);
    bindSubjectRowEvents(listEl.lastElementChild);
  } catch (e) { msgEl.textContent = e.message; }
  restoreAdminModal(modal);
}

// Quick add subject from sidebar
async function quickAddSubject() {
  const input = document.getElementById('quick-subject-name');
  const name = input.value.trim();
  if (!name) return;
  const modal = holdAdminModal();
  try {
    const newSubject = await fetchJson(`${API_BASE}/admin/subjects/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '', name }),
    });
    input.value = '';
    state.resourceData.push(newSubject);
    addSidebarSubject(newSubject);
    // If admin panel subjects tab is open, append row there too
    const panel = document.querySelector('[data-admin-panel="subjects"]');
    if (panel && panel.classList.contains('active')) {
      const listEl = document.getElementById('admin-subjects-list');
      const placeholder = listEl.querySelector('p');
      if (placeholder) placeholder.remove();
      const temp = document.createElement('div');
      temp.innerHTML = makeSubjectRowHTML(newSubject);
      listEl.appendChild(temp.firstElementChild);
      bindSubjectRowEvents(listEl.lastElementChild);
    }
  } catch (e) { /* ignore */ }
  restoreAdminModal(modal);
}

// ── Init on page load ───────────────────────────────

function initApp() {
  initAuthUI();
  updateAuthUI();
  loadData();
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
  els.saveAddSite.addEventListener("click", saveCustomSite);
  els.addTodo?.addEventListener("click", addTodo);
  els.todoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTodo();
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
  els.globalDrawerBackdrop?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeAllFloatingPanels();
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    // If the target was removed from the DOM by a preceding handler (e.g. innerHTML
    // replacement), don't treat it as an outside-panel click — the user intended
    // to interact with an element inside a floating panel.
    if (target instanceof Element && !document.contains(target)) {
      return;
    }
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
      (els.globalDrawerBackdrop?.contains(target) || false) ||
      (els.headerQuickActions?.contains(target) || false) ||
      (els.bottomPanel?.contains(target) || false) ||
      (els.bottomBar?.contains(target) || false) ||
      (els.addSiteModal?.contains(target) || false) ||
      (els.uploadModal?.contains(target) || false);
    if (!clickedInsideFloatingPanel) {
      closeAllFloatingPanels();
    }
  });

  // Export/import — bind once at top level
  els.btnExport?.addEventListener("click", exportUserData);
  els.btnImport?.addEventListener("click", (e) => {
    e.stopPropagation();
    els.importFileInput?.click();
  });
  els.importFileInput?.addEventListener("change", importUserData);
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
  window.addEventListener("resize", syncDesktopLayoutMetrics);
  if (els.roomQuote) {
    els.roomQuote.addEventListener("change", () => {
      storage.setRoomQuote(els.roomQuote.value.trim());
    });
  }
  let searchDebounceTimer;
  els.searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      renderResources();
      renderSites();
    }, 200);
  });
  els.brand?.addEventListener("click", handleBrandHomeNavigation);
  els.brand?.addEventListener("keydown", handleBrandKeydown);
  syncDesktopLayoutMetrics();
  syncBottomPanelState();

  // ── New event bindings for auth/admin/preview ─────

  // Upload URL paste → auto-extract
  els.uploadUrl?.addEventListener('input', () => {
    const url = els.uploadUrl.value.trim();
    if (url && /^https?:\/\/.+/.test(url)) {
      extractUrlMeta(url);
    }
  });

  // X close buttons on all modals
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      if (modalId) {
        document.getElementById(modalId)?.classList.remove('show');
      } else {
        btn.closest('.modal')?.classList.remove('show');
      }
    });
  });

  // Preview jump button
  document.getElementById('preview-jump')?.addEventListener('click', function () {
    const url = this.dataset.url;
    if (url) window.open(url, '_blank');
  });


  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.adminTab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.querySelector(`[data-admin-panel="${tabName}"]`);
      if (panel) panel.classList.add('active');
      if (tabName === 'review') loadAdminReviewList();
      if (tabName === 'users') loadAdminUsersList();
      if (tabName === 'subjects') loadAdminSubjectsList();
    });
  });

  // Excel download template
  document.getElementById('btn-download-template')?.addEventListener('click', async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/template`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resource_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('下载失败'); }
  });

  // Excel upload
  document.getElementById('admin-excel-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resultEl = document.getElementById('admin-import-result');
    resultEl.textContent = '正在导入...';
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/admin/import-excel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.errors && data.errors.length) {
        const errorDetails = data.errors.map(e => `第${e.row}行: ${e.error}`).join('<br>');
        resultEl.innerHTML = `<span style="color:#c53030">导入完成，成功 ${data.created} 条，失败 ${data.errors.length} 条</span>
          <div style="margin-top:8px;font-size:11px;color:var(--text-secondary);max-height:120px;overflow-y:auto">${errorDetails}</div>`;
      } else {
        resultEl.innerHTML = `<span style="color:#2b5ecf">成功导入 ${data.created} 条资源</span>`;
      }
    } catch(e) {
      resultEl.innerHTML = `<span style="color:#e53e3e">导入失败: ${e.message}</span>`;
    }
    e.target.value = '';
  });

  // Admin add subject
  document.getElementById('admin-add-subject')?.addEventListener('click', addSubject);

  // Quick add subject from sidebar
  document.getElementById('btn-quick-add-subject')?.addEventListener('click', quickAddSubject);

  // Feedback button
  document.getElementById('open-feedback-btn')?.addEventListener('click', () => {
    els.feedbackTitle.textContent = "意见反馈";
    els.feedbackFormGroup.style.display = "flex";
    els.feedbackActions.style.display = "flex";
    els.feedbackText.value = "";
    els.feedbackModal.classList.add("show");
    const oldMsg = document.getElementById("feedback-success-msg");
    if (oldMsg) oldMsg.remove();
  });

  // Admin application button
  document.getElementById('open-admin-apply-btn')?.addEventListener('click', async () => {
    if (!isLoggedIn()) {
      alert('请先登录');
      return;
    }
    const reason = prompt('请输入申请管理员的原因：');
    if (!reason) return;
    try {
      await fetchJson(`${API_BASE}/auth/apply-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      alert('申请已提交，请等待管理员审核');
    } catch(e) { alert('申请失败: ' + e.message); }
  });

  // Close modals on click outside
  document.getElementById('preview-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('preview-modal')) {
      document.getElementById('preview-modal').classList.remove('show');
    }
  });
}

initApp();
bindEvents();
