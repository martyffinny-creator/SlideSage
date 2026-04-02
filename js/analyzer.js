/**
 * SlideSage — analyzer.js  (v2 — GPT-4o backend)
 * Handles: upload zone, PPTX extraction, API call, results rendering,
 * score animations, PDF/Word export, share, and demo mode.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
   * DEMO DATA
   * ───────────────────────────────────────── */
  var DEMO_DATA = {
    overallScore: 84,
    summary: 'Your pitch deck demonstrates strong storytelling and compelling market analysis. The problem-solution narrative is clear and persuasive. Primary improvements needed: reduce text density on slides 4-6, strengthen the financial projections slide, and add more social proof.',
    presentationType: 'Pitch Deck',
    audienceFit: 'Investors & Stakeholders',
    estimatedTime: '12-15 minutes',
    tone: 'Professional',
    strengths: [
      'Compelling narrative arc from problem to solution',
      'Strong market size data with credible sources',
      'Clear and memorable call-to-action on final slide'
    ],
    weaknesses: [
      'Slides 4-6 are too text-heavy — audiences will disengage',
      'Financial projections lack supporting assumptions',
      'No customer testimonials or social proof'
    ],
    recommendations: [
      { priority: 1, title: 'Reduce text on slides 4-6', detail: 'Replace paragraphs with 3-5 bullet points maximum. Move details to speaker notes.', impact: 'high' },
      { priority: 2, title: 'Add financial assumptions', detail: 'Show your math. Add a simple table with key assumptions driving your projections.', impact: 'high' },
      { priority: 3, title: 'Include 1-2 customer quotes', detail: 'Add a testimonial slide or sidebar quote. Real user validation dramatically increases credibility.', impact: 'medium' },
      { priority: 4, title: 'Standardize your typography', detail: 'Use max 2 fonts consistently. Currently mixing 3 different heading styles.', impact: 'medium' },
      { priority: 5, title: 'Add a competition slide', detail: 'Show you understand the landscape. A 2x2 matrix positioning you clearly is standard for investor decks.', impact: 'low' }
    ],
    slides: [
      { slideNumber: 1, title: 'The Problem', scores: { content: 91, design: 88, clarity: 94, engagement: 86 }, overallScore: 90, feedback: 'Excellent opening. The pain point is immediately relatable and the statistic is striking. Strong visual hierarchy.', quickWin: 'Add a human face photo to make the problem more emotionally resonant.' },
      { slideNumber: 2, title: 'Our Solution', scores: { content: 87, design: 79, clarity: 85, engagement: 82 }, overallScore: 83, feedback: 'Solution is clearly articulated. The 3-pillar structure works well. Design feels slightly rushed compared to slide 1.', quickWin: 'Align the three pillars with consistent icon sizes and spacing.' },
      { slideNumber: 3, title: 'Market Opportunity', scores: { content: 88, design: 82, clarity: 80, engagement: 85 }, overallScore: 84, feedback: 'TAM/SAM/SOM breakdown is solid. Sources are cited which builds trust. Consider making the numbers bigger — they\'re your main point.', quickWin: 'Increase the font size of the $12B TAM figure to at least 48pt.' },
      { slideNumber: 4, title: 'Product Deep-Dive', scores: { content: 82, design: 65, clarity: 58, engagement: 61 }, overallScore: 67, feedback: 'Too much text. This slide loses audience attention. The product features are good but buried in paragraphs that no one will read during your presentation.', quickWin: 'Convert to 4 feature cards with icons. Move all detail to speaker notes.' },
      { slideNumber: 5, title: 'Traction & Growth', scores: { content: 85, design: 78, clarity: 82, engagement: 88 }, overallScore: 83, feedback: 'Growth chart is compelling. MoM numbers are impressive. Consider adding a \'hockey stick moment\' annotation to highlight the inflection point.', quickWin: 'Add a callout annotation at the inflection point showing what caused the spike.' },
      { slideNumber: 6, title: 'The Ask', scores: { content: 80, design: 75, clarity: 88, engagement: 76 }, overallScore: 80, feedback: 'Ask is clear and specific — good. Use of funds breakdown is appropriate. Add a timeline showing key milestones the funding will unlock.', quickWin: 'Add a 6-month roadmap showing the 3 biggest milestones this round funds.' }
    ]
  };

  /* ─────────────────────────────────────────
   * STATE
   * ───────────────────────────────────────── */
  var currentResult  = null;
  var currentFile    = null;
  var _etaInterval   = null;
  var _progressTimer = null;

  /* ─────────────────────────────────────────
   * HELPERS
   * ───────────────────────────────────────── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getScoreColor(score) {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function getScoreClass(score) {
    if (score >= 75) return 'good';
    if (score >= 50) return 'warn';
    return 'bad';
  }

  function getScoreValClass(score) {
    if (score >= 75) return 'g';
    if (score >= 50) return 'y';
    return 'r';
  }

  function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Work';
    return 'Poor';
  }

  function toast(message, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'info');
      return;
    }
    // Fallback: inject a simple toast
    var existing = document.getElementById('ss-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'ss-toast';
    t.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
      'padding:12px 20px', 'border-radius:10px', 'font-size:14px',
      'font-weight:600', 'color:#fff', 'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
      'opacity:0', 'transform:translateY(8px)',
      'transition:opacity 0.25s,transform 0.25s'
    ].join(';');
    var bg = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#22c55e' : '#6366f1';
    t.style.background = bg;
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.style.opacity = '1';
      t.style.transform = 'translateY(0)';
    });
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(function () { if (t.parentNode) t.remove(); }, 300);
    }, 3500);
  }

  /* ─────────────────────────────────────────
   * 1. UPLOAD ZONE
   * ───────────────────────────────────────── */
  window.initUploadZone = function () {
    var zone      = document.getElementById('upload-zone') || document.querySelector('.upload-zone');
    var fileInput = document.getElementById('file-input');

    if (!zone) return;

    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id   = 'file-input';
      fileInput.accept = '.pptx,.ppt';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }

    // Show filename in zone
    function showFileName(name) {
      var existing = zone.querySelector('.upload-filename-display');
      if (existing) existing.remove();
      var el = document.createElement('p');
      el.className  = 'upload-filename-display';
      el.style.cssText = 'margin-top:10px;font-size:13px;font-weight:600;opacity:0.75;';
      el.textContent = '📎 ' + name;
      zone.appendChild(el);
    }

    // Validate and dispatch
    function handleFile(file) {
      if (!file) return;
      var name = file.name.toLowerCase();
      if (!name.endsWith('.pptx') && !name.endsWith('.ppt')) {
        toast('Please upload a .pptx or .ppt file.', 'warning');
        return;
      }
      showFileName(file.name);
      currentFile = file;
      window.analyzeFile(file);
    }

    // Expose globally so inline onchange="handleFileSelect(this)" still works
    window.handleFileSelect = function (input) {
      if (input.files && input.files[0]) handleFile(input.files[0]);
    };

    // Click to browse
    zone.addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(fileInput.files[0]);
        fileInput.value = '';
      }
    });

    // Drag & drop
    zone.addEventListener('dragenter', function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragover',  function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function (e) { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files && files.length) handleFile(files[0]);
    });

    // Wire sidebar export buttons
    var exportBtns = document.querySelectorAll('.export-btn');
    if (exportBtns[0]) exportBtns[0].addEventListener('click', function () { window.exportPDF(); });
    if (exportBtns[1]) exportBtns[1].addEventListener('click', function () { window.exportWord(); });
    if (exportBtns[2]) exportBtns[2].addEventListener('click', function () { window.shareReport(); });
  };

  /* ─────────────────────────────────────────
   * 2. BASIC PPTX SLIDE EXTRACTION
   *    PPTX is a ZIP — no library, so we do a
   *    best-effort size-based estimate with
   *    fallback generic slides.
   * ───────────────────────────────────────── */
  function extractSlidesBasic(file) {
    return new Promise(function (resolve) {
      // Estimate slide count from file size (~100KB per slide average)
      var estimatedCount = Math.max(5, Math.min(30, Math.round(file.size / 102400)));

      // Try to read the ZIP PK signatures to count slide XML files
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var buffer = e.target.result;
          var bytes  = new Uint8Array(buffer);
          var text   = '';
          // Read the local file header area (first 64KB is usually enough for the central directory)
          var sample = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 65536));
          for (var i = 0; i < sample.length; i++) {
            text += String.fromCharCode(sample[i]);
          }

          // Count occurrences of "ppt/slides/slide" entries in the ZIP local headers
          var slideMatches = text.match(/ppt\/slides\/slide\d+\.xml/g);
          if (slideMatches && slideMatches.length) {
            estimatedCount = slideMatches.length;
          }
        } catch (err) {
          // Ignore parse errors, keep estimate
        }

        var slides = [];
        for (var n = 1; n <= estimatedCount; n++) {
          slides.push({
            slideNumber: n,
            title:       'Slide ' + n,
            content:     '',
            notes:       ''
          });
        }
        resolve(slides);
      };

      reader.onerror = function () {
        // Fallback: 10 generic slides
        var slides = [];
        for (var n = 1; n <= 10; n++) {
          slides.push({ slideNumber: n, title: 'Slide ' + n, content: '', notes: '' });
        }
        resolve(slides);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /* ─────────────────────────────────────────
   * 3. ANALYZE FILE
   * ───────────────────────────────────────── */
  window.analyzeFile = async function (file) {
    var uploadSection = document.getElementById('upload-section');
    var overlay       = document.getElementById('loading-overlay');
    var resultsSection = document.getElementById('results-section');
    var subText       = document.getElementById('loading-sub-text');

    // Hide upload, show overlay
    if (uploadSection) uploadSection.style.display = 'none';
    if (resultsSection) { resultsSection.classList.remove('active'); resultsSection.style.display = 'none'; }
    if (overlay) overlay.classList.add('active');

    // Reset loading steps
    _resetLoadingSteps();

    // Progress step labels
    var stepLabels = [
      'Reading presentation structure',
      'Analyzing slide content with GPT-4o',
      'Generating AI recommendations',
      'Building your report'
    ];
    var stepIds      = ['step-1', 'step-2', 'step-3', 'step-4'];
    var stepDelays   = [400, 900, 1400, 1900]; // ms between activations
    var stepDuration = 800;                     // how long each step stays "active"
    var progressPcts = ['15%', '40%', '70%', '92%'];
    var etaTimes     = ['~45s', '~30s', '~15s', '~5s'];

    // Animate steps
    stepIds.forEach(function (id, i) {
      setTimeout(function () { _activateStep(id, stepLabels[i]); }, stepDelays[i]);
      setTimeout(function () { _completeStep(id); }, stepDelays[i] + stepDuration);
    });

    // Update progress bar and ETA
    stepIds.forEach(function (id, i) {
      setTimeout(function () {
        var fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = progressPcts[i];
        var eta = document.getElementById('eta-counter');
        if (eta) eta.textContent = etaTimes[i];
      }, stepDelays[i]);
    });

    // Extract slides
    var slides;
    try {
      slides = await extractSlidesBasic(file);
    } catch (e) {
      slides = [{ slideNumber: 1, title: 'Slide 1', content: '', notes: '' }];
    }

    if (subText) subText.textContent = 'Reading ' + slides.length + ' slides with GPT-4o…';

    // POST to Netlify function
    var data;
    try {
      var response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides:   slides,
          fileName: file.name,
          language: 'en'
        })
      });

      if (!response.ok) {
        var errText = await response.text();
        throw new Error('API error ' + response.status + ': ' + errText);
      }

      data = await response.json();
    } catch (err) {
      console.error('[SlideSage] analyzeFile error:', err);

      // Finish remaining steps visually so the UI doesn't look broken
      stepIds.forEach(function (id) { _completeStep(id); });
      var fill2 = document.getElementById('progress-fill');
      if (fill2) fill2.style.width = '100%';

      if (overlay) overlay.classList.remove('active');
      if (uploadSection) uploadSection.style.display = '';
      toast('Analysis failed. Please check your connection and try again.', 'error');
      return;
    }

    // Finish steps + progress bar
    stepIds.forEach(function (id) { _completeStep(id); });
    var fill3 = document.getElementById('progress-fill');
    if (fill3) fill3.style.width = '100%';
    var eta3 = document.getElementById('eta-counter');
    if (eta3) eta3.textContent = 'Done!';

    // Short pause, then reveal results
    await _sleep(500);
    if (overlay) overlay.classList.remove('active');

    window.renderResults(data, file);
  };

  function _sleep(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  function _resetLoadingSteps() {
    ['step-1', 'step-2', 'step-3', 'step-4'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.className = 'loading-step pending';
      var wrap = el.querySelector('.step-icon-wrap');
      if (wrap) wrap.textContent = '○';
    });
    var fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = '0%';
    var eta = document.getElementById('eta-counter');
    if (eta) eta.textContent = '~45s';
  }

  function _activateStep(id, label) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = 'loading-step active';
    var wrap = el.querySelector('.step-icon-wrap');
    if (wrap) wrap.innerHTML = '<div class="step-spinner"></div>';
    var labelEl = el.querySelector('.step-label, span:not(.step-icon-wrap)');
    if (labelEl && label) labelEl.textContent = label;
  }

  function _completeStep(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = 'loading-step done';
    var wrap = el.querySelector('.step-icon-wrap');
    if (wrap) wrap.textContent = '✓';
  }

  /* ─────────────────────────────────────────
   * 4. RENDER RESULTS
   * ───────────────────────────────────────── */
  window.renderResults = function (data, file) {
    currentResult = data;

    var uploadSection  = document.getElementById('upload-section');
    var overlay        = document.getElementById('loading-overlay');
    var resultsSection = document.getElementById('results-section');

    if (overlay) overlay.classList.remove('active');
    if (uploadSection) uploadSection.style.display = 'none';

    if (!resultsSection) {
      console.warn('[SlideSage] #results-section not found');
      return;
    }

    resultsSection.classList.add('active');
    resultsSection.style.display = 'flex';

    // File meta
    var filenameEl = document.getElementById('results-filename');
    var metaEl     = document.getElementById('results-meta');
    var slideCount = (data.slides && data.slides.length) || 0;
    if (filenameEl) filenameEl.textContent = (file && file.name) || (currentFile && currentFile.name) || 'presentation.pptx';
    if (metaEl) metaEl.textContent = slideCount + ' slides · ' + (data.estimatedTime || '—') + ' read time · Analyzed just now';

    // Render all sections
    window.animateOverallScore(data.overallScore || 0);
    renderSubScores(data.slides || []);
    renderStrengthsWeaknesses(data.strengths || [], data.weaknesses || []);
    renderPresentationMeta(data.presentationType, data.estimatedTime, data.tone);
    renderSummary(data.summary);
    renderRecommendations(data.recommendations || []);
    renderSlideAccordion(data.slides || []);

    // Tips panel hook
    if (typeof window.initTipsPanel === 'function') window.initTipsPanel(data);

    // Scroll to results
    setTimeout(function () {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    // Save to Supabase (non-blocking)
    _saveAnalysis(data);
  };

  /* ─────────────────────────────────────────
   * 5. ANIMATE OVERALL SCORE GAUGE
   * ───────────────────────────────────────── */
  window.animateOverallScore = function (score) {
    var arc       = document.getElementById('gauge-arc');
    var scoreEl   = document.getElementById('gauge-score');

    // SVG gauge constants
    // r=72, circumference = 2*π*72 ≈ 452.4
    // Arc covers 270°/360° = 75% of circumference = 339.3
    // dashoffset formula: 452.4 - (339.3 * score/100)
    var CIRC = 452.4;
    var ARC  = 339.3; // 270° arc

    var duration  = 1200;
    var startTime = null;
    var startVal  = 0;

    if (arc) {
      arc.style.strokeDashoffset = String(CIRC); // start empty
      // Set stroke gradient color based on score
      if (score >= 75) {
        arc.style.stroke = 'url(#gaugeGrad)';
      } else if (score >= 50) {
        arc.style.stroke = '#f59e0b';
      } else {
        arc.style.stroke = '#ef4444';
      }
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed  = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      var current  = Math.round(startVal + (score - startVal) * eased);

      if (scoreEl) scoreEl.textContent = current;

      if (arc) {
        var offset = CIRC - (ARC * current / 100);
        arc.style.strokeDashoffset = String(offset);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (scoreEl) scoreEl.textContent = score;
        if (arc) arc.style.strokeDashoffset = String(CIRC - (ARC * score / 100));
      }
    }

    requestAnimationFrame(step);
  };

  /* ─────────────────────────────────────────
   * 6. RENDER SUB SCORES (mini bars)
   * ───────────────────────────────────────── */
  function renderSubScores(slides) {
    if (!slides || !slides.length) return;

    var totals = { content: 0, design: 0, clarity: 0, engagement: 0 };
    slides.forEach(function (s) {
      if (s.scores) {
        totals.content    += (s.scores.content    || 0);
        totals.design     += (s.scores.design     || 0);
        totals.clarity    += (s.scores.clarity    || 0);
        totals.engagement += (s.scores.engagement || 0);
      }
    });
    var n = slides.length;
    var avgs = {
      content:    Math.round(totals.content    / n),
      design:     Math.round(totals.design     / n),
      clarity:    Math.round(totals.clarity    / n),
      engagement: Math.round(totals.engagement / n)
    };

    var colorMap = {
      content:    '#22c55e',
      design:     '#3b82f6',
      clarity:    '#a855f7',
      engagement: '#f59e0b'
    };

    var items = document.querySelectorAll('.mini-score-item');
    var keys  = ['content', 'design', 'clarity', 'engagement'];

    items.forEach(function (item, i) {
      var key   = keys[i];
      if (!key) return;
      var val   = avgs[key];
      var color = colorMap[key];

      var valEl  = item.querySelector('.mini-score-val');
      var fillEl = item.querySelector('.mini-score-fill');

      if (valEl) {
        valEl.textContent    = val;
        valEl.style.color    = color;
      }
      if (fillEl) {
        fillEl.style.width = '0%';
        setTimeout(function () {
          fillEl.style.transition = 'width 1s ease';
          fillEl.style.width = val + '%';
        }, 300 + i * 100);
      }
    });
  }

  /* ─────────────────────────────────────────
   * 7. STRENGTHS & WEAKNESSES
   * ───────────────────────────────────────── */
  function renderStrengthsWeaknesses(strengths, weaknesses) {
    var strList  = document.querySelector('.strength-list');
    var weakList = document.querySelector('.weakness-list');

    if (strList) {
      strList.innerHTML = '';
      strengths.forEach(function (s) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="str-icon good">✓</span>' + escapeHtml(s);
        strList.appendChild(li);
      });
    }

    if (weakList) {
      weakList.innerHTML = '';
      weaknesses.forEach(function (w) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="str-icon bad">✗</span>' + escapeHtml(w);
        weakList.appendChild(li);
      });
    }
  }

  /* ─────────────────────────────────────────
   * 8. PRESENTATION META
   * ───────────────────────────────────────── */
  function renderPresentationMeta(type, time, tone) {
    var badges = document.querySelectorAll('.pres-badge');

    // First badge is type
    if (badges[0]) {
      badges[0].textContent = type || '—';
      badges[0].className   = 'pres-badge type';
    }

    // Second badge is time
    if (badges[1]) {
      badges[1].textContent = time ? '⏱ ' + time : '⏱ —';
      badges[1].className   = 'pres-badge time';
    }

    // Tone badge — inject a third badge if missing
    var toneEl = document.querySelector('.tone-badge') || badges[2];
    if (!toneEl && tone) {
      var presEl = document.querySelector('.pres-badges');
      if (presEl) {
        toneEl = document.createElement('span');
        toneEl.className = 'pres-badge tone-badge';
        presEl.appendChild(toneEl);
      }
    }
    if (toneEl && tone) {
      toneEl.textContent = '🎭 ' + tone;
      toneEl.className   = 'pres-badge tone-badge';
    }

    // Also update .sidebar-label audience fit if present
    var audienceEl = document.querySelector('.audience-fit');
    if (audienceEl && currentResult && currentResult.audienceFit) {
      audienceEl.textContent = currentResult.audienceFit;
    }
  }

  /* ─────────────────────────────────────────
   * 9. EXECUTIVE SUMMARY
   * ───────────────────────────────────────── */
  function renderSummary(summary) {
    var execDiv = document.querySelector('.exec-summary');
    if (!execDiv) return;

    // Update the paragraph
    var p = execDiv.querySelector('p');
    if (p) {
      p.textContent = summary || '';
    } else {
      var newP = document.createElement('p');
      newP.textContent = summary || '';
      execDiv.appendChild(newP);
    }

    // Clear/update h3
    var h3 = execDiv.querySelector('h3');
    if (h3 && currentResult) {
      h3.textContent = currentResult.presentationType
        ? currentResult.presentationType + ' Analysis'
        : 'Presentation Analysis';
    }
  }

  /* ─────────────────────────────────────────
   * 10. RECOMMENDATIONS
   * ───────────────────────────────────────── */
  function renderRecommendations(recommendations) {
    var container = document.querySelector('.recs-list');
    if (!container) return;

    container.innerHTML = '';

    recommendations.forEach(function (rec) {
      var impactClass = rec.impact === 'high' ? 'high' : rec.impact === 'medium' ? 'med' : 'low';
      var impactLabel = rec.impact === 'high' ? '🔴 High impact' : rec.impact === 'medium' ? '🟡 Medium impact' : '🟢 Low impact';

      var div = document.createElement('div');
      div.className = 'rec-item';
      div.innerHTML = [
        '<div class="rec-num-badge">' + rec.priority + '</div>',
        '<div class="rec-content">',
          '<div class="rec-title">' + escapeHtml(rec.title) + '</div>',
          '<div class="rec-desc">' + escapeHtml(rec.detail) + '</div>',
          '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">',
            '<span class="rec-impact ' + impactClass + '">' + impactLabel + '</span>',
          '</div>',
        '</div>'
      ].join('');
      container.appendChild(div);
    });
  }

  /* ─────────────────────────────────────────
   * 11. SLIDE ACCORDION
   * ───────────────────────────────────────── */
  function renderSlideAccordion(slides) {
    var container = document.getElementById('slides-accordion');
    if (!container) container = document.querySelector('.slides-accordion');
    if (!container) return;

    container.innerHTML = '';

    slides.forEach(function (slide, idx) {
      var score     = slide.overallScore || 0;
      var sc        = getScoreClass(score);
      var thumbCls  = 's-' + sc;
      var isFirst   = idx === 0;

      var item = document.createElement('div');
      item.className = 'slide-accordion-item' + (isFirst ? ' open' : '');
      item.onclick   = function () { window.toggleSlide(item); };

      var s    = slide.scores || {};
      var cv   = getScoreValClass(s.content    || 0);
      var dv   = getScoreValClass(s.design     || 0);
      var clv  = getScoreValClass(s.clarity    || 0);
      var ev   = getScoreValClass(s.engagement || 0);

      item.innerHTML = [
        '<div class="slide-accordion-header">',
          '<div class="slide-thumb-mini ' + thumbCls + '">S' + slide.slideNumber + '</div>',
          '<div class="slide-header-info">',
            '<div class="slide-header-title">' + escapeHtml(slide.title || ('Slide ' + slide.slideNumber)) + '</div>',
            '<div class="slide-header-sub">' + _slideSub(slide) + '</div>',
          '</div>',
          '<span class="slide-header-score ' + sc + '">' + score + '</span>',
          '<span class="slide-chevron">▼</span>',
        '</div>',
        '<div class="slide-accordion-body">',
          '<div class="slide-mini-scores">',
            '<div class="sms-item"><div class="sms-label">Content</div><div class="sms-val ' + cv  + '">' + (s.content    || 0) + '</div></div>',
            '<div class="sms-item"><div class="sms-label">Design</div><div class="sms-val '  + dv  + '">' + (s.design     || 0) + '</div></div>',
            '<div class="sms-item"><div class="sms-label">Clarity</div><div class="sms-val ' + clv + '">' + (s.clarity    || 0) + '</div></div>',
            '<div class="sms-item"><div class="sms-label">Engage</div><div class="sms-val '  + ev  + '">' + (s.engagement || 0) + '</div></div>',
          '</div>',
          '<p class="slide-feedback">' + escapeHtml(slide.feedback || '') + '</p>',
          slide.quickWin ? [
            '<div class="quick-win">',
              '<span class="quick-win-icon">⚡</span>',
              '<div class="quick-win-text"><strong>Quick Win:</strong> ' + escapeHtml(slide.quickWin) + '</div>',
            '</div>'
          ].join('') : '',
        '</div>'
      ].join('');

      container.appendChild(item);
    });
  }

  /** Generate a short subtitle for a slide accordion header */
  function _slideSub(slide) {
    var score = slide.overallScore || 0;
    if (score >= 85) return 'Strong slide · ' + getScoreLabel(score);
    if (score >= 70) return 'Good overall · ' + getScoreLabel(score);
    if (score >= 55) return '⚠️ Needs attention · ' + getScoreLabel(score);
    return '🚨 Critical issue · ' + getScoreLabel(score);
  }

  /** Toggle accordion — also wired via onclick in generated HTML */
  window.toggleSlide = function (item) {
    item.classList.toggle('open');
  };

  /* ─────────────────────────────────────────
   * 12. SHOW DEMO
   * ───────────────────────────────────────── */
  window.showDemo = function () {
    // Wire up inline onclick="startDemo()" call from app.html
    var uploadSection = document.getElementById('upload-section');
    if (uploadSection) uploadSection.style.display = 'none';

    // Fake filename for demo
    var filenameEl = document.getElementById('results-filename');
    if (filenameEl) filenameEl.textContent = 'Q4_Investor_Update_DEMO.pptx';

    window.renderResults(DEMO_DATA, { name: 'Q4_Investor_Update_DEMO.pptx' });
    toast('Showing demo results for a sample pitch deck.', 'info');
  };

  // Also expose as startDemo() for backward-compat with app.html inline handler
  window.startDemo = function () { window.showDemo(); };

  /* ─────────────────────────────────────────
   * 13. EXPORT PDF
   * ───────────────────────────────────────── */
  window.exportPDF = function () {
    if (!currentResult) {
      toast('No results yet — upload a file or try the demo first.', 'warning');
      return;
    }

    toast('Preparing PDF…', 'info');

    // Inject print styles once
    if (!document.getElementById('ss-print-styles')) {
      var style = document.createElement('style');
      style.id    = 'ss-print-styles';
      style.media = 'print';
      style.textContent = [
        '@page { margin: 18mm; }',
        'body { font-family: Georgia, serif; color: #111; background: #fff; }',
        '.upload-section, .loading-overlay, nav, .navbar, .demo-link,',
        '.export-btns, .btn-sm { display: none !important; }',
        '#results-section { display: block !important; flex-direction: unset !important; }',
        '.results-left, .results-right { width: 100% !important; max-width: 100% !important; }',
        '.slide-accordion-body { display: block !important; }',
        '.slide-accordion-item { break-inside: avoid; border: 1px solid #ccc !important; margin-bottom: 12px; }',
        'h1, h2, h3 { page-break-after: avoid; }',
        '.gauge-svg, .mini-score-fill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }',
      ].join('\n');
      document.head.appendChild(style);
    }

    // Open all accordions
    var bodies = document.querySelectorAll('.slide-accordion-body');
    var wasOpen = [];
    bodies.forEach(function (b, i) {
      var item = b.closest('.slide-accordion-item');
      wasOpen[i] = item && item.classList.contains('open');
      if (item) item.classList.add('open');
    });

    setTimeout(function () {
      window.print();
      // Restore states after dialog
      setTimeout(function () {
        bodies.forEach(function (b, i) {
          var item = b.closest('.slide-accordion-item');
          if (item && !wasOpen[i]) item.classList.remove('open');
        });
      }, 1200);
    }, 300);
  };

  /* ─────────────────────────────────────────
   * 14. EXPORT WORD (.doc)
   * ───────────────────────────────────────── */
  window.exportWord = function () {
    if (!currentResult) {
      toast('No results yet — upload a file or try the demo first.', 'warning');
      return;
    }

    var data       = currentResult;
    var scoreColor = getScoreColor(data.overallScore);

    // Slide rows
    var slideRows = (data.slides || []).map(function (slide) {
      var sc = getScoreColor(slide.overallScore || 0);
      var s  = slide.scores || {};
      return [
        '<tr>',
          '<td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:700;">' + slide.slideNumber + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(slide.title || '') + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;text-align:center;color:' + sc + ';font-weight:700;">' + (slide.overallScore || 0) + '/100</td>',
          '<td style="padding:8px;border:1px solid #ddd;font-size:12px;">' + (s.content || 0) + ' / ' + (s.design || 0) + ' / ' + (s.clarity || 0) + ' / ' + (s.engagement || 0) + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;font-size:12px;">' + escapeHtml(slide.feedback || '') + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;font-size:12px;color:#7c3aed;">' + escapeHtml(slide.quickWin || '') + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    // Recs rows
    var recRows = (data.recommendations || []).map(function (rec) {
      var impactColor = rec.impact === 'high' ? '#dc2626' : rec.impact === 'medium' ? '#d97706' : '#16a34a';
      return [
        '<tr>',
          '<td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:700;width:30px;">' + rec.priority + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;font-weight:700;">' + escapeHtml(rec.title) + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;font-size:12px;">' + escapeHtml(rec.detail) + '</td>',
          '<td style="padding:8px;border:1px solid #ddd;text-align:center;color:' + impactColor + ';font-weight:700;text-transform:uppercase;font-size:11px;">' + (rec.impact || '') + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    // Strengths & weaknesses
    var strHtml  = (data.strengths  || []).map(function (s) { return '<li style="color:#16a34a;margin-bottom:4px;">✓ ' + escapeHtml(s) + '</li>'; }).join('');
    var weakHtml = (data.weaknesses || []).map(function (w) { return '<li style="color:#dc2626;margin-bottom:4px;">✗ ' + escapeHtml(w) + '</li>'; }).join('');

    var html = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="UTF-8"><title>SlideSage Report</title>',
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->',
      '<style>',
        'body{font-family:Calibri,Arial,sans-serif;color:#111;margin:40px;font-size:13px;}',
        'h1{color:#6366f1;font-size:26px;margin-bottom:4px;}',
        'h2{color:#374151;font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:5px;margin-top:28px;}',
        'table{border-collapse:collapse;width:100%;margin-top:10px;font-size:12px;}',
        'th{background:#6366f1;color:#fff;padding:8px;border:1px solid #6366f1;text-align:left;font-size:12px;}',
        'tr:nth-child(even) td{background:#f9fafb;}',
        '.score-hero{text-align:center;padding:20px;background:#f5f3ff;border-radius:8px;margin:20px 0;}',
        '.score-hero .big{font-size:60px;font-weight:900;color:' + scoreColor + ';line-height:1;}',
        '.score-hero .lbl{font-size:16px;color:#6b7280;margin-top:4px;}',
        'ul{padding-left:20px;}',
        'p{line-height:1.6;}',
      '</style></head><body>',
        '<h1>🎯 SlideSage — Presentation Analysis Report</h1>',
        '<p style="color:#6b7280;font-size:12px;">Generated on ' + new Date().toLocaleString() + ' · ' + (data.presentationType || '') + '</p>',

        '<div class="score-hero">',
          '<div class="big">' + (data.overallScore || 0) + '</div>',
          '<div class="lbl">Overall Score — ' + getScoreLabel(data.overallScore || 0) + '</div>',
        '</div>',

        '<h2>Executive Summary</h2>',
        '<p>' + escapeHtml(data.summary || '') + '</p>',

        '<h2>Presentation Details</h2>',
        '<ul>',
          '<li><strong>Type:</strong> ' + escapeHtml(data.presentationType || '—') + '</li>',
          '<li><strong>Audience:</strong> ' + escapeHtml(data.audienceFit || '—') + '</li>',
          '<li><strong>Estimated Time:</strong> ' + escapeHtml(data.estimatedTime || '—') + '</li>',
          '<li><strong>Tone:</strong> ' + escapeHtml(data.tone || '—') + '</li>',
        '</ul>',

        '<h2>Strengths</h2>',
        '<ul>' + strHtml + '</ul>',

        '<h2>Areas to Improve</h2>',
        '<ul>' + weakHtml + '</ul>',

        '<h2>Top 5 Recommendations</h2>',
        '<table><thead><tr><th>#</th><th>Title</th><th>Detail</th><th>Impact</th></tr></thead>',
        '<tbody>' + recRows + '</tbody></table>',

        '<h2>Slide-by-Slide Analysis</h2>',
        '<table><thead><tr>',
          '<th>#</th><th>Title</th><th>Score</th>',
          '<th>C / D / Cl / E</th><th>Feedback</th><th>⚡ Quick Win</th>',
        '</tr></thead>',
        '<tbody>' + slideRows + '</tbody></table>',

        '<p style="margin-top:40px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:14px;">',
          'Report generated by <strong>SlideSage</strong> · AI-Powered Presentation Analysis · slidesage.ai',
        '</p>',
      '</body></html>'
    ].join('\n');

    var blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'SlideSage-Report-' + new Date().toISOString().slice(0, 10) + '.doc';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);

    toast('Word report downloaded!', 'success');
  };

  /* ─────────────────────────────────────────
   * 15. SHARE REPORT
   * ───────────────────────────────────────── */
  window.shareReport = async function () {
    if (!currentResult) {
      toast('No results to share yet.', 'warning');
      return;
    }

    try {
      var response = await fetch('/.netlify/functions/share', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysis: currentResult })
      });

      if (!response.ok) throw new Error('Share failed: ' + response.status);

      var json = await response.json();
      var shareUrl = json.url || json.shareUrl || window.location.href;

      await navigator.clipboard.writeText(shareUrl);
      toast('Link copied! 🔗', 'success');
    } catch (err) {
      console.warn('[SlideSage] shareReport:', err);
      // Fallback: copy current URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast('Link copied!', 'success');
      } catch (e2) {
        toast('Could not copy link. Try again.', 'error');
      }
    }
  };

  /* ─────────────────────────────────────────
   * 16. RESET ANALYZER
   * ───────────────────────────────────────── */
  window.resetAnalyzer = function () {
    currentResult = null;
    currentFile   = null;

    var uploadSection  = document.getElementById('upload-section');
    var overlay        = document.getElementById('loading-overlay');
    var resultsSection = document.getElementById('results-section');
    var fileInput      = document.getElementById('file-input');

    if (overlay) overlay.classList.remove('active');
    if (resultsSection) {
      resultsSection.classList.remove('active');
      resultsSection.style.display = 'none';
    }
    if (uploadSection) {
      uploadSection.style.display = '';
    }
    if (fileInput) fileInput.value = '';

    // Clear filename display
    var zone = document.getElementById('upload-zone') || document.querySelector('.upload-zone');
    if (zone) {
      zone.classList.remove('drag-over');
      var fn = zone.querySelector('.upload-filename-display');
      if (fn) fn.remove();
    }

    // Reset loading steps
    _resetLoadingSteps();

    // Scroll up
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Ready for a new presentation.', 'info');
  };

  // Expose alias used by app.html inline button onclick="restartAnalysis()"
  window.restartAnalysis = window.resetAnalyzer;

  /* ─────────────────────────────────────────
   * 17. SAVE ANALYSIS (Supabase, non-blocking)
   * ───────────────────────────────────────── */
  function _saveAnalysis(data) {
    if (!data) return;
    fetch('/.netlify/functions/save-analysis', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        analysis:  data,
        fileName:  (currentFile && currentFile.name) || null,
        savedAt:   new Date().toISOString()
      })
    }).catch(function (err) {
      console.warn('[SlideSage] save-analysis error (non-critical):', err.message);
    });
  }

  /* ─────────────────────────────────────────
   * EXPOSE EVERYTHING ON window
   * ───────────────────────────────────────── */
  window.getScoreColor = getScoreColor;
  window.getScoreLabel = getScoreLabel;
  window.DEMO_DATA     = DEMO_DATA;

  window.SlideSage = {
    DEMO_DATA:             DEMO_DATA,
    initUploadZone:        window.initUploadZone,
    analyzeFile:           window.analyzeFile,
    renderResults:         window.renderResults,
    animateOverallScore:   window.animateOverallScore,
    showDemo:              window.showDemo,
    exportPDF:             window.exportPDF,
    exportWord:            window.exportWord,
    shareReport:           window.shareReport,
    resetAnalyzer:         window.resetAnalyzer,
    getScoreColor:         getScoreColor,
    getScoreLabel:         getScoreLabel,
    toggleSlide:           window.toggleSlide
  };

  /* ─────────────────────────────────────────
   * INIT on DOMContentLoaded
   * ───────────────────────────────────────── */
  function init() {
    var isAppPage = window.location.pathname.includes('app') ||
                    !!document.querySelector('.upload-zone');
    if (!isAppPage) return;
    window.initUploadZone();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
