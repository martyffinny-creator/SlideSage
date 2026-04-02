/**
 * SlideSage — Premium Dark Glassmorphism UI
 * app.js — Main JavaScript bundle
 * Production-ready · No dependencies · ES2020+
 */

'use strict';

/* ============================================================
   1. NAVBAR
   ============================================================ */
function initNavbar() {
  const navbar  = document.querySelector('.navbar') || document.querySelector('nav');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!navbar) return;

  // --- Scroll behaviour ---
  const onScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on init

  // --- Hamburger toggle ---
  if (hamburger && mobileMenu) {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', 'mobile-menu');

    const openMenu = () => {
      mobileMenu.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (mobileMenu.classList.contains('open') &&
          !mobileMenu.contains(e.target) &&
          !hamburger.contains(e.target)) {
        closeMenu();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMenu();
        hamburger.focus();
      }
    });

    // Close menu when a mobile nav link is clicked
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
  }

  // --- Active nav link highlighting ---
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const navLinks = document.querySelectorAll('.nav-link, .navbar a, #mobile-menu a');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const linkPath = href.replace(/\/$/, '') || '/';

    // Exact match or index fallback
    if (
      linkPath === currentPath ||
      (currentPath === '' && linkPath === '/index.html') ||
      (linkPath !== '/' && currentPath.endsWith(linkPath))
    ) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ============================================================
   2. SCROLL ANIMATIONS (IntersectionObserver)
   ============================================================ */
function initScrollAnimations() {
  const targets = document.querySelectorAll('.fade-in, .slide-up');

  if (!targets.length) return;

  // Graceful fallback if IntersectionObserver is not supported
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // once is enough
        }
      });
    },
    { threshold: 0.1 }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ============================================================
   3. MARQUEE PAUSE ON HOVER
   ============================================================ */
function initMarquee() {
  const tracks = document.querySelectorAll('.marquee-track');

  tracks.forEach((track) => {
    track.addEventListener('mouseenter', () => {
      track.style.animationPlayState = 'paused';
    });
    track.addEventListener('mouseleave', () => {
      track.style.animationPlayState = 'running';
    });
    // Touch support
    track.addEventListener('touchstart', () => {
      track.style.animationPlayState = 'paused';
    }, { passive: true });
    track.addEventListener('touchend', () => {
      track.style.animationPlayState = 'running';
    }, { passive: true });
  });
}

/* ============================================================
   4. SMOOTH SCROLL (anchor links with navbar offset)
   ============================================================ */
function initSmoothScroll() {
  const NAVBAR_OFFSET = 80;

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();

      const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;

      window.scrollTo({ top, behavior: 'smooth' });

      // Update URL hash without jumping
      if (history.pushState) {
        history.pushState(null, '', id);
      }
    });
  });
}

/* ============================================================
   5. TOAST SYSTEM
   ============================================================ */
function getOrCreateToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Notifications');
    // Inline critical positioning styles so it works without a stylesheet
    Object.assign(container.style, {
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
      maxWidth: '360px',
      width: 'calc(100vw - 48px)',
    });
    document.body.appendChild(container);
  }
  return container;
}

window.showToast = function showToast(message, type = 'info', duration = 4000) {
  const container = getOrCreateToastContainer();

  const icons = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
  };

  const colors = {
    success: '#22c55e',
    error:   '#ef4444',
    warning: '#f59e0b',
    info:    '#6366f1',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  Object.assign(toast.style, {
    display:         'flex',
    alignItems:      'center',
    gap:             '10px',
    padding:         '14px 16px',
    borderRadius:    '12px',
    background:      'rgba(15, 15, 30, 0.92)',
    backdropFilter:  'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border:          `1px solid ${colors[type] || colors.info}40`,
    color:           '#f0f0ff',
    fontSize:        '14px',
    fontFamily:      'inherit',
    boxShadow:       '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents:   'all',
    cursor:          'default',
    transform:       'translateX(120%)',
    transition:      'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
    opacity:         '0',
    minWidth:        '0',
    wordBreak:       'break-word',
  });

  const iconEl = document.createElement('span');
  iconEl.textContent = icons[type] || icons.info;
  Object.assign(iconEl.style, {
    flexShrink:   '0',
    width:        '20px',
    height:       '20px',
    borderRadius: '50%',
    background:   colors[type] || colors.info,
    color:        '#fff',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     '11px',
    fontWeight:   '700',
    lineHeight:   '1',
  });

  const msgEl = document.createElement('span');
  msgEl.textContent = message;
  msgEl.style.flex = '1';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  Object.assign(closeBtn.style, {
    background:  'none',
    border:      'none',
    color:       'rgba(255,255,255,0.5)',
    fontSize:    '18px',
    lineHeight:  '1',
    cursor:      'pointer',
    padding:     '0 2px',
    flexShrink:  '0',
    transition:  'color 0.2s',
  });
  closeBtn.addEventListener('mouseover',  () => { closeBtn.style.color = '#fff'; });
  closeBtn.addEventListener('mouseout',   () => { closeBtn.style.color = 'rgba(255,255,255,0.5)'; });

  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity   = '1';
    });
  });

  const dismiss = () => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity   = '0';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  closeBtn.addEventListener('click', dismiss);

  if (duration > 0) {
    const timer = setTimeout(dismiss, duration);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => setTimeout(dismiss, 1500));
  }

  return { dismiss };
};

/* ============================================================
   6. NEWSLETTER FORM HANDLER
   ============================================================ */
function initForms() {
  const forms = document.querySelectorAll('.newsletter-form, #newsletter-form');

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"], input[name="email"]');
      const submitBtn  = form.querySelector('button[type="submit"], .btn-submit, button');

      if (!emailInput) return;

      const email = emailInput.value.trim();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        window.showToast('Please enter a valid email address.', 'warning');
        emailInput.focus();
        return;
      }

      // Loading state
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" aria-hidden="true" style="
          display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);
          border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;
          vertical-align:middle;margin-right:6px;
        "></span>Subscribing…`;
      }

      // Ensure spinner animation keyframes exist
      if (!document.getElementById('ss-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'ss-spinner-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      try {
        const response = await fetch('/.netlify/functions/newsletter', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          window.showToast("You're in! 🎉", 'success');
          form.reset();
        } else if (data.message && /already subscribed/i.test(data.message)) {
          window.showToast("You're already on the list! 💌", 'info');
        } else {
          window.showToast('Something went wrong. Try again.', 'error');
        }
      } catch (err) {
        console.error('[SlideSage] Newsletter submission error:', err);
        window.showToast('Something went wrong. Try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled  = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  });
}

/* ============================================================
   7. FAQ / ACCORDION
   ============================================================ */
function initAccordions() {
  const items = document.querySelectorAll('.accordion-item');
  if (!items.length) return;

  items.forEach((item) => {
    const header = item.querySelector('.accordion-header');
    const body   = item.querySelector('.accordion-body');

    if (!header || !body) return;

    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');

    const toggle = () => {
      const isOpen  = item.classList.contains('open');
      const group   = item.dataset.group;

      // Close siblings in the same group
      if (group) {
        document.querySelectorAll(`.accordion-item[data-group="${group}"]`).forEach((sibling) => {
          if (sibling !== item && sibling.classList.contains('open')) {
            sibling.classList.remove('open');
            const sibBody = sibling.querySelector('.accordion-body');
            const sibHeader = sibling.querySelector('.accordion-header');
            if (sibBody)   sibBody.style.maxHeight = '0';
            if (sibHeader) sibHeader.setAttribute('aria-expanded', 'false');
          }
        });
      } else {
        // Default: close all other accordion items on the page
        items.forEach((sibling) => {
          if (sibling !== item && sibling.classList.contains('open')) {
            sibling.classList.remove('open');
            const sibBody = sibling.querySelector('.accordion-body');
            const sibHeader = sibling.querySelector('.accordion-header');
            if (sibBody)   sibBody.style.maxHeight = '0';
            if (sibHeader) sibHeader.setAttribute('aria-expanded', 'false');
          }
        });
      }

      if (isOpen) {
        item.classList.remove('open');
        body.style.maxHeight = '0';
        header.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        header.setAttribute('aria-expanded', 'true');
      }
    };

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    // Initial state
    body.style.maxHeight = '0';
    body.style.overflow  = 'hidden';
    body.style.transition = 'max-height 0.35s ease';
  });
}

/* ============================================================
   8. PRICING TOGGLE (monthly / annual)
   ============================================================ */
function initPricingToggle() {
  const toggle = document.getElementById('billing-toggle');
  if (!toggle) return;

  const monthlyEls = document.querySelectorAll('[data-monthly]');
  const annualEls  = document.querySelectorAll('[data-annual]');
  const monthlyBtn = document.querySelector('[data-billing="monthly"]');
  const annualBtn  = document.querySelector('[data-billing="annual"]');

  const FADE_MS = 200;

  const fadeAndSwap = (hideEls, showEls) => {
    hideEls.forEach((el) => {
      el.style.transition = `opacity ${FADE_MS}ms ease`;
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, FADE_MS);
    });
    showEls.forEach((el) => {
      setTimeout(() => {
        el.style.display = '';
        requestAnimationFrame(() => {
          el.style.transition = `opacity ${FADE_MS}ms ease`;
          el.style.opacity = '1';
        });
      }, FADE_MS);
    });
  };

  const setMonthly = () => {
    fadeAndSwap(annualEls, monthlyEls);
    monthlyBtn?.classList.add('active');
    annualBtn?.classList.remove('active');
    toggle.checked = false;
  };

  const setAnnual = () => {
    fadeAndSwap(monthlyEls, annualEls);
    annualBtn?.classList.add('active');
    monthlyBtn?.classList.remove('active');
    toggle.checked = true;
  };

  toggle.addEventListener('change', () => {
    toggle.checked ? setAnnual() : setMonthly();
  });

  monthlyBtn?.addEventListener('click', setMonthly);
  annualBtn?.addEventListener('click', setAnnual);

  // Init default state
  setMonthly();
}

/* ============================================================
   9. BLOG CATEGORY FILTER
   ============================================================ */
function initBlogFilter() {
  const filterBtns = document.querySelectorAll('[data-category]');
  const blogCards  = document.querySelectorAll('.blog-card');

  if (!filterBtns.length || !blogCards.length) return;

  const ANIM_MS = 250;

  const filter = (category) => {
    filterBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    blogCards.forEach((card) => {
      const cardCat = card.dataset.category || '';
      const show = category === 'all' || cardCat === category;

      if (show) {
        card.style.transition = `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`;
        card.style.display = '';
        requestAnimationFrame(() => {
          card.style.opacity   = '1';
          card.style.transform = 'translateY(0)';
        });
      } else {
        card.style.transition = `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`;
        card.style.opacity   = '0';
        card.style.transform = 'translateY(8px)';
        setTimeout(() => {
          if (card.style.opacity === '0') card.style.display = 'none';
        }, ANIM_MS);
      }
    });
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => filter(btn.dataset.category));
  });

  // Set initial active
  const initialActive = document.querySelector('[data-category].active');
  filter(initialActive ? initialActive.dataset.category : 'all');
}

/* ============================================================
   10. USE CASES TAB SWITCHER
   ============================================================ */
function initTabSwitcher() {
  const tabBtns   = document.querySelectorAll('[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-panel, [role="tabpanel"]');

  if (!tabBtns.length) return;

  const switchTab = (targetId) => {
    tabBtns.forEach((btn) => {
      const isActive = btn.dataset.tab === targetId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    // Try matching panels by id or data-tab-panel
    tabPanels.forEach((panel) => {
      const panelId = panel.id || panel.dataset.tabPanel;
      const isActive = panelId === targetId;

      if (isActive) {
        panel.style.opacity   = '0';
        panel.style.display   = '';
        panel.removeAttribute('hidden');
        requestAnimationFrame(() => {
          panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          panel.style.opacity   = '1';
          panel.style.transform = 'translateY(0)';
        });
      } else {
        panel.style.opacity = '0';
        setTimeout(() => {
          panel.style.display = 'none';
          panel.setAttribute('hidden', '');
        }, 300);
      }
    });
  };

  tabBtns.forEach((btn) => {
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchTab(btn.dataset.tab);
      }
    });
  });

  // Activate first tab by default
  const firstActive = document.querySelector('[data-tab].active') || tabBtns[0];
  if (firstActive) switchTab(firstActive.dataset.tab);
}

/* ============================================================
   11. STATS COUNTER ANIMATION
   ============================================================ */
function initStatsCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const DURATION = 1500;

  const formatNumber = (n) =>
    Math.floor(n).toLocaleString('en-US');

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const raw     = el.dataset.count;
    const hasSuffix = raw.endsWith('+');
    const target  = parseFloat(raw.replace(/[^0-9.]/g, ''));
    const suffix  = hasSuffix ? '+' : '';

    let start = null;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed  = timestamp - start;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased    = easeOut(progress);
      const current  = eased * target;

      el.textContent = formatNumber(current) + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatNumber(target) + suffix;
      }
    };

    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animateCounter);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ============================================================
   12. SHIMMER BUTTON EFFECT
   ============================================================ */
function initShimmerButtons() {
  const buttons = document.querySelectorAll('.btn-primary');

  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width)  * 100;
      const y = ((e.clientY - rect.top)  / rect.height) * 100;
      btn.style.setProperty('--mouse-x', `${x}%`);
      btn.style.setProperty('--mouse-y', `${y}%`);
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('--mouse-x', '50%');
      btn.style.setProperty('--mouse-y', '50%');
    });
  });
}

/* ============================================================
   13. SMOOTH PAGE TRANSITIONS
   ============================================================ */
function initPageTransitions() {
  // On load: enter animation
  document.body.classList.add('page-enter');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('page-enter--active');
      setTimeout(() => {
        document.body.classList.remove('page-enter', 'page-enter--active');
      }, 400);
    });
  });

  // On link click: exit animation then navigate
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip: external, anchor-only, special protocols, target=_blank, modifier keys
    const isExternal = link.hostname !== window.location.hostname;
    const isAnchor   = href.startsWith('#');
    const isSpecial  = /^(mailto:|tel:|javascript:)/i.test(href);
    const isNewTab   = link.target === '_blank';
    const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;

    if (isExternal || isAnchor || isSpecial || isNewTab || hasModifier) return;

    e.preventDefault();

    document.body.classList.add('page-exit');
    setTimeout(() => {
      window.location.href = href;
    }, 300);
  });
}

/* ============================================================
   14. COPY TO CLIPBOARD UTILITY
   ============================================================ */
window.copyToClipboard = async function copyToClipboard(text, successMessage = 'Copied!') {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Legacy fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    window.showToast(successMessage, 'success', 2500);
  } catch (err) {
    console.error('[SlideSage] Copy to clipboard failed:', err);
    window.showToast('Failed to copy. Please copy manually.', 'error');
  }
};

/* ============================================================
   EXPOSE ALL FUNCTIONS ON window.*
   ============================================================ */
window.initNavbar          = initNavbar;
window.initScrollAnimations = initScrollAnimations;
window.initMarquee         = initMarquee;
window.initSmoothScroll    = initSmoothScroll;
window.initForms           = initForms;
window.initAccordions      = initAccordions;
window.initPricingToggle   = initPricingToggle;
window.initBlogFilter      = initBlogFilter;
window.initTabSwitcher     = initTabSwitcher;
window.initStatsCounters   = initStatsCounters;
window.initShimmerButtons  = initShimmerButtons;
window.initPageTransitions = initPageTransitions;

/* ============================================================
   AUTO-INIT ON DOMContentLoaded
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Core — always run
  initNavbar();
  initScrollAnimations();
  initMarquee();
  initSmoothScroll();
  initForms();
  initAccordions();
  initStatsCounters();
  initShimmerButtons();
  initPageTransitions();

  // Page-specific — feature-detect via DOM presence
  const path = window.location.pathname;

  if (path.includes('pricing') || document.getElementById('billing-toggle')) {
    initPricingToggle();
  }

  if (path.includes('blog') || document.querySelector('[data-category]')) {
    initBlogFilter();
  }

  if (path.includes('features') || document.querySelector('[data-tab]')) {
    initTabSwitcher();
  }
});

/* ============================================================
   CSS INJECTION — critical runtime styles (transitions, page fx)
   ============================================================ */
(function injectRuntimeStyles() {
  if (document.getElementById('ss-runtime-styles')) return;

  const css = `
    /* Page transitions */
    body.page-enter       { opacity: 0; transform: translateY(6px); }
    body.page-enter--active { opacity: 1; transform: translateY(0);
                              transition: opacity 0.35s ease, transform 0.35s ease; }
    body.page-exit        { opacity: 0; transform: translateY(-6px);
                              transition: opacity 0.3s ease, transform 0.3s ease;
                              pointer-events: none; }

    /* Scroll animations — initial states */
    .fade-in  { opacity: 0; transition: opacity 0.65s ease, transform 0.65s ease; }
    .slide-up { opacity: 0; transform: translateY(28px);
                transition: opacity 0.65s ease, transform 0.65s ease; }
    .fade-in.is-visible,
    .slide-up.is-visible { opacity: 1; transform: translateY(0); }

    /* Stagger children */
    .fade-in:nth-child(2), .slide-up:nth-child(2) { transition-delay: 0.1s; }
    .fade-in:nth-child(3), .slide-up:nth-child(3) { transition-delay: 0.2s; }
    .fade-in:nth-child(4), .slide-up:nth-child(4) { transition-delay: 0.3s; }
    .fade-in:nth-child(5), .slide-up:nth-child(5) { transition-delay: 0.4s; }
    .fade-in:nth-child(6), .slide-up:nth-child(6) { transition-delay: 0.5s; }

    /* Accordion body */
    .accordion-body { overflow: hidden; max-height: 0; transition: max-height 0.35s ease; }

    /* Blog card hidden state */
    .blog-card { transition: opacity 0.25s ease, transform 0.25s ease; }
  `;

  const style = document.createElement('style');
  style.id = 'ss-runtime-styles';
  style.textContent = css;
  document.head.appendChild(style);
}());
