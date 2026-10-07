/**
 * JavaScript interaction code that gets inlined into the blog HTML.
 * Navigation, TOC, search, scroll progress, and tag filter functions.
 */

/**
 * Generate the JS interactions for the classic/magazine/minimal theme single-file blog.
 */
export function getClassicJsInteractions(blogLang: 'zh' | 'en'): string {
  return `
    function showPage(pageId) {
      var sections = document.querySelectorAll('.page-section');
      for (var i = 0; i < sections.length; i++) sections[i].classList.remove('active');
      var el = document.getElementById(pageId);
      if (el) {
        el.classList.add('active');
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'pageFadeIn 0.3s ease';
      }
      window.scrollTo(0, 0);
    }

    // 平滑滚动到锚点，自动减去 sticky header 高度，避免标题被遮挡
    function _scrollToHeading(el) {
      if (!el) return;
      var OFFSET = 40;
      var rect = el.getBoundingClientRect();
      var bodyScroll = document.body ? document.body.scrollTop : 0;
      var htmlScroll = document.documentElement ? document.documentElement.scrollTop : 0;
      var winScroll = window.scrollY || window.pageYOffset || 0;
      var currentScroll = Math.max(bodyScroll, htmlScroll, winScroll);
      var targetTop = rect.top + currentScroll - OFFSET;
      if (document.body) document.body.scrollTop = targetTop;
      if (document.documentElement) document.documentElement.scrollTop = targetTop;
      try { window.scrollTo(0, targetTop); } catch(_) {} // 导出博客运行时：best-effort，静默降级 // 导出博客运行时：best-effort，静默降级
    }

    function navigateToPost(slug, sectionId) {
      showPage('post-' + slug);
      if (sectionId) {
        setTimeout(function() {
          var target = document.getElementById(sectionId);
          if (target) _scrollToHeading(target);
        }, 100);
      }
    }

    function navigateToIndex() {
      showPage('page-index');
    }

    function navigateToArchive() {
      showPage('page-archive');
    }

    function navigateToTags() {
      showPage('page-tags');
      resetTagFilter();
    }

    function navigateToAbout() {
      showPage('page-about');
    }

    function navigateToLinks() {
      showPage('page-links');
    }

    function navigateToSeries() {
      showPage('page-series');
    }

    function navigateTo404() {
      showPage('page-404');
    }

    function resetTagFilter() {
      var container = document.getElementById('tag-groups-container');
      if (container) container.classList.remove('tag-filter-active');
      var items = document.querySelectorAll('.tag-item');
      var groups = document.querySelectorAll('.tag-group');
      for (var i = 0; i < items.length; i++) { items[i].classList.remove('show'); }
      for (var j = 0; j < groups.length; j++) { groups[j].classList.remove('show'); }
    }

    function filterByTag(tagName) {
      var container = document.getElementById('tag-groups-container');
      if (!container) return;
      container.classList.add('tag-filter-active');

      var items = document.querySelectorAll('.tag-item');
      var groups = document.querySelectorAll('.tag-group');

      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('data-tag') === tagName) {
          items[i].classList.add('show');
        } else {
          items[i].classList.remove('show');
        }
      }

      for (var j = 0; j < groups.length; j++) {
        var heading = groups[j].querySelector('[data-tag-heading]');
        if (heading && heading.getAttribute('data-tag-heading') === tagName) {
          groups[j].classList.add('show');
        } else {
          groups[j].classList.remove('show');
        }
      }

      var tagSection = document.getElementById('page-tags');
      if (tagSection && !tagSection.classList.contains('active')) {
        showPage('page-tags');
      }
    }

    document.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el !== document) {
        if (el.tagName === 'A') {
          var href = el.getAttribute('href') || '';
          if (href.indexOf('#post/') === 0) {
            e.preventDefault();
            var slugPart = href.replace('#post/', '');
            var parts = slugPart.split('/');
            navigateToPost(parts[0], parts[1] || '');
            return;
          }
          if (href === '#index' || href === '#') {
            e.preventDefault();
            navigateToIndex();
            return;
          }
          if (href === '#archive') {
            e.preventDefault();
            navigateToArchive();
            return;
          }
          if (href === '#tags') {
            e.preventDefault();
            navigateToTags();
            return;
          }
          if (href === '#about') {
            e.preventDefault();
            navigateToAbout();
            return;
          }
          if (href === '#links') {
            e.preventDefault();
            navigateToLinks();
            return;
          }
          if (href === '#series') {
            e.preventDefault();
            navigateToSeries();
            return;
          }
          if (href === '#404') {
            e.preventDefault();
            navigateTo404();
            return;
          }
          if (href.indexOf('#section-') === 0 || (el.closest && el.closest('.toc-nav'))) {
            e.preventDefault();
            var targetId = href.slice(1);
            var anchor = document.getElementById(targetId);
            if (anchor) {
              _scrollToHeading(anchor);
              updateTocActive();
            }
            return;
          }
          // Catch-all: handle any remaining hash links (footnotes, etc.)
          if (href.indexOf('#') === 0 && href.length > 1) {
            e.preventDefault();
            var anchorId = href.slice(1);
            var target = document.getElementById(anchorId);
            if (target) _scrollToHeading(target);
            return;
          }
        }
        var sectionAttr = el.getAttribute('data-section');
        if (sectionAttr && el.classList.contains('tag-post-item')) {
          e.preventDefault();
          var postHref = el.getAttribute('href');
          if (postHref) {
            var slugPart = postHref.replace('#post/', '');
            navigateToPost(slugPart, sectionAttr);
          }
          return;
        }
        var tagFilter = el.getAttribute('data-tag-filter');
        if (tagFilter) {
          e.preventDefault();
          filterByTag(tagFilter);
          return;
        }
        el = el.parentElement;
      }
    });

    window.addEventListener('scroll', function() {
      var bar = document.getElementById('reading-progress');
      if (!bar) return;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    });

    function updateTocActive() {
      var sections = document.querySelectorAll('.post-content h2[id], .post-content h3[id]');
      var tocLinks = document.querySelectorAll('.toc-nav a');
      if (sections.length === 0 || tocLinks.length === 0) return;

      var current = '';
      for (var i = sections.length - 1; i >= 0; i--) {
        var rect = sections[i].getBoundingClientRect();
        if (rect.top <= 120) {
          current = sections[i].id;
          break;
        }
      }

      for (var j = 0; j < tocLinks.length; j++) {
        tocLinks[j].classList.remove('active');
        if (tocLinks[j].getAttribute('href') === '#' + current) {
          tocLinks[j].classList.add('active');
        }
      }
    }

    window.addEventListener('scroll', updateTocActive);

    // Scroll spy for TOC using IntersectionObserver
    (function(){
      var tocLinks=document.querySelectorAll('.toc-link');
      var headings=document.querySelectorAll('.post-content h2,.post-content h3');
      if(tocLinks.length&&headings.length){
        var tocObserver=new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(entry.isIntersecting){
              tocLinks.forEach(function(l){l.classList.remove('active')});
              var id=entry.target.getAttribute('id');
              var activeLink=document.querySelector('.toc-link[href="#'+id+'"]');
              if(activeLink)activeLink.classList.add('active');
            }
          });
        },{rootMargin:'-80px 0px -70% 0px'});
        headings.forEach(function(h){tocObserver.observe(h)});
      }
    })();

    // Prevent scroll propagation when hovering over TOC
    (function() {
      var toc = document.querySelector('.post-toc');
      if (!toc) return;
      toc.addEventListener('wheel', function(e) {
        var delta = e.deltaY;
        var isScrollableUp = toc.scrollTop > 0;
        var isScrollableDown = toc.scrollTop + toc.clientHeight < toc.scrollHeight;
        if ((delta < 0 && isScrollableUp) || (delta > 0 && isScrollableDown)) {
          e.preventDefault();
          toc.scrollTop += delta;
        }
      }, { passive: false });
    })();

    function copyPostLink() {
      var input = document.createElement('input');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); } catch(e) {} // 导出博客运行时：best-effort，静默降级
      document.body.removeChild(input);
      var btn = document.querySelector('.share-copy-btn');
      if (btn) {
        var original = btn.textContent;
        btn.textContent = ${blogLang === 'en' ? "'Copied!'" : "'已复制!'"};
        setTimeout(function() { btn.textContent = original; }, 2000);
      }
    }

    navigateToIndex();
  `
}

/**
 * Generate the JS interactions for the new-theme single-file blog.
 */
export function getNewThemeJsInteractions(): string {
  return `
var currentView = 'home';

function showPage(pageId) {
  var sections = document.querySelectorAll('.page-section');
  for (var i = 0; i < sections.length; i++) sections[i].classList.remove('active');
  var el = document.getElementById(pageId);
  if (el) {
    el.classList.add('active');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'pageFadeIn 0.3s ease';
  }
  window.scrollTo(0, 0);
}

// 平滑滚动到锚点，自动减去 sticky header 高度，避免标题被遮挡
function _scrollToHeading(el) {
  if (!el) return;
  var OFFSET = 40;
  var rect = el.getBoundingClientRect();
  var bodyScroll = document.body ? document.body.scrollTop : 0;
  var htmlScroll = document.documentElement ? document.documentElement.scrollTop : 0;
  var winScroll = window.scrollY || window.pageYOffset || 0;
  var currentScroll = Math.max(bodyScroll, htmlScroll, winScroll);
  var targetTop = rect.top + currentScroll - OFFSET;
  if (document.body) document.body.scrollTop = targetTop;
  if (document.documentElement) document.documentElement.scrollTop = targetTop;
  try { window.scrollTo(0, targetTop); } catch(_) {} // 导出博客运行时：best-effort，静默降级
}

function showView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.blog-view').forEach(function(v) { v.style.display = 'none'; });
  document.querySelectorAll('.view-' + viewName).forEach(function(v) { v.style.display = 'block'; });
  document.querySelectorAll('.nav-link').forEach(function(l) {
    l.classList.remove('active');
    if (l.getAttribute('data-view') === viewName) l.classList.add('active');
  });
}

function navigateToPost(slug, sectionId) {
  showPage('post-' + slug);
  showView('');
  if (sectionId) {
    setTimeout(function() {
      var target = document.getElementById(sectionId);
      if (target) _scrollToHeading(target);
    }, 100);
  }
}

function navigateToIndex() {
  showPage('page-index');
  showView('home');
}

function navigateToArchive() {
  showPage('page-archive');
  showView('archive');
}

function navigateToTags() {
  showPage('page-tags');
  showView('tags');
}

function navigateToAbout() {
  showPage('page-about');
  showView('');
}

function navigateToLinks() {
  showPage('page-links');
  showView('');
}

function navigateToSeries() {
  showPage('page-series');
  showView('');
}

function navigateTo404() {
  showPage('page-404');
  showView('');
}

document.addEventListener('click', function(e) {
  var el = e.target;
  while (el && el !== document) {
    if (el.tagName === 'A') {
      var href = el.getAttribute('href') || '';
      if (href.indexOf('#post/') === 0) {
        e.preventDefault();
        var slugPart = href.replace('#post/', '');
        var parts = slugPart.split('/');
        navigateToPost(parts[0], parts[1] || '');
        return;
      }
      if (href === '#index' || href === '#') {
        e.preventDefault();
        navigateToIndex();
        return;
      }
      if (href === '#archive') {
        e.preventDefault();
        navigateToArchive();
        return;
      }
      if (href === '#tags') {
        e.preventDefault();
        navigateToTags();
        return;
      }
      if (href === '#about') {
        e.preventDefault();
        navigateToAbout();
        return;
      }
      if (href === '#links') {
        e.preventDefault();
        navigateToLinks();
        return;
      }
      if (href === '#series') {
        e.preventDefault();
        navigateToSeries();
        return;
      }
      if (href === '#404') {
        e.preventDefault();
        navigateTo404();
        return;
      }
      if (href.indexOf('#section-') === 0) {
        e.preventDefault();
        var targetId = href.slice(1);
        var anchor = document.getElementById(targetId);
        if (anchor) _scrollToHeading(anchor);
        return;
      }
      // Catch-all: handle any remaining hash links (footnotes, etc.)
      if (href.indexOf('#') === 0 && href.length > 1) {
        e.preventDefault();
        var anchorId = href.slice(1);
        var target = document.getElementById(anchorId);
        if (target) _scrollToHeading(target);
        return;
      }
    }
    if (el.classList && el.classList.contains('nav-link')) {
      e.preventDefault();
      var view = el.getAttribute('data-view');
      if (view === 'home') navigateToIndex();
      else if (view === 'archive') navigateToArchive();
      else if (view === 'tags') navigateToTags();
      else if (view === 'about') navigateToAbout();
      else if (view === 'links') navigateToLinks();
      else if (view === 'series') navigateToSeries();
      return;
    }
    if (el.classList && el.classList.contains('tag-cloud-item')) {
      e.preventDefault();
      document.querySelectorAll('.tag-posts-section').forEach(function(s) { s.style.display = 'none'; });
      var tag = el.getAttribute('data-tag');
      var sec = document.getElementById('tag-posts-' + tag);
      if (sec) sec.style.display = 'block';
      return;
    }
    el = el.parentElement;
  }
});

navigateToIndex();

// TOC scroll tracking and click handling
(function(){
  function setupToc(){
    var sections = document.querySelectorAll('.post-content h2[id], .post-content h3[id]');
    var tocLinks = document.querySelectorAll('.toc-nav a');
    if (!sections.length || !tocLinks.length) return;
    function updateActiveToc(){
      var scrollY = window.scrollY + 100;
      var current = null;
      for (var i = sections.length - 1; i >= 0; i--) {
        if (sections[i].offsetTop <= scrollY) { current = sections[i]; break; }
      }
      tocLinks.forEach(function(l){ l.classList.remove('active'); });
      if (current) {
        var id = current.getAttribute('id');
        var activeLink = document.querySelector('.toc-nav a[href="#' + id + '"]');
        if (activeLink) activeLink.classList.add('active');
      }
    }
    window.addEventListener('scroll', updateActiveToc, {passive:true});
    updateActiveToc();
    // TOC click handling
    tocLinks.forEach(function(link){
      link.addEventListener('click', function(e){
        e.preventDefault();
        var href = link.getAttribute('href') || '';
        var targetId = href.slice(1);
        var anchor = document.getElementById(targetId);
        if (anchor) _scrollToHeading(anchor);
      });
    });
    // TOC wheel event isolation
    var toc = document.querySelector('.post-toc');
    if (toc) {
      toc.addEventListener('wheel', function(e){
        var delta = e.deltaY;
        var up = toc.scrollTop > 0;
        var down = toc.scrollTop + toc.clientHeight < toc.scrollHeight;
        if ((delta < 0 && up) || (delta > 0 && down)) {
          e.preventDefault();
          toc.scrollTop += delta;
        }
      }, {passive:false});
    }
  }
  setupToc();

  // Scroll spy for TOC using IntersectionObserver
  (function(){
    var tocLinks=document.querySelectorAll('.toc-link');
    var headings=document.querySelectorAll('.post-content h2,.post-content h3');
    if(tocLinks.length&&headings.length){
      var tocObserver=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            tocLinks.forEach(function(l){l.classList.remove('active')});
            var id=entry.target.getAttribute('id');
            var activeLink=document.querySelector('.toc-link[href="#'+id+'"]');
            if(activeLink)activeLink.classList.add('active');
          }
        });
      },{rootMargin:'-80px 0px -70% 0px'});
      headings.forEach(function(h){tocObserver.observe(h)});
    }
  })();

  // Re-setup after page navigation
  var origShowPage = window.showPage;
  if (origShowPage) {
    window.showPage = function(pageId) {
      origShowPage(pageId);
      setTimeout(setupToc, 200);
    };
  }
})();
`
}
