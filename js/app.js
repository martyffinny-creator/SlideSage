/**
 * SlideSage — app.js
 * Shared across all pages.
 * Handles: mobile menu, smooth scroll, navbar scroll effect,
 * toast notifications, newsletter form, fade-in on scroll,
 * active nav link highlighting.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
   * 1. MOBILE MENU TOGGLE
   * ───────────────────────────────────────── */
  function initMobileMenu() {
    const toggle = document.querySelector('.nav-toggle, .hamburger, [data-menu-toggle]');
    const mobileMenu = document.querySelector('.nav-menu, .mobile-menu, [data-menu]');

    if (!toggle || !mobileMenu) return;

    toggle.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.contains('is-open');

      if (isOpen) {
        mobileMenu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      } else {
        mobileMenu.classList.add('is-open');
        toggle.classList.add('is-active');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        mobileMenu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      }
    });
  }

  /* ─────────────────────────────────────────
   * 2. SMOOTH SCROLL FOR ANCHOR LINKS
   * ───────────────────────────────────────── */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (href === '#' || href === '#!') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navHeight = document.querySelector('nav, .navbar, header')?.offsetHeight || 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });

      // Close mobile menu if open
      const mobileMenu = document.querySelector('.nav-menu, .mobile-menu, [data-menu]');
      const toggle = document.querySelector('.nav-toggle, .hamburger, [data-menu-toggle]');
      if (mobileMenu) mobileMenu.classList.remove('is-open');
      if (toggle) toggle.classList.remove('is-active');
      document.body.classList.remove('menu-open');
    });
  }

  /* ─────────────────────────────────────────
   * 3. NAVBAR SCROLL EFFECT
   * ───────────────────────────────────────── */
  function initNavbarScroll() {
    const navbar = document.querySelector('nav, .navbar, header');
    if (!navbar) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateNavbar() {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      lastScrollY = window.scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }, { passive: true });

    // Set initial state
    updateNavbar();
  }

  /* ─────────────────────────────────────────
   * 4. TOAST NOTIFICATION SYSTEM
   * ───────────────────────────────────────── */
  var toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('aria-atomic', 'false');
      toastContainer.style.cssText = [
        'position: fixed',
        'bottom: 24px',
        'right: 24px',
        'z-index: 9999',
        'display: flex',
        'flex-direction: column',
        'gap: 10px',
        'pointer-events: none',
        'max-width: 360px',
        'width: calc(100vw - 48px)',
      ].join(';');
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  var TOAST_ICONS = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  var TOAST_COLORS = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '#10b981' },
    error:   { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d', icon: '#ef4444' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#78350f', icon: '#f59e0b' },
    info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a5f', icon: '#3b82f6' },
  };

  function showToast(message, type) {
    type = type || 'info';
    var colors = TOAST_COLORS[type] || TOAST_COLORS.info;
    var icon = TOAST_ICONS[type] || TOAST_ICONS.info;
    var container = getToastContainer();

    var toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.style.cssText = [
      'display: flex',
      'align-items: flex-start',
      'gap: 10px',
      'padding: 12px 16px',
      'border-radius: 10px',
      'border-left: 4px solid ' + colors.border,
      'background: ' + colors.bg,
      'color: ' + colors.text,
      'box-shadow: 0 4px 16px rgba(0,0,0,0.12)',
      'pointer-events: all',
      'cursor: pointer',
      'font-family: inherit',
      'font-size: 14px',
      'line-height: 1.4',
      'transform: translateX(110%)',
      'transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
      'opacity: 0',
      'max-width: 100%',
      'word-break: break-word',
    ].join(';');

    var iconEl = document.createElement('span');
    iconEl.style.cssText = 'flex-shrink:0;color:' + colors.icon + ';margin-top:1px;';
    iconEl.innerHTML = icon;

    var msgEl = document.createElement('span');
    msgEl.style.cssText = 'flex:1;';
    msgEl.textContent = message;

    var closeEl = document.createElement('button');
    closeEl.innerHTML = '&times;';
    closeEl.setAttribute('aria-label', 'Dismiss');
    closeEl.style.cssText = [
      'flex-shrink:0',
      'background:none',
      'border:none',
      'color:' + colors.text,
      'cursor:pointer',
      'font-size:18px',
      'line-height:1',
      'padding:0',
      'opacity:0.6',
      'margin-top:-1px',
    ].join(';');
    closeEl.addEventListener('click', function () { dismissToast(toast); });

    toast.appendChild(iconEl);
    toast.appendChild(msgEl);
    toast.appendChild(closeEl);
    toast.addEventListener('click', function () { dismissToast(toast); });
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
      });
    });

    // Auto-dismiss after 4s
    var timer = setTimeout(function () { dismissToast(toast); }, 4000);
    toast._dismissTimer = timer;
  }

  function dismissToast(toast) {
    if (toast._dismissTimer) clearTimeout(toast._dismissTimer);
    toast.style.transform = 'translateX(110%)';
    toast.style.opacity = '0';
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }

  window.showToast = showToast;

  /* ─────────────────────────────────────────
   * 5. NEWSLETTER FORM HANDLER
   * ───────────────────────────────────────── */
  function initNewsletterForm() {
    var forms = document.querySelectorAll('.newsletter-form, [data-newsletter-form]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var emailInput = form.querySelector('input[type="email"], input[name="email"]');
        if (!emailInput || !emailInput.value.trim()) {
          showToast('Please enter a valid email address.', 'warning');
          return;
        }

        var email = emailInput.value.trim();
        var btn = form.querySelector('button[type="submit"], .btn-subscribe');
        var originalText = btn ? btn.textContent : '';

        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Subscribing…';
        }

        fetch('/.netlify/functions/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
        })
          .then(function (res) {
            if (!res.ok) return res.json().then(function (d) { throw new Error(d.message || 'Subscription failed'); });
            return res.json();
          })
          .then(function () {
            showToast('You\'re subscribed! 🎉 Check your inbox.', 'success');
            form.reset();
          })
          .catch(function (err) {
            showToast(err.message || 'Something went wrong. Please try again.', 'error');
          })
          .finally(function () {
            if (btn) {
              btn.disabled = false;
              btn.textContent = originalText;
            }
          });
      });
    });
  }

  /* ─────────────────────────────────────────
   * 6. FADE-IN ON SCROLL (IntersectionObserver)
   * ───────────────────────────────────────── */
  function initFadeIn() {
    var elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: just show them all
      elements.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) {
      // Ensure initial hidden state if not already styled via CSS
      if (!el.style.opacity) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
      }
      observer.observe(el);
    });

    // Inject .is-visible styles
    if (!document.getElementById('fade-in-styles')) {
      var style = document.createElement('style');
      style.id = 'fade-in-styles';
      style.textContent = '.fade-in.is-visible { opacity: 1 !important; transform: translateY(0) !important; }';
      document.head.appendChild(style);
    }
  }

  /* ─────────────────────────────────────────
   * 7. ACTIVE NAV LINK HIGHLIGHTING
   * ───────────────────────────────────────── */
  function initActiveNavLinks() {
    var currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    var navLinks = document.querySelectorAll('nav a, .nav-menu a, .navbar a');

    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;

      // Normalise
      var linkPath = href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';

      if (linkPath === currentPath || (currentPath === '/' && (linkPath === '' || linkPath === '/index.html'))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Scroll-spy for same-page anchor links
    var anchorLinks = document.querySelectorAll('nav a[href^="#"], .nav-menu a[href^="#"]');
    if (!anchorLinks.length) return;

    var sections = [];
    anchorLinks.forEach(function (link) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) sections.push({ link: link, target: target });
    });

    if (!sections.length) return;

    var scrollSpyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var section = sections.find(function (s) { return s.target === entry.target; });
          if (!section) return;
          if (entry.isIntersecting) {
            anchorLinks.forEach(function (l) { l.classList.remove('active'); });
            section.link.classList.add('active');
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    sections.forEach(function (s) { scrollSpyObserver.observe(s.target); });
  }

  /* ─────────────────────────────────────────
   * INIT
   * ───────────────────────────────────────── */
  function init() {
    initMobileMenu();
    initSmoothScroll();
    initNavbarScroll();
    initNewsletterForm();
    initFadeIn();
    initActiveNavLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose utilities on window
  window.SlideSage = window.SlideSage || {};
  window.SlideSage.showToast = showToast;
  window.SlideSage.initFadeIn = initFadeIn;

})();
