/**
 * Theme Manager Module
 * Handles theme switching, initialization, and UI updates
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // DOM elements
    const themeToggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    const lightIcon = document.querySelector('.light-icon');
    const darkIcon = document.querySelector('.dark-icon');
    
    // Initialize theme
    initializeTheme();
    
    // Add theme toggle event listener
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Apply system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange);
    
    /**
     * Initialize theme based on saved preference or system preference
     */
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (systemPrefersDark) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    }
    
    /**
     * Toggle between light and dark themes
     */
    function toggleTheme() {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    /**
     * Apply theme to document and update UI
     * @param {string} theme - 'light' or 'dark'
     */
    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        updateThemeUI(theme);
    }
    
    /**
     * Update UI elements based on current theme
     * @param {string} theme - 'light' or 'dark'
     */
    function updateThemeUI(theme) {
        if (theme === 'dark') {
            if (lightIcon) lightIcon.style.display = 'none';
            if (darkIcon) darkIcon.style.display = 'block';
            // Use dark theme for syntax highlighting
            const prismTheme = document.getElementById('prism-theme');
            if (prismTheme) {
                prismTheme.href = '/static/libs/prism-1.30.0/prism-tomorrow.min.css';
            }
        } else {
            if (lightIcon) lightIcon.style.display = 'block';
            if (darkIcon) darkIcon.style.display = 'none';
            // Use light theme for syntax highlighting
            const prismTheme = document.getElementById('prism-theme');
            if (prismTheme) {
                prismTheme.href = '/static/libs/prism-1.30.0/prism.min.css';
            }
        }
        
        // Dispatch theme change event for other components
        const themeChangeEvent = new CustomEvent('themeChanged', { 
            detail: { theme: theme } 
        });
        document.dispatchEvent(themeChangeEvent);
    }
    
    /**
     * Handle system theme preference changes
     * @param {MediaQueryListEvent} e - Media query change event
     */
    function handleSystemThemeChange(e) {
        // Only apply system preference if user hasn't set a preference
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            applyTheme(newTheme);
        }
    }
    
    // Export theme functions to global scope
    window.ThemeManager = {
        getCurrentTheme: function() {
            return root.getAttribute('data-theme') || 'light';
        },
        setTheme: applyTheme,
        toggleTheme: toggleTheme,
        updateUI: updateThemeUI
    };
});