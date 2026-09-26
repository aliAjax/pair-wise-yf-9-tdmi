const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const skillNames = ["没玩过", "玩过", "熟悉"];
const itemLevelNames = ["仅新手会漏", "玩过也会漏", "老手也会漏"];

// 四类顺序照旧：讲解单和详情库都按这个顺序展示
const ruleCategories = [
  { key: "forgets", label: "容易忘的规则", level: 1 },
  { key: "disputes", label: "常见争议", level: 2 },
  { key: "setup", label: "开局准备", level: 0 },
  { key: "scoring", label: "计分提醒", level: 1 }
];

const makeItem = (text, level) => ({ id: crypto.randomUUID(), text, level });

const defaultGames = [
  {
    id: crypto.randomUUID(),
    name: "奥尔良",
    minPlayers: 2,
    maxPlayers: 4,
    duration: 90,
    complexity: "中",
    lastPlayed: "2025-11-20",
    cover: "",
    forgets: [
      makeItem("商站建造前先确认道路或水路连接", 1),
      makeItem("袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽", 1)
    ],
    disputes: [makeItem("事件顺序和玩家动作结算先后", 2), makeItem("科技板是否能替代所有同类随从", 2)],
    setup: [makeItem("按人数放置货物板块", 0), makeItem("每位玩家拿起始随从、商人和个人板", 0)],
    scoring: [makeItem("货物分数", 1), makeItem("商站和市民乘区块", 1), makeItem("金币和建筑剩余加分", 1)]
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
    forgets: [makeItem("联邦连接时卫星数量和能量消耗要一起核对", 1), makeItem("研究升到顶必须拿对应科技板限制", 1)],
    disputes: [makeItem("被动充能是否能拒绝", 2), makeItem("星球改造费用受哪些能力影响", 2)],
    setup: [makeItem("随机终局计分板和回合得分板", 0), makeItem("按种族设置起始资源和母星", 0)],
    scoring: [makeItem("终局计分板", 1), makeItem("科技轨排名", 1), makeItem("联邦和建筑分", 1)]
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
    forgets: [makeItem("每轮结束先铺墙再补工厂展示区", 1), makeItem("地板线扣分后清空对应砖", 1)],
    disputes: [makeItem("同色砖放置限制是否看整面墙", 2), makeItem("中央区起始玩家标记是否必须拿", 2)],
    setup: [makeItem("按人数放工厂圆盘", 0), makeItem("每个圆盘补4块砖", 0)],
    scoring: [makeItem("横竖相邻即时分", 1), makeItem("完整行列和颜色终局加分", 1)]
  }
];

const defaultState = {
  selectedId: "",
  games: defaultGames,
  friends: [
    { id: crypto.randomUUID(), name: "阿杰", skill: { [defaultGames[0].id]: 2, [defaultGames[2].id]: 1 } },
    { id: crypto.randomUUID(), name: "小林", skill: { [defaultGames[2].id]: 2 } },
    { id: crypto.randomUUID(), name: "老周", skill: { [defaultGames[0].id]: 1, [defaultGames[1].id]: 1 } }
  ],
  roster: {},
  teach: {}
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

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
  friendForm: document.querySelector("#friendForm"),
  friendNameInput: document.querySelector("#friendNameInput"),
  friendList: document.querySelector("#friendList"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  tonightCount: document.querySelector("#tonightCount"),
  visibleCount: document.querySelector("#visibleCount")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return normalizeState({});
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return normalizeState({});
  }
}

function normalizeState(raw) {
  const state = { ...structuredClone(defaultState), ...raw };
  state.friends = Array.isArray(state.friends) ? state.friends : [];
  state.roster = state.roster && typeof state.roster === "object" ? state.roster : {};
  state.teach = state.teach && typeof state.teach === "object" ? state.teach : {};
  state.games = (state.games || []).map((game) => {
    ruleCategories.forEach((cat) => {
      game[cat.key] = (game[cat.key] || []).map((item) =>
        typeof item === "string" ? makeItem(item, cat.level) : { level: cat.level, ...item }
      );
    });
    return game;
  });
  const friendIds = new Set(state.friends.map((friend) => friend.id));
  Object.keys(state.roster).forEach((gameId) => {
    state.roster[gameId] = (state.roster[gameId] || []).filter((id) => friendIds.has(id));
  });
  return state;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getGame() {
  return state.games.find((item) => item.id === state.selectedId) || state.games[0];
}

function getAllItems(game) {
  return ruleCategories.flatMap((cat) => game[cat.key]);
}

function getAllRules(game) {
  return getAllItems(game).map((item) => item.text);
}

function skillOf(friendId, gameId) {
  const friend = state.friends.find((item) => item.id === friendId);
  return friend?.skill?.[gameId] ?? 0;
}

function attendees(gameId) {
  return (state.roster[gameId] || []).filter((id) => state.friends.some((friend) => friend.id === id));
}

function minSkill(gameId) {
  const ids = attendees(gameId);
  if (!ids.length) return null;
  return Math.min(...ids.map((id) => skillOf(id, gameId)));
}

// 只保留场上最不熟的人会漏掉的提醒
function visibleItems(game) {
  const min = minSkill(game.id);
  if (min === null) return [];
  return getAllItems(game).filter((item) => item.level >= min);
}

// 离场或熟练度上调后，把多余项连同完成记录一起收走
function pruneTeach(game) {
  const visible = new Set(visibleItems(game).map((item) => item.id));
  state.teach[game.id] = (state.teach[game.id] || []).filter((id) => visible.has(id));
}

function toggleAttend(friendId) {
  const game = getGame();
  if (!game) return;
  const list = (state.roster[game.id] ||= []);
  if (list.includes(friendId)) {
    state.roster[game.id] = list.filter((id) => id !== friendId);
    pruneTeach(game);
    return;
  }
  list.push(friendId);
  // 讲完才到：他会漏掉的已讲项要重新打开，不能留在完成记录里
  const level = skillOf(friendId, game.id);
  const items = getAllItems(game);
  state.teach[game.id] = (state.teach[game.id] || []).filter((id) => {
    const item = items.find((entry) => entry.id === id);
    return item && item.level < level;
  });
}

function setSkill(friendId, level) {
  const game = getGame();
  const friend = state.friends.find((item) => item.id === friendId);
  if (!game || !friend) return;
  friend.skill = { ...(friend.skill || {}), [game.id]: level };
  pruneTeach(game);
}

function toggleTeach(itemId) {
  const game = getGame();
  if (!game) return;
  const done = (state.teach[game.id] ||= []);
  const index = done.indexOf(itemId);
  if (index >= 0) done.splice(index, 1);
  else done.push(itemId);
}

function removeFriend(friendId) {
  state.friends = state.friends.filter((friend) => friend.id !== friendId);
  Object.keys(state.roster).forEach((gameId) => {
    state.roster[gameId] = state.roster[gameId].filter((id) => id !== friendId);
  });
  state.games.forEach(pruneTeach);
}

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
  const game = getGame();
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
  els.tonightCount.textContent = game ? attendees(game.id).length : 0;
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

function renderFriends() {
  els.friendList.innerHTML =
    state.friends
      .map((friend) => {
        const recorded = Object.keys(friend.skill || {}).length;
        return `
          <li>
            <span>${escapeHtml(friend.name)} <span class="rec">${recorded ? `已记录${recorded}款` : "未记录"}</span></span>
            <button type="button" title="删除" data-friend-id="${friend.id}">×</button>
          </li>
        `;
      })
      .join("") || `<li><span class="rec">还没有常来的朋友。</span></li>`;
}

function renderRoster(game) {
  const rosterIds = attendees(game.id);
  return `
    <section class="rule-section roster-section">
      <h3>今晚名单</h3>
      <p class="hint">勾选到场朋友。讲完才到的勾上后，他会漏的已讲项会自动重开；离场则收走多余项。</p>
      <ul class="roster-list">
        ${
          state.friends
            .map((friend) => {
              const inRoster = rosterIds.includes(friend.id);
              const level = skillOf(friend.id, game.id);
              return `
                <li>
                  <label class="attend">
                    <input type="checkbox" data-attend="${friend.id}" ${inRoster ? "checked" : ""} />
                    ${escapeHtml(friend.name)}
                  </label>
                  <select data-skill="${friend.id}" title="熟练度">
                    ${skillNames
                      .map((name, index) => `<option value="${index}" ${index === level ? "selected" : ""}>${name}</option>`)
                      .join("")}
                  </select>
                </li>
              `;
            })
            .join("") || `<li><span class="rec">先在左侧添加常来的朋友。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderTeachSheet(game) {
  if (!attendees(game.id).length) {
    return `
      <section class="rule-section teach-sheet">
        <h3>讲解单</h3>
        <p class="empty">先在今晚名单里勾选到场朋友。</p>
      </section>
    `;
  }
  const min = minSkill(game.id);
  const done = new Set(state.teach[game.id] || []);
  const visible = visibleItems(game);
  const doneCount = visible.filter((item) => done.has(item.id)).length;
  const percent = visible.length ? Math.round((doneCount / visible.length) * 100) : 0;
  const groups = ruleCategories
    .map((cat) => {
      const items = game[cat.key].filter((item) => item.level >= min);
      if (!items.length) return "";
      return `
        <div class="teach-group">
          <h4>${cat.label}</h4>
          <ul class="teach-list">
            ${items
              .map(
                (item) => `
                  <li class="${done.has(item.id) ? "done" : ""}">
                    <label>
                      <input type="checkbox" data-teach="${item.id}" ${done.has(item.id) ? "checked" : ""} />
                      <span>${escapeHtml(item.text)}</span>
                    </label>
                  </li>
                `
              )
              .join("")}
          </ul>
        </div>
      `;
    })
    .join("");
  return `
    <section class="rule-section teach-sheet">
      <div class="teach-head">
        <h3>讲解单</h3>
        <span class="pill">场上最不熟：${skillNames[min]}</span>
      </div>
      <div class="progress"><div style="width: ${percent}%"></div></div>
      <p class="hint">已讲 ${doneCount}/${visible.length} 条</p>
      ${groups || `<p class="empty">大家都会，没有必须讲的提醒。</p>`}
      <button id="resetTeachBtn" type="button">清空讲解进度</button>
    </section>
  `;
}

function renderDetail() {
  const game = getGame();
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
      ${renderRoster(game)}
      ${renderTeachSheet(game)}
      ${ruleCategories.map((cat) => renderRuleSection(cat.label, cat.key, game[cat.key])).join("")}
      <form class="add-rule" id="ruleForm">
        <div class="split">
          <select id="ruleTypeInput">
            ${ruleCategories.map((cat) => `<option value="${cat.key}">${cat.label}</option>`).join("")}
          </select>
          <select id="ruleLevelInput">
            ${itemLevelNames.map((name, index) => `<option value="${index}">${name}</option>`).join("")}
          </select>
        </div>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
  const cat = ruleCategories[0];
  const levelSelect = document.querySelector("#ruleLevelInput");
  if (levelSelect) levelSelect.value = String(cat.level);
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item) => `
                <li>
                  <span>${escapeHtml(item.text)}</span>
                  <span class="level-badge lv${item.level}">${itemLevelNames[item.level]}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-id="${item.id}">×</button>
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
  renderList();
  renderFriends();
  renderDetail();
}

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
    forgets: [makeItem("本局开始前先补充容易忘的规则。", 1)],
    disputes: [],
    setup: [makeItem("整理组件并按人数调整初始设置。", 0)],
    scoring: [makeItem("确认终局计分项和即时得分项。", 1)]
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

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.friendForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.friendNameInput.value.trim();
  if (!name) return;
  state.friends.push({ id: crypto.randomUUID(), name, skill: {} });
  els.friendForm.reset();
  renderAll();
});

els.friendList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-friend-id]");
  if (!button) return;
  removeFriend(button.dataset.friendId);
  renderAll();
});

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("change", (event) => {
  const attend = event.target.closest("[data-attend]");
  const skill = event.target.closest("[data-skill]");
  const teach = event.target.closest("[data-teach]");
  if (attend) {
    toggleAttend(attend.dataset.attend);
    renderAll();
    return;
  }
  if (skill) {
    setSkill(skill.dataset.skill, Number(skill.value));
    renderAll();
    return;
  }
  if (teach) {
    toggleTeach(teach.dataset.teach);
    renderAll();
    return;
  }
  if (event.target.id === "ruleTypeInput") {
    const cat = ruleCategories.find((item) => item.key === event.target.value);
    const levelSelect = document.querySelector("#ruleLevelInput");
    if (cat && levelSelect) levelSelect.value = String(cat.level);
  }
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = getGame();
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const level = Number(document.querySelector("#ruleLevelInput").value);
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(makeItem(text, level));
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-id]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const resetButton = event.target.closest("#resetTeachBtn");
  const game = getGame();
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const id = ruleButton.dataset.ruleId;
    game[key] = game[key].filter((item) => item.id !== id);
    state.teach[game.id] = (state.teach[game.id] || []).filter((itemId) => itemId !== id);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (resetButton) {
    state.teach[game.id] = [];
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    delete state.roster[game.id];
    delete state.teach[game.id];
    state.friends.forEach((friend) => {
      if (friend.skill) delete friend.skill[game.id];
    });
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
