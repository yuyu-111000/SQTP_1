const dataUrl = "./data/data.json";
const API_BASE = "http://localhost:8000";

const state = {
  activeResourceCategory: null,
  resourceData: [],
  resourceCache: {},
  commentCache: {},
  sites: [],
  siteSections: [],
  todos: [],
  laterItems: [],
  selectedResource: null,
  isDraggingSite: false,
  pomodoro: {
    isRunning: false,
    mode: "work",
    workSeconds: 25 * 60,
    remaining: 25 * 60,
    timer: null
  }
};

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

const els = {
  resourceCategories: document.getElementById("resource-categories"),
  resourceContainer: document.getElementById("resource-container"),
  siteContainer: document.getElementById("site-container"),
  resourceTitle: document.getElementById("resource-title"),
  resourceSubtitle: document.getElementById("resource-subtitle"),
  onlineCount: document.getElementById("online-count"),
  searchInput: document.getElementById("search-input"),
  sortSelect: document.getElementById("sort-select"),
  pomodoroTime: document.getElementById("pomodoro-time"),
  pomodoroMode: document.getElementById("pomodoro-mode"),
  pomodoroToggle: document.getElementById("pomodoro-toggle"),
  timePicker: document.getElementById("time-picker"),
  timeWrap: document.getElementById("time-wrap"),
  timeHours: document.getElementById("time-hours"),
  timeMinutes: document.getElementById("time-minutes"),
  timeSeconds: document.getElementById("time-seconds"),
  addSiteModal: document.getElementById("add-site-modal"),
  openAddSite: document.getElementById("open-add-site"),
  addSection: document.getElementById("add-section"),
  sectionName: document.getElementById("section-name"),
  cancelAddSite: document.getElementById("cancel-add-site"),
  saveAddSite: document.getElementById("save-add-site"),
  siteTitle: document.getElementById("site-title"),
  siteUrl: document.getElementById("site-url"),
  siteDesc: document.getElementById("site-desc"),
  studyRoom: document.getElementById("study-room"),
  roomToggle: document.getElementById("room-toggle"),
  roomQuote: document.getElementById("room-quote"),
  commentsModal: document.getElementById("comments-modal"),
  commentsTitle: document.getElementById("comments-title"),
  commentsList: document.getElementById("comments-list"),
  cancelComment: document.getElementById("cancel-comment"),
  submitComment: document.getElementById("submit-comment"),
  commentUser: document.getElementById("comment-user"),
  commentContent: document.getElementById("comment-content"),
  openUpload: document.getElementById("open-upload"),
  openApply: document.getElementById("open-apply"),
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
  laterList: document.getElementById("later-list")
};

const uiState = {
  uploadMode: "upload",
  drag: {
    active: false,
    offsetX: 0,
    offsetY: 0
  }
};

const storage = {
  commentsKey: "resourceCommentsById",
  customSitesKey: "userCustomSites",
  resourceLikesKey: "resourceLikesById",
  siteSectionsKey: "siteSections",
  siteAssignmentsKey: "siteAssignments",
  roomQuoteKey: "studyRoomQuote",
  todoKey: "todoItems",
  uploadKey: "resourceUploadsByCategory",
  laterKey: "laterStudyList",
  getComments() {
    return JSON.parse(localStorage.getItem(this.commentsKey) || "{}");
  },
  setComments(data) {
    localStorage.setItem(this.commentsKey, JSON.stringify(data));
  },
  getCustomSites() {
    return JSON.parse(localStorage.getItem(this.customSitesKey) || "[]");
  },
  setCustomSites(data) {
    localStorage.setItem(this.customSitesKey, JSON.stringify(data));
  },
  getResourceLikes() {
    return JSON.parse(localStorage.getItem(this.resourceLikesKey) || "{}");
  },
  setResourceLikes(data) {
    localStorage.setItem(this.resourceLikesKey, JSON.stringify(data));
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
  els.roomQuote.value = storage.getRoomQuote();
  updatePomodoroView();
  initCategories();
  initOnlineCount();
  await loadTodos();
  await loadLaterItems();
}

function initCategories() {
  renderCategoryList(els.resourceCategories, state.resourceData);
  if (state.resourceData.length) {
    state.activeResourceCategory = state.resourceData[0].id;
  }
  renderResources();
  renderSites();
}

function renderCategoryList(container, list) {
  container.innerHTML = "";
  list.forEach((item) => {
    const li = document.createElement("li");
    li.className = "nav-item";
    li.textContent = item.name;
    li.addEventListener("click", () => {
      state.activeResourceCategory = item.id;
      updateActiveNav();
      renderResources();
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

async function renderResources() {
  const category = state.resourceData.find((c) => c.id === state.activeResourceCategory);
  els.resourceTitle.textContent = category?.name || "学科资源";
  els.resourceSubtitle.textContent = "按学科分类的资料入口";
  els.resourceContainer.innerHTML = "";
  if (!category) return;
  if (!state.resourceCache[category.id]) {
    els.resourceContainer.innerHTML = "<div class=\"comment-item\">加载中...</div>";
    try {
      const resources = await fetchJson(`${API_BASE}/subjects/${category.id}/resources`);
      state.resourceCache[category.id] = resources.length ? resources : (category.resources || []);
    } catch (error) {
      state.resourceCache[category.id] = category.resources || [];
    }
  }
  const uploads = getUploadsForCategory(category?.id);
  const resources = applyResourceFilters([...(uploads || []), ...(state.resourceCache[category.id] || [])]);
  resources.forEach((item) => {
    const card = createResourceCard(item);
    els.resourceContainer.appendChild(card);
    loadCommentPreview(item.id, card.querySelector(".comment-preview"));
  });
}

function renderSites() {
  els.siteContainer.innerHTML = "";
  const sites = [...state.sites];
  const keyword = els.searchInput.value.trim();
  const filtered = keyword
    ? sites.filter((item) => item.title.includes(keyword) || (item.description || "").includes(keyword))
    : sites;

  const sections = state.siteSections.length ? state.siteSections : [{ id: "default", name: "默认分区" }];

  sections.forEach((section) => {
    const block = document.createElement("div");
    block.className = "section-block";
    block.innerHTML = `
      <div class="section-head">
        <div class="section-title">${section.name}</div>
        <div class="section-actions-inline">
          <button class="btn ghost btn-xs" data-action="rename" data-id="${section.id}">重命名</button>
          ${section.id === "default" ? "" : `<button class=\"btn ghost btn-xs\" data-action=\"delete\" data-id=\"${section.id}\">删除</button>`}
        </div>
      </div>
      <div class="site-grid drop-zone" data-section="${section.id}"></div>
    `;
    const grid = block.querySelector(".site-grid");
    setupDropZone(grid, section.id);

    const list = filtered.filter((site) => (site.section_id || "default") === section.id);
    list.forEach((site) => grid.appendChild(createSiteCard(site)));

    const actions = block.querySelector(".section-actions-inline");
    actions.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      if (action === "rename") await renameSection(id);
      if (action === "delete") await deleteSection(id);
    });

    els.siteContainer.appendChild(block);
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
  del.className = "btn ghost btn-xs";
  del.textContent = "删除";
  del.addEventListener("click", () => deleteTodo(todo.id));

  item.appendChild(label);
  item.appendChild(del);
  return item;
}

async function addTodo() {
  const text = els.todoInput.value.trim();
  if (!text) return;
  try {
    const created = await fetchJson(`${API_BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, done: false })
    });
    state.todos = [created, ...state.todos];
  } catch (error) {
    const list = storage.getTodos();
    list.unshift({
      id: `todo_${Date.now()}`,
      text,
      done: false
    });
    storage.setTodos(list);
    state.todos = list;
  }
  els.todoInput.value = "";
  renderTodos(state.todos);
}

async function toggleTodo(todoId, nextDone) {
  try {
    const updated = await fetchJson(`${API_BASE}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: nextDone })
    });
    state.todos = state.todos.map((todo) => (todo.id === todoId ? updated : todo));
    renderTodos(state.todos);
    return;
  } catch (error) {
    const list = storage.getTodos();
    const target = list.find((todo) => todo.id === todoId);
    if (!target) return;
    target.done = nextDone;
    storage.setTodos(list);
    state.todos = list;
    renderTodos(state.todos);
  }
}

async function deleteTodo(todoId) {
  try {
    await fetchJson(`${API_BASE}/todos/${todoId}`, { method: "DELETE" });
    state.todos = state.todos.filter((todo) => todo.id !== todoId);
    renderTodos(state.todos);
    return;
  } catch (error) {
    const list = storage.getTodos().filter((todo) => todo.id !== todoId);
    storage.setTodos(list);
    state.todos = list;
    renderTodos(state.todos);
  }
}

function renderLaterList(list) {
  const items = list || [];
  els.laterList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "later-empty";
    empty.textContent = "暂无收藏，先挑一个内容吧。";
    els.laterList.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "later-item";
    row.innerHTML = `
      <span>${item.title}</span>
      <button class="btn ghost btn-xs" data-id="${item.resource_id || item.id}">移除</button>
    `;
    row.querySelector("button").addEventListener("click", () => removeFromLaterList(item.resource_id || item.id));
    els.laterList.appendChild(row);
  });
}

async function addToLaterList(item) {
  if (state.laterItems.some((entry) => entry.resource_id === item.id || entry.id === item.id)) return;
  try {
    const created = await fetchJson(`${API_BASE}/later`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_id: item.id, title: item.title })
    });
    state.laterItems = [created, ...state.laterItems];
    renderLaterList(state.laterItems);
    return;
  } catch (error) {
    const list = storage.getLaterList();
    if (list.some((entry) => entry.id === item.id)) return;
    list.unshift({
      id: item.id,
      title: item.title,
      url: item.url || ""
    });
    storage.setLaterList(list);
    state.laterItems = list;
    renderLaterList(state.laterItems);
  }
}

async function removeFromLaterList(itemId) {
  try {
    await fetchJson(`${API_BASE}/later/${itemId}`, { method: "DELETE" });
    state.laterItems = state.laterItems.filter((item) => (item.resource_id || item.id) !== itemId);
    renderLaterList(state.laterItems);
    return;
  } catch (error) {
    const list = storage.getLaterList().filter((item) => item.id !== itemId);
    storage.setLaterList(list);
    state.laterItems = list;
    renderLaterList(state.laterItems);
  }
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

function saveUpload() {
  const title = els.uploadTitle.value.trim();
  const url = els.uploadUrl.value.trim();
  if (!title || !url || !state.activeResourceCategory) return;
  if (uiState.uploadMode === "apply") {
    closeUploadModal();
    alert("管理员已收到你的新建栏目申请，请耐心等待");
    return;
  }
  const desc = els.uploadDesc.value.trim();
  const platform = els.uploadPlatform.value.trim();
  const tags = els.uploadTags.value
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  const uploads = storage.getUploads();
  const list = uploads[state.activeResourceCategory] || [];
  list.unshift({
    id: `u_${Date.now()}`,
    title,
    url,
    description: desc,
    tags,
    platform,
    createdAt: Date.now(),
    comments: []
  });
  uploads[state.activeResourceCategory] = list;
  storage.setUploads(uploads);
  closeUploadModal();
  renderResources();
}

function createResourceCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  const preview = "加载中...";
  const likeCount = item.like_count ?? getResourceLikeCount(item.id);
  const tags = [...(item.tags || [])];
  if (item.platform && !tags.includes(item.platform)) tags.push(item.platform);
  card.innerHTML = `
    <div class="card-title">
      <h3>${item.title}</h3>
      <button class="btn ghost btn-xs" data-action="later">稍后再学</button>
    </div>
    <div class="tags">${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    <p>${item.description || ""}</p>
    <div class="comment-preview">${preview}</div>
    <div class="card-actions">
      <button class="btn primary">打开</button>
      <button class="btn ghost">评论</button>
      <button class="btn ghost">👍 ${likeCount}</button>
      <button class="btn ghost">举报</button>
    </div>
  `;
  const [openBtn, commentBtn, likeBtn, reportBtn] = card.querySelectorAll(".card-actions button");
  const laterBtn = card.querySelector("[data-action='later']");
  openBtn.addEventListener("click", () => window.open(item.url, "_blank"));
  commentBtn.addEventListener("click", () => openComments(item));
  likeBtn.addEventListener("click", () => addResourceLike(item.id, likeBtn));
  reportBtn.addEventListener("click", () => {
    alert("已收到举报，我们会尽快核查。谢谢反馈！");
  });
  laterBtn.addEventListener("click", () => addToLaterList(item));
  return card;
}

function createSiteCard(item) {
  const card = document.createElement("div");
  card.className = "card site-card";
  card.setAttribute("draggable", "true");
  card.dataset.siteId = item.id;
  const initial = item.title?.[0] || "站";
  card.innerHTML = `
    <div class="site-head">
      <div class="site-icon">${initial}</div>
      <h3>${item.title}</h3>
    </div>
  `;
  card.addEventListener("click", () => {
    if (state.isDraggingSite) return;
    window.open(item.url, "_blank");
  });
  card.addEventListener("dragstart", (event) => {
    state.isDraggingSite = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(item.id));
    event.dataTransfer.setData("text/site-id", String(item.id));
  });
  card.addEventListener("dragend", () => {
    state.isDraggingSite = false;
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
  try {
    state.siteSections = await fetchJson(`${API_BASE}/sites/sections`);
    state.sites = await fetchJson(`${API_BASE}/sites`);
  } catch (error) {
    state.siteSections = [];
    state.sites = fallbackSites || [];
  }
}

function applyResourceFilters(list) {
  const keyword = els.searchInput.value.trim();
  let result = keyword
    ? list.filter((item) => item.title.includes(keyword) || (item.description || "").includes(keyword))
    : [...list];
  const sort = els.sortSelect.value;
  if (sort === "hot") {
    result.sort((a, b) => getResourceHeatFromItem(b) - getResourceHeatFromItem(a));
  } else if (sort === "new") {
    result.sort((a, b) => getResourceCreatedAt(b) - getResourceCreatedAt(a));
  }
  return result;
}

function getResourceHeatFromItem(item) {
  const likeCount = item.like_count ?? getResourceLikeCount(item.id);
  const commentCount = item.comment_count ?? 0;
  return likeCount + commentCount * 2;
}

function getResourceCreatedAt(item) {
  if (typeof item.createdAt === "number") return item.createdAt;
  const numeric = Number(item.id);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function getResourceHeat(resourceId) {
  const resource = findResourceById(resourceId);
  const baseComments = resource?.comments || [];
  const localComments = storage.getComments()[resourceId] || [];
  const commentCount = baseComments.length + localComments.length;
  return getResourceLikeCount(resourceId) + commentCount * 2;
}

function getResourceLikeCount(resourceId) {
  const likes = storage.getResourceLikes();
  return likes[resourceId] || 0;
}

async function addResourceLike(resourceId, button) {
  try {
    const result = await fetchJson(`${API_BASE}/resources/${resourceId}/likes`, { method: "POST" });
    button.textContent = `👍 ${result.likeCount}`;
    return;
  } catch (error) {
    const likes = storage.getResourceLikes();
    likes[resourceId] = (likes[resourceId] || 0) + 1;
    storage.setResourceLikes(likes);
    button.textContent = `👍 ${likes[resourceId]}`;
  }
}

async function fetchComments(resourceId) {
  if (state.commentCache[resourceId]) return state.commentCache[resourceId];
  try {
    const data = await fetchJson(`${API_BASE}/resources/${resourceId}/comments`);
    state.commentCache[resourceId] = data;
  } catch (error) {
    state.commentCache[resourceId] = [];
  }
  return state.commentCache[resourceId];
}

async function loadCommentPreview(resourceId, element) {
  if (!element) return;
  const list = await fetchComments(resourceId);
  if (!list.length) {
    element.textContent = "暂无评论";
    return;
  }
  const top = list[0];
  element.textContent = `评论：${top.user || "匿名"} · ${top.content || ""}`;
}

async function openComments(item) {
  state.selectedResource = item;
  els.commentsTitle.textContent = `评论区 - ${item.title}`;
  const list = await fetchComments(item.id);
  renderComments(list);
  els.commentsModal.classList.add("show");
}

function closeComments() {
  els.commentsModal.classList.remove("show");
  els.commentUser.value = "";
  els.commentContent.value = "";
}

function renderComments(comments) {
  els.commentsList.innerHTML = "";
  if (!comments.length) {
    els.commentsList.innerHTML = "<div class=\"comment-item\">暂无评论，做第一个留言的人吧！</div>";
    return;
  }
  comments.forEach((comment) => {
    const div = document.createElement("div");
    const time = comment.time || (comment.created_at ? new Date(comment.created_at * 1000).toISOString().slice(0, 10) : "");
    div.className = "comment-item";
    div.innerHTML = `
      <div class="comment-meta">
        <span>${comment.user || "匿名"}</span>
        <span>${time}</span>
      </div>
      <div>${comment.content || ""}</div>
      <div class="comment-meta">
        <span class="comment-like">👍 ${comment.likes ?? 0}</span>
      </div>
    `;
    els.commentsList.appendChild(div);
  });
}

function addLike() {}

function findResourceById(resourceId) {
  for (const category of state.resourceData) {
    const found = category.resources?.find((item) => item.id === resourceId);
    if (found) return found;
  }
  const uploads = storage.getUploads();
  for (const list of Object.values(uploads)) {
    const found = list.find((item) => item.id === resourceId);
    if (found) return found;
  }
  return null;
}

async function submitComment() {
  if (!state.selectedResource) return;
  const content = els.commentContent.value.trim();
  if (!content) return;

  const user = els.commentUser.value.trim() || "匿名";
  try {
    const created = await fetchJson(`${API_BASE}/resources/${state.selectedResource.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, content })
    });
    state.commentCache[state.selectedResource.id] = null;
    const list = await fetchComments(state.selectedResource.id);
    renderComments(list);
    els.commentContent.value = "";
    renderResources();
  } catch (error) {
    alert("评论提交失败，请稍后重试。");
  }
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

function updatePomodoroView() {
  const hours = Math.floor(state.pomodoro.remaining / 3600);
  const minutes = Math.floor((state.pomodoro.remaining % 3600) / 60);
  const seconds = state.pomodoro.remaining % 60;
  els.pomodoroTime.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  els.pomodoroMode.textContent = "专注中";
}

function togglePomodoro() {
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.timer);
    state.pomodoro.isRunning = false;
    els.pomodoroToggle.textContent = "开始";
    return;
  }
  state.pomodoro.isRunning = true;
  els.pomodoroToggle.textContent = "暂停";
  state.pomodoro.timer = setInterval(() => {
    if (state.pomodoro.remaining <= 0) {
      clearInterval(state.pomodoro.timer);
      state.pomodoro.isRunning = false;
      state.pomodoro.remaining = 0;
      els.pomodoroToggle.textContent = "开始";
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
    els.pomodoroToggle.textContent = "开始";
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

async function saveCustomSite() {
  const title = els.siteTitle.value.trim();
  const url = els.siteUrl.value.trim();
  if (!title || !url) return;
  const desc = els.siteDesc.value.trim();
  const defaultSection = state.siteSections.find((section) => section.id === "default");
  const sectionId = defaultSection ? defaultSection.id : "default";
  try {
    const created = await fetchJson(`${API_BASE}/sites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, description: desc, section_id: sectionId })
    });
    state.sites.push(created);
  } catch (error) {
    alert("保存网站失败，请稍后重试。");
  }
  closeAddSiteModal();
  renderSites();
}

async function addSiteSection() {
  const name = els.sectionName.value.trim();
  if (!name) return;
  try {
    const created = await fetchJson(`${API_BASE}/sites/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    state.siteSections.push(created);
    els.sectionName.value = "";
    renderSites();
  } catch (error) {
    alert("新建分区失败，请稍后重试。");
  }
}

function handleRoomDragStart(event) {
  if (event.button !== 0) return;
  uiState.drag.active = true;
  const rect = els.studyRoom.getBoundingClientRect();
  uiState.drag.offsetX = event.clientX - rect.left;
  uiState.drag.offsetY = event.clientY - rect.top;
  els.studyRoom.classList.add("dragging");
  els.studyRoom.style.right = "auto";
  event.preventDefault();
}

function handleRoomDragMove(event) {
  if (!uiState.drag.active) return;
  const maxLeft = window.innerWidth - els.studyRoom.offsetWidth;
  const maxTop = window.innerHeight - els.studyRoom.offsetHeight;
  const nextLeft = Math.min(Math.max(0, event.clientX - uiState.drag.offsetX), maxLeft);
  const nextTop = Math.min(Math.max(0, event.clientY - uiState.drag.offsetY), maxTop);
  els.studyRoom.style.left = `${nextLeft}px`;
  els.studyRoom.style.top = `${nextTop}px`;
}

function handleRoomDragEnd() {
  if (!uiState.drag.active) return;
  uiState.drag.active = false;
  els.studyRoom.classList.remove("dragging");
}
async function renameSection(sectionId) {
  const target = state.siteSections.find((s) => s.id === sectionId);
  if (!target) return;
  const nextName = prompt("新的分区名称：", target.name);
  if (!nextName) return;
  try {
    const updated = await fetchJson(`${API_BASE}/sites/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName.trim() || target.name })
    });
    target.name = updated.name;
    renderSites();
  } catch (error) {
    alert("重命名失败，请稍后重试。");
  }
}

async function deleteSection(sectionId) {
  if (!confirm("确定删除该分区？其中网站将回到默认分区。")) return;
  try {
    await fetchJson(`${API_BASE}/sites/sections/${sectionId}`, { method: "DELETE" });
    state.siteSections = state.siteSections.filter((section) => section.id !== sectionId);
    state.sites = state.sites.map((site) => (site.section_id === sectionId ? { ...site, section_id: "default" } : site));
    renderSites();
  } catch (error) {
    alert("删除分区失败，请稍后重试。");
  }
}

async function assignSite(siteId, sectionId) {
  try {
    const updated = await fetchJson(`${API_BASE}/sites/${siteId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId })
    });
    state.sites = state.sites.map((site) => (site.id === siteId ? updated : site));
    renderSites();
  } catch (error) {
    alert("移动网站失败，请稍后重试。");
  }
}

function bindEvents() {
  els.openAddSite.addEventListener("click", openAddSiteModal);
  els.addSection.addEventListener("click", addSiteSection);
  els.cancelAddSite.addEventListener("click", closeAddSiteModal);
  els.saveAddSite.addEventListener("click", saveCustomSite);
  els.cancelComment.addEventListener("click", closeComments);
  els.submitComment.addEventListener("click", submitComment);
  els.addTodo.addEventListener("click", addTodo);
  els.todoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTodo();
  });
  els.openUpload.addEventListener("click", () => openUploadModal("upload"));
  els.openApply.addEventListener("click", () => openUploadModal("apply"));
  els.cancelUpload.addEventListener("click", closeUploadModal);
  els.saveUpload.addEventListener("click", saveUpload);
  els.pomodoroToggle.addEventListener("click", togglePomodoro);
  els.pomodoroTime.addEventListener("click", (event) => {
    event.stopPropagation();
    els.timePicker.classList.toggle("show");
  });
  els.timeHours.addEventListener("change", applyTimePicker);
  els.timeMinutes.addEventListener("change", applyTimePicker);
  els.timeSeconds.addEventListener("change", applyTimePicker);
  document.addEventListener("click", (event) => {
    if (!els.timeWrap.contains(event.target)) {
      els.timePicker.classList.remove("show");
    }
  });
  const roomHeader = els.studyRoom.querySelector(".room-header");
  if (roomHeader) {
    roomHeader.addEventListener("pointerdown", handleRoomDragStart);
  }
  document.addEventListener("pointermove", handleRoomDragMove);
  document.addEventListener("pointerup", handleRoomDragEnd);
  els.roomQuote.addEventListener("change", () => {
    storage.setRoomQuote(els.roomQuote.value.trim());
  });
  els.roomToggle.addEventListener("click", () => {
    const isCollapsed = els.studyRoom.classList.toggle("collapsed");
    els.roomToggle.textContent = isCollapsed ? "<" : ">";
  });
  els.sortSelect.addEventListener("change", renderResources);
  els.searchInput.addEventListener("input", () => {
    renderResources();
    renderSites();
  });
}

loadData();
bindEvents();
