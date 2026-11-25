/* global window */
(function () {
  'use strict';

  var DATA = null;
  var songsById = {};
  var ensembleById = {};
  var memberById = {};

  var WORK_TYPES = {
    group: '团歌',
    unit: '小分队／团内组合',
    solo: '个人曲',
    cover: '翻唱',
    collaboration: '合作曲',
    ost: 'OST',
    character_project: '角色企划',
    interlude_pending_vocal_check: '过渡曲（待核）',
    instrumental: '纯音乐',
    intro_outro: '序曲／尾声'
  };

  var VERSION_LABELS = {
    studio_original: '正式音源',
    studio_korean: '韩语版',
    studio_japanese: '日语版',
    studio_english: '英语版',
    studio_chinese: '中文版',
    holiday: '节日版',
    sped_up: '加速版',
    remastered: '重制版',
    vocal_team_rerecording: '主唱队重录版',
    hiphop_team_rerecording: '嘻哈队重录版',
    performance_team_rerecording: '表演队重录版'
  };

  var MOOD_RESPONSE = {
    sad: ['先不用急着好起来', '低落不是需要立刻修好的问题。今晚可以先让声音陪着你，不解释也可以。'],
    restless: ['让乱糟糟的思绪有地方落', '心里很吵的时候，不必马上想明白。先让一首歌替你接住这几分钟。'],
    lonely: ['让声音先陪你一会儿', '孤独不一定要被立刻填满。此刻有人唱给你听，就已经是一种陪伴。'],
    tired: ['累了就把今天先放下', '电量快用完的时候，休息不是退步。你不需要再证明什么。'],
    anxious: ['不必马上想清楚所有事', '担心不会因为一句“别想太多”就消失。先听一首，让身体慢一点。'],
    calm: ['把平静再留久一点', '平静也值得被认真对待。让这几分钟不被别的事情拿走。'],
    happy: ['把今天的好心情延长一点', '开心不需要低调。让一首歌把这一刻多留一会儿。']
  };

  var SUPPORT_LINE = {
    understand: '你更想被理解，而不是被催着解释。',
    soothe: '你想被温柔地安慰，不需要谁来评判这份心情。',
    encourage: '你想借一点力气往前走，但不必一步就位。',
    release: '有些感觉不必憋着，可以跟着音乐放出来。',
    rest: '你已经很努力了，休息不是偷懒。',
    celebrate: '开心值得被认真对待，今天就多停留一会儿。'
  };

  var CONTEXT_LINE = {
    self_pressure: '当压力来自对自己的要求，今晚可以暂时不再给自己打分。',
    relationships: '与人相处带来的消耗，不必靠继续懂事来消化。',
    future: '关于接下来的方向，可以晚一点再回答。',
    overload: '事情太多的时候，先处理此刻的感受，也是一种秩序。',
    good_news: '有一件值得开心的事，就允许自己多开心一会儿。',
    unspecified: ''
  };

  function init(data) {
    DATA = data;
    songsById = {};
    ensembleById = {};
    memberById = {};
    var i;
    for (i = 0; i < DATA.members.length; i += 1) memberById[DATA.members[i].id] = DATA.members[i];
    for (i = 0; i < DATA.ensembles.length; i += 1) ensembleById[DATA.ensembles[i].id] = DATA.ensembles[i];
    for (i = 0; i < DATA.songs.length; i += 1) songsById[DATA.songs[i].version_id] = DATA.songs[i];
  }

  function uniqueWorks(list) {
    var seen = {};
    var count = 0;
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (!seen[list[i].work_id]) {
        seen[list[i].work_id] = true;
        count += 1;
      }
    }
    return count;
  }

  function isReviewed(song) {
    var e = song.editorial || {};
    return song.demo_eligible === true
      && typeof e.energy === 'number'
      && e.moods && e.moods.length > 0
      && e.support && Object.keys(e.support).length > 0
      && e.listening_modes && e.listening_modes.length > 0;
  }

  function hasAnyTag(song) {
    var e = song.editorial || {};
    return typeof e.energy === 'number'
      || (e.moods && e.moods.length > 0)
      || (e.support && Object.keys(e.support).length > 0)
      || (e.listening_modes && e.listening_modes.length > 0)
      || !!e.reason_material;
  }

  function songsForEnsemble(ensemble) {
    var wanted = {};
    var available = {};
    var result = [];
    var i;
    var j;
    var id;
    for (i = 0; i < ensemble.member_ids.length; i += 1) wanted[ensemble.member_ids[i]] = true;

    function add(song) {
      if (!available[song.version_id]) {
        available[song.version_id] = true;
        result.push(song);
      }
    }

    for (i = 0; i < DATA.songs.length; i += 1) {
      var song = DATA.songs[i];
      if (song.ensemble_id === ensemble.id) add(song);
    }
    for (i = 0; i < DATA.songs.length; i += 1) {
      var candidate = DATA.songs[i];
      var actual = candidate.performer_member_ids || [];
      var expected = ensemble.member_ids || [];
      if (actual.length > 0 && actual.length === expected.length) {
        var exact = true;
        for (j = 0; j < expected.length; j += 1) {
          if (!actual.includes(expected[j])) {
            exact = false;
            break;
          }
        }
        if (exact) add(candidate);
      }
    }
    void id;
    return result;
  }

  function isFullGroupSong(song) {
    if (song.ensemble_id === 'all') return true;
    var ensemble = ensembleById[song.ensemble_id];
    return !!ensemble && ensemble.kind === 'age_project';
  }

  function statusOf(availableWorks, reviewedWorks) {
    if (availableWorks === 0) return '暂无记录';
    if (availableWorks < 3) return '当前可推荐 ' + availableWorks + ' 首';
    if (reviewedWorks >= 3) return reviewedWorks + ' 首已完善 · 共 ' + availableWorks + ' 首';
    if (reviewedWorks > 0) return reviewedWorks + ' 首已完善 · 共 ' + availableWorks + ' 首';
    return availableWorks + ' 首可选 · 待完善';
  }

  function makeEnsembleOption(ensemble) {
    var available = songsForEnsemble(ensemble);
    var reviewed = available.filter(isReviewed);
    var availableWorks = uniqueWorks(available);
    var reviewedWorks = uniqueWorks(reviewed);
    var totalRecords = DATA.songs.filter(function (song) {
      return song.ensemble_id === ensemble.id;
    }).length;
    return {
      type: 'ensemble',
      id: ensemble.id,
      label: ensemble.name,
      section: 'official',
      totalRecords: totalRecords,
      availableWorks: availableWorks,
      reviewedWorks: reviewedWorks,
      qualifiedWorks: reviewedWorks,
      pendingWorks: Math.max(0, availableWorks - reviewedWorks),
      canTop3: availableWorks >= 3,
      selectable: availableWorks > 0,
      statusLabel: statusOf(availableWorks, reviewedWorks)
    };
  }

  function buildVoiceOptions() {
    var official = DATA.ensembles.filter(function (ensemble) {
      return ensemble.kind === 'core_unit'
        || ensemble.kind === 'official_unit'
        || ensemble.kind === 'leader_project';
    }).map(makeEnsembleOption);

    var members = DATA.members.map(function (member) {
      var all = DATA.songs.filter(function (song) {
        return (song.performer_member_ids || []).indexOf(member.id) !== -1;
      });
      var reviewed = all.filter(isReviewed);
      var availableWorks = uniqueWorks(all);
      var reviewedWorks = uniqueWorks(reviewed);
      return {
        type: 'member',
        id: member.id,
        label: member.name,
        section: 'member',
        totalRecords: all.length,
        availableWorks: availableWorks,
        reviewedWorks: reviewedWorks,
        qualifiedWorks: reviewedWorks,
        pendingWorks: Math.max(0, availableWorks - reviewedWorks),
        canTop3: availableWorks >= 3,
        selectable: availableWorks > 0,
        statusLabel: statusOf(availableWorks, reviewedWorks)
      };
    });

    var fullSongs = DATA.songs.filter(isFullGroupSong);
    var fullReviewed = fullSongs.filter(isReviewed);
    var fullAvailable = uniqueWorks(fullSongs);
    var fullReviewedWorks = uniqueWorks(fullReviewed);

    var unrestrictedReviewed = DATA.songs.filter(isReviewed);
    var unrestrictedAvailable = uniqueWorks(DATA.songs);
    var unrestrictedReviewedWorks = uniqueWorks(unrestrictedReviewed);

    return {
      members: members,
      officialUnits: official,
      fullGroup: {
        type: 'all',
        id: 'all',
        label: 'SEVENTEEN（全团）',
        section: 'full',
        totalRecords: fullSongs.length,
        availableWorks: fullAvailable,
        reviewedWorks: fullReviewedWorks,
        qualifiedWorks: fullReviewedWorks,
        canTop3: fullAvailable >= 3,
        selectable: fullAvailable > 0,
        statusLabel: statusOf(fullAvailable, fullReviewedWorks)
      },
      unrestricted: {
        type: 'unrestricted',
        id: 'all',
        label: '交给此刻的心情',
        section: 'any',
        totalRecords: DATA.songs.length,
        availableWorks: unrestrictedAvailable,
        reviewedWorks: unrestrictedReviewedWorks,
        qualifiedWorks: unrestrictedReviewedWorks,
        canTop3: unrestrictedAvailable >= 3,
        selectable: unrestrictedAvailable > 0,
        statusLabel: statusOf(unrestrictedAvailable, unrestrictedReviewedWorks)
      }
    };
  }

  function findQuestion(id) {
    for (var i = 0; i < DATA.questions.length; i += 1) {
      if (DATA.questions[i].id === id) return DATA.questions[i];
    }
    return null;
  }

  function findOption(question, id) {
    if (!question) return null;
    for (var i = 0; i < question.options.length; i += 1) {
      if (question.options[i].id === id) return question.options[i];
    }
    return null;
  }

  function buildContext(answerIds) {
    var context = {};
    var keys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var option = findOption(findQuestion(key), answerIds[key]);
      if (!option) throw { code: 'INVALID_ANSWERS', message: '请先完成全部题目。' };
      context[key] = option;
    }
    var q4Tag = Object.keys(context.q4.support || {})[0];
    var q6Tag = Object.keys(context.q6.support || {})[0];
    if (!q4Tag || !q6Tag) throw { code: 'INVALID_ANSWERS', message: '支持需求答案无效。' };
    context.q4SupportTag = q4Tag;
    context.q6SupportTag = q6Tag;
    context.userSupport = {};
    context.userSupport[q4Tag] = 3;
    context.userSupport[q6Tag] = (context.userSupport[q6Tag] || 0) + 2;
    return context;
  }

  function scoreSong(song, context) {
    var editorial = song.editorial || {};
    var support = editorial.support || {};
    var quality = isReviewed(song) ? 'reviewed' : (hasAnyTag(song) ? 'partial' : 'unreviewed');
    var sumUser = 0;
    var overlap = 0;
    var key;
    for (key in context.userSupport) {
      if (Object.prototype.hasOwnProperty.call(context.userSupport, key)) {
        sumUser += context.userSupport[key];
        overlap += context.userSupport[key] * (support[key] || 0);
      }
    }
    var supportScore = sumUser > 0 ? (100 * overlap) / (5 * sumUser) : 0;
    var moodScore = (editorial.moods || []).indexOf(context.q1.mood) !== -1 ? 100 : 0;
    var energyScore = typeof editorial.energy === 'number'
      ? Math.max(0, 100 - 25 * Math.abs(context.q2.energy_target - editorial.energy))
      : 0;
    var modeScore = (editorial.listening_modes || []).indexOf(context.q5.listening_mode) !== -1 ? 100 : 0;
    var score = 0.60 * supportScore + 0.15 * moodScore + 0.15 * energyScore + 0.10 * modeScore;

    var copy = {};
    for (var k in song) {
      if (Object.prototype.hasOwnProperty.call(song, k)) copy[k] = song[k];
    }
    copy.matchQuality = quality;
    copy.score = score;
    copy.breakdown = {
      support: supportScore,
      mood: moodScore,
      energy: energyScore,
      mode: modeScore
    };
    return copy;
  }

  var QUALITY_RANK = { reviewed: 0, partial: 1, unreviewed: 2 };

  function compareRanked(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    var aq = QUALITY_RANK[a.matchQuality];
    var bq = QUALITY_RANK[b.matchQuality];
    if (aq !== bq) return aq - bq;
    var as = a.work_type === 'solo' ? 0 : 1;
    var bs = b.work_type === 'solo' ? 0 : 1;
    if (as !== bs) return as - bs;
    return String(a.version_id).localeCompare(String(b.version_id));
  }

  function primarySupport(song) {
    var support = (song.editorial && song.editorial.support) || {};
    var order = ['understand', 'soothe', 'encourage', 'release', 'rest', 'celebrate'];
    var best = null;
    var i;
    for (i = 0; i < order.length; i += 1) {
      var key = order[i];
      if (!Object.prototype.hasOwnProperty.call(support, key)) continue;
      if (!best || support[key] > support[best]) best = key;
    }
    return best;
  }

  function supportLabels(support, limit) {
    var entries = Object.keys(support || {}).map(function (key) {
      return [key, support[key]];
    }).sort(function (a, b) { return b[1] - a[1]; });
    return entries.slice(0, limit).map(function (entry) {
      return DATA.tags.support[entry[0]] || entry[0];
    });
  }

  function chooseNext(pool, picks) {
    var usedSupport = {};
    var usedEnergy = {};
    var i;
    for (i = 0; i < picks.length; i += 1) {
      var s = primarySupport(picks[i]);
      if (s) usedSupport[s] = true;
      if (typeof picks[i].editorial.energy === 'number') usedEnergy[picks[i].editorial.energy] = true;
    }
    var ranked = pool.slice().sort(function (a, b) {
      function diversity(song) {
        var value = 0;
        var support = primarySupport(song);
        if (support && !usedSupport[support]) value += 2;
        if (typeof song.editorial.energy === 'number' && !usedEnergy[song.editorial.energy]) value += 2;
        return value;
      }
      var diff = diversity(b) - diversity(a);
      if (diff !== 0) return diff;
      return compareRanked(a, b);
    });
    return ranked[0] || null;
  }

  function optionFromVoice(voice, options) {
    var list = voice.type === 'member' ? options.members
      : voice.type === 'ensemble' ? options.officialUnits
        : voice.type === 'all' ? [options.fullGroup]
          : [options.unrestricted];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === voice.id) return list[i];
    }
    return null;
  }

  function songsForOption(option) {
    if (option.type === 'member') {
      return DATA.songs.filter(function (song) {
        return (song.performer_member_ids || []).indexOf(option.id) !== -1;
      });
    }
    if (option.type === 'ensemble') {
      return songsForEnsemble(ensembleById[option.id]);
    }
    if (option.type === 'all') {
      return DATA.songs.filter(isFullGroupSong);
    }
    return DATA.songs;
  }

  function workTypeLabel(song) {
    return WORK_TYPES[song.work_type] || song.work_type;
  }

  function versionLabel(version) {
    if (VERSION_LABELS[version]) return VERSION_LABELS[version];
    if (version.indexOf('cover_') === 0) return '翻唱';
    if (version.indexOf('remix_') === 0) return '混音版';
    if (version.indexOf('mixtape_') === 0) return 'Mixtape';
    if (version.indexOf('live_') === 0) return '现场版';
    if (version.indexOf('studio_') === 0) return '录音室版';
    return String(version || '').split('_').join(' ');
  }

  function performerDisplay(song) {
    var names = (song.performer_member_ids || []).map(function (id) {
      return memberById[id] ? memberById[id].name : null;
    }).filter(Boolean);
    var external = song.external_performers || [];
    if (names.length > 0) {
      return external.length > 0 ? names.join('、') + ' feat. ' + external.join('、') : names.join('、');
    }
    if (external.length > 0) return external.join('、');
    if (song.ensemble_id === 'all' || song.work_type === 'group') return 'SEVENTEEN（全团）';
    return '演唱者明细待核';
  }

  function copyTextFor(song) {
    var names = (song.performer_member_ids || []).map(function (id) {
      return memberById[id] ? memberById[id].name : null;
    }).filter(Boolean);
    var artist = 'SEVENTEEN';
    if (song.work_type === 'solo' && names[0]) artist = names[0];
    return [song.title, artist].filter(Boolean).join(' ');
  }

  function safeEditorial(copy, context) {
    if (!copy) return false;
    if (copy.indexOf('如果') === 0 || copy.indexOf('想') === 0 || copy.indexOf('面对') === 0 || copy.indexOf('心情交织') === 0) return true;
    var support = context.userSupport;
    var checks = [
      [/想休息|休息/, 'rest'],
      [/先被理解|共鸣|被理解/, 'understand'],
      [/迈出下一步|行动|动起来|推动/, 'encourage'],
      [/释放|痛快|跟唱/, 'release'],
      [/延续好心情|热闹|庆祝/, 'celebrate'],
      [/温柔|温暖|柔软|陪伴|安慰/, 'soothe']
    ];
    for (var i = 0; i < checks.length; i += 1) {
      if (checks[i][0].test(copy)) return !!support[checks[i][1]];
    }
    return true;
  }

  function buildReason(song, context, rank, picks) {
    var editorial = song.editorial || {};
    var support = editorial.support || {};
    var labels = supportLabels(support, 2);
    var userNeed = context.q4.label;
    var afterNeed = context.q6.label;
    var moodLabel = DATA.tags.moods[context.q1.mood];
    var modeLabel = DATA.tags.listening_modes[context.q5.listening_mode];
    var energy = editorial.energy;
    var parts = [];

    if (song.matchQuality === 'unreviewed') {
      return '你选的是「' + userNeed + '」，希望听完「' + afterNeed + '」。这首歌目前只有曲目和演唱者信息，情绪标签还没有完成，因此不能把它说成贴合你的情绪。先把它放进这个声音范围的候选，方便你试听和判断。';
    }
    if (song.matchQuality === 'partial') {
      parts.push('你选的是「' + userNeed + '」，希望听完「' + afterNeed + '」。这首歌的编辑标签还不完整，目前只记录了' + (labels.length ? '「' + labels.join('、') + '」' : '少量信息') + '。');
    } else {
      parts.push('你想「' + userNeed + '」，也希望听完「' + afterNeed + '」。这首的编辑方向以「' + labels.join('、') + '」为主。');
    }
    if ((editorial.moods || []).indexOf(context.q1.mood) !== -1) parts.push('它也被标注为贴近「' + moodLabel + '」。');
    if ((editorial.listening_modes || []).indexOf(context.q5.listening_mode) !== -1) parts.push('适合' + modeLabel + '。');
    if (typeof energy === 'number') parts.push('音乐能量 ' + energy + '/5。');
    if (song.matchQuality === 'partial') parts.push('这些信息只代表已记录的部分，不代表完整审校结论。');

    if (rank > 1 && song.matchQuality !== 'partial') {
      var priorSupport = {};
      var priorEnergy = {};
      var i;
      for (i = 0; i < picks.length; i += 1) {
        var ps = primarySupport(picks[i]);
        if (ps) priorSupport[ps] = true;
        if (typeof picks[i].editorial.energy === 'number') priorEnergy[picks[i].editorial.energy] = true;
      }
      var own = primarySupport(song);
      if (own && !priorSupport[own]) {
        parts.push('作为另一种陪伴方式，它把重点放在「' + DATA.tags.support[own] + '」。');
      } else if (typeof energy === 'number' && !priorEnergy[energy]) {
        parts.push('它换了一个能量层级，给此刻另一种听感。');
      } else {
        parts.push('它是另一首作品，给这一刻多一个选择。');
      }
    }

    var editorialCopy = editorial.reason_material;
    if (song.matchQuality !== 'unreviewed' && editorialCopy && safeEditorial(editorialCopy, context)) {
      parts.push(editorialCopy);
    }
    return parts.join('');
  }

  function buildIntro(context) {
    var mood = MOOD_RESPONSE[context.q1.mood] || ['先听听此刻的声音', '不必急着解释，先给自己几分钟。'];
    var body = '你选的是「' + context.q1.label + '」，此刻更想「' + context.q4.label + '」，也希望听完「' + context.q6.label + '」。';
    if (SUPPORT_LINE[context.q4SupportTag]) body += SUPPORT_LINE[context.q4SupportTag];
    if (CONTEXT_LINE[context.q3.context]) body += CONTEXT_LINE[context.q3.context];
    return {
      headline: mood[0],
      body: body,
      closing: '下面的推荐来自编辑草案，不是对你下的结论，也不代表心理测评结果。'
    };
  }

  function presentSong(song, rank, context, picks) {
    return {
      rank: rank,
      versionId: song.version_id,
      workId: song.work_id,
      title: song.title,
      performers: performerDisplay(song),
      workType: workTypeLabel(song),
      version: versionLabel(song.version),
      quality: song.matchQuality,
      qualityLabel: song.matchQuality === 'unreviewed' ? '资料未完善' : song.matchQuality === 'partial' ? '部分标签' : '已完善',
      reason: buildReason(song, context, rank, picks),
      tags: {
        moods: (song.editorial.moods || []).map(function (key) { return DATA.tags.moods[key] || key; }),
        support: supportLabels(song.editorial.support, 3),
        energy: typeof song.editorial.energy === 'number' ? song.editorial.energy : null,
        modes: (song.editorial.listening_modes || []).map(function (key) { return DATA.tags.listening_modes[key] || key; })
      },
      copyText: copyTextFor(song),
      demo: song.demo_eligible === true
    };
  }

  function match(answers, voice, acceptPartial, options) {
    var context = buildContext(answers);
    var option = optionFromVoice(voice, options);
    if (!option) throw { code: 'INVALID_VOICE', message: '这个声音选项无效。' };
    var source = songsForOption(option);
    var availableCount = uniqueWorks(source);
    if (availableCount === 0) {
      throw { code: 'NO_CANDIDATES', message: '「' + option.label + '」目前没有可用歌曲。', details: { availableCount: 0 } };
    }
    if (availableCount < 3 && !acceptPartial) {
      throw {
        code: 'INSUFFICIENT_CANDIDATES',
        message: '「' + option.label + '」目前只有 ' + availableCount + ' 首可选歌曲，不足三首。可以接受现有数量，或主动选择“不限定”。',
        details: { availableCount: availableCount }
      };
    }

    var scored = source.map(function (song) { return scoreSong(song, context); });
    var best = {};
    var i;
    for (i = 0; i < scored.length; i += 1) {
      var item = scored[i];
      if (!best[item.work_id] || compareRanked(item, best[item.work_id]) < 0) best[item.work_id] = item;
    }
    var ranked = Object.keys(best).map(function (key) { return best[key]; }).sort(compareRanked);
    var desired = Math.min(3, ranked.length);
    var picks = [ranked[0]];
    if (desired >= 2) {
      var pool2 = ranked.slice(1).filter(function (song) { return ranked[0].score - song.score <= 15; });
      picks.push(chooseNext(pool2.length ? pool2 : ranked.slice(1), picks));
    }
    if (desired >= 3) {
      var remaining = ranked.filter(function (song) {
        for (var j = 0; j < picks.length; j += 1) if (picks[j].work_id === song.work_id) return false;
        return true;
      });
      var pool3 = remaining.filter(function (song) { return ranked[0].score - song.score <= 15; });
      picks.push(chooseNext(pool3.length ? pool3 : remaining, picks));
    }

    var resultSongs = picks.map(function (song, index) {
      return presentSong(song, index + 1, context, picks.slice(0, index));
    });

    return {
      dataAsOf: DATA.meta.asOf,
      intro: buildIntro(context),
      context: {
        mood: context.q1.mood,
        moodLabel: DATA.tags.moods[context.q1.mood],
        modeLabel: DATA.tags.listening_modes[context.q5.listening_mode],
        want: context.q4.label,
        after: context.q6.label,
        support: Object.keys(context.userSupport).map(function (key) { return DATA.tags.support[key]; })
      },
      voice: {
        type: option.type,
        id: option.id,
        label: option.label,
        availableCount: availableCount
      },
      songs: resultSongs,
      meta: {
        availableCount: availableCount,
        partial: resultSongs.length < 3,
        unreviewedCount: resultSongs.filter(function (song) { return song.quality !== 'reviewed'; }).length,
        containsUnreviewed: resultSongs.some(function (song) { return song.quality !== 'reviewed'; })
      }
    };
  }

  window.SVT = {
    init: init,
    buildVoiceOptions: buildVoiceOptions,
    match: match
  };
}());
