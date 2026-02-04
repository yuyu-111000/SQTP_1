const dataUrl = "./data/data.json";

const state = {
  activeResourceCategory: null,
  resourceData: [],
  sites: [],
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
  uploadModal: document.getElementById("upload-modal"),
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
  const res = await fetch(dataUrl);
  const data = await res.json();
  state.resourceData = data.studyResourceCategories || [];
  state.sites = data.sites || [];
  state.pomodoro.workSeconds = (data.studyRoom?.pomodoroConfig?.workDuration || 25) * 60;
  state.pomodoro.remaining = state.pomodoro.workSeconds;
  initTimePicker();
  els.roomQuote.value = storage.getRoomQuote();
  updatePomodoroView();
  initCategories();
  initOnlineCount();
  renderTodos();
  renderLaterList();
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

function renderResources() {
  const category = state.resourceData.find((c) => c.id === state.activeResourceCategory);
  els.resourceTitle.textContent = category?.name || "学科资源";
  els.resourceSubtitle.textContent = "按学科分类的资料入口";
  els.resourceContainer.innerHTML = "";
  const uploads = getUploadsForCategory(category?.id);
  const resources = applyResourceFilters([...(uploads || []), ...(category?.resources || [])]);
  resources.forEach((item) => {
    els.resourceContainer.appendChild(createResourceCard(item));
  });
}

function renderSites() {
  els.siteContainer.innerHTML = "";
  const sites = [...state.sites, ...storage.getCustomSites()];
  const keyword = els.searchInput.value.trim();
  const filtered = keyword
    ? sites.filter((item) => item.title.includes(keyword) || (item.description || "").includes(keyword))
    : sites;

  const sections = storage.getSiteSections();
  const assignments = storage.getSiteAssignments();

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

    const list = filtered.filter((site) => (assignments[site.id] || "default") === section.id);
    list.forEach((site) => grid.appendChild(createSiteCard(site)));

    const actions = block.querySelector(".section-actions-inline");
    actions.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      if (action === "rename") renameSection(id);
      if (action === "delete") deleteSection(id);
    });

    els.siteContainer.appendChild(block);
  });
}

function renderTodos() {
  const list = storage.getTodos();
  els.todoList.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "todo-empty";
    empty.textContent = "暂无待办，先添加一个目标吧。";
    els.todoList.appendChild(empty);
    return;
  }
  list.forEach((todo) => {
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
  checkbox.addEventListener("change", () => toggleTodo(todo.id));

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

function addTodo() {
  const text = els.todoInput.value.trim();
  if (!text) return;
  const list = storage.getTodos();
  list.unshift({
    id: `todo_${Date.now()}`,
    text,
    done: false
  });
  storage.setTodos(list);
  els.todoInput.value = "";
  renderTodos();
}

function toggleTodo(todoId) {
  const list = storage.getTodos();
  const target = list.find((todo) => todo.id === todoId);
  if (!target) return;
  target.done = !target.done;
  storage.setTodos(list);
  renderTodos();
}

function deleteTodo(todoId) {
  const list = storage.getTodos().filter((todo) => todo.id !== todoId);
  storage.setTodos(list);
  renderTodos();
}

function renderLaterList() {
  const list = storage.getLaterList();
  els.laterList.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "later-empty";
    empty.textContent = "暂无收藏，先挑一个内容吧。";
    els.laterList.appendChild(empty);
    return;
  }
  list.forEach((item) => {
    const row = document.createElement("div");
    row.className = "later-item";
    row.innerHTML = `
      <span>${item.title}</span>
      <button class="btn ghost btn-xs" data-id="${item.id}">移除</button>
    `;
    row.querySelector("button").addEventListener("click", () => removeFromLaterList(item.id));
    els.laterList.appendChild(row);
  });
}

function addToLaterList(item) {
  const list = storage.getLaterList();
  if (list.some((entry) => entry.id === item.id)) return;
  list.unshift({
    id: item.id,
    title: item.title,
    url: item.url || ""
  });
  storage.setLaterList(list);
  renderLaterList();
}

function removeFromLaterList(itemId) {
  const list = storage.getLaterList().filter((item) => item.id !== itemId);
  storage.setLaterList(list);
  renderLaterList();
}

function getUploadsForCategory(categoryId) {
  if (!categoryId) return [];
  const uploads = storage.getUploads();
  return uploads[categoryId] || [];
}

function openUploadModal() {
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
  const preview = getCommentPreview(item.id);
  const likeCount = getResourceLikeCount(item.id);
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
    const assignments = storage.getSiteAssignments();
    assignments[siteId] = sectionId;
    storage.setSiteAssignments(assignments);
    renderSites();
  });
}

function applyResourceFilters(list) {
  const keyword = els.searchInput.value.trim();
  let result = keyword
    ? list.filter((item) => item.title.includes(keyword) || (item.description || "").includes(keyword))
    : [...list];
  const sort = els.sortSelect.value;
  if (sort === "hot") {
    result.sort((a, b) => getResourceHeat(b.id) - getResourceHeat(a.id));
  } else if (sort === "new") {
    result.sort((a, b) => getResourceCreatedAt(b) - getResourceCreatedAt(a));
  }
  return result;
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

function addResourceLike(resourceId, button) {
  const likes = storage.getResourceLikes();
  likes[resourceId] = (likes[resourceId] || 0) + 1;
  storage.setResourceLikes(likes);
  button.textContent = `👍 ${likes[resourceId]}`;
}

function getCommentPreview(resourceId) {
  const resource = findResourceById(resourceId);
  const baseComments = resource?.comments || [];
  const localComments = storage.getComments()[resourceId] || [];
  const all = [...baseComments, ...localComments];
  if (!all.length) return "暂无评论";
  const top = all[0];
  return `评论：${top.user || "匿名"} · ${top.content || ""}`;
}

function openComments(item) {
  state.selectedResource = item;
  els.commentsTitle.textContent = `评论区 - ${item.title}`;
  renderComments(item.id);
  els.commentsModal.classList.add("show");
}

function closeComments() {
  els.commentsModal.classList.remove("show");
  els.commentUser.value = "";
  els.commentContent.value = "";
}

function renderComments(resourceId) {
  const localCommentsMap = storage.getComments();
  const localComments = localCommentsMap[resourceId] || [];
  const resource = findResourceById(resourceId);
  const baseComments = resource?.comments || [];
  const allComments = [...baseComments, ...localComments];

  els.commentsList.innerHTML = "";
  if (!allComments.length) {
    els.commentsList.innerHTML = "<div class=\"comment-item\">暂无评论，做第一个留言的人吧！</div>";
    return;
  }
  allComments.forEach((comment) => {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
      <div class="comment-meta">
        <span>${comment.user || "匿名"}</span>
        <span>${comment.time || ""}</span>
      </div>
      <div>${comment.content || ""}</div>
      <div class="comment-meta">
        <span class="comment-like" data-id="${comment.id}">👍 ${comment.likes ?? 0}</span>
      </div>
    `;
    div.querySelector(".comment-like").addEventListener("click", () => addLike(resourceId, comment.id));
    els.commentsList.appendChild(div);
  });
}

function addLike(resourceId, commentId) {
  const localCommentsMap = storage.getComments();
  const localComments = localCommentsMap[resourceId] || [];
  const target = localComments.find((c) => c.id === commentId);
  if (target) {
    target.likes = (target.likes || 0) + 1;
    localCommentsMap[resourceId] = localComments;
    storage.setComments(localCommentsMap);
    renderComments(resourceId);
    return;
  }

  const resource = findResourceById(resourceId);
  const baseComments = resource?.comments || [];
  const baseTarget = baseComments.find((c) => c.id === commentId);
  if (baseTarget) {
    baseTarget.likes = (baseTarget.likes || 0) + 1;
    renderComments(resourceId);
  }
}

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

function submitComment() {
  if (!state.selectedResource) return;
  const content = els.commentContent.value.trim();
  if (!content) return;

  const user = els.commentUser.value.trim() || "匿名";
  const newComment = {
    id: `lc_${state.selectedResource.id}_${Date.now()}`,
    user,
    content,
    time: new Date().toISOString().slice(0, 10),
    likes: 0
  };

  const localCommentsMap = storage.getComments();
  const list = localCommentsMap[state.selectedResource.id] || [];
  list.push(newComment);
  localCommentsMap[state.selectedResource.id] = list;
  storage.setComments(localCommentsMap);

  renderComments(state.selectedResource.id);
  els.commentContent.value = "";
  renderResources();
}

function initOnlineCount() {
  const count = Math.floor(Math.random() * 60) + 20;
  els.onlineCount.textContent = count;
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

function saveCustomSite() {
  const title = els.siteTitle.value.trim();
  const url = els.siteUrl.value.trim();
  if (!title || !url) return;
  const desc = els.siteDesc.value.trim();
  const list = storage.getCustomSites();
  list.push({
    id: `u_${Date.now()}`,
    title,
    url,
    description: desc,
    iconUrl: ""
  });
  storage.setCustomSites(list);
  closeAddSiteModal();
  renderSites();
}

function addSiteSection() {
  const name = els.sectionName.value.trim();
  if (!name) return;
  const sections = storage.getSiteSections();
  sections.push({ id: `sec_${Date.now()}`, name });
  storage.setSiteSections(sections);
  els.sectionName.value = "";
  renderSites();
}

function renameSection(sectionId) {
  const sections = storage.getSiteSections();
  const target = sections.find((s) => s.id === sectionId);
  if (!target) return;
  const nextName = prompt("新的分区名称：", target.name);
  if (!nextName) return;
  target.name = nextName.trim() || target.name;
  storage.setSiteSections(sections);
  renderSites();
}

function deleteSection(sectionId) {
  if (!confirm("确定删除该分区？其中网站将回到默认分区。")) return;
  const sections = storage.getSiteSections().filter((s) => s.id !== sectionId);
  const assignments = storage.getSiteAssignments();
  Object.keys(assignments).forEach((siteId) => {
    if (assignments[siteId] === sectionId) {
      assignments[siteId] = "default";
    }
  });
  storage.setSiteSections(sections);
  storage.setSiteAssignments(assignments);
  renderSites();
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
  els.openUpload.addEventListener("click", openUploadModal);
  els.cancelUpload.addEventListener("click", closeUploadModal);
  els.saveUpload.addEventListener("click", saveUpload);
  els.pomodoroToggle.addEventListener("click", togglePomodoro);
  els.pomodoroTime.addEventListener("click", () => {
    els.timePicker.classList.toggle("show");
  });
  els.timeHours.addEventListener("change", applyTimePicker);
  els.timeMinutes.addEventListener("change", applyTimePicker);
  els.timeSeconds.addEventListener("change", applyTimePicker);
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
