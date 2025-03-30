// Sidebar Navigation Module for Wiki-Go
// Handles sidebar functionality, hamburger menu toggle, and touch gestures
(function() {
    'use strict';

    // Module state
    let hamburger;
    let sidebar;
    let content;
    let body;
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50; // Minimum distance required for a swipe
    const edgeThreshold = 30; // Distance from edge to detect edge swipe

    // Initialize when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        hamburger = document.querySelector('.hamburger');
        sidebar = document.querySelector('.sidebar');
        content = document.querySelector('.content');
        body = document.body;

        initHamburgerMenu();
        initClickOutside();
        initSidebarLinks();
        initTouchGestures();
    });

    // Hamburger menu toggle
    function initHamburgerMenu() {
        if (!hamburger) return;

        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Click outside to close
    function initClickOutside() {
        document.addEventListener('click', function(e) {
            if (sidebar && 
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                !hamburger.contains(e.target)) {
                closeSidebar();
            }
        });
    }

    // Links inside sidebar - close sidebar on mobile when clicked
    function initSidebarLinks() {
        if (!sidebar) return;
        
        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });
    }

    // Touch gestures for mobile
    function initTouchGestures() {
        // Handle touch start
        document.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        // Handle touch end
        document.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    // Process swipe gestures
    function handleSwipe() {
        if (!sidebar) return;
        
        const swipeDistance = touchEndX - touchStartX;

        // Right swipe (open sidebar)
        if (swipeDistance > swipeThreshold && touchStartX < edgeThreshold && !sidebar.classList.contains('active')) {
            openSidebar();
        }

        // Left swipe (close sidebar)
        if (swipeDistance < -swipeThreshold && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    }

    // Toggle sidebar visibility
    function toggleSidebar() {
        if (!hamburger || !sidebar || !body || !content) return;

        hamburger.classList.toggle('active');
        sidebar.classList.toggle('active');
        body.classList.toggle('sidebar-active');
        content.classList.toggle('sidebar-active');
    }

    // Open sidebar
    function openSidebar() {
        if (!hamburger || !sidebar || !body || !content) return;

        hamburger.classList.add('active');
        sidebar.classList.add('active');
        body.classList.add('sidebar-active');
        content.classList.add('sidebar-active');
    }

    // Close sidebar
    function closeSidebar() {
        if (!hamburger || !sidebar || !body || !content) return;

        hamburger.classList.remove('active');
        sidebar.classList.remove('active');
        body.classList.remove('sidebar-active');
        content.classList.remove('sidebar-active');
    }

    // Expose functions to global scope
    window.SidebarNavigation = {
        toggleSidebar: toggleSidebar,
        openSidebar: openSidebar,
        closeSidebar: closeSidebar
    };
})();