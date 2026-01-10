import React from 'react';
import { useAppSelector } from '../store/hooks';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Hook zur Berechnung des Offsets für Seiten, wenn die globale Navigation (Sidebar oder Dropdown) geöffnet ist.
 * Verhindert, dass Seiten-Inhalte von der globalen Navigation überdeckt werden.
 * 
 * @returns {Object} Objekt mit marginTop-Wert und anderen nützlichen Werten
 */
export const useGlobalNavigationOffset = () => {
  const navigationMode = useAppSelector((state) => state.navigation.mode);
  const globalSidebarOpen = useAppSelector((state) => state.navigation.sidebarOpen);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [globalSidebarHeight, setGlobalSidebarHeight] = React.useState(0);
  
  React.useEffect(() => {
    // Prüfe sowohl für Sidebar- als auch für Dropdown-Modus
    if (!globalSidebarOpen || isMobile) {
      setGlobalSidebarHeight(0);
      return;
    }

    const checkSidebarHeight = () => {
      let foundHeight = 0;
      
      if (navigationMode === 'sidebar') {
        // Suche nach der globalen Sidebar (persistent drawer, width 240px)
        const allDrawers = document.querySelectorAll('[class*="MuiDrawer-root"]');
        
        allDrawers.forEach((drawer) => {
          const drawerElement = drawer as HTMLElement;
          const isPersistent = drawerElement.querySelector('[class*="persistent"]') || 
                              drawerElement.getAttribute('class')?.includes('persistent');
          
          if (isPersistent) {
            const paper = drawerElement.querySelector('[class*="MuiDrawer-paper"]') as HTMLElement;
            if (paper) {
              const rect = paper.getBoundingClientRect();
              // Die globale Sidebar hat width 240px, die InternalMessages-Sidebar hat width 280px
              if (rect.width > 0 && rect.height > 0 && Math.abs(rect.width - 240) < 5) {
                const sidebarHeight = Math.max(paper.scrollHeight, rect.height, paper.offsetHeight);
                if (sidebarHeight > foundHeight) {
                  foundHeight = sidebarHeight;
                }
              }
            }
          }
        });
      } else if (navigationMode === 'dropdown') {
        // Suche nach der DropdownNavigation (Paper mit data-navigation-panel)
        const dropdownNav = document.querySelector('[data-navigation-panel]') as HTMLElement;
        if (dropdownNav) {
          const rect = dropdownNav.getBoundingClientRect();
          if (rect.height > 0) {
            foundHeight = Math.max(dropdownNav.scrollHeight, rect.height, dropdownNav.offsetHeight);
          }
        }
      }
      
      if (foundHeight > 0) {
        setGlobalSidebarHeight(foundHeight);
      } else {
        setGlobalSidebarHeight(0);
      }
    };
    
    // Initial check mit mehreren Verzögerungen, damit DOM vollständig geladen ist
    const timeouts = [
      setTimeout(checkSidebarHeight, 50),
      setTimeout(checkSidebarHeight, 200),
      setTimeout(checkSidebarHeight, 500),
    ];
    
    // Verwende MutationObserver, um Änderungen in der Sidebar zu erkennen
    const observer = new MutationObserver(() => {
      checkSidebarHeight();
    });
    
    // Beobachte Änderungen im DOM
    if (typeof document !== 'undefined') {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-hidden']
      });
    }
    
    // Prüfe auch bei Resize
    window.addEventListener('resize', checkSidebarHeight);
    
    // Prüfe regelmäßig (als Fallback)
    const interval = setInterval(checkSidebarHeight, 300);
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener('resize', checkSidebarHeight);
    };
  }, [navigationMode, globalSidebarOpen, isMobile]);

  // Berechne marginTop-Wert
  const marginTopValue = !isMobile && globalSidebarOpen && globalSidebarHeight > 0 
    ? `${globalSidebarHeight}px` 
    : '0px';

  return {
    marginTop: marginTopValue,
    marginTopValue,
    globalSidebarHeight,
    shouldShift: !isMobile && globalSidebarOpen && globalSidebarHeight > 0,
    navigationMode,
    globalSidebarOpen,
  };
};
