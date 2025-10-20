# Jack Portal UI - Visual Layout Guide

**Date:** October 20, 2025  
**Current Theme:** Dark Mode (Modern/Premium aesthetic)

---

## 🎨 Overall Visual Structure

```
┌─────────────────────────────────────────────────┐
│  HEADER (Dark with blur effect)                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Jack Portal              [Login Button] │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                                                 │
│  MAIN CONTENT AREA                              │
│  ┌──────────────────────────────────────────┐  │
│  │ Search Panel                             │  │
│  │ ┌────────────────────────────────────┐  │  │
│  │ │ Search Query                       │  │  │
│  │ │ ┌─────────────────────────────────┐│  │  │
│  │ │ │                                 ││  │  │
│  │ │ └─────────────────────────────────┘│  │  │
│  │ │                                     │  │  │
│  │ │ Search Mode  │  Freshness          │  │  │
│  │ │ Results      │  Provider           │  │  │
│  │ │ Region       │  Proxy Type         │  │  │
│  │ │                                     │  │  │
│  │ │ [Search] [Proxy Status]             │  │  │
│  │ └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Results Grid (Auto-layout)               │  │
│  │ ┌────────┐ ┌────────┐ ┌────────┐        │  │
│  │ │Result1 │ │Result2 │ │Result3 │ ...   │  │
│  │ └────────┘ └────────┘ └────────┘        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│ Ready                              [Status]   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎭 Current Color Scheme (Dark Mode)

### CSS Variables (in `:root`)
```css
--bg:           #0b0b0c      /* Main background - Almost black */
--panel:        #141416      /* Panel background - Dark gray */
--panel-2:      #1a1b1e      /* Secondary panel - Darker gray */
--muted:        #9aa0a6      /* Muted text - Light gray */
--txt:          #e9eaee      /* Main text - Off white */
--accent:       #3b82f6      /* Primary blue - Bright */
--accent-2:     #2563eb      /* Secondary blue - Darker */
--ok:           #22c55e      /* Success - Green */
--bad:          #ef4444      /* Error - Red */
--radius:       14px         /* Border radius */
```

### Visual Examples
- **Dark backgrounds:** #0b0b0c, #141416
- **Text colors:** #e9eaee (main), #9aa0a6 (secondary)
- **Interactive colors:** #3b82f6 (blue accent), #22c55e (green ok), #ef4444 (red error)
- **Borders:** 1px solid #1f2024 (very dark gray)

---

## 📐 Layout Components

### 1. **Header**
```
Position: Sticky at top
Background: Semi-transparent dark (#0f1012cc) with blur effect
Height: ~44px + safe area padding
Content: Logo ("Jack Portal") + Login button (right-aligned)
Border: Bottom border with subtle color
```

**CSS:**
```css
header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #0f1012cc;
  backdrop-filter: saturate(120%) blur(6px);
  padding: calc(14px + var(--safe-area-inset-top)) 16px 14px;
  border-bottom: 1px solid #1f2024;
}
```

### 2. **Main Content Area**
```
Max-width: 1100px (centered)
Padding: 16px (with safe area support)
Contains: Search panel, results grid, status
Responsive: Full width on mobile
```

### 3. **Search Panel**
```
Type: .panel class
Background: --panel (#141416)
Border: 1px solid #1f2024
Padding: 16px
Border-radius: 14px
Content: Form with inputs, selects, buttons
```

**Layout Grid:**
- Full width search query
- 2-column row for: Mode + Freshness
- 2-column row for: Results + Provider
- 2-column row for: Region + Proxy Type
- Buttons below (Search, Proxy Status)

### 4. **Input Elements**
```
All inputs/selects:
- Width: 100% of container
- Padding: 12px
- Border-radius: 10px
- Border: 1px solid #23252b
- Background: --panel-2 (#1a1b1e)
- Color: --txt (#e9eaee)
- Min-height: 44px (mobile-friendly)
```

### 5. **Results Grid**
```
Type: Auto-fill responsive grid
Min-card-width: 280px
Gap: 14px
Cards scale: 1-4 columns depending on screen size
```

### 6. **Result Card**
```
Background: --panel-2 (#1a1b1e)
Border: 1px solid #22252b
Padding: 12px
Border-radius: 12px
Animation: Fade-in + slide-up (0.3s ease)
Content: Title, metadata, snippet, link
```

---

## 🔧 CUSTOMIZATION GUIDE

### Change 1: Dark Mode → Light Mode

**Step 1:** Modify CSS variables in `src/html.js` (around line 14):

```javascript
// FIND THIS:
--bg:#0b0b0c; --panel:#141416; --panel-2:#1a1b1e; --muted:#9aa0a6; --txt:#e9eaee;

// REPLACE WITH:
--bg:#f5f5f7; --panel:#ffffff; --panel-2:#f9f9fb; --muted:#6b7280; --txt:#1f2937;
```

### Change 2: Accent Color (Blue → Purple, Green, etc.)

**Step 1:** Find the accent colors in `src/html.js` (line 14):

```javascript
// Current (Blue):
--accent:#3b82f6; --accent-2:#2563eb;

// Purple:
--accent:#9333ea; --accent-2:#7e22ce;

// Green:
--accent:#16a34a; --accent-2:#15803d;

// Red/Pink:
--accent:#ec4899; --accent-2:#db2777;
```

### Change 3: Border Radius (Modern → Minimal)

**Step 1:** Find `--radius` in CSS variables (line 14):

```javascript
// Current (Modern/Rounded):
--radius:14px;

// Minimal (Flat):
--radius:4px;

// Ultra-Rounded (Pill-shaped):
--radius:24px;
```

### Change 4: Font Style

**Step 1:** Find font definition in `src/html.js` (line 23):

```javascript
// Current (System fonts):
font:16px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;

// Professional (Serif):
font:16px 'Georgia','Times New Roman',serif;

// Modern (Specific):
font:16px 'Inter','Helvetica Neue',sans-serif;
```

### Change 5: Header Style

**Option A:** Remove blur effect (minimal style):

Find this in header CSS:
```javascript
backdrop-filter: saturate(120%) blur(6px);

// Replace with:
backdrop-filter: none;
```

**Option B:** Make header more solid:

```javascript
background: #0f1012cc;

// Replace with:
background: #0b0b0c; /* Full opacity */
```

### Change 6: Result Card Animation

**Step 1:** Find `.card` class (around line 80):

```javascript
// Current (Fade + Slide):
opacity: 0;
transform: translateY(10px);
transition: opacity 0.3s ease, transform 0.3s ease;

// No animation:
opacity: 1;
transform: none;
transition: none;

// Fade only:
opacity: 0;
transform: none;
transition: opacity 0.3s ease;

// Scale animation:
opacity: 0;
transform: scale(0.95);
transition: opacity 0.3s ease, transform 0.3s ease;
```

### Change 7: Panel Spacing/Padding

**Step 1:** Find `.panel` class (around line 50):

```javascript
// Current:
.panel{background:var(--panel);border:1px solid #1f2024;border-radius:var(--radius);padding:16px}

// More spacious:
.panel{background:var(--panel);border:1px solid #1f2024;border-radius:var(--radius);padding:24px}

// Minimal:
.panel{background:var(--panel);border:1px solid #1f2024;border-radius:var(--radius);padding:12px}
```

### Change 8: Grid Layout (Columns)

**Step 1:** Find `.grid` class (around line 65):

```javascript
// Current (Min 280px per card):
grid-template-columns:repeat(auto-fill,minmax(280px,1fr));

// Larger cards:
grid-template-columns:repeat(auto-fill,minmax(350px,1fr));

// Smaller cards:
grid-template-columns:repeat(auto-fill,minmax(200px,1fr));

// Fixed 3 columns:
grid-template-columns:repeat(3,1fr);
```

### Change 9: Button Styling

**Step 1:** Find `button` CSS (around line 60):

```javascript
// Current:
button{
  appearance:none;border:0;border-radius:10px;background:var(--accent);
  color:#fff;padding:12px 16px;font-weight:600;cursor:pointer;
}

// Add borders:
button{
  appearance:none;border:2px solid var(--accent);border-radius:10px;background:transparent;
  color:var(--accent);padding:12px 16px;font-weight:600;cursor:pointer;
}

// Larger buttons:
button{
  appearance:none;border:0;border-radius:10px;background:var(--accent);
  color:#fff;padding:16px 24px;font-weight:600;cursor:pointer;font-size:18px;
}
```

### Change 10: Mobile Responsiveness

**Step 1:** Modify responsive breakpoint (around line 48):

```javascript
// Current (2 columns → 1 on small screens):
@media (max-width:720px){.row{grid-template-columns:1fr}}

// Adjust breakpoint:
@media (max-width:600px){.row{grid-template-columns:1fr}}  /* More aggressive */
@media (max-width:900px){.row{grid-template-columns:1fr}}  /* Less aggressive */
```

---

## 📱 Layout Features Explained

### Safe Area Support
The UI includes safe area support for notched phones:
```css
padding-top: var(--safe-area-inset-top);
padding-bottom: var(--safe-area-inset-bottom);
```
This automatically adapts to iPhone notches and Android cutouts.

### Sticky Header
The header stays at top while scrolling:
```css
position: sticky;
top: 0;
z-index: 5;
```

### Responsive Grid
Results automatically adjust to screen size:
```css
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
```
- On 1200px+: ~4 columns
- On 800px: ~2-3 columns
- On mobile: 1 column

### Glass Morphism (Header)
The header has a modern frosted glass effect:
```css
backdrop-filter: saturate(120%) blur(6px);
```

---

## 🎯 Quick Customization Examples

### Example 1: Clean, Minimal Look
```javascript
// 1. Change colors to light
--bg:#ffffff; --panel:#f5f5f5; --txt:#000000; --accent:#000000;

// 2. Remove blur
backdrop-filter: none;

// 3. Reduce radius
--radius:4px;

// 4. Reduce padding
padding:8px
```

### Example 2: Vibrant, Colorful
```javascript
// 1. Bright accent
--accent:#ff6b35; --accent-2:#ff4500;

// 2. Colorful panels
--panel:#1a0033; --panel-2:#330066;

// 3. Large radius
--radius:20px;

// 4. More spacing
padding:20px
```

### Example 3: Professional/Corporate
```javascript
// 1. Blue scheme
--accent:#0066cc; --accent-2:#004499;

// 2. Neutral colors
--panel:#f0f2f5; --txt:#1c1e21;

// 3. Minimal radius
--radius:6px;

// 4. Serif font
font: 'Georgia', serif;
```

---

## 📋 Key Files to Edit

| File | Section | What to Change |
|------|---------|---|
| `src/html.js` | Lines 12-16 | CSS Color Variables |
| `src/html.js` | Line 14-48 | Typography & Spacing |
| `src/html.js` | Line 45-95 | Layout & Grid Styles |
| `src/html.js` | Line 60-62 | Button Styling |
| `src/html.js` | Line 80-88 | Card Animations |
| `src/html.js` | Line 165-220 | Search Form Layout |
| `src/html.js` | Line 300+ | Results Display |

---

## 💡 Design Tips

1. **Contrast:** Keep text readable - ensure --txt has high contrast with backgrounds
2. **Spacing:** Consistent gaps (16px, 8px) create clean layouts
3. **Mobile:** Test on phone - always ensure min-height: 44px for touch targets
4. **Animation:** Subtle transitions (0.3s) feel more professional than instant changes
5. **Colors:** Limit to 5-7 colors for cohesive design

---

**All changes are made in `src/html.js` - this is the only UI file!**

After editing, deploy with: `wrangler publish`

