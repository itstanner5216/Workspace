# Jack'D Portal - Visual Reference Guide

**Live UI:** https://jack-portal.jacobthaywood.workers.dev

---

## 📐 New UI Layout

### Full Page View

```
╔════════════════════════════════════════════════════════╗
║  🔴 Jack'D                                  [Login]   ║  ← Bold Red Header
╠════════════════════════════════════════════════════════╣
║                                                        ║
║                   MAX WIDTH: 1100px                    ║
║                                                        ║
║  ╭────────────────────────────────────────────────╮   ║
║  │ 🔴 Search                                      │   │  ← Red Title
║  ├────────────────────────────────────────────────┤   ║
║  │                                                │   ║
║  │ Search Query:                                  │   ║
║  │ ┌────────────────────────────────────────────┐ │   ║
║  │ │ Enter search terms...                      │ │   ║
║  │ └────────────────────────────────────────────┘ │   ║
║  │                                                │   ║
║  │ ⚙️ Advanced Filters                        ▼  │   │  ← COLLAPSIBLE
║  │                                                │   ║
║  │ ┌────────────────────────────────────────────┐ │   ║
║  │ │ [Search]              [Proxy Status]       │ │   │
║  │ └────────────────────────────────────────────┘ │   ║
║  ╰────────────────────────────────────────────────╯   ║
║                                                        ║
║  ╭────────────────────────────────────────────────╮   ║
║  │ Results (Auto-fill Grid)                       │   ║
║  │                                                │   ║
║  │ ┌──────────┐  ┌──────────┐  ┌──────────┐     │   ║
║  │ │  Card 1  │  │  Card 2  │  │  Card 3  │     │   ║
║  │ └──────────┘  └──────────┘  └──────────┘     │   ║
║  │                                                │   ║
║  │ ┌──────────┐  ┌──────────┐  ┌──────────┐     │   ║
║  │ │  Card 4  │  │  Card 5  │  │  Card 6  │     │   ║
║  │ └──────────┘  └──────────┘  └──────────┘     │   ║
║  ╰────────────────────────────────────────────────╯   ║
║                                                        ║
║  Ready                                                 ║  ← Dynamic Status
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

### Expanded Filters View

```
╔════════════════════════════════════════════════════════╗
║  🔴 Jack'D                                  [Login]   ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  ╭────────────────────────────────────────────────╮   ║
║  │ 🔴 Search                                      │   ║
║  ├────────────────────────────────────────────────┤   ║
║  │                                                │   ║
║  │ Search Query:                                  │   ║
║  │ ┌────────────────────────────────────────────┐ │   ║
║  │ │ Enter search terms...                      │ │   ║
║  │ └────────────────────────────────────────────┘ │   ║
║  │                                                │   ║
║  │ ⚙️ Advanced Filters                        ▲  │   │  ← EXPANDED
║  │ ┌──────────────────────────────────────────┐   │   │  ← RED BORDER
║  │ │ Search Mode  │  Freshness               │   │   │
║  │ │ [v]          │  [v]                     │   │   │
║  │ │                                           │   │   │
║  │ │ Results      │  Provider (optional)     │   │   │
║  │ │ [__]         │  [v]                     │   │   │
║  │ │                                           │   │   │
║  │ │ Region       │  Proxy Type              │   │   │
║  │ │ [v]          │  [v]                     │   │   │
║  │ └──────────────────────────────────────────┘   │   │
║  │                                                │   ║
║  │ ┌────────────────────────────────────────────┐ │   ║
║  │ │ [Search]              [Proxy Status]       │ │   ║
║  │ └────────────────────────────────────────────┘ │   ║
║  ╰────────────────────────────────────────────────╯   ║
║                                                        ║
║  Ready                                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 🎨 Color Palette Reference

### Main Colors

```
█ PRIMARY BLACK    #0b0b0c
█ PANEL DARK       #141416
█ PANEL DARKER     #1a1b1e
█ BORDER SUBTLE    #1f2024
█ BORDER INPUT     #23252b

█ TEXT PRIMARY     #e9eaee (off-white)
█ TEXT MUTED       #9aa0a6 (light gray)

█ ACCENT RED       #c8102e (Dark-bright crimson - PRIMARY ACTION)
█ ACCENT DARK RED  #b91c1c (Secondary/hover state)

█ STATUS AMBER     #f59e0b (Searching/warning)
█ STATUS GREEN     #22c55e (Success/Done)
█ STATUS RED       #ef4444 (Error/Failed)
```

### RGB Values for Designers
```
Accent Red (#c8102e)
  RGB: 200, 16, 46
  HSL: 353°, 85%, 42%

Accent Dark Red (#b91c1c)
  RGB: 185, 28, 28
  HSL: 0°, 74%, 42%
```

---

## 🧩 Component States

### Status Indicator

#### State 1: READY (Idle)
```
┌─────────────────────────────┐
│ Ready                       │  ← Gray text (#9aa0a6)
└─────────────────────────────┘
CSS Class: .status.ready
```

#### State 2: SEARCHING (Processing)
```
┌─────────────────────────────┐
│ Searching…                  │  ← Amber text (#f59e0b)
└─────────────────────────────┘
CSS Class: .status.searching
```

#### State 3: DONE (Success)
```
┌─────────────────────────────┐
│ Done — 5 results            │  ← Green text (#22c55e)
│ Done — 1 result             │
│ Done — 12 results (via US   │
│        residential proxy)   │
└─────────────────────────────┘
CSS Class: .status.done
```

#### State 4: ERROR (Failed)
```
┌─────────────────────────────┐
│ Error                       │  ← Red text (#ef4444)
└─────────────────────────────┘
CSS Class: .status.error
```

### Collapsible Filters

#### Closed State
```
┌─────────────────────────────────────────┐
│ ⚙️ Advanced Filters            ▼        │
└─────────────────────────────────────────┘
  
Background: Dark panel (#1a1b1e)
Border: 1px solid #23252b
Cursor: pointer
Text: White (#e9eaee)
```

#### Open State
```
┌─────────────────────────────────────────┐
│ ⚙️ Advanced Filters            ▲        │  ← Chevron flipped
├─────────────────────────────────────────┤  ← RED border
│ Search Mode  │  Freshness               │
│ Results      │  Provider                │
│ Region       │  Proxy Type              │
└─────────────────────────────────────────┘

Background: Darker (#1f2024)
Left Border: 2px solid #c8102e (RED!)
Main Border: 1px solid #c8102e (RED!)
Animation: max-height 0 → max-height: 1000px over 0.3s ease
```

#### Hover State
```
┌─────────────────────────────────────────┐
│ ⚙️ Advanced Filters            ▼/▲      │
└─────────────────────────────────────────┘

Background: Darker (#1f2024)
Border: 1px solid #c8102e (RED!)
Cursor: pointer
Transition: all 0.2s ease
```

---

## 🔘 Button Reference

### Search Button (Primary)
```
┌─────────────────────┐
│     Search          │
└─────────────────────┘

Default:
  Background: #c8102e (Red)
  Color: White
  Height: 44px (mobile-friendly)
  Padding: 12px 16px
  Border-radius: 10px

Hover/Focus:
  Background: #b91c1c (Darker red)
  Cursor: pointer
  Transition: smooth
```

### Login Button (Secondary)
```
┌─────────────┐
│   Login     │
└─────────────┘

Default:
  Background: #b91c1c (Darker red)
  Color: White
  Height: 44px
  Padding: 8px 14px
  Font-size: 13px
  Border-radius: 10px
```

### Proxy Status Button (Tertiary)
```
┌──────────────────────┐
│  Proxy Status        │
└──────────────────────┘

Default:
  Background: #9aa0a6 (Muted gray)
  Color: White
  Height: 44px
  Padding: 12px 16px
  Border-radius: 10px
  Margin-left: 8px
```

---

## 📱 Typography

### Header Title
```
Jack'D

Font: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial
Size: 20px
Weight: Bold (650)
Color: #c8102e (Red)
Style: Strong tag for emphasis
Effect: text-shadow: 0 0 12px rgba(200,16,46,0.3)
```

### Section Titles
```
Search
Site Credentials
Proxy Status

Font: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial
Size: 22px
Weight: Bold (700)
Color: #c8102e (Red)
Effect: text-shadow: 0 0 8px rgba(200,16,46,0.2)
Margin: 0 0 10px
```

### Labels
```
Search Query
Search Mode
Freshness
Results
...

Font: system-ui
Size: 13px
Color: #9aa0a6 (Muted)
Weight: Regular
Margin: 8px 0 6px
```

### Body Text
```
Enter search terms...
Normal
Deep Niche
...

Font: system-ui
Size: 16px (input), 13px (meta)
Color: #e9eaee (Main), #9aa0a6 (Meta)
Weight: Regular
```

---

## 🎯 Interaction Flow

### Search Interaction

```
1. User visits page
   Status: "Ready" (gray)
   Filters: Collapsed
   
   ↓ (Click search bar)
   
2. User enters query, clicks Search
   Status: "Searching…" (amber)
   Filters: State preserved
   Results: Cleared
   
   ↓ (Wait for results)
   
3a. Results received (success)
    Status: "Done — 5 results" (green)
    Results: Displayed in grid
    Filters: State preserved
    
    ↓ (User clicks filter toggle)
    
3b. OR Error occurs
    Status: "Error" (red)
    Results: Error message shown
    Filters: State preserved
```

### Filter Toggle Interaction

```
1. Collapsed State (Default)
   ⚙️ Advanced Filters    ▼
   (No filters visible)
   
   ↓ (Click on toggle)
   
2. Expanding Animation
   Max-height: 0 → 1000px
   Duration: 0.3s ease
   Border: Turns red
   
3. Expanded State
   ⚙️ Advanced Filters    ▲
   ├─ Search Mode
   ├─ Freshness
   ├─ Results
   ├─ Provider
   ├─ Region
   └─ Proxy Type
   (Filters visible)
   
   ↓ (Click again)
   
4. Collapsing Animation
   Max-height: 1000px → 0
   Duration: 0.3s ease
   Border: Returns to subtle
```

---

## 🌐 Responsive Breakpoints

### Desktop (1200px+)
- Header: Full width, centered
- Main content: Max-width 1100px
- Filters: 2-column grid
- Results: 3-4 columns auto-fill
- Layout: Optimal spacing

### Tablet (900px - 1199px)
- Same as desktop, fewer result columns (2-3)
- Filters: Still 2-column

### Mobile (720px - 899px)
- Filters: Switch to 1-column
- Results: 2 columns
- Buttons: Full width available

### Small Mobile (< 720px)
- Everything: 1 column
- Header: Compressed padding
- Buttons: Stack vertically if needed
- Results: Single column
- Safe area: Respects notches

---

## ✨ Animation Specifications

### Collapsible Filters Expansion
```
Property: max-height
From: 0
To: 1000px
Duration: 0.3s
Easing: ease
Overflow: hidden
```

### Result Cards Fade-In
```
Property: opacity, transform
From: opacity 0, translateY(10px)
To: opacity 1, translateY(0)
Duration: 0.3s
Easing: ease
Class: .card.visible
```

### Hover Effects
```
Button:
  Transition: all 0.2s ease
  
Filter Header:
  Transition: all 0.2s ease
  
Input Focus:
  Outline: none
  Border: 1px solid #c8102e (Red)
```

---

## 🔐 Accessibility Features

### Semantic HTML
- `<header role="banner">`
- `<main role="main">`
- `<form role="search">`
- `<div aria-live="polite">` (results)

### ARIA Labels
- `aria-label="Search mode"`
- `aria-label="Search query"`
- `aria-label="Number of results"`

### Focus States
- All interactive elements have visible focus
- Red border on focus for consistency
- Min-height: 44px for touch targets

### Color Contrast
- Text (#e9eaee) on black (#0b0b0c): 17.4:1 ✓
- Status green (#22c55e) on black: 7.2:1 ✓
- Status amber (#f59e0b) on black: 7.8:1 ✓
- Status red (#ef4444) on black: 5.8:1 ✓

---

## 📊 Performance Notes

- **No blur effects:** Better performance (removed `backdrop-filter: blur`)
- **CSS variables:** Easy theme switching
- **Smooth animations:** 0.3s keeps interactions snappy
- **Responsive design:** Adapts to all screen sizes
- **Minimal JavaScript:** Simple toggle + status update

---

## 🎓 Customization Quick Guide

### Change Status Color
```javascript
// In .status.done { color: var(--ok); }
// Change var(--ok) to any color
```

### Change Red Accent
```javascript
// In :root { --accent: #c8102e; }
// Change to any hex color
```

### Change Collapse Speed
```javascript
// In .collapsible-content { transition: max-height 0.3s ease; }
// Change 0.3s to desired duration
```

### Disable Animations
```javascript
// Remove or comment out transition properties
// .card { transition: none; }
```

---

**All changes are live and ready to use! 🚀**

