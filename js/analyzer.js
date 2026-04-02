/* ============================================================
   SlideSage — analyzer.js
   Upload handling, drag-drop, demo mode, API call, results
   ============================================================ */

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL = 'https://dppjohfplbznhggdemeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGpvaGZwbGJ6bmhnZ2RlbWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzMwODYsImV4cCI6MjA5MDIwOTA4Nn0.05a8RlPvNlpDgarsjvvFDoPBUKDCOPUwMqquVoBH63o';

// ── Demo Data ─────────────────────────────────────────────
const DEMO_RESULTS = {
  overallScore: 78,
  summary: "Your presentation demonstrates strong content and clear messaging, with well-structured slides that effectively communicate the main points. The visual hierarchy is mostly consistent, though a few slides could benefit from less text density. Overall, this is a compelling deck with minor areas for improvement in visual balance and call-to-action clarity.",
  slides: [
    {
      slideNumber: 1,
      title: "Opening: The Problem We Solve",
      score: 88,
      feedback: "Strong opening slide with a clear problem statement. The headline is punchy and immediately engages the audience. Consider adding a single striking statistic to reinforce the urgency of the problem."
    },
    {
      slideNumber: 2,
      title: "Market Opportunity",
      score: 72,
      feedback: "Good data presented, but the slide feels text-heavy. The $47B market size could be visualized as a chart or infographic instead of bullet points. Reduce text by 40% and let the numbers speak."
    },
    {
      slideNumber: 3,
      title: "Our Solution",
      score: 85,
      feedback: "Excellent solution articulation. The three-step process is clear and visually distinct. The product screenshot adds credibility. Ensure the CTA at the bottom is more prominent — currently it blends with the background."
    },
    {
      slideNumber: 4,
      title: "How It Works",
      score: 91,
      feedback: "Outstanding slide! Clean flow, minimal text, strong icons. This is one of the most effective slides in the deck. The step-by-step layout makes the process immediately understandable. No major changes needed."
    },
    {
      slideNumber: 5,
      title: "Traction & Social Proof",
      score: 65,
      feedback: "The metrics shown are impressive but buried in small font. Lead with your biggest win in large typography. Consider adding 1-2 short customer quotes. The chart on the right needs a clearer title and axis labels."
    },
    {
      slideNumber: 6,
      title: "Business Model",
      score: 70,
      feedback: "Clear pricing tiers but the revenue model explanation is confusing. Simplify to 'Free / Pro / Enterprise' with one-line descriptions. Remove the detailed calculation table — save it for the appendix or investor Q&A."
    },
    {
      slideNumber: 7,
      title: "Team",
      score: 82,
      feedback: "Strong team slide with relevant backgrounds highlighted. Profile photos add a human touch. Add LinkedIn URLs as tiny icons under each name. The 'advisors' section could be moved to a separate slide or the appendix to avoid diluting the core team focus."
    },
    {
      slideNumber: 8,
      title: "The Ask",
      score: 76,
      feedback: "The funding ask is clear but the use-of-funds breakdown lacks visual impact. Convert the bullet list to a pie chart or horizontal bar chart. Be specific about milestones that will be achieved with this round — investors want to see a clear path to the next milestone."
    }
  ],
  recommendations: [
    "Reduce text density on slides 2, 5, and 6 by at least 40%. Audiences retain 65% more information when text is paired with relevant visuals instead of presented as bullet points.",
    "Increase the visual hierarchy of your CTAs. Your call-to-action elements on slides 3 and 8 should be 20% larger and in a contrasting color to draw the eye naturally.",
    "Add consistent data visualization throughout. Slides with charts or infographics have 3x higher engagement in investor presentations. Convert your key metrics to visual formats."
  ]
};

// ── State ─────────────────────────────────────────────────
let selectedFile = null;
let isAnalyzing = false;
let analysisSessionId = generateSessionId();

// ── DOM Refs ──────────────────────────────────────────────
let uploadZone, fileInput, uploadSection, loadingSection, resultsSection, errorSection;

document.addEventListener('DOMContentLoaded', () => {
  uploadZone = document.getElementById('uploadZone');
  fileInput = document.getElementById('fileInput');
  uploadSection = document.getElementById('uploadSection');
  loadingSection = document.getElementById('loadingSection');
  resultsSection = document.getElementById('resultsSection');
  errorSection = document.getElementById('errorSection');

  if (!uploadZone) return; // Not on app page

  initDragDrop();
  initFileInput();
  initAnalyzeButton();
  initDemoButton();
  initExportButtons();

  // Check if demo mode from URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true') {
    setTimeout(() => triggerDemo(), 300);
  }
});

// ── Session ID ────────────────────────────────────────────
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// ── Drag & Drop ───────────────────────────────────────────
function initDragDrop() {
  uploadZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', (e) => {
    if (!uploadZone.contains(e.relatedTarget)) {
      uploadZone.classList.remove('drag-over');
    }
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });
  uploadZone.addEventListener('click', (e) => {
    if (!e.target.closest('.upload-selected')) {
      fileInput.click();
    }
  });
}

function initFileInput() {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelect(e.target.files[0]);
  });
}

function handleFileSelect(file) {
  if (!file.name.endsWith('.pptx')) {
    showToast('Please upload a .pptx file only.', 'error');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    showToast('File too large. Maximum size is 50MB.', 'error');
    return;
  }

  selectedFile = file;
  showSelectedFile(file);
}

function showSelectedFile(file) {
  const existing = uploadZone.querySelector('.upload-selected');
  if (existing) existing.remove();

  const selected = document.createElement('div');
  selected.className = 'upload-selected';
  selected.innerHTML = `
    <span class="file-icon">📊</span>
    <span class="file-name">${escapeHtml(file.name)}</span>
    <span class="file-size" style="color:var(--color-muted);font-size:0.8125rem">${formatFileSize(file.size)}</span>
    <button class="file-remove" title="Remove file" onclick="removeFile(event)">✕</button>
  `;
  uploadZone.appendChild(selected);

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '✨ Analyze Presentation';
  }
}

window.removeFile = function(e) {
  e.stopPropagation();
  selectedFile = null;
  const selected = uploadZone.querySelector('.upload-selected');
  if (selected) selected.remove();
  fileInput.value = '';
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Upload a file first';
  }
};

// ── Analyze Button ────────────────────────────────────────
function initAnalyzeButton() {
  const btn = document.getElementById('analyzeBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (selectedFile && !isAnalyzing) {
      startAnalysis(selectedFile);
    }
  });
}

// ── Demo Button ───────────────────────────────────────────
function initDemoButton() {
  document.querySelectorAll('[data-demo-trigger]').forEach(btn => {
    btn.addEventListener('click', triggerDemo);
  });
}

function triggerDemo() {
  showLoadingState('demo-presentation.pptx');
  simulateProgress(() => {
    showResults(DEMO_RESULTS, 'demo-presentation.pptx');
  });
}

// ── Analysis Flow ─────────────────────────────────────────
async function startAnalysis(file) {
  if (isAnalyzing) return;
  isAnalyzing = true;
  showLoadingState(file.name);

  try {
    // Extract filename for logging
    const fileName = file.name;

    // TODO: In production, implement actual PPTX text extraction here
    // using a library like pptx2json, officegen, or similar client-side parser.
    // For now, we send metadata to the Netlify function.
    const mockSlides = generateMockSlideData(fileName);

    // ── TODO: Replace this block with real PPTX parsing ──────────
    // import { parsePPTX } from './pptx-parser.js';
    // const slideData = await parsePPTX(file);
    // ─────────────────────────────────────────────────────────────

    updateLoadingStep(1);
    await delay(600);
    updateLoadingStep(2);

    // Call Netlify function
    const response = await fetch('/.netlify/functions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slides: mockSlides,
        language: 'en',
        fileName: fileName,
        sessionId: analysisSessionId
      })
    });

    updateLoadingStep(3);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Analysis failed (${response.status})`);
    }

    const results = await response.json();
    await delay(400);

    // Save to Supabase
    await saveAnalysis(fileName, mockSlides.length, results);

    showResults(results, fileName);
    showToast('Analysis complete! 🎉', 'success');

  } catch (err) {
    console.error('Analysis error:', err);
    showErrorState(err.message);
  } finally {
    isAnalyzing = false;
  }
}

function generateMockSlideData(fileName) {
  // Placeholder slide data until real PPTX parsing is implemented
  return Array.from({ length: 8 }, (_, i) => ({
    slideNumber: i + 1,
    title: `Slide ${i + 1}`,
    textContent: `Content from slide ${i + 1} of ${fileName}`,
    speakerNotes: ''
  }));
}

// ── TODO: Real API Call ───────────────────────────────────
// This function will be called by startAnalysis() once PPTX parsing
// is implemented. The Netlify function at /.netlify/functions/analyze
// accepts { slides: [...], language: string } and returns analysis.
//
// async function callAnalyzeAPI(slides, language = 'en') {
//   const res = await fetch('/.netlify/functions/analyze', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ slides, language })
//   });
//   if (!res.ok) throw new Error('API call failed');
//   return res.json();
// }

// ── Save to Supabase ──────────────────────────────────────
async function saveAnalysis(fileName, slideCount, results) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_session: analysisSessionId,
        file_name: fileName,
        slide_count: slideCount,
        overall_score: results.overallScore,
        report_json: results,
        created_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('Failed to save analysis:', err);
    // Non-critical — don't throw
  }
}

// ── Loading State ─────────────────────────────────────────
function showLoadingState(fileName) {
  uploadSection.style.display = 'none';
  loadingSection.style.display = 'block';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'none';

  const steps = loadingSection.querySelectorAll('.loading-step');
  steps.forEach(s => { s.className = 'loading-step'; });
  if (steps[0]) steps[0].classList.add('active');

  const nameEl = loadingSection.querySelector('.loading-filename');
  if (nameEl) nameEl.textContent = fileName;
}

function updateLoadingStep(stepIndex) {
  const steps = document.querySelectorAll('.loading-step');
  steps.forEach((s, i) => {
    if (i < stepIndex) s.classList.add('done');
    else if (i === stepIndex) s.classList.add('active');
    else s.classList.remove('active', 'done');
  });
}

function simulateProgress(callback) {
  updateLoadingStep(0);
  setTimeout(() => updateLoadingStep(1), 800);
  setTimeout(() => updateLoadingStep(2), 1600);
  setTimeout(() => { updateLoadingStep(3); callback(); }, 2400);
}

// ── Results ───────────────────────────────────────────────
function showResults(data, fileName) {
  uploadSection.style.display = 'none';
  loadingSection.style.display = 'none';
  errorSection.style.display = 'none';
  resultsSection.style.display = 'block';

  // Score
  renderScore(data.overallScore);

  // Summary
  const summaryEl = document.getElementById('summaryText');
  if (summaryEl) summaryEl.textContent = data.summary;

  // Slides
  renderSlides(data.slides);

  // Recommendations
  renderRecommendations(data.recommendations);

  // Store for export
  window._currentResults = { data, fileName };

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderScore(score) {
  const fill = document.querySelector('.score-fill');
  const number = document.querySelector('.score-number');
  if (!fill || !number) return;

  const circumference = 408;
  const offset = circumference - (score / 100) * circumference;

  // Set color class
  fill.className = 'score-fill';
  if (score >= 80) fill.classList.add('score-high');
  else if (score >= 60) fill.classList.add('score-mid');
  else if (score >= 40) fill.classList.add('score-low');
  else fill.classList.add('score-poor');

  // Animate
  setTimeout(() => {
    fill.style.strokeDashoffset = offset;
    animateNumber(number, 0, score, 1200);
  }, 200);
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function update(time) {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderSlides(slides) {
  const container = document.getElementById('slidesAccordion');
  if (!container) return;

  container.innerHTML = slides.map(slide => {
    const badgeClass = slide.score >= 80 ? 'green' : slide.score >= 60 ? 'yellow' : 'red';
    return `
      <div class="accordion-item">
        <button class="accordion-trigger" onclick="toggleAccordion(this)">
          <span class="slide-number">Slide ${slide.slideNumber}</span>
          <span class="slide-title">${escapeHtml(slide.title)}</span>
          <span class="score-badge ${badgeClass}">${slide.score}/100</span>
          <span class="accordion-arrow">▼</span>
        </button>
        <div class="accordion-content">
          <p>${escapeHtml(slide.feedback)}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecommendations(recs) {
  const container = document.getElementById('recommendationsList');
  if (!container) return;

  container.innerHTML = recs.map((rec, i) => `
    <div class="recommendation-item">
      <div class="rec-number">${i + 1}</div>
      <p class="rec-text">${escapeHtml(rec)}</p>
    </div>
  `).join('');
}

window.toggleAccordion = function(trigger) {
  const content = trigger.nextElementSibling;
  const isOpen = trigger.classList.contains('open');
  trigger.classList.toggle('open', !isOpen);
  content.classList.toggle('open', !isOpen);
};

// ── Error State ───────────────────────────────────────────
function showErrorState(message) {
  uploadSection.style.display = 'none';
  loadingSection.style.display = 'none';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'block';

  const msgEl = errorSection.querySelector('.error-message');
  if (msgEl) msgEl.textContent = message || 'An unexpected error occurred.';
}

// ── Reset ─────────────────────────────────────────────────
window.resetAnalyzer = function() {
  selectedFile = null;
  isAnalyzing = false;
  fileInput.value = '';

  uploadSection.style.display = 'block';
  loadingSection.style.display = 'none';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'none';

  const selected = uploadZone.querySelector('.upload-selected');
  if (selected) selected.remove();

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Upload a file first';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ── Export ────────────────────────────────────────────────
function initExportButtons() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('#exportPDF') || e.target.closest('#exportPDF')) {
      exportReport('pdf');
    }
    if (e.target.matches('#exportWord') || e.target.closest('#exportWord')) {
      exportReport('word');
    }
  });
}

function exportReport(format) {
  const results = window._currentResults;
  if (!results) return;

  // TODO: In production, use a PDF library (jsPDF) or Word library (docx)
  // For now, generate a plain text report and trigger download
  const { data, fileName } = results;
  const content = generateTextReport(data, fileName);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SlideSage-Report-${fileName.replace('.pptx', '')}.${format === 'pdf' ? 'txt' : 'txt'}`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Downloading ${format.toUpperCase()} report...`, 'info');
}

function generateTextReport(data, fileName) {
  const lines = [
    '═══════════════════════════════════════',
    '         SLIDESAGE ANALYSIS REPORT',
    '═══════════════════════════════════════',
    `File: ${fileName}`,
    `Date: ${new Date().toLocaleDateString()}`,
    `Overall Score: ${data.overallScore}/100`,
    '',
    'EXECUTIVE SUMMARY',
    '─────────────────',
    data.summary,
    '',
    'SLIDE-BY-SLIDE ANALYSIS',
    '──────────────────────',
    ...data.slides.map(s => [
      `Slide ${s.slideNumber}: ${s.title} (Score: ${s.score}/100)`,
      s.feedback,
      ''
    ].join('\n')),
    'TOP RECOMMENDATIONS',
    '──────────────────',
    ...data.recommendations.map((r, i) => `${i + 1}. ${r}`),
    '',
    '═══════════════════════════════════════',
    'Generated by SlideSage — slidesage.app',
    '═══════════════════════════════════════'
  ];
  return lines.join('\n');
}

// ── Utilities ─────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
