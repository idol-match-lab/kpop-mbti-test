/* global window, document, navigator */
(function () {
  'use strict';

  var DATA = window.SVT_DATA;
  var ENGINE = window.SVT;
  var MEM = {};
  var STORE_PREFIX = 'svt_xhs_';
  var app = document.getElementById('app');
  var toastTimer = null;

  var state = {
    screen: 'home',
    qIndex: 1,
    answers: {},
    voice: null,
    acceptPartial: false,
    draft: null,
    lastResult: null,
    result: null,
    options: null,
    error: null,
    ready: false
  };

  function miniTool() {
    return window.xhs && window.xhs.miniTool ? window.xhs.miniTool : null;
  }

  function cacheApi() {
    if (window.xhs && typeof window.xhs.getStorage === 'function' && typeof window.xhs.setStorage === 'function') return window.xhs;
    var mt = miniTool();
    if (mt && typeof mt.getStorage === 'function' && typeof mt.setStorage === 'function') return mt;
    return null;
  }

  function storeGet(key) {
    var api = cacheApi();
    if (!api) {
      return Promise.resolve(MEM[key] || null);
    }
    return new Promise(function (resolve) {
      try {
        var result = api.getStorage({ key: STORE_PREFIX + key });
        if (!result || typeof result.then !== 'function') {
          resolve(MEM[key] || null);
          return;
        }
        result.then(function (res) {
          var raw = res ? (res.data !== undefined ? res.data : res.value) : null;
          if (raw === undefined || raw === null || raw === '') {
            resolve(MEM[key] || null);
            return;
          }
          if (typeof raw === 'string') {
            try {
              resolve(JSON.parse(raw));
            } catch (e) {
              resolve(MEM[key] || null);
            }
          } else {
            resolve(raw);
          }
        }).catch(function () {
          resolve(MEM[key] || null);
        });
      } catch (e) {
        resolve(MEM[key] || null);
      }
    });
  }

  function storeSet(key, value) {
    MEM[key] = value;
    var api = cacheApi();
    if (!api) return;
    try {
      var result = api.setStorage({ key: STORE_PREFIX + key, data: JSON.stringify(value) });
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (e) {
      // Storage is best-effort; the in-memory state still works.
    }
  }

  function storeRemove(key) {
    delete MEM[key];
    var api = cacheApi();
    if (!api || typeof api.removeStorage !== 'function') return;
    try {
      var result = api.removeStorage({ key: STORE_PREFIX + key });
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (e) {
      // Ignore storage failures.
    }
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function dateText(value) {
    var d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2);
  }

  function newId() {
    return 'xhs_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
  }

  function newDraft() {
    return {
      id: newId(),
      answers: {},
      voice: null,
      acceptPartial: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function saveDraft() {
    state.draft.answers = state.answers;
    state.draft.voice = state.voice;
    state.draft.acceptPartial = state.acceptPartial;
    state.draft.updatedAt = new Date().toISOString();
    storeSet('draft', state.draft);
  }

  function saveLastResult(result) {
    state.lastResult = result;
    storeSet('lastResult', result);
  }

  function showToast(text) {
    var el = document.getElementById('toast');
    clearTimeout(toastTimer);
    el.textContent = text;
    el.className = 'toast show';
    toastTimer = setTimeout(function () {
      el.className = 'toast';
    }, 2400);
  }

  function topbar(right) {
    return '<header class="topbar">'
      + '<div class="brand"><span class="brand-mark">听</span><span>SEVENTEEN<br>此刻，听一首</span></div>'
      + '<div class="topbar-meta"><strong>SVT / 01</strong>' + escapeHtml(right) + '</div>'
      + '</header>';
  }

  function screenWrap(inner, extraClass) {
    return '<section class="screen ' + (extraClass || '') + '">' + inner + '</section>';
  }

  function setScreen(html, keepScroll) {
    var y = window.scrollY || window.pageYOffset || 0;
    app.innerHTML = html;
    window.scrollTo(0, keepScroll ? y : 0);
  }

  function firstUnanswered() {
    for (var i = 1; i <= 6; i += 1) {
      if (!state.answers['q' + i]) return i;
    }
    return 7;
  }

  function hasProgress() {
    return Object.keys(state.answers).length > 0 || !!state.voice;
  }

  function renderHome() {
    var startLabel = hasProgress() ? '继续上次答题 · 第 ' + firstUnanswered() + ' 题' : '开始这 7 道题';
    var secondary = '';
    if (state.lastResult) {
      secondary += '<button class="btn secondary" data-action="last-result">查看上次结果</button>';
    }
    if (hasProgress()) {
      secondary += '<button class="btn ghost" data-action="restart">重新开始</button>';
    }
    setScreen(screenWrap(
      '<main class="home-main">'
      + '<p class="kicker">FOR THE MOMENT · NO. 01</p>'
      + '<h1>此刻，<br>听一首。</h1>'
      + '<p class="lede">先回答 6 个关于此刻的问题，再选一个想听到的声音。从 SEVENTEEN 已收录的歌曲里，找到此刻适合的几首。</p>'
      + '<div class="home-actions"><button class="btn" data-action="start">' + escapeHtml(startLabel) + '</button>' + secondary + '</div>'
      + '</main>'
      + '<footer class="home-foot">'
      + '<div class="fact-row">'
      + '<div class="fact"><b>13</b><span>位成员</span></div>'
      + '<div class="fact"><b>' + DATA.meta.stats.song_versions + '</b><span>首选录歌曲</span></div>'
      + '<div class="fact"><b>11</b><span>组正式分队</span></div>'
      + '</div>'
      + '<p class="small">这不是人格测试，也不是心理测评。它只根据你此刻的选择，从已标注的歌曲里做一次编辑式推荐。</p>'
      + '<p class="tiny">推荐体验测试版</p>'
      + '</footer>',
      'home'
    ));
  }

  function renderQuiz(keepScroll) {
    var voiceMode = state.qIndex === 7;
    var q = voiceMode ? DATA.voice_question : DATA.questions[state.qIndex - 1];
    var body;
    if (voiceMode) {
      body = '<p class="question-index">QUESTION 07 / 声音</p>'
        + '<h1 class="question-title">' + escapeHtml(q.text) + '</h1>'
        + '<p class="question-helper">' + escapeHtml(q.helper) + '</p>'
        + renderVoice();
    } else {
      var selected = state.answers[q.id];
      body = '<p class="question-index">QUESTION ' + ('0' + state.qIndex).slice(-2) + ' / 06</p>'
        + '<h1 class="question-title">' + escapeHtml(q.text) + '</h1>'
        + '<p class="question-helper">没有标准答案，选最接近此刻的一项。</p>'
        + '<div class="options">' + q.options.map(function (option, index) {
          return '<button class="option" data-answer="' + escapeHtml(option.id) + '" aria-pressed="' + (selected === option.id ? 'true' : 'false') + '">'
            + '<span>' + escapeHtml(option.label) + '</span><span class="option-key">' + ('0' + (index + 1)).slice(-2) + '</span></button>';
        }).join('') + '</div>';
    }

    var next = voiceMode ? voiceCta() : { label: state.answers[q.id] ? '下一题' : '下一题', disabled: !state.answers[q.id] };
    if (voiceMode && !state.voice) next.disabled = true;

    setScreen(screenWrap(
      '<div class="quiz-top"><span class="progress-label">' + ('0' + state.qIndex).slice(-2) + ' / 07</span>'
      + '<div class="progress-track"><span class="progress-fill" style="width:' + (state.qIndex / 7 * 100) + '%"></span></div></div>'
      + '<div class="quiz-body">' + body + '</div>'
      + '<div class="quiz-actions">'
      + '<button class="btn secondary" data-action="prev">' + (state.qIndex === 1 ? '返回' : '上一题') + '</button>'
      + '<button class="btn" data-action="next" ' + (next.disabled ? 'disabled' : '') + '>' + escapeHtml(next.label) + '</button>'
      + '</div>',
      'quiz'
    ), keepScroll);
  }

  function voiceCta() {
    var option = findVoice();
    if (!option) return { label: '生成推荐', disabled: true };
    if (!option.selectable) return { label: '暂无歌曲', disabled: true };
    if (!option.canTop3 && !state.acceptPartial) return { label: '确认推荐数量', disabled: false };
    if (!option.canTop3) return { label: '生成 ' + option.availableWorks + ' 首推荐', disabled: false };
    return { label: '生成我的三首歌', disabled: false };
  }

  function findVoice() {
    if (!state.voice) return null;
    var groups = [state.options.members, state.options.officialUnits, [state.options.fullGroup], [state.options.unrestricted]];
    for (var i = 0; i < groups.length; i += 1) {
      for (var j = 0; j < groups[i].length; j += 1) {
        if (groups[i][j].type === state.voice.type && groups[i][j].id === state.voice.id) return groups[i][j];
      }
    }
    return null;
  }

  function voiceButton(option) {
    var selected = state.voice && state.voice.type === option.type && state.voice.id === option.id;
    var disabled = !option.selectable;
    var countLine = option.totalRecords !== undefined
      ? '共 ' + option.totalRecords + ' 条记录 · 可选 ' + option.availableWorks + ' 首'
      : '';
    return '<button class="voice-option' + (disabled ? ' pending' : '') + '"'
      + ' data-voice-type="' + escapeHtml(option.type) + '" data-voice-id="' + escapeHtml(option.id) + '"'
      + ' aria-pressed="' + (selected ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') + '>'
      + '<span class="voice-name">' + escapeHtml(option.label) + '</span>'
      + '<span class="voice-status">' + escapeHtml(option.statusLabel) + '</span>'
      + (countLine ? '<span class="voice-count">' + escapeHtml(countLine) + '</span>' : '')
      + '</button>';
  }

  function renderVoice() {
    var options = state.options;
    function section(title, note, list) {
      if (!list.length) return '';
      return '<section class="voice-section"><div class="voice-heading"><h3>' + escapeHtml(title) + '</h3><span>' + escapeHtml(note) + '</span></div>'
        + '<div class="voice-grid">' + list.map(voiceButton).join('') + '</div></section>';
    }
    return '<div class="voice-body">'
      + section('单人成员', options.members.length + ' 位', options.members)
      + section('正式小分队／企划', options.officialUnits.length + ' 组', options.officialUnits)
      + section('全团', '按全团范围', [options.fullGroup])
      + section('不限定', '交给此刻的心情', [options.unrestricted])
      + '<p class="voice-help">所有已收录歌曲都会进入对应范围。未完成情绪标签的歌曲会标注“资料未完善”，不会被说成已完成情绪匹配；总作品不足三首时，会先询问是否接受现有数量。</p>'
      + '</div>';
  }

  function showPartialPrompt(option) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = '<div class="partial-modal" role="dialog" aria-modal="true">'
      + '<p class="kicker">ONLY ' + option.availableWorks + ' TRACK' + (option.availableWorks > 1 ? 'S' : '') + ' READY</p>'
      + '<h2>' + escapeHtml(option.label) + ' 目前可推荐 ' + option.availableWorks + ' 首</h2>'
      + '<span class="partial-count">' + option.totalRecords + ' 条记录 · 可推荐 ' + option.availableWorks + ' 首</span>'
      + '<p>没有凑满三首。系统不会为了补足数量，自动加入其他成员的作品。未完善歌曲只会作为该范围的可选曲目出现，并明确标注。</p>'
      + '<div class="partial-actions">'
      + '<button class="btn" data-partial="accept">接受，只推荐 ' + option.availableWorks + ' 首</button>'
      + '<button class="btn secondary" data-partial="expand">改为不限定声音</button>'
      + '<button class="btn ghost" data-partial="cancel">取消，换一个</button>'
      + '</div></div>';
    document.body.appendChild(overlay);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    overlay.querySelector('[data-partial="accept"]').addEventListener('click', function () {
      state.acceptPartial = true;
      saveDraft();
      close();
      startMatch();
    });
    overlay.querySelector('[data-partial="expand"]').addEventListener('click', function () {
      state.voice = { type: 'unrestricted', id: 'all', label: '交给此刻的心情' };
      state.acceptPartial = false;
      saveDraft();
      close();
      startMatch();
    });
    overlay.querySelector('[data-partial="cancel"]').addEventListener('click', function () {
      close();
      render(true);
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        close();
        render(true);
      }
    });
    overlay.querySelector('[data-partial="accept"]').focus();
  }

  function renderMatching() {
    setScreen(screenWrap(
      topbar('正在匹配')
      + '<div class="match-inner"><div class="spinner"></div><p class="kicker">MATCHING YOUR MOMENT</p>'
      + '<h1>正在找这几首歌</h1><p class="match-status">正在比对声音范围、情绪、能量与陪伴方式。</p>'
      + '<p class="tiny">不会自动放宽你选择的声音范围。</p></div>',
      'matching'
    ));
    setTimeout(runMatch, 350);
  }

  function startMatch() {
    state.error = null;
    state.screen = 'matching';
    renderMatching();
  }

  function runMatch() {
    try {
      var result = ENGINE.match(state.answers, {
        type: state.voice.type,
        id: state.voice.id
      }, state.acceptPartial, state.options);
      state.result = result;
      saveLastResult(result);
      state.screen = 'result';
      renderResult();
    } catch (error) {
      state.error = error;
      state.screen = 'error';
      renderMatchError();
    }
  }

  function renderMatchError() {
    var error = state.error || {};
    var available = error.details && error.details.availableCount ? error.details.availableCount : 0;
    var canAccept = error.code === 'INSUFFICIENT_CANDIDATES' && available > 0;
    setScreen(screenWrap(
      topbar('匹配未完成')
      + '<div class="match-inner"><p class="kicker">NOT ENOUGH YET</p>'
      + '<div class="match-error"><h2>' + (canAccept ? '这个范围只有 ' + available + ' 首' : '这一次没有接上') + '</h2>'
      + '<p>' + escapeHtml(error.message || '请重新试一次。') + '</p></div>'
      + '<div class="stack">'
      + (canAccept ? '<button class="btn" data-action="accept-current">接受，只推荐 ' + available + ' 首</button>' : '')
      + '<button class="btn secondary" data-action="unrestricted">改为“不限定”声音</button>'
      + '<button class="btn secondary" data-action="back-voice">改选声音</button>'
      + '<button class="btn ghost" data-action="home">回到首页</button>'
      + '</div></div>',
      'matching'
    ));
  }

  function songCard(song) {
    var pills = '<span class="pill dark">' + escapeHtml(song.workType) + '</span>'
      + '<span class="pill">' + escapeHtml(song.version) + '</span>';
    if (song.quality !== 'reviewed') {
      pills += '<span class="pill quality">' + escapeHtml(song.qualityLabel) + '</span>';
    }
    return '<article class="song-card">'
      + '<div class="song-top"><div class="song-rank">' + ('0' + song.rank).slice(-2) + '</div>'
      + '<div><h2 class="song-title">' + escapeHtml(song.title) + '</h2><p class="song-performers">' + escapeHtml(song.performers) + '</p></div></div>'
      + '<div class="song-meta">' + pills + '</div>'
      + '<p class="reason-label">为什么是这首</p><p class="song-reason">' + escapeHtml(song.reason) + '</p>'
      + '<div class="listen"><button class="listen-btn" data-action="copy-name" data-copy="' + escapeHtml(song.title) + '">'
      + '<span>复制歌名</span></button>'
      + '<p class="listen-note">复制后到你常用的音乐 App 搜索；平台和音质由你自己选择。</p></div>'
      + '</article>';
  }

  function renderResult() {
    var result = state.result;
    var count = result.songs.length;
    var partial = result.meta.partial;
    var unreviewed = result.meta.unreviewedCount;
    var support = result.context.support.join('、');
    setScreen(screenWrap(
      '<header class="result-hero"><p class="kicker">YOUR ' + (count === 1 ? 'SONG' : 'SONGS') + '</p>'
      + '<h1>' + escapeHtml(result.intro.headline) + '</h1>'
      + '<p class="result-copy">' + escapeHtml(result.intro.body) + '</p>'
      + '<div class="result-context"><span class="pill dark">' + escapeHtml(result.context.moodLabel) + '</span>'
      + '<span class="pill">想听：' + escapeHtml(result.voice.label) + '</span>'
      + '<span class="pill">' + escapeHtml(result.context.modeLabel) + '</span>'
      + (support ? '<span class="pill">' + escapeHtml(support) + '</span>' : '')
      + '</div></header>'
      + '<div class="result-section-label"><span>TOP ' + count + ' / 按此刻匹配</span><span>01—' + ('0' + count).slice(-2) + '</span></div>'
      + result.songs.map(songCard).join('')
      + (partial ? '<div class="result-notice result-partial"><strong>没有凑满三首。</strong>「' + escapeHtml(result.voice.label) + '」当前只有 ' + count + ' 首可选歌曲；没有自动加入其他成员的作品。</div>' : '')
      + (unreviewed ? '<div class="result-notice result-unreviewed"><strong>其中 ' + unreviewed + ' 首资料未完善。</strong>这些歌曲只确认了曲目和演唱者，情绪标签尚未完成；它们被放入候选供你试听，但不代表已经通过情绪匹配审校。</div>' : '')
      + '<div class="result-actions">'
      + '<button class="btn" data-action="save-card">保存到相册</button>'
      + '<button class="btn secondary" data-action="restart">重新测一次</button>'
      + '<button class="btn ghost" data-action="home">回到首页</button>'
      + '</div>'
      + '<div class="result-foot"><span>数据截至 ' + escapeHtml(result.dataAsOf) + '</span></div>',
      'result'
    ));
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    var chars = String(text || '').split('');
    var lines = [];
    var line = '';
    var i;
    for (i = 0; i < chars.length; i += 1) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
        if (lines.length === maxLines - 1) break;
      } else {
        line = test;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === maxLines && lines.join('').length < chars.length) {
      var last = lines[maxLines - 1];
      while (last.length > 0 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines.length ? lines : [''];
  }

  function buildCard(result) {
    var width = 1080;
    var count = result.songs.length;
    var songStart = 356;
    var songSpacing = 250;
    var height = songStart + count * songSpacing + 20;
    var pad = 72;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#111111';
    function font(weight, size) {
      return weight + ' ' + size + 'px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    }
    function line(y) {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(width - pad, y);
      ctx.stroke();
    }
    ctx.font = font(700, 24);
    ctx.fillText('SEVENTEEN / 此刻，听一首', pad, 66);
    ctx.textAlign = 'right';
    ctx.fillText('TOP ' + count, width - pad, 66);
    ctx.textAlign = 'left';
    line(112);
    ctx.font = font(700, 70);
    ctx.fillText('给此刻的' + ['', '一', '两', '三'][count] + '首歌', pad, 164);
    ctx.font = font(400, 24);
    ctx.fillStyle = '#555555';
    ctx.fillText('推荐体验测试版 · ' + dateText(result.dataAsOf), pad, 256);
    ctx.fillStyle = '#111111';
    line(310);
    var y = songStart;
    var i;
    for (i = 0; i < result.songs.length; i += 1) {
      var song = result.songs[i];
      ctx.font = font(700, 78);
      ctx.fillText(('0' + song.rank).slice(-2), pad, y - 4);
      var textX = pad + 146;
      var maxWidth = width - textX - pad;
      ctx.font = font(700, 52);
      var lines = wrapText(ctx, song.title, maxWidth, 2);
      var j;
      for (j = 0; j < lines.length; j += 1) ctx.fillText(lines[j], textX, y + j * 60);
      var after = y + lines.length * 60 + 10;
      ctx.font = font(400, 27);
      ctx.fillStyle = '#444444';
      ctx.fillText(song.performers, textX, after);
      ctx.font = font(400, 23);
      ctx.fillStyle = '#777777';
      ctx.fillText(song.workType + ' / ' + song.version, textX, after + 38);
      ctx.fillStyle = '#111111';
      y += songSpacing;
      line(y - 34);
    }
    return canvas.toDataURL('image/png');
  }

  function showImage(dataUrl) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-backdrop image-backdrop';
    overlay.innerHTML = '<div class="image-modal"><p class="kicker">PREVIEW</p><p class="small">长按图片保存，或在相册中查看。</p><img alt="结果卡预览" src="' + dataUrl + '"><button class="btn" data-close>关闭</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-close]').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
  }

  function saveCard() {
    var dataUrl;
    try {
      dataUrl = buildCard(state.result);
    } catch (e) {
      showToast('结果卡生成失败，请重试。');
      return;
    }
    var mt = miniTool();
    if (mt && typeof mt.saveImageToPhotosAlbum === 'function') {
      mt.saveImageToPhotosAlbum({ filePath: dataUrl }).then(function () {
        showToast('结果卡已保存到相册。');
      }).catch(function () {
        showImage(dataUrl);
      });
      return;
    }
    showImage(dataUrl);
  }

  function showSongName(text) {
    showText(text);
  }

  function showText(text) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = '<div class="text-modal"><p class="kicker">SONG NAME</p><p class="small">长按下面的文字复制，再到常用音乐 App 搜索。</p>'
      + '<textarea readonly>' + escapeHtml(text) + '</textarea><button class="btn" data-close>关闭</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-close]').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
  }

  function closeModal() {
    var modal = document.querySelector('.modal-backdrop');
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function render(keepScroll) {
    closeModal();
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'quiz') renderQuiz(keepScroll);
    else if (state.screen === 'matching') renderMatching();
    else if (state.screen === 'result') renderResult();
    else if (state.screen === 'error') renderMatchError();
  }

  function startFlow(reset) {
    if (reset || !state.draft) {
      state.draft = newDraft();
      state.answers = {};
      state.voice = null;
      state.acceptPartial = false;
      saveDraft();
    }
    state.qIndex = firstUnanswered();
    state.screen = 'quiz';
    render();
  }

  document.addEventListener('click', function (event) {
    var option = event.target.closest('[data-answer]');
    if (option) {
      var q = DATA.questions[state.qIndex - 1];
      state.answers[q.id] = option.dataset.answer;
      saveDraft();
      render(true);
      return;
    }

    var voice = event.target.closest('[data-voice-type]');
    if (voice) {
      state.voice = {
        type: voice.dataset.voiceType,
        id: voice.dataset.voiceId,
        label: voice.getAttribute('aria-pressed') === 'true' ? '' : ''
      };
      var found = findVoice();
      if (found) state.voice.label = found.label;
      state.acceptPartial = false;
      saveDraft();
      render(true);
      return;
    }

    var action = event.target.closest('[data-action]');
    if (action) {
      var name = action.dataset.action;
      if (name === 'start') {
        startFlow(false);
      } else if (name === 'last-result') {
        if (state.lastResult) {
          state.result = state.lastResult;
          state.screen = 'result';
          render();
        }
      } else if (name === 'restart') {
        startFlow(true);
      } else if (name === 'prev') {
        if (state.qIndex === 1) {
          state.screen = 'home';
          render();
        } else {
          state.qIndex -= 1;
          render();
        }
      } else if (name === 'next') {
        if (state.qIndex < 7) {
          state.qIndex += 1;
          render();
        } else {
          var current = findVoice();
          if (!current || !current.selectable) {
            showToast('请选择一个有可用歌曲的范围。');
          } else if (!current.canTop3 && !state.acceptPartial) {
            showPartialPrompt(current);
          } else {
            startMatch();
          }
        }
      } else if (name === 'accept-current') {
        state.acceptPartial = true;
        saveDraft();
        startMatch();
      } else if (name === 'unrestricted') {
        state.voice = { type: 'unrestricted', id: 'all', label: '交给此刻的心情' };
        state.acceptPartial = false;
        saveDraft();
        startMatch();
      } else if (name === 'back-voice') {
        state.qIndex = 7;
        state.screen = 'quiz';
        render();
      } else if (name === 'home') {
        state.screen = 'home';
        render();
      } else if (name === 'save-card') {
        saveCard();
      } else if (name === 'copy-name') {
        var title = action.dataset.copy;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(title).then(function () {
            showToast('歌名已复制');
          }).catch(function () {
            showSongName(title);
          });
        } else {
          showSongName(title);
        }
      }
      return;
    }

    var close = event.target.closest('[data-close]');
    if (close) {
      var modal = close.closest('.modal-backdrop');
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }
  });

  function boot() {
    ENGINE.init(DATA);
    state.options = ENGINE.buildVoiceOptions();
    Promise.all([storeGet('draft'), storeGet('lastResult')]).then(function (values) {
      var draft = values[0];
      var last = values[1];
      if (draft && draft.answers && typeof draft.answers === 'object') {
        state.draft = draft;
        state.answers = draft.answers;
        state.voice = draft.voice || null;
        state.acceptPartial = draft.acceptPartial === true;
        if (!state.draft.id) state.draft.id = newId();
      } else {
        state.draft = newDraft();
      }
      if (last && last.songs && last.songs.length) state.lastResult = last;
      state.ready = true;
      render();
    });
  }

  boot();
}());
