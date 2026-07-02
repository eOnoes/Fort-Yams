# Patch 006 — Desktop Layout Reference

## Pattern: Responsive Desktop Rail + Content Area

### Detection (JS)
```tsx
const [isDesktop, setIsDesktop] = useState(false);
useEffect(() => {
  const mq = window.matchMedia("(min-width: 1024px)");
  const update = () => setIsDesktop(mq.matches);
  update();
  mq.addEventListener("change", update);
  return () => mq.removeEventListener("change", update);
}, []);
```

### Layout Structure
```tsx
// Desktop: rail + content
if (isDesktop) {
  return (
    <div className="app-shell app-shell-desktop">
      <nav className="desktop-rail">
        {NAV_ITEMS.map(item => (
          <button className={`rail-icon${active === item.view ? " active" : ""}`}
                  onClick={() => setActiveView(item.view)}>
            <Icon name={item.icon} />
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="rail-icon rail-cyony" onClick={openCyony}>🔧</button>
      </nav>
      <main className="desktop-content">{workspaceContent}</main>
    </div>
  );
}
// Mobile: current layout unchanged
return <div className="app-shell">{workspaceContent}{fab}</div>;
```

### Key CSS (inside @media min-width: 1024px)
- `.app-shell` → `display: flex; height: 100vh; overflow: hidden`
- `.desktop-rail` → `width: 64px; min-width: 64px; background: #0a0a0a; flex column`
- `.rail-icon` → `44x44px; active state gets left green accent bar via ::before`
- `.desktop-content` → `flex: 1; min-width: 0; overflow-y: auto`
- `.cyony-overlay > div` → `position: absolute; right: 0; width: 380px` (sidebar)
- `.fab-container` → `display: none` (rail replaces FAB)
- `.home-feed-stats` → `grid-template-columns: repeat(3, 1fr)`
- `.home-feed-reminders .feed-reminder-list` → `grid-template-columns: repeat(2, 1fr)`

### Pitfalls
- **`min-width: 0` on `.desktop-content`** — Without this, flex child won't shrink below content width, causing horizontal overflow.
- **Extract workspace content to variable** — Don't duplicate the JSX. Extract `{workspaceContent}` and use it in both desktop and mobile branches.
- **`onBack` props become no-ops on desktop** — Pass `isDesktop ? () => {} : () => setActiveView("Command")` to workspace components. Desktop nav handles view switching via L1 rail.
- **Back buttons hidden via CSS** — `.desktop-content .card-view-back { display: none }` — cleaner than conditional rendering for UI chrome.
- **Cyony sidebar needs slide animation** — Add `@keyframes slideInRight` for smooth open. Mobile overlay keeps its own center animation.
