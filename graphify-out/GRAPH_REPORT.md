# Graph Report - ClassScheduler  (2026-06-03)

## Corpus Check
- 28 files · ~14,707 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 192 nodes · 271 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd8c3a5e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 30 edges
2. `TuiText()` - 14 edges
3. `expo` - 11 edges
4. `scripts` - 9 edges
5. `MainApp()` - 6 edges
6. `TUI Template Native (Expo / React Native)` - 5 edges
7. `TuiContainer()` - 4 edges
8. `syncNotifications()` - 4 edges
9. `🚀 Getting Started` - 4 edges
10. `🎨 Brutalist Design System (TUI)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `DayButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `TuiSegmentedMeter()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/tui-chart.tsx → src/theme/theme-provider.tsx
- `TuiProgressMeter()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/tui-chart.tsx → src/theme/theme-provider.tsx
- `TuiBarChart()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/tui-chart.tsx → src/theme/theme-provider.tsx

## Communities (18 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (35): styles, TuiButton(), TuiButtonProps, MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (23): ClassItem, DAY_NAMES_SHORT, DAY_NAMES_SUNDAY_START, DayButton(), DayButtonProps, DAYS_OF_WEEK, DEFAULT_CLASSES, getHeaderBgColor() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (18): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (19): dependencies, expo, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono, expo-notifications, expo-sharing (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (14): author, main, name, private, scripts, android, format, ios (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (9): ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps, TuiSegmentedMeter() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier, @types/node (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (4): ScreenType, styles, TuiTabBar(), TuiTabBarProps

### Community 10 - "Community 10"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (4): SPRING_CONFIG_OPEN, styles, TuiDrawer(), TuiDrawerProps

## Knowledge Gaps
- **119 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `Community 0` to `Community 1`, `Community 5`, `Community 17`, `Community 9`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 7` to `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08080808080808081 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._