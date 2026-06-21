// =====================================================
// FIFA LIVE - SMART SCHEDULE WITH DUAL TIMEZONE
// =====================================================
(function(){
  'use strict';

  var CONFIG = {
    matchesJsonUrl: 'https://cdn.jsdelivr.net/gh/rabbihusenroki/fifa-stream@master/matches.json',
    refreshInterval: 30000,
    allowedHosts: ['fifalivehdstream.blogspot.com', 'www.fifalivehdstream.blogspot.com'],
    defaultStream: 1
  };

  // === DOMAIN WHITELIST ===
  var isAuthorized = false;
  for (var hi = 0; hi < CONFIG.allowedHosts.length; hi++) {
    if (CONFIG.allowedHosts[hi] === location.hostname) { isAuthorized = true; break; }
  }
  if (!isAuthorized) {
    document.body.innerHTML = '<div style="color:#fff;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;font-size:22px;padding:20px;">UNAUTHORIZED DOMAIN</div>';
    return;
  }

  // === ANTI-PIRACY ===
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  ['selectstart','copy','cut','dragstart'].forEach(function(ev){
    document.addEventListener(ev, function(e){ e.preventDefault(); });
  });
  document.addEventListener('keydown', function(e){
    if (e.keyCode === 123) { e.preventDefault(); return false; }
    if (e.ctrlKey) {
      if (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault(); return false;
      }
      if (e.keyCode === 85 || e.keyCode === 83 || e.keyCode === 80) {
        e.preventDefault(); return false;
      }
    }
  });
  setInterval(function(){
    if (window.outerWidth - window.innerWidth > 180 || window.outerHeight - window.innerHeight > 180) {
      document.body.style.filter = 'blur(20px)';
      setTimeout(function(){ location.reload(); }, 1500);
    }
  }, 800);

  // === HLS PLAYER ===
  var video = document.getElementById('fifa-video');
  var loader = document.getElementById('fifa-loading');
  var hlsInstance = null;

  function hideLoader() { if (loader) loader.style.display = 'none'; }

  function loadStream(channel) {
    var url = (window._fifaStreams && window._fifaStreams[channel]) ||
              (window._fifaStreams && window._fifaStreams[String(CONFIG.defaultStream)]);
    if (!url) {
      url = (window._fifaData && window._fifaData.streams && window._fifaData.streams[String(channel)]);
    }
    if (!url) return;
    loader.style.display = 'flex';
    if (hlsInstance) { try { hlsInstance.destroy(); } catch(e){} hlsInstance = null; }
    video.removeAttribute('src');
    video.load();
    if (window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls({ lowLatencyMode: true, maxBufferLength: 30, enableWorker: true });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, function(){
        var p = video.play(); if (p) { p.then(hideLoader).catch(hideLoader); } else hideLoader();
      });
      hlsInstance.on(Hls.Events.ERROR, function(e, d){
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) try { hlsInstance.startLoad(); } catch(e){}
          else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) try { hlsInstance.recoverMediaError(); } catch(e){}
          else { try { hlsInstance.destroy(); } catch(e){} hideLoader(); }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', function(){
        var p = video.play(); if (p) { p.then(hideLoader).catch(hideLoader); } else hideLoader();
      });
    } else {
      document.body.innerHTML = '<div style="color:#fff;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;font-size:18px;padding:20px;">BROWSER NOT SUPPORTED</div>';
    }
  }

  // === TIME HELPERS ===
  function todayLocalStr() {
    var d = new Date();
    var offset = 6 * 60;
    var local = new Date(d.getTime() + (offset + d.getTimezoneOffset()) * 60000);
    var y = local.getFullYear();
    var m = String(local.getMonth() + 1).padStart(2, '0');
    var dd = String(local.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }
  function nowUtcMinutes() {
    var d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  function timeToMin(t) {
    var p = t.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  function getTeam(data, name) {
    return (data.teams && data.teams[name]) || { code: name.substring(0, 2).toUpperCase(), flag: '🏳️' };
  }

  // === DOM HELPERS ===
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) e[k] = attrs[k];
        else e.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        if (typeof children[i] === 'string') e.appendChild(document.createTextNode(children[i]));
        else if (children[i]) e.appendChild(children[i]);
      }
    }
    return e;
  }

  // === RENDER: LIVE MATCH ===
  function renderLiveMatch(data, match) {
    var container = document.getElementById('fifa-live-match-container');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'block';

    if (!match) {
      container.appendChild(el('div', { class: 'fifa-match-header' }, [
        el('div', { class: 'fifa-live-badge', style: 'background:linear-gradient(90deg,#9a9ab0,#666);' }, ['NO LIVE MATCH NOW']),
        el('div', { style: 'color:#9a9ab0;font-size:13px;font-weight:600;letter-spacing:1px;' }, ['See today\'s matches below'])
      ]));
      return;
    }

    var homeInfo = getTeam(data, match.home);
    var awayInfo = getTeam(data, match.away);
    var headerText = 'Group ' + match.group + ' - ' + (match.venue || '');
    var scoreStr = (match.score && match.score.home !== undefined) ? match.score.home + '-' + match.score.away : '0-0';
    var timeStr = match.minute ? match.minute + ' min' : match.localTime + ' (BST)';

    container.appendChild(el('div', { class: 'fifa-match-header' }, [
      el('div', { class: 'fifa-live-badge' }, ['🔴 LIVE NOW']),
      el('div', { style: 'color:#9a9ab0;font-size:13px;font-weight:600;letter-spacing:1px;' }, [headerText])
    ]));
    container.appendChild(el('div', { class: 'fifa-match-info' }, [
      el('div', { class: 'fifa-team' }, [
        el('div', { class: 'fifa-team-flag' }, [homeInfo.flag]),
        el('div', { class: 'fifa-team-name' }, [match.home]),
        el('div', { class: 'fifa-team-form' }, [match.homeForm || 'Group ' + match.group])
      ]),
      el('div', { class: 'fifa-score-display' }, [
        el('div', { class: 'fifa-score' }, [
          el('span', {}, [String(scoreStr.split('-')[0])]),
          el('span', { class: 'fifa-score-sep' }, ['-']),
          el('span', {}, [String(scoreStr.split('-')[1])])
        ]),
        el('div', { class: 'fifa-match-time' }, [timeStr])
      ]),
      el('div', { class: 'fifa-team' }, [
        el('div', { class: 'fifa-team-flag' }, [awayInfo.flag]),
        el('div', { class: 'fifa-team-name' }, [match.away]),
        el('div', { class: 'fifa-team-form' }, [match.awayForm || 'Group ' + match.group])
      ])
    ]));
  }

  // === RENDER: TODAY'S MATCHES ===
  function renderTodaysMatches(data, todayMatches, liveMatchId) {
    var container = document.getElementById('fifa-today-matches-container');
    if (!container) return;
    container.innerHTML = '';

    if (!todayMatches || todayMatches.length === 0) {
      container.appendChild(el('div', { style: 'grid-column:1/-1;text-align:center;color:#9a9ab0;padding:30px;font-size:14px;' }, [
        'No FIFA World Cup 2026 matches scheduled for today in your timezone.',
        el('br'),
        el('small', null, ['Tournament runs June 11 - July 19, 2026. Check back tomorrow!'])
      ]));
      return;
    }

    for (var i = 0; i < todayMatches.length; i++) {
      var m = todayMatches[i];
      var isLive = m.id === liveMatchId;
      var homeInfo = getTeam(data, m.home);
      var awayInfo = getTeam(data, m.away);
      var statusClass = isLive ? 'live' : 'upcoming';
      var tagClass = isLive ? 'fifa-tag-live' : 'fifa-tag-upcoming';
      var tagText = isLive ? '🔴 LIVE' : (m.localTime + ' BST');

      var card = el('div', { class: 'fifa-match-card ' + statusClass }, [
        el('div', { class: 'fifa-league' }, ['Group ' + m.group + ' • ' + m.venue]),
        el('div', { class: 'fifa-teams-row' }, [
          el('div', { class: 'fifa-card-team' }, [(homeInfo.flag || '🏳️') + ' ' + m.home + ' (' + homeInfo.code + ')']),
          el('div', { class: 'fifa-card-vs' }, ['VS']),
          el('div', { class: 'fifa-card-team' }, [m.away + ' (' + awayInfo.code + ') ' + (awayInfo.flag || '🏳️')])
        ]),
        el('div', { class: 'fifa-card-meta' }, [
          el('span', { class: tagClass }, [tagText]),
          el('span', null, [(m.venue || '').substring(0, 25)])
        ])
      ]);
      container.appendChild(card);
    }
  }

  function renderPopularLeagues(data) {
    var container = document.getElementById('fifa-popular-leagues-container');
    if (!container) return;
    container.innerHTML = '';
    var t = data.tournament || {};
    var items = [
      { name: 'FIFA World Cup 2026', host: t.host || '', dates: t.dates || '' },
      { name: 'Group Stage', host: '48 teams, 12 groups', dates: 'June 11 - June 26' },
      { name: 'Knockout Stage', host: 'Round of 32 onwards', dates: 'June 27 onwards' },
      { name: 'Final', host: 'Championship Match', dates: 'July 19, 2026' }
    ];
    for (var i = 0; i < items.length; i++) {
      var l = items[i];
      container.appendChild(el('div', { class: 'fifa-match-card' }, [
        el('div', { class: 'fifa-league' }, ['🏆 ' + l.name]),
        el('div', { class: 'fifa-teams-row', style: 'justify-content:center;color:#9a9ab0;font-size:13px;' }, [l.host]),
        el('div', { class: 'fifa-card-meta' }, [
          el('span', null, [l.dates]),
          el('span', null, [el('i', { class: 'fas fa-arrow-right' })])
        ])
      ]));
    }
  }

  function renderTicker(tickerItems) {
    var container = document.getElementById('fifa-ticker-track');
    if (!container) return;
    container.innerHTML = '';
    var items = tickerItems || ['FIFA World Cup 2026', 'Watch live on FIFA Live HD'];
    for (var i = 0; i < items.length; i++) {
      var span = el('span', null, []);
      if (items[i].indexOf('LIVE') === 0 || items[i].indexOf('GOAL') === 0) {
        span.appendChild(el('span', { class: 'fifa-live-dot' }));
        span.appendChild(document.createTextNode(items[i]));
      } else {
        span.appendChild(document.createTextNode(items[i]));
      }
      container.appendChild(span);
    }
  }

  function renderStats(stats) {
    var items = document.querySelectorAll('.fifa-stat-item .fifa-stat-num');
    if (!stats || items.length < 4) return;
    if (stats.viewersOnline) items[0].textContent = stats.viewersOnline;
    if (stats.quality) items[1].textContent = stats.quality;
    if (stats.daysLive) items[2].textContent = stats.daysLive;
    if (stats.cost) items[3].textContent = stats.cost;
  }

  function setupChannelTabs() {
    var tabs = document.querySelectorAll('.fifa-channel-tab');
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('active'); });
        tab.classList.add('active');
        loadStream(parseInt(tab.getAttribute('data-channel'), 10));
      });
    });
  }

  // === DETECT LIVE MATCH ===
  function determineLiveMatch(data) {
    if (data.liveStream && data.liveStream.matchId) {
      var manual = (data.matches || []).filter(function(m){ return m.id === data.liveStream.matchId; })[0];
      if (manual) {
        manual.status = 'live';
        return manual;
      }
    }

    var now = nowUtcMinutes();
    var allMatches = data.matches || [];
    for (var i = 0; i < allMatches.length; i++) {
      var m = allMatches[i];
      if (!m.utcDate || !m.utcTime) continue;
      var todayUtc = new Date().toISOString().split('T')[0];
      if (m.utcDate !== todayUtc) continue;
      var matchTime = timeToMin(m.utcTime);
      if (now >= matchTime && now <= matchTime + 110) {
        m.status = 'live';
        return m;
      }
    }
    return null;
  }

  function buildTicker(data, todayMatches, liveMatch) {
    var items = [];
    var now = nowUtcMinutes();
    var today = todayLocalStr();

    items.push('FIFA World Cup 2026 - Tournament June 11 to July 19');

    if (todayMatches.length > 0) {
      items.push('TODAY (' + today + '): ' + todayMatches.length + ' WC matches scheduled');
    }

    todayMatches.forEach(function(m){
      var homeInfo = getTeam(data, m.home);
      var awayInfo = getTeam(data, m.away);
      if (m.id === (liveMatch ? liveMatch.id : -1)) {
        items.push('🔴 LIVE NOW: ' + m.home + ' vs ' + m.away + ' (' + m.localTime + ' BST)');
      } else {
        var matchTime = timeToMin(m.utcTime);
        var diffMin = matchTime - now;
        if (diffMin > 60) {
          items.push('⏰ TODAY ' + m.localTime + ' BST: ' + m.home + ' vs ' + m.away);
        } else if (diffMin > 0) {
          items.push('⏰ Starting in ' + diffMin + ' min: ' + m.home + ' vs ' + m.away);
        } else {
          items.push('📺 Earlier today: ' + m.home + ' vs ' + m.away + ' (Watch replay)');
        }
      }
    });

    return items;
  }

  // === FETCH + REFRESH ===
  function fetchData() {
    fetch(CONFIG.matchesJsonUrl + '?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(data){
        window._fifaData = data;
        if (data.streams) window._fifaStreams = data.streams;

        var today = todayLocalStr();

        var todayMatches = (data.matches || []).filter(function(m){ return m.localDate === today; });

        todayMatches.sort(function(a, b){ return timeToMin(a.localTime) - timeToMin(b.localTime); });

        var liveMatch = determineLiveMatch(data);
        var liveMatchId = liveMatch ? liveMatch.id : null;

        var tickerItems = buildTicker(data, todayMatches, liveMatch);

        renderTicker(tickerItems);
        renderLiveMatch(data, liveMatch);
        renderTodaysMatches(data, todayMatches, liveMatchId);
        renderPopularLeagues(data);
        renderStats(data.siteStats);

        if (!video.src && !hlsInstance) {
          var streamNum = (liveMatch && data.liveStream && data.liveStream.streamNumber) || CONFIG.defaultStream;
          loadStream(streamNum);
        }
      })
      .catch(function(err){ console.warn('Failed to load data:', err); });
  }

  function boot() {
    setupChannelTabs();
    fetchData();
    setInterval(fetchData, CONFIG.refreshInterval);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();