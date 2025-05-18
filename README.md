# Layout Resource Plan System

A web-based management tool for tracking and planning IC layout resource assignments, including schematic and layout milestones, designer ownership, and weekly workload visualization.

## Features

### Tabs

* **Designer Tab**: Manage IP-level scheduling per designer
* **Layout Leader Tab**: Assign layout ownership, split IPs, and view milestones
* **Layout Tab**: Track weekly workload per layout owner and mark closure status
* **Gantt Tab**: Visualize timelines of all IPs across weeks in a Gantt chart

### Functions

* CSV import/export
* Dynamic Gantt rendering with weekly breakdowns
* Weekly input of man-day contribution
* IP duplication and deletion
* Designer and Layout Owner filtering
* Reopening closed tasks with audit tracking

---

## File Structure Overview

```
my-layout-app-fixed/
├── src/
│   ├── App.jsx                 # Main application entry with routing and tab switching
│   ├── index.css              # Global styles
│   ├── components/
│   │   ├── DesignerTab.jsx    # Designer tab UI and logic
│   │   ├── LayoutLeaderTab.jsx# Layout Leader tab: owner assignment & IP split
│   │   ├── LayoutTab.jsx      # Layout tab: weekly work reporting
│   │   ├── GanttChart.jsx     # Gantt tab: visual scheduling overview
│   │   └── SplitIpModal.jsx   # Modal UI for IP splitting feature
│   ├── utils/
│   │   ├── dateUtils.js       # Utility functions: date calculation, working days
│   │   ├── ganttUtils.js      # ISO week helpers, Gantt bar calculations
│   │   └── csvUtils.js        # CSV import/export parser helpers
```

## Development

### Setup

```bash
npm install
npm run dev
```

### Tech Stack

* React
* Vite
* react-datepicker

---

## Author

Developed by Erik Liu for internal layout resource planning.

## License

MIT (or customize for your internal use)
