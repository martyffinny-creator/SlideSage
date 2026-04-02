/**
 * SlideSage — tips.js
 * Client-side tips panel for app.html results page.
 *
 * Public API:
 *   window.initTipsPanel()          — call after analysis completes
 *   window.loadTipsByCategory(cat)  — filter the displayed tips
 *
 * Categories: design | content | delivery | structure
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
   * Constants
   * ───────────────────────────────────────── */

  var CATEGORIES = ['design', 'content', 'delivery', 'structure'];

  var CATEGORY_META = {
    design:    { label: 'Design',    emoji: '🎨', color: '#a78bfa' },
    content:   { label: 'Content',   emoji: '✍️',  color: '#60a5fa' },
    delivery:  { label: 'Delivery',  emoji: '🎤', color: '#f97316' },
    structure: { label: 'Structure', emoji: '🏗️',  color: '#4ade80' },
  };

  /* ─────────────────────────────────────────
   * Internal state
   * ───────────────────────────────────────── */

  var _allTips       = [];        // all tips fetched from the server
  var _activeCategory = 'all';   // 'all' or one of CATEGORIES
  var _panelRoot     = null;      // the injected DOM container
  var _listEl        = null;      // the tips list container

  /* ─────────────────────────────────────────
   * Helpers
   * ───────────────────────────────────────── */

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Return the index of the weakest-scoring slides.
   * Used to hint the server about which categories matter most.
   * Reads from window.currentAnalysisResult if available.
   */
  function getWeakSlideIndices(limit) {
    limit = limit || 3;
    var result = window.currentAnalysisResult || null;
    if (!result || !Array.isArray(result.slides)) return [];
    var sorted = result.slides
      .slice()
      .sort(function (a, b) { return a.score - b.score; });
    return sorted.slice(0, limit).map(function (s) { return s.slideNumber; });
  }

  /**
   * Inject panel styles once into <head>.
   */
  function injectStyles() {
    if (document.getElementById('slidesage-tips-styles')) return;

    var css = [
      /* Container */
      '#tips-panel{margin-top:24px;font-family:\'Inter\',sans-serif;}',

      /* Header row */
      '.tips-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;}',
      '.tips-heading{font-size:18px;font-weight:700;color:#e8f5e9;display:flex;align-items:center;gap:8px;}',

      /* Category tabs */
      '.tips-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
      '.tips-tab{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.18s,color 0.18s,border-color 0.18s;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#9bb09b;font-family:\'Inter\',sans-serif;}',
      '.tips-tab:hover{background:rgba(255,255,255,0.08);color:#e8f5e9;}',
      '.tips-tab:focus-visible{outline:2px solid #4ade80;outline-offset:2px;}',
      '.tips-tab.active{background:rgba(74,222,128,0.12);border-color:rgba(74,222,128,0.3);color:#4ade80;}',

      /* Tips grid */
      '.tips-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}',

      /* Tip card */
      '.tip-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;transition:border-color 0.2s,transform 0.2s;}',
      '.tip-card:hover{border-color:rgba(74,222,128,0.2);transform:translateY(-2px);}',

      /* Tip card inner */
      '.tip-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;}',
      '.tip-category-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:600;flex-shrink:0;}',
      '.tip-title{font-size:14px;font-weight:700;color:#e8f5e9;margin-bottom:7px;line-height:1.4;}',
      '.tip-desc{font-size:13px;color:#9bb09b;line-height:1.65;margin-bottom:10px;}',

      /* Example block */
      '.tip-example{background:rgba(0,0,0,0.25);border-left:2px solid rgba(74,222,128,0.35);border-radius:0 6px 6px 0;padding:8px 12px;}',
      '.tip-example-label{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6b7a6b;margin-bottom:4px;}',
      '.tip-example-text{font-size:12px;color:#9bb09b;line-height:1.5;font-style:italic;}',

      /* Empty state */
      '.tips-empty{text-align:center;padding:40px 20px;color:#6b7a6b;font-size:14px;}',

      /* Loading skeleton */
      '.tip-skeleton{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px;animation:tip-pulse 1.4s ease-in-out infinite;}',
      '@keyframes tip-pulse{0%,100%{opacity:0.5;}50%{opacity:1;}}',
      '.tip-skel-line{height:10px;border-radius:99px;background:rgba(255,255,255,0.08);margin-bottom:8px;}',
      '.tip-skel-line.short{width:40%;}',
      '.tip-skel-line.long{width:85%;}',
      '.tip-skel-line.medium{width:65%;}',
    ].join('\n');

    var style = document.createElement('style');
    style.id = 'slidesage-tips-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────
   * Build DOM skeleton for the panel
   * ───────────────────────────────────────── */

  function buildPanelDOM() {
    if (_panelRoot) return;

    injectStyles();

    var panel = document.createElement('section');
    panel.id = 'tips-panel';
    panel.setAttribute('aria-labelledby', 'tips-panel-heading');

    /* Header */
    var header = document.createElement('div');
    header.className = 'tips-header';

    var heading = document.createElement('h2');
    heading.className = 'tips-heading';
    heading.id = 'tips-panel-heading';
    heading.innerHTML = '<span aria-hidden="true">💡</span> Tips for You';

    var tabs = document.createElement('div');
    tabs.className = 'tips-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Filter tips by category');

    /* All tab */
    tabs.appendChild(buildTab('all', '✨', 'All', '#4ade80'));

    /* Category tabs */
    CATEGORIES.forEach(function (cat) {
      var meta = CATEGORY_META[cat];
      tabs.appendChild(buildTab(cat, meta.emoji, meta.label, meta.color));
    });

    header.appendChild(heading);
    header.appendChild(tabs);

    /* List */
    var list = document.createElement('div');
    list.className = 'tips-grid';
    list.id = 'tips-list';
    list.setAttribute('aria-live', 'polite');

    panel.appendChild(header);
    panel.appendChild(list);

    _panelRoot = panel;
    _listEl    = list;
  }

  function buildTab(value, emoji, label, color) {
    var btn = document.createElement('button');
    btn.className = 'tips-tab' + (value === _activeCategory ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(value === _activeCategory));
    btn.setAttribute('data-category', value);
    btn.innerHTML = '<span aria-hidden="true">' + emoji + '</span>' + escHtml(label);

    btn.addEventListener('click', function () {
      _activeCategory = value;
      updateActiveTabs();
      renderTips();
    });

    return btn;
  }

  function updateActiveTabs() {
    if (!_panelRoot) return;
    _panelRoot.querySelectorAll('.tips-tab').forEach(function (btn) {
      var cat = btn.getAttribute('data-category');
      var isActive = cat === _activeCategory;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  /* ─────────────────────────────────────────
   * Skeleton loading placeholders
   * ───────────────────────────────────────── */

  function renderSkeletons(count) {
    if (!_listEl) return;
    _listEl.innerHTML = '';

    for (var i = 0; i < count; i++) {
      var card = document.createElement('div');
      card.className = 'tip-skeleton';
      card.setAttribute('aria-hidden', 'true');
      card.innerHTML =
        '<div class="tip-skel-line short"></div>' +
        '<div class="tip-skel-line long" style="margin-top:12px;"></div>' +
        '<div class="tip-skel-line medium"></div>' +
        '<div class="tip-skel-line long"></div>' +
        '<div class="tip-skel-line" style="width:55%;"></div>';
      _listEl.appendChild(card);
    }
  }

  /* ─────────────────────────────────────────
   * Render Tips
   * ───────────────────────────────────────── */

  function renderTips() {
    if (!_listEl) return;

    var filtered = _activeCategory === 'all'
      ? _allTips
      : _allTips.filter(function (t) { return t.category === _activeCategory; });

    _listEl.innerHTML = '';

    if (filtered.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'tips-empty';
      empty.textContent = 'No tips found for this category yet.';
      _listEl.appendChild(empty);
      return;
    }

    filtered.forEach(function (tip) {
      _listEl.appendChild(buildTipCard(tip));
    });
  }

  function buildTipCard(tip) {
    var meta  = CATEGORY_META[tip.category] || { label: tip.category, emoji: '💡', color: '#4ade80' };
    var color = meta.color;

    var card = document.createElement('article');
    card.className = 'tip-card';
    card.setAttribute('aria-label', tip.title);

    var topRow = document.createElement('div');
    topRow.className = 'tip-card-top';

    var badge = document.createElement('span');
    badge.className = 'tip-category-badge';
    badge.style.background = color + '1a';
    badge.style.color       = color;
    badge.style.border      = '1px solid ' + color + '33';
    badge.innerHTML = '<span aria-hidden="true">' + meta.emoji + '</span>' + escHtml(meta.label);

    topRow.appendChild(badge);

    var title = document.createElement('h3');
    title.className = 'tip-title';
    title.textContent = tip.title;

    var desc = document.createElement('p');
    desc.className = 'tip-desc';
    desc.textContent = tip.description;

    card.appendChild(topRow);
    card.appendChild(title);
    card.appendChild(desc);

    if (tip.example) {
      var exBlock = document.createElement('div');
      exBlock.className = 'tip-example';

      var exLabel = document.createElement('p');
      exLabel.className = 'tip-example-label';
      exLabel.textContent = 'Example';

      var exText = document.createElement('p');
      exText.className = 'tip-example-text';
      exText.textContent = tip.example;

      exBlock.appendChild(exLabel);
      exBlock.appendChild(exText);
      card.appendChild(exBlock);
    }

    return card;
  }

  /* ─────────────────────────────────────────
   * Mount panel into the page
   * Looks for a .results-panel or #results-panel;
   * appends tips section after recommendations.
   * ───────────────────────────────────────── */

  function mountPanel() {
    if (!_panelRoot) return;

    /* Already mounted */
    if (document.getElementById('tips-panel')) return;

    /* Try to place after recommendations */
    var anchor =
      document.querySelector('[data-recommendations]') ||
      document.querySelector('.recommendations-list') ||
      document.querySelector('.results-panel') ||
      document.querySelector('#results-panel') ||
      document.querySelector('main') ||
      document.body;

    /* Walk up to find a sensible parent */
    var parent = anchor.parentElement || anchor;

    /* If anchor is a list/container inside a card, go up one more level */
    if (anchor.tagName === 'UL' || anchor.tagName === 'OL') {
      parent = anchor.parentElement ? anchor.parentElement.parentElement || anchor.parentElement : parent;
    }

    parent.appendChild(_panelRoot);
  }

  /* ─────────────────────────────────────────
   * Fetch tips from the server
   * ───────────────────────────────────────── */

  function fetchTips(weakSlides) {
    var body = {};

    if (weakSlides && weakSlides.length) {
      body.slideNumbers = weakSlides;
    }

    return fetch('/.netlify/functions/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Tips fetch failed: HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        /* Accept { tips: [...] } or a bare array */
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.tips)) return data.tips;
        throw new Error('Unexpected tips response shape');
      });
  }

  /* ─────────────────────────────────────────
   * window.initTipsPanel()
   * Call this after analysis completes.
   * ───────────────────────────────────────── */

  function initTipsPanel() {
    buildPanelDOM();
    mountPanel();

    /* Show skeleton while loading */
    renderSkeletons(6);

    var weakSlides = getWeakSlideIndices(3);

    fetchTips(weakSlides)
      .then(function (tips) {
        _allTips = normalizeTips(tips);
        renderTips();
      })
      .catch(function (err) {
        console.warn('[SlideSage] Tips fetch error:', err);
        /* Fall back to built-in tips so the panel is never empty */
        _allTips = getFallbackTips();
        renderTips();
      });
  }

  /* ─────────────────────────────────────────
   * window.loadTipsByCategory(category)
   * Switch the active category and re-render.
   * ───────────────────────────────────────── */

  function loadTipsByCategory(category) {
    if (category === undefined || category === null || category === '') {
      _activeCategory = 'all';
    } else if (CATEGORIES.indexOf(category) !== -1) {
      _activeCategory = category;
    } else if (category === 'all') {
      _activeCategory = 'all';
    } else {
      console.warn('[SlideSage] Unknown tip category:', category);
      return;
    }

    /* If the panel hasn't been initialised yet, init now */
    if (!_panelRoot) {
      initTipsPanel();
      return;
    }

    updateActiveTabs();
    renderTips();
  }

  /* ─────────────────────────────────────────
   * Normalise tips from server into a known shape:
   *   { category, title, description, example }
   * ───────────────────────────────────────── */

  function normalizeTips(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (t) { return t && typeof t === 'object'; })
      .map(function (t) {
        return {
          category:    CATEGORIES.indexOf(String(t.category || '').toLowerCase()) !== -1
                         ? String(t.category).toLowerCase()
                         : 'content',
          title:       String(t.title || t.name || 'Tip'),
          description: String(t.description || t.body || t.text || ''),
          example:     t.example || t.sample || null,
        };
      });
  }

  /* ─────────────────────────────────────────
   * Fallback tips (shown if the API is unavailable)
   * ───────────────────────────────────────── */

  function getFallbackTips() {
    return [
      /* Design */
      {
        category: 'design',
        title: 'Use the 6×6 Rule',
        description: 'Limit each slide to 6 bullet points with no more than 6 words each. Dense text kills attention; whitespace is your friend.',
        example: 'Instead of a paragraph, use: "Reduces costs by 30%" as a single bullet.',
      },
      {
        category: 'design',
        title: 'Stick to 3 Brand Colors',
        description: 'A consistent palette of one primary, one accent, and one neutral color keeps visuals professional and coherent throughout.',
        example: 'Primary #2D6A4F (deep green), Accent #52B788 (mid green), Neutral #F8FAF8 (off-white).',
      },
      {
        category: 'design',
        title: 'Align Everything to a Grid',
        description: 'Use your presentation tool\'s alignment guides. Misaligned elements create visual noise even when the content is strong.',
        example: 'Select all objects → Arrange → Align → Align Left, then distribute vertically.',
      },

      /* Content */
      {
        category: 'content',
        title: 'Lead with the Insight',
        description: 'State the key takeaway in the slide title, not buried in the body. Your audience skims; make sure the headline does the work.',
        example: 'Title: "Churn dropped 22% after onboarding redesign" instead of just "Churn Metrics".',
      },
      {
        category: 'content',
        title: 'The One-Idea-Per-Slide Rule',
        description: 'Each slide should communicate exactly one idea. If you can\'t summarise the slide in a single sentence, split it.',
        example: 'Instead of "Features & Pricing", make two slides: "Key Features" and "Simple Pricing".',
      },
      {
        category: 'content',
        title: 'Show Data in Context',
        description: 'Raw numbers are hard to interpret. Compare to a benchmark, prior period, or industry average to make data meaningful.',
        example: '"We grew 18% MoM — 3× the category average of 6%."',
      },

      /* Delivery */
      {
        category: 'delivery',
        title: 'Write Your Opening Word for Word',
        description: 'The first 30 seconds set the tone. Script and rehearse your opening until it feels natural — nerves peak right at the start.',
        example: '"In the next 12 minutes I\'m going to show you why our retention strategy will save $2M this year."',
      },
      {
        category: 'delivery',
        title: 'Pause After Key Points',
        description: 'A two-second pause after an important claim lets the idea land and signals to the audience that it matters.',
        example: 'State the stat → pause → continue. "We closed 40 enterprise deals last quarter. [pause] That\'s double our previous record."',
      },
      {
        category: 'delivery',
        title: 'Anticipate the Top 3 Questions',
        description: 'Prepare backup slides for the questions you\'re most likely to get. Confidence in Q&A is as important as the deck itself.',
        example: 'Hide supplementary slides at the end labelled "Appendix: Unit Economics", "Appendix: Roadmap", etc.',
      },

      /* Structure */
      {
        category: 'structure',
        title: 'Use the Problem–Solution–Proof Arc',
        description: 'The most persuasive presentations follow a clear narrative arc: establish pain, present your solution, prove it works.',
        example: 'Slides 1-2: Problem → Slides 3-4: Solution → Slides 5-6: Evidence / Case Studies.',
      },
      {
        category: 'structure',
        title: 'Add a Visual Agenda Slide',
        description: 'A brief agenda slide tells the audience where you\'re going and reduces cognitive load. Revisit it between major sections.',
        example: '3-item agenda: "1. The Challenge  2. Our Approach  3. Results & Next Steps".',
      },
      {
        category: 'structure',
        title: 'End with a Single CTA',
        description: 'Your final slide should ask for one specific action. Multiple asks dilute momentum. Make it easy to say yes.',
        example: '"Schedule a 30-min pilot kickoff → [calendar link]" is better than three vague next steps.',
      },
    ];
  }

  /* ─────────────────────────────────────────
   * Export public API
   * ───────────────────────────────────────── */

  window.initTipsPanel       = initTipsPanel;
  window.loadTipsByCategory  = loadTipsByCategory;

}());
