import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Dumbbell, TrendingUp, History, Settings, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';

const tabs = [
  { id: 'today', href: '/', icon: Dumbbell, label: 'Today' },
  { id: 'food', href: '/food', icon: Utensils, label: 'Food' },
  { id: 'progress', href: '/progress', icon: TrendingUp, label: 'Progress' },
  { id: 'history', href: '/history', icon: History, label: 'History' },
  { id: 'settings', href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = tabs.find(t => t.href === router.pathname);
    return tab?.id || 'today';
  });
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const contentRef = useRef(null);

  // Update active tab when route changes
  useEffect(() => {
    const tab = tabs.find(t => t.href === router.pathname);
    if (tab) setActiveTab(tab.id);
  }, [router.pathname]);

  // Swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    
    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      // Swipe left = go to next tab
      const nextTab = tabs[currentIndex + 1];
      router.push(nextTab.href);
    } else if (isRightSwipe && currentIndex > 0) {
      // Swipe right = go to previous tab
      const prevTab = tabs[currentIndex - 1];
      router.push(prevTab.href);
    }
  };

  const handleTabClick = (tab) => {
    router.push(tab.href);
  };

  const currentIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-iron-950 flex flex-col">
      {/* Top Header with Tabs */}
      <header 
        className="sticky top-0 z-40 bg-iron-950/95 backdrop-blur-xl border-b border-iron-800/50"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 py-3">
          {/* App Title */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-iron-100 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-lift-primary" />
              Logbook
            </h1>
          </div>
          
          {/* Tab Bar */}
          <div className="flex bg-iron-900/80 rounded-xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-lift-primary text-iron-950 shadow-lg shadow-lift-primary/20' 
                      : 'text-iron-400 hover:text-iron-200 active:bg-iron-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Swipe Indicator */}
        <div className="flex justify-center pb-2">
          <div className="flex gap-1.5">
            {tabs.map((tab, i) => (
              <div
                key={tab.id}
                className={`h-1 rounded-full transition-all duration-200 ${
                  i === currentIndex 
                    ? 'w-6 bg-lift-primary' 
                    : 'w-1.5 bg-iron-700'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content with Swipe */}
      <main 
        ref={contentRef}
        className="flex-1 overflow-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {children}
      </main>

      {/* Swipe Hints (on edges) */}
      {currentIndex > 0 && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-30 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-iron-800/80 rounded-r-lg p-1">
            <ChevronLeft className="w-4 h-4 text-iron-400" />
          </div>
        </div>
      )}
      {currentIndex < tabs.length - 1 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-iron-800/80 rounded-l-lg p-1">
            <ChevronRight className="w-4 h-4 text-iron-400" />
          </div>
        </div>
      )}
    </div>
  );
}
