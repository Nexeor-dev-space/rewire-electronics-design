# Admin Sidebar Improvements

## Overview
Enhanced the admin dashboard navigation with two new features to improve usability and content visibility.

## Features Implemented

### 1. Accordion-Style Dropdown Structure
Each navigation section (OVERVIEW, CATALOGUE, STOREFRONT, SALES, SERVICE, MARKETING, INTEGRATIONS, GOVERNANCE) now supports collapsible/expandable functionality.

**Features:**
- Click the section header to expand/collapse its items
- Smooth height animation when opening/closing
- Chevron icon rotates to indicate state (0° when open, -90° when closed)
- Sections are open by default
- Active sections (with currently selected items) are visually highlighted
- When sidebar is collapsed to icon-only view, accordion sections are also hidden

**Files Modified:**
- `src/components/admin/admin-nav.tsx`

### 2. Retractable Desktop Sidebar
The desktop navigation sidebar can now collapse to an icon-only view, freeing up horizontal space for content.

**Features:**
- Toggle button in the sidebar header (only visible on desktop/lg+)
- Smooth width animation: expanded (288px/18rem) ↔ collapsed (80px/5rem)
- Content area padding animates synchronously
- Mobile/tablet drawer navigation remains unaffected (always full-width)
- Brand logo hides when sidebar is collapsed
- Only shows section icons when collapsed
- Collapse state persists within the session

**Files Modified:**
- `src/components/admin/admin-shell.tsx`
- `src/components/admin/admin-nav.tsx`

## Technical Details

### Admin Navigation (`admin-nav.tsx`)
- Added `useState` hook to track open sections by area
- Added `collapsed` prop to conditionally render text/icons
- Section headers become clickable buttons with aria-expanded attributes
- Used Framer Motion for smooth accordion animations
  - Initial: `{ opacity: 0, height: 0 }`
  - Animate: `{ opacity: 1, height: "auto" }`
  - Exit: `{ opacity: 0, height: 0 }`
  - Duration: 0.2s
- Chevron icon rotates -90° when section is collapsed

### Admin Shell (`admin-shell.tsx`)
- Added `sidebarCollapsed` state to track collapse state
- Desktop rail (fixed aside) animates width between 288px and 80px
- Content column animates padding-left between 288px and 80px
- Both use Framer Motion with 0.3s duration and EASE_OUT_EXPO easing
- Toggle button in rail header controls the collapse state
- Button is hidden on mobile (lg:block class)
- Drawer navigation (mobile) passes `collapsed={false}` to always show full text

## User Interactions

### Expanding/Collapsing Sections
1. Click on any section header (CATALOGUE, STOREFRONT, etc.)
2. Section expands/collapses with smooth animation
3. Chevron rotates to indicate current state

### Toggling Sidebar
**Desktop only:**
1. Click the collapse/expand button in the sidebar header (top right of sidebar)
2. Sidebar animates to compact icon-only view
3. Content area expands to use the freed space
4. Click again to restore full sidebar with labels

## Browser Support
- Uses Framer Motion for animations (excellent browser compatibility)
- All animations are smooth on modern browsers
- Gracefully degrades if animations are disabled (prefers-reduced-motion)

## Performance Considerations
- Accordion state is local to the component (resets on navigation)
- Sidebar collapse state is local to the session (resets on page reload)
- No external dependencies added
- Animations use GPU-accelerated properties (transform, opacity)

## Future Enhancements
- Persist sidebar collapse state to localStorage or server preferences
- Persist accordion section state across navigation
- Add keyboard shortcuts (e.g., Cmd+B to toggle sidebar)
- Add animation preference detection (prefers-reduced-motion)
