/* The Agentic Stack — shared site behaviour: mobile nav + command-K search */
(function () {
  'use strict';

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- Search palette ---------- */
  var trigger = document.getElementById('searchTrigger');
  var overlay = document.getElementById('searchOverlay');
  if (!trigger || !overlay) return;

  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var index = null;
  var activeIndex = -1;
  var currentItems = [];

  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch('/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { index = data; return data; })
      .catch(function () { index = []; return index; });
  }

  function openSearch() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    loadIndex().then(function () {
      input.value = '';
      input.focus();
      render('');
    });
  }

  function closeSearch() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function score(item, q) {
    var t = item.title.toLowerCase(), d = (item.desc || '').toLowerCase(), c = (item.cat || '').toLowerCase();
    if (t.indexOf(q) === 0) return 100;
    if (t.indexOf(q) > -1) return 70;
    if (c.indexOf(q) > -1) return 40;
    if (d.indexOf(q) > -1) return 20;
    return 0;
  }

  function render(q) {
    q = q.trim().toLowerCase();
    var items;
    if (!q) {
      items = index.slice(0, 8);
    } else {
      items = index
        .map(function (it) { return { it: it, s: score(it, q) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 12)
        .map(function (x) { return x.it; });
    }
    currentItems = items;
    activeIndex = items.length ? 0 : -1;
    if (!items.length) {
      results.innerHTML = '<div class="search-empty">No matches. Try a vendor name, category, or "signal".</div>';
      return;
    }
    results.innerHTML = items.map(function (it, i) {
      return '<a class="search-result' + (i === 0 ? ' active' : '') + '" href="' + it.url + '" data-idx="' + i + '">' +
        '<div class="search-result-cat">' + it.cat + '</div>' +
        '<div class="search-result-title serif">' + it.title + '</div>' +
        '<div class="search-result-desc">' + (it.desc || '') + '</div>' +
        '</a>';
    }).join('');
  }

  function move(delta) {
    if (!currentItems.length) return;
    activeIndex = (activeIndex + delta + currentItems.length) % currentItems.length;
    var nodes = results.querySelectorAll('.search-result');
    nodes.forEach(function (n, i) { n.classList.toggle('active', i === activeIndex); });
    var el = nodes[activeIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function goActive() {
    if (activeIndex > -1 && currentItems[activeIndex]) {
      window.location.href = currentItems[activeIndex].url;
    }
  }

  trigger.addEventListener('click', openSearch);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });
  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); goActive(); }
    else if (e.key === 'Escape') { closeSearch(); }
  });
  results.addEventListener('mousemove', function (e) {
    var r = e.target.closest('.search-result');
    if (!r) return;
    var idx = parseInt(r.dataset.idx, 10);
    if (idx !== activeIndex) {
      results.querySelectorAll('.search-result').forEach(function (n, i) { n.classList.toggle('active', i === idx); });
      activeIndex = idx;
    }
  });

  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.classList.contains('open') ? closeSearch() : openSearch();
    } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeSearch();
    }
  });
})();
