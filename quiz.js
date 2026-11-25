const axes = ['EI', 'SN', 'TF', 'JP'];
const questions = [
  [0,'忙完一周，你最想怎么充电？','约朋友见面','独处一会儿'],
  [1,'学一支新舞时，你会先关注什么？','具体动作和拍点','整支舞的风格和表达'],
  [2,'朋友在练习中受挫，你通常先做什么？','一起找出卡住的原因','先听听对方的感受'],
  [3,'计划去看演唱会，你会怎么安排当天？','提前定好时间和路线','定好大方向，其他到时再说'],
  [0,'第一次参加线下粉丝活动，你会怎么融入？','找人聊聊共同喜欢的歌','先观察现场，等合适时机再聊'],
  [1,'听到一首新歌，你通常先留意什么？','旋律、音色或节奏','歌曲让我联想到的故事'],
  [2,'小组对海报有不同意见，你更看重什么？','哪版更符合事先说好的标准','哪版更能兼顾成员的在意之处'],
  [3,'周末突然空下来，你更喜欢怎么过？','先定几件想完成的事','看当天的心情决定'],
  [0,'遇到一个有趣的新想法，你会怎么处理？','边和人聊边理清','先独自想清楚再分享'],
  [1,'朋友讲起一段旅行，你更想追问什么？','去了哪里，发生了什么','这段经历改变了什么想法'],
  [2,'要给朋友提修改意见，你通常怎么开口？','先指出最需要解决的问题','先回应对方投入的心力'],
  [3,'离交稿还有一周，你比较喜欢哪种节奏？','提前分好每天的进度','留出余地，按当天状态推进'],
  [0,'在一个陌生班级里，课间你更可能做什么？','主动和附近的人打招呼','先做自己的事，慢慢认识大家'],
  [1,'第一次尝试做甜点，你更愿意怎么学？','照着示范做一遍','先理解原理，再构思做法'],
  [2,'两人都想要最后一张票，你更倾向怎么协调？','按双方都认可的规则决定','聊聊这场演出对各自的意义'],
  [3,'临出门时朋友想临时换目的地，你的第一反应是？','先看看会不会打乱原安排','想听听新地点有什么好玩的'],
  [0,'看完一场很喜欢的演出，你更想怎么回味？','和朋友边走边聊','戴上耳机独自回想'],
  [1,'看到一张专辑封面时，什么更容易吸引你？','看得见的配色、材质和构图','画面背后可能藏着的意象'],
  [2,'合作伙伴没完成约好的任务，你会先关注什么？','目前的缺口怎么补','对方遇到了什么困难'],
  [3,'选好旅行目的地后，你更想马上做什么？','敲定住宿和主要行程','收集几个选项，先保留弹性'],
  [0,'遇到难想通的事，哪种方式更容易让你理清？','和信任的人聊一聊','自己安静地写下来'],
  [1,'整理演出回忆时，你通常更容易记住什么？','具体场景和当时的细节','整晚带给我的印象和意义'],
  [2,'帮朋友比较两个机会时，你更倾向先问什么？','各自的条件和成本是什么','哪一个更贴近你在乎的事'],
  [3,'同时有几件小事要办，你会怎么做？','列清单，按顺序完成','按当下情况调整顺序'],
  [0,'聚会结束后，你通常有什么感觉？','聊得开心，还想多待一会儿','聊得开心，也想安静一会儿'],
  [1,'接到一个开放式创作任务，你会从哪里开始？','找现成的例子和可用的素材','先发散几种可能的主题'],
  [2,'朋友问你对新作品的真实看法，你会怎么组织反馈？','以具体的优缺点为主','以对方想传达的感受为主'],
  [3,'一项计划有好几个可行选项时，你更喜欢？','早点做决定，安心往下走','多留一阵选择，看看有没有变化'],
  [0,'想认识同好时，哪种场合更自在？','大家一起聊天的活动','一对一慢慢聊'],
  [1,'介绍一个新点子时，你更自然的起点是？','一个具体例子','它将来可能带来的变化']
];

const screen = document.querySelector('#screen');
let index = 0;
let answers = [];
const selectedGroups = new Set();

function show(html) {
  screen.innerHTML = html;
  const heading = screen.querySelector('h1,h2');
  heading.tabIndex = -1;
  heading.focus();
}

function home() {
  show('<div class="card-toolbar"><p class="muted">K-POP MBTI · 30 道情境题</p></div><h1>你和哪位艺人<br><mark>最同频？</mark></h1><p>跟着第一直觉作答，看看哪位 K-pop 艺人的 MBTI 和你最接近。</p><button class="primary" id="start">开始测试</button>');
  const start = screen.querySelector('#start');
  start.insertAdjacentHTML('beforebegin', '<details><summary>选择喜欢的团体（可多选）</summary><label for="group-search">搜索团体</label><input type="search" id="group-search"><div class="group-options" id="group-options" role="group" aria-label="可选团体"></div><button id="clear-groups" type="button">清空选择</button></details><p class="muted" id="group-selection" role="status"></p>');
  const search = screen.querySelector('#group-search');
  const options = screen.querySelector('#group-options');
  const selection = screen.querySelector('#group-selection');
  const clear = screen.querySelector('#clear-groups');
  const popular = document.createElement('div');
  popular.innerHTML = '<p id="popular-heading"><strong>热门</strong></p><div class="popular-groups" role="group" aria-labelledby="popular-heading"></div>';
  search.labels[0].before(popular);
  const popularButtons = new Map();
  popularGroups.forEach(group => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = group;
    button.onclick = () => toggleGroup(group, !selectedGroups.has(group));
    popular.querySelector('.popular-groups').append(button);
    popularButtons.set(group, button);
  });
  function toggleGroup(group, checked) {
    if (checked) selectedGroups.add(group);
    else selectedGroups.delete(group);
    showGroups();
    updateSelection();
  }
  function updateSelection() {
    selection.textContent = selectedGroups.size ? '已选 ' + selectedGroups.size + ' 个团体 · ' + [...selectedGroups].join('、') : '匹配范围：全部团体';
    clear.disabled = !selectedGroups.size;
    popularButtons.forEach((button, group) => button.setAttribute('aria-pressed', String(selectedGroups.has(group))));
  }
  function showGroups() {
    const query = search.value.trim().toLowerCase();
    const visible = groups.filter(group => group.toLowerCase().includes(query));
    options.replaceChildren();
    if (!visible.length) options.textContent = '未找到团体';
    visible.forEach(group => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedGroups.has(group);
      checkbox.onchange = () => {
        if (checkbox.checked) selectedGroups.add(group);
        else selectedGroups.delete(group);
        updateSelection();
      };
      label.append(checkbox, group);
      options.append(label);
    });
  }
  search.oninput = showGroups;
  clear.onclick = () => { selectedGroups.clear(); showGroups(); updateSelection(); search.focus(); };
  showGroups();
  updateSelection();
  start.onclick = () => { answers = []; index = 0; quiz(); };
  directoryButton('艺人总表', '', home, { parent: screen.querySelector('.card-toolbar') });
}

function directoryButton(label, type, back, { entries, parent = screen } = {}) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = () => directory(type, back, entries);
  parent.append(button);
}

const roster = Object.entries(idols).flatMap(([type, names]) => names.map(entry => {
  const [, name, group] = entry.match(/^(.*?)\s+\((.+)\)$/) || [];
  return { name: name || entry, group: group || '', type, types: type.split(' / ') };
})).filter(artist => artist.group.trim()).sort((a, b) => a.name.localeCompare(b.name));
const groups = [...new Set(roster.map(artist => artist.group))].sort((a, b) => a.localeCompare(b));
const popularGroups = [
  'BIGBANG', '2NE1', 'SHINee', 'Wonder Girls', 'SUPER JUNIOR', 'KARA', '2PM',
  'EXO', 'Red Velvet', 'BTS', 'TWICE', 'SEVENTEEN', 'BLACKPINK',
  'Stray Kids', 'ITZY', 'TXT', 'aespa', 'ENHYPEN', 'IVE', 'LE SSERAFIM', 'Newjeans',
  'RIIZE', 'BABYMONSTER', 'ZEROBASEONE', 'ILLIT', 'A2O LITE'
].filter(group => groups.includes(group));

function directory(type, back, entries = roster) {
  show('<h1>艺人 MBTI 总表</h1><label for="search">搜索艺人或组合</label><input id="search" type="search"><label for="filter">筛选 MBTI</label><select id="filter"><option value="">全部类型</option></select><p id="count" role="status"></p><div class="directory" tabindex="0" aria-label="艺人总表"><table aria-label="艺人、组合和 MBTI"><thead><tr><th scope="col">艺人</th><th scope="col">组合</th><th scope="col">MBTI</th></tr></thead><tbody></tbody></table></div><button id="close">返回</button>');
  const search = screen.querySelector('#search');
  const filter = screen.querySelector('#filter');
  const body = screen.querySelector('tbody');
  [...new Set(roster.flatMap(artist => artist.types))].sort()
    .forEach(value => filter.add(new Option(value, value)));
  filter.value = type;
  function update() {
    const query = search.value.trim().toLowerCase();
    const matches = entries.filter(artist => (!filter.value || artist.types.includes(filter.value)) &&
      (artist.name.toLowerCase().includes(query) || artist.group.toLowerCase().includes(query)));
    body.replaceChildren();
    matches.forEach(artist => {
      const row = body.insertRow();
      [artist.name, artist.group, artist.type].forEach(value => {
        row.insertCell().textContent = value;
      });
    });
    screen.querySelector('.directory').scrollTop = 0;
    screen.querySelector('#count').textContent = matches.length ? '共 ' + matches.length + ' 条艺人记录' : '没有找到符合条件的艺人';
  }
  search.oninput = update;
  filter.onchange = update;
  screen.querySelector('#close').onclick = back;
  update();
}

function quiz(focusAnswer) {
  const [, prompt, first, second] = questions[index];
  const order = index % 8 >= 4 ? [1, 0] : [0, 1];
  const choices = [first, second];
  const buttons = order.map(value => '<button data-choice="' + value + '" aria-pressed="' + (answers[index] === value) + '">' + choices[value] + '</button>').join('');
  show('<p class="muted">第 ' + (index + 1) + ' / ' + questions.length + ' 题</p><progress aria-label="已完成题数" value="' + answers.filter(Number.isInteger).length + '" max="' + questions.length + '"></progress><h2>' + prompt + '</h2>' + buttons + '<div class="quiz-actions"><button id="back">' + (index ? '上一题' : '返回首页') + '</button><button class="primary" id="next" ' + (answers[index] === undefined ? 'disabled' : '') + '>' + (index === questions.length - 1 ? '查看我的匹配' : '下一题') + '</button></div>');
  screen.querySelectorAll('[data-choice]').forEach(button => {
    button.onclick = () => { answers[index] = Number(button.dataset.choice); quiz(button.dataset.choice); };
  });
  if (focusAnswer !== undefined) screen.querySelector('[data-choice="' + focusAnswer + '"]').focus();
  screen.querySelector('#next').onclick = () => {
    if (index === questions.length - 1) result();
    else { index++; quiz(); }
  };
  screen.querySelector('#back').onclick = () => { if (index) { index--; quiz(); } else home(); };
}

function score(responses) {
  const totals = axes.map(() => [0, 0]);
  questions.forEach(([axis], i) => totals[axis][responses[i]]++);
  return totals.map(([left, right], axis) => {
    const firstQuestion = questions.findIndex(([dimension]) => dimension === axis);
    const preference = left === right ? responses[firstQuestion] : Number(right > left);
    return axes[axis][preference];
  }).join('');
}

function findMatches(type) {
  const candidates = roster.filter(artist => !selectedGroups.size || selectedGroups.has(artist.group));
  const scored = candidates.map(artist => ({
    artist,
    similarity: Math.max(...artist.types.map(candidate =>
      [...type].filter((letter, i) => letter === candidate[i]).length))
  }));
  const similarity = Math.max(...scored.map(entry => entry.similarity));
  return { similarity, matches: scored.filter(entry => entry.similarity === similarity).map(entry => entry.artist) };
}

function result(previousMatch) {
  const type = score(answers);
  const { similarity, matches } = findMatches(type);
  const match = previousMatch || matches[Math.floor(Math.random() * matches.length)];
  show('<div class="card-toolbar"><p class="muted">你的 MBTI</p></div><h1 class="type">' + type + '</h1><p class="muted" id="scope"></p><h2 id="match"></h2><p id="match-type"></p><p>你们有 ' + similarity + ' / 4 个 MBTI 字母相同，当前范围内共有 ' + matches.length + ' 条并列最佳记录。</p><p class="muted">配对结果仅供娱乐。</p><button class="primary" id="again">重新测试</button>');
  screen.querySelector('#scope').textContent = '匹配范围：' + (selectedGroups.size ? [...selectedGroups].join('、') : '全部团体');
  screen.querySelector('#match').textContent = match.name + ' (' + match.group + ')';
  screen.querySelector('#match-type').textContent = '艺人 MBTI · ' + match.type;
  screen.querySelector('#again').onclick = home;
  directoryButton(similarity === 4 ? '同类型艺人' : '并列最佳匹配', '', () => result(match), { entries: matches, parent: screen.querySelector('.card-toolbar') });
}

home();

