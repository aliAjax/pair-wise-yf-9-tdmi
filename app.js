const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

// 熟练度：0 没玩过（四类全讲）/ 1 玩过（跳过开局准备）/ 2 熟悉（无需讲解）
const LEVELS = [
  { value: 0, label: "没玩过" },
  { value: 1, label: "玩过" },
  { value: 2, label: "熟悉" }
];
// 讲解单四类顺序，照旧：容易忘的规则 → 常见争议 → 开局准备 → 计分提醒
const SECTIONS = [
  { key: "forgets", title: "容易忘的规则", taughtTo: [0, 1] },
  { key: "disputes", title: "常见争议", taughtTo: [0, 1] },
  { key: "setup", title: "开局准备", taughtTo: [0] },
  { key: "scoring", title: "计分提醒", taughtTo: [0, 1] }
];

function buildDefaultState() {
  const games = [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ];
  const friends = [
    { id: crypto.randomUUID(), name: "老王" },
    { id: crypto.randomUUID(), name: "小周" },
    { id: crypto.randomUUID(), name: "阿琪" }
  ];
  return {
    selectedId: games[0].id,
    games,
    friends,
    // 每位朋友对每款桌游的熟练度，缺省按“没玩过”处理
    proficiency: {
      [friends[0].id]: { [games[0].id]: 1, [games[1].id]: 0, [games[2].id]: 2 },
      [friends[1].id]: { [games[0].id]: 0, [games[1].id]: 2, [games[2].id]: 1 },
      [friends[2].id]: { [games[0].id]: 2, [games[1].id]: 1, [games[2].id]: 0 }
    },
    // 今晚名单（到场朋友 id）
    roster: [friends[0].id, friends[1].id],
    // 每款游戏的讲解勾选状态，key 形如 "forgets:0"
    checked: {}
  };
}

const defaultState = buildDefaultState();

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

// 本次会话内标记“因迟到而重新打开”的提醒，只用于高亮提示，不写入存档
const reopenedKeys = new Set();

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount"),
  rosterChips: document.querySelector("#rosterChips"),
  rosterCount: document.querySelector("#rosterCount"),
  clearRosterBtn: document.querySelector("#clearRosterBtn"),
  friendForm: document.querySelector("#friendForm"),
  friendNameInput: document.querySelector("#friendNameInput")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return SECTIONS.flatMap((section) => game[section.key]);
}

// ---------- 名单 / 熟练度 / 讲解单逻辑 ----------

function getLevel(friendId, gameId) {
  return state.proficiency?.[friendId]?.[gameId] ?? 0;
}

function presentFriends(gameId) {
  return state.roster
    .map((id) => state.friends.find((friend) => friend.id === id))
    .filter(Boolean)
    .map((friend) => ({ ...friend, level: getLevel(friend.id, gameId) }));
}

// 场上最不熟的人的熟练度（取最小值）
function minLevelFor(gameId) {
  const present = presentFriends(gameId);
  return present.length ? Math.min(...present.map((friend) => friend.level)) : null;
}

function itemKey(category, index) {
  return `${category}:${index}`;
}

// 当前熟练度下，讲解单需要覆盖的提醒 key
function requiredKeysFor(game, level) {
  if (level == null) return new Set();
  const keys = new Set();
  SECTIONS.forEach((section) => {
    if (section.taughtTo.includes(level)) {
      game[section.key].forEach((_, index) => keys.add(itemKey(section.key, index)));
    }
  });
  return keys;
}

function requiredKeysOfGame(gameId) {
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return new Set();
  return requiredKeysFor(game, minLevelFor(gameId));
}

// 收走场上不再需要的多余项，完成记录只保留当前讲解单上的勾选
function pruneChecked(gameId) {
  if (!state.checked[gameId]) return;
  const game = state.games.find((item) => item.id === gameId);
  const required = requiredKeysOfGame(gameId);
  state.checked[gameId] = state.checked[gameId].filter((key) => {
    const [category, indexText] = key.split(":");
    const exists = game && Number(indexText) in (game[category] || []);
    return required.has(key) && exists;
  });
}

// 朋友到场（含讲完才到）：只有当其成为“最不熟者”时，受影响的已讲项才重新打开
function arriveFriend(friendId) {
  if (state.roster.includes(friendId)) return;
  const wasEmpty = state.roster.length === 0;
  const previousMin = {};
  if (!wasEmpty) {
    state.games.forEach((game) => {
      previousMin[game.id] = minLevelFor(game.id);
    });
  }
  state.roster.push(friendId);
  if (wasEmpty) return; // 名单从空变非空，没有任何已讲项需要处理

  state.games.forEach((game) => {
    const oldMin = previousMin[game.id];
    const level = getLevel(friendId, game.id);
    // 新人不比原来最不熟的人更熟（持平或更生）→ 他会漏掉的已讲项重新打开
    if (oldMin != null && level <= oldMin) {
      const reopened = requiredKeysFor(game, level);
      const before = state.checked[game.id] || [];
      before.forEach((key) => {
        if (reopened.has(key)) reopenedKeys.add(`${game.id}|${key}`);
      });
      // 重开即取消勾选，不计入完成记录
      state.checked[game.id] = before.filter((key) => !reopened.has(key));
    }
  });
  state.games.forEach((game) => pruneChecked(game.id));
}

// 朋友离场：讲解单按剩余名单重算，多余项收走
function departFriend(friendId) {
  state.roster = state.roster.filter((id) => id !== friendId);
  state.games.forEach((game) => pruneChecked(game.id));
}

function setProficiency(friendId, gameId, level) {
  state.proficiency[friendId] = state.proficiency[friendId] || {};
  state.proficiency[friendId][gameId] = level;
  pruneChecked(gameId);
}

function deleteFriend(friendId) {
  state.friends = state.friends.filter((friend) => friend.id !== friendId);
  state.roster = state.roster.filter((id) => id !== friendId);
  delete state.proficiency[friendId];
  state.games.forEach((game) => pruneChecked(game.id));
}

function clearRoster() {
  state.roster = [];
  state.checked = {};
  reopenedKeys.clear();
}

// ---------- 筛选 / 概览 ----------

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

// ---------- 今晚名单 ----------

function renderRoster() {
  els.rosterCount.textContent = `${state.roster.length}/${state.friends.length} 人到场`;
  if (state.friends.length === 0) {
    els.rosterChips.innerHTML = `<p class="empty">还没有朋友资料，先在下面添加常来的朋友。</p>`;
    return;
  }
  els.rosterChips.innerHTML = state.friends
    .map((friend) => {
      const present = state.roster.includes(friend.id);
      return `
        <span class="roster-chip ${present ? "present" : ""}" data-friend-id="${friend.id}">
          <button type="button" class="chip-toggle" data-toggle-friend="${friend.id}">${present ? "✓ " : ""}${escapeHtml(friend.name)}</button>
          <button type="button" class="chip-delete" title="删除朋友资料" data-delete-friend="${friend.id}">×</button>
        </span>
      `;
    })
    .join("");
}

// ---------- 详情：讲解单 + 熟练度 + 规则库 ----------

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${renderTeachCard(game)}
      ${renderProficiencyEditor(game)}
      ${SECTIONS.map((section) => renderRuleSection(section.title, section.key, game[section.key])).join("")}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          ${SECTIONS.map((section) => `<option value="${section.key}">${section.title}</option>`).join("")}
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderTeachCard(game) {
  const present = presentFriends(game.id);
  if (present.length === 0) {
    return `
      <section class="teach-card teach-empty">
        <h3>今晚讲解单</h3>
        <p class="empty">名单还是空的。先在上方点亮到场的朋友，讲解单会按最不熟的人生成。</p>
      </section>
    `;
  }

  const minLevel = Math.min(...present.map((friend) => friend.level));
  const leastFamiliar = present.filter((friend) => friend.level === minLevel);
  const checked = state.checked[game.id] || [];
  const required = requiredKeysFor(game, minLevel);
  const doneCount = checked.filter((key) => required.has(key)).length;
  const total = required.size;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const levelLabel = LEVELS.find((item) => item.value === minLevel).label;

  const groups = SECTIONS.map((section) => {
    if (!section.taughtTo.includes(minLevel)) return "";
    const items = game[section.key]
      .map((text, index) => {
        const key = itemKey(section.key, index);
        const isChecked = checked.includes(key);
        const isReopened = reopenedKeys.has(`${game.id}|${key}`);
        return `
          <li class="teach-item">
            <label class="teach-check">
              <input type="checkbox" data-check-key="${key}" ${isChecked ? "checked" : ""} />
              <span>${escapeHtml(text)}</span>
            </label>
            ${isReopened ? `<em class="reopen-badge">迟到重开</em>` : ""}
          </li>
        `;
      })
      .join("");
    return `
      <section class="teach-section">
        <h4>${section.title}</h4>
        <ul class="rule-list teach-list">${items}</ul>
      </section>
    `;
  }).join("");

  return `
    <section class="teach-card">
      <div class="teach-head">
        <h3>今晚讲解单</h3>
        <button type="button" class="ghost-btn" data-reset-checks="${game.id}">重置讲解勾选</button>
      </div>
      <p class="teach-scope">
        按最不熟的人讲解：<strong>${levelLabel}</strong>
        （${leastFamiliar.map((friend) => escapeHtml(friend.name)).join("、")}）
      </p>
      ${
        total === 0
          ? `<p class="empty">场上的朋友都熟悉这款游戏，无需讲解。</p>`
          : `
            <div class="progress">
              <div class="progress-bar"><span style="width:${percent}%"></span></div>
              <span class="progress-text">已讲 ${doneCount}/${total}</span>
            </div>
            ${groups}
          `
      }
    </section>
  `;
}

function renderProficiencyEditor(game) {
  if (state.friends.length === 0) {
    return `
      <section class="proficiency-card">
        <h3>朋友熟练度</h3>
        <p class="empty">先在上方添加常来的朋友，再记录他们对这款游戏的熟练度。</p>
      </section>
    `;
  }
  const rows = state.friends
    .map((friend) => {
      const level = getLevel(friend.id, game.id);
      const options = LEVELS.map(
        (item) => `<option value="${item.value}" ${item.value === level ? "selected" : ""}>${item.label}</option>`
      ).join("");
      return `
        <div class="prof-row">
          <span class="prof-name">${escapeHtml(friend.name)}</span>
          <select data-level-friend="${friend.id}" aria-label="${escapeHtml(friend.name)}的熟练度">${options}</select>
        </div>
      `;
    })
    .join("");
  return `
    <section class="proficiency-card">
      <h3>朋友熟练度</h3>
      <div class="prof-grid">${rows}</div>
    </section>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderAll() {
  saveState();
  renderSummary();
  renderRoster();
  renderList();
  renderDetail();
}

// ---------- 规则增删时同步讲解勾选的索引 ----------

function removeRule(game, key, index) {
  const checked = state.checked[game.id] || [];
  game[key].splice(index, 1);
  const prefix = `${key}:`;
  const remapped = checked
    .filter((itemKeyName) => !itemKeyName.startsWith(prefix) || Number(itemKeyName.split(":")[1]) !== index)
    .map((itemKeyName) => {
      if (!itemKeyName.startsWith(prefix)) return itemKeyName;
      const oldIndex = Number(itemKeyName.split(":")[1]);
      return oldIndex > index ? `${prefix}${oldIndex - 1}` : itemKeyName;
    });
  state.checked[game.id] = remapped;
  pruneChecked(game.id);
}

// ---------- 表单 / 工具 ----------

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- 事件绑定 ----------

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

// 添加朋友：资料入库并视为此刻到场（讲完才到的场景）
els.friendForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.friendNameInput.value.trim();
  if (!name) return;
  const friend = { id: crypto.randomUUID(), name };
  state.friends.push(friend);
  arriveFriend(friend.id);
  els.friendForm.reset();
  renderAll();
});

// 名单：点亮到场 / 再点离场 / 删除朋友资料
els.rosterChips.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-friend]");
  const deleteButton = event.target.closest("[data-delete-friend]");
  if (toggleButton) {
    const friendId = toggleButton.dataset.toggleFriend;
    if (state.roster.includes(friendId)) departFriend(friendId);
    else arriveFriend(friendId);
    renderAll();
  }
  if (deleteButton) {
    const friendId = deleteButton.dataset.deleteFriend;
    const friend = state.friends.find((item) => item.id === friendId);
    if (friend && confirm(`删除朋友「${friend.name}」及其全部熟练度记录？`)) {
      deleteFriend(friendId);
      renderAll();
    }
  }
});

els.clearRosterBtn.addEventListener("click", () => {
  if (state.roster.length === 0) return;
  if (confirm("清空今晚名单？各游戏的讲解勾选也会一并重置。")) {
    clearRoster();
    renderAll();
  }
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(text);
  pruneChecked(game.id);
  renderAll();
});

els.detailView.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-check-key]");
  const levelSelect = event.target.closest("[data-level-friend]");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (checkbox) {
    const key = checkbox.dataset.checkKey;
    const checked = state.checked[game.id] || (state.checked[game.id] = []);
    if (checkbox.checked) {
      if (!checked.includes(key)) checked.push(key);
      reopenedKeys.delete(`${game.id}|${key}`);
    } else {
      state.checked[game.id] = checked.filter((item) => item !== key);
    }
    renderAll();
  }

  if (levelSelect) {
    setProficiency(levelSelect.dataset.levelFriend, game.id, Number(levelSelect.value));
    renderAll();
  }
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const resetButton = event.target.closest("[data-reset-checks]");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    removeRule(game, key, index);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (resetButton) {
    state.checked[game.id] = [];
    reopenedKeys.clear();
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    delete state.checked[game.id];
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
