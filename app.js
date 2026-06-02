/**
 * ProjectForge - Logic, State & Rendering Controller
 * Secure, Vanilla JS, SPA Implementation
 */

// ==================== STATE MANAGEMENT ====================
let projects = [];
let activityStream = [];
let currentTheme = 'dark';
let activeProjectIdForMilestones = null;
let projectToDeleteId = null;

// Default Seeding Data (Mock premium developer projects loaded if empty)
const SEED_PROJECTS = [
  {
    id: "seed-projectforge",
    title: "ProjectForge &mdash; Developer Portfolio",
    description: "A premium glassmorphic Single Page Application for tracking and showcasing developer deliverables. Includes interactive checklist metrics, custom mathematical SVG dashboards, and offline local persistence.",
    status: "Completed",
    deadline: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days from now
    techStack: ["HTML", "CSS", "JavaScript", "SVG", "LocalStorage"],
    githubUrl: "https://github.com/developer/projectforge",
    liveUrl: "https://projectforge.dev",
    highlights: ["Completely immune to XSS injection", "Smooth dark/light SaaS HSL styling", "Pure vanilla JS SVG charts compiler"],
    notes: "System Requirements:\n- Modern evergreen browser supporting CSS custom variables and backdrop-filter.\n- Full offline operation via client-side storage.\n\nTechnical Architecture:\n- Encapsulated component structures.\n- Text-node rendering to completely bypass insecure markup elements.",
    milestones: [
      { id: "seed-m1", title: "Establish premium dark/light CSS tokens", completed: true, createdAt: new Date().toISOString() },
      { id: "seed-m2", title: "Design structural semantic HTML boundaries", completed: true, createdAt: new Date().toISOString() },
      { id: "seed-m3", title: "Build robust secure DOM creation controller", completed: true, createdAt: new Date().toISOString() },
      { id: "seed-m4", title: "Compile custom SVG analytics dashboard compiler", completed: true, createdAt: new Date().toISOString() }
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    updatedAt: new Date().toISOString(),
    statusHistory: [
      { status: "Planning", timestamp: new Date(Date.now() - 86400000 * 10).toISOString() },
      { status: "In Progress", timestamp: new Date(Date.now() - 86400000 * 8).toISOString() },
      { status: "Testing", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
      { status: "Completed", timestamp: new Date().toISOString() }
    ]
  },
  {
    id: "seed-career-nav",
    title: "AI Career Navigator Platform",
    description: "A professional portal providing automated roadmap generation, industry skill gap matrices, and dynamic career milestones powered by simulated LLM recommendations.",
    status: "In Progress",
    deadline: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], // 15 days from now
    techStack: ["React", "CSS", "Node.js", "Express", "D3.js"],
    githubUrl: "https://github.com/developer/ai-career-navigator",
    liveUrl: "",
    highlights: ["Dynamic interactive career trees", "Real-time API simulation for suggestions", "User roadmap history log"],
    notes: "Key Deliverables:\n- Integrate responsive flowchart visuals.\n- Implement persistent token caching strategy.\n- Build profile summary exporter.",
    milestones: [
      { id: "seed-c1", title: "Design responsive interactive tree structure", completed: true, createdAt: new Date().toISOString() },
      { id: "seed-c2", title: "Simulate LLM responses for dynamic queries", completed: true, createdAt: new Date().toISOString() },
      { id: "seed-c3", title: "Validate secure token caching parameters", completed: false, createdAt: new Date().toISOString() },
      { id: "seed-c4", title: "Run responsive browser audit", completed: false, createdAt: new Date().toISOString() }
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    statusHistory: [
      { status: "Planning", timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
      { status: "In Progress", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() }
    ]
  }
];

const SEED_ACTIVITY = [
  { text: "System Initialized: Default premium templates loaded", timestamp: new Date().toISOString(), type: "created" },
  { text: "ProjectForge application status changed to Completed", timestamp: new Date(Date.now() - 60000 * 5).toISOString(), type: "completed" },
  { text: "Milestone 'Build robust secure DOM creation controller' completed", timestamp: new Date(Date.now() - 60000 * 30).toISOString(), type: "milestone" }
];

// ==================== SECURE DOM BUILDER UTILITY ====================
/**
 * Strictly secure DOM construction tool. Completely bans innerHTML.
 * Protects application against HTML attributes breakouts and XSS injections.
 */
function el(type, attrs = {}, children = []) {
  // SVG support validation
  const isSvg = ['svg', 'path', 'circle', 'line', 'polyline', 'polygon', 'rect', 'text', 'g', 'defs', 'linearGradient', 'stop'].includes(type);
  const element = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', type)
    : document.createElement(type);

  for (const [key, val] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof val === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), val);
    } else if (key === 'className') {
      element.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(element.style, val);
    } else if (val !== null && val !== undefined) {
      element.setAttribute(key, val);
    }
  }

  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement || child instanceof SVGElement) {
      element.appendChild(child);
    }
  }

  return element;
}

// Custom Premium Toast Notification
function showToast(message, type = 'success') {
  const existingContainer = document.getElementById('toast-container');
  const container = existingContainer || el('div', { id: 'toast-container', style: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: '1000',
    pointerEvents: 'none'
  }});

  if (!existingContainer) {
    document.body.appendChild(container);
  }

  const bg = type === 'success' ? 'var(--status-completed-bg)' : type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)';
  const color = type === 'success' ? 'var(--status-completed-text)' : type === 'error' ? '#f87171' : 'var(--text-primary)';
  const borderColor = type === 'success' ? 'rgba(16, 185, 129, 0.3)' : type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)';

  const toast = el('div', {
    style: {
      background: bg,
      backdropFilter: 'blur(8px)',
      border: `1px solid ${borderColor}`,
      color: color,
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '0.85rem',
      fontWeight: '600',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      fontFamily: 'var(--font-logo)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transform: 'translateY(20px)',
      opacity: '0',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25)',
      pointerEvents: 'auto'
    }
  }, [
    type === 'success' ? '✓ ' : 'ℹ ',
    message
  ]);

  container.appendChild(toast);

  // Trigger animation frame
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 50);

  // Auto clean up
  setTimeout(() => {
    toast.style.transform = 'translateY(-20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 4000);
}

// ==================== STORAGE CONTROLLER ====================
function loadData() {
  try {
    const rawProjects = localStorage.getItem('projectforge_projects');
    const rawActivity = localStorage.getItem('projectforge_activity');
    const rawTheme = localStorage.getItem('projectforge_theme');

    if (rawProjects) {
      projects = JSON.parse(rawProjects);
    } else {
      projects = [...SEED_PROJECTS];
      localStorage.setItem('projectforge_projects', JSON.stringify(projects));
    }

    if (rawActivity) {
      activityStream = JSON.parse(rawActivity);
    } else {
      activityStream = [...SEED_ACTIVITY];
      localStorage.setItem('projectforge_activity', JSON.stringify(activityStream));
    }

    if (rawTheme) {
      currentTheme = rawTheme;
    } else {
      currentTheme = 'dark';
    }
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    syncThemeIcons();

  } catch (error) {
    console.error("Error loading portfolio state from LocalStorage:", error);
    showToast("Failed to load saved state. Storage might be corrupt.", "error");
  }
}

function saveData() {
  try {
    localStorage.setItem('projectforge_projects', JSON.stringify(projects));
    localStorage.setItem('projectforge_activity', JSON.stringify(activityStream));
    localStorage.setItem('projectforge_theme', currentTheme);
  } catch (error) {
    console.error("Error committing state changes to LocalStorage:", error);
    showToast("Local Storage is full! Failed to save current details.", "error");
  }
}

function logActivity(text, type = 'info') {
  activityStream.unshift({
    text,
    timestamp: new Date().toISOString(),
    type
  });
  
  // Keep timeline compact
  if (activityStream.length > 20) {
    activityStream.pop();
  }
  
  saveData();
  renderActivityTimeline();
}

// ==================== DYNAMIC GRAPHICS & RENDERERS ====================

// Left Sidebar Metrics Coordinator
function updateSidebarStats() {
  const total = projects.length;
  const completed = projects.filter(p => p.status === 'Completed').length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('quick-total').textContent = total;
  document.getElementById('quick-completed').textContent = completed;
  document.getElementById('quick-rate').textContent = `${rate}%`;

  // Sync to analytics counters if visible
  const mTotal = document.getElementById('metric-total');
  const mCompleted = document.getElementById('metric-completed');
  const mActive = document.getElementById('metric-active');
  const mRate = document.getElementById('metric-rate');

  if (mTotal) mTotal.textContent = total;
  if (mCompleted) mCompleted.textContent = completed;
  if (mActive) mActive.textContent = projects.filter(p => p.status === 'In Progress' || p.status === 'Testing').length;
  if (mRate) mRate.textContent = `${rate}%`;
}

// Render Upcoming Deadline Alert Indicators
function renderDeadlineAlerts() {
  const alertsList = document.getElementById('deadlines-alerts-list');
  if (!alertsList) return;
  
  alertsList.replaceChildren();
  
  const now = new Date();
  const nextSevenDays = new Date(Date.now() + 86400000 * 7);
  
  const closeProjects = projects.filter(p => {
    if (!p.deadline || p.status === 'Completed') return false;
    const due = new Date(p.deadline);
    return due >= now && due <= nextSevenDays;
  });

  const overdueProjects = projects.filter(p => {
    if (!p.deadline || p.status === 'Completed') return false;
    const due = new Date(p.deadline);
    due.setHours(23,59,59,999); // End of deadline day
    return due < now;
  });

  if (closeProjects.length === 0 && overdueProjects.length === 0) {
    alertsList.appendChild(
      el('div', { className: 'empty-alerts' }, ['All clear! No upcoming deadlines within 7 days.'])
    );
    return;
  }

  // Overdue Reminders First
  overdueProjects.forEach(p => {
    const card = el('div', { className: 'alert-item urgent' }, [
      el('span', { className: 'alert-icon' }, ['⚠️']),
      el('div', { className: 'alert-content' }, [
        el('span', { className: 'alert-msg' }, [`Overdue: ${p.title}`]),
        el('span', { className: 'alert-meta' }, [`Deadline passed: ${p.deadline}`])
      ])
    ]);
    alertsList.appendChild(card);
  });

  // Upcoming Reminders
  closeProjects.forEach(p => {
    const diffTime = Math.abs(new Date(p.deadline) - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const card = el('div', { className: 'alert-item info' }, [
      el('span', { className: 'alert-icon' }, ['⏰']),
      el('div', { className: 'alert-content' }, [
        el('span', { className: 'alert-msg' }, [`Due in ${diffDays} day${diffDays > 1 ? 's' : ''}: ${p.title}`]),
        el('span', { className: 'alert-meta' }, [`Target date: ${p.deadline}`])
      ])
    ]);
    alertsList.appendChild(card);
  });
}

// Sync tech badge options & tag clouds in sidebar
function renderTechFrequency() {
  const techCloud = document.getElementById('tech-frequency-cloud');
  const techFilterDropdown = document.getElementById('filter-tech');
  if (!techCloud || !techFilterDropdown) return;

  // Compile tag frequency dictionary
  const techCounts = {};
  projects.forEach(p => {
    if (p.techStack && Array.isArray(p.techStack)) {
      p.techStack.forEach(t => {
        const cleaned = t.trim();
        if (cleaned) {
          techCounts[cleaned] = (techCounts[cleaned] || 0) + 1;
        }
      });
    }
  });

  // Sort technologies by count desc
  const sortedTechs = Object.entries(techCounts).sort((a, b) => b[1] - a[1]);

  // Render sidebar technology cloud nodes
  techCloud.replaceChildren();
  if (sortedTechs.length === 0) {
    techCloud.appendChild(
      el('div', { className: 'empty-techs' }, ['Add technology tags in your projects to view distribution.'])
    );
  } else {
    // Top 8 technologies
    sortedTechs.slice(0, 8).forEach(([techName, count]) => {
      const activeFilter = activeTechFilter === techName ? ' active-filter' : '';
      const badge = el('span', {
        className: `tech-tag-badge${activeFilter}`,
        onClick: () => handleSidebarTechClick(techName)
      }, [
        techName,
        el('span', { className: 'tech-tag-count' }, [count])
      ]);
      techCloud.appendChild(badge);
    });
  }

  // Sync Dropdown Options in Controls bar
  const currentlySelectedVal = techFilterDropdown.value;
  techFilterDropdown.replaceChildren();
  techFilterDropdown.appendChild(el('option', { value: 'ALL' }, ['All Technologies']));
  
  Object.keys(techCounts).sort().forEach(tech => {
    techFilterDropdown.appendChild(el('option', { value: tech }, [tech]));
  });

  // Keep selection if it still exists
  if (techCounts[currentlySelectedVal]) {
    techFilterDropdown.value = currentlySelectedVal;
  } else {
    techFilterDropdown.value = 'ALL';
  }
}

// Side Stream activity stream render
function renderActivityTimeline() {
  const timeline = document.getElementById('activity-timeline-feed');
  if (!timeline) return;

  timeline.replaceChildren();
  if (activityStream.length === 0) {
    timeline.appendChild(el('div', { className: 'empty-timeline' }, ['No recent activity. Start planning milestones!']));
    return;
  }

  const container = el('div', { className: 'activity-timeline' });
  
  activityStream.slice(0, 8).forEach(act => {
    const date = new Date(act.timestamp);
    const friendlyTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const friendlyDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let itemClass = 'activity-item';
    if (act.type === 'created') itemClass += ' created';
    else if (act.type === 'completed') itemClass += ' completed';
    else if (act.type === 'milestone') itemClass += ' milestone';
    else if (act.type === 'delete') itemClass += ' delete';

    const item = el('div', { className: itemClass }, [
      el('div', { className: 'activity-dot' }),
      el('span', { className: 'activity-text' }, [act.text]),
      el('span', { className: 'activity-time' }, [`${friendlyDate} at ${friendlyTime}`])
    ]);
    container.appendChild(item);
  });

  timeline.appendChild(container);
}

// ==================== PROJECT CARD COMPILED RENDER ====================
let activeTechFilter = 'ALL';

function handleSidebarTechClick(tech) {
  const drop = document.getElementById('filter-tech');
  if (activeTechFilter === tech) {
    activeTechFilter = 'ALL';
    if (drop) drop.value = 'ALL';
  } else {
    activeTechFilter = tech;
    if (drop) drop.value = tech;
  }
  renderTechFrequency();
  filterAndRenderProjects();
}

// Calculate precise project completion %
function calculateProjectProgress(project) {
  if (project.milestones && project.milestones.length > 0) {
    const completed = project.milestones.filter(m => m.completed).length;
    return Math.round((completed / project.milestones.length) * 100);
  }
  return project.manualProgress !== undefined ? project.manualProgress : 0;
}

// Compile a beautiful responsive Project Card DOM node
function buildProjectCard(p) {
  const progress = calculateProjectProgress(p);
  
  // Format deadline readability
  const targetDate = new Date(p.deadline);
  const now = new Date();
  const isOverdue = targetDate < now && p.status !== 'Completed';
  
  // Check if due in less than 48 hours
  const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
  const isDueSoon = diffDays >= 0 && diffDays <= 2 && p.status !== 'Completed';

  let deadlineClass = 'project-card-deadline';
  let deadlineLabel = `Deadline: ${p.deadline}`;
  if (isOverdue) {
    deadlineClass += ' overdue';
    deadlineLabel = `⚠️ OVERDUE: ${p.deadline}`;
  } else if (isDueSoon) {
    deadlineClass += ' due-soon';
    deadlineLabel = `⏳ Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }

  // Status visual configurations
  const statusLower = p.status.toLowerCase().replace(' ', '-');

  // Build element
  return el('article', { className: 'project-card', id: `p-card-${p.id}` }, [
    
    // Header Row
    el('div', { className: 'project-card-header' }, [
      el('h3', { className: 'project-card-title font-glow' }, [p.title]),
      el('span', { className: `status-badge ${statusLower}` }, [p.status])
    ]),

    // Description text
    el('p', { className: 'project-card-desc' }, [p.description]),

    // Progress Bar
    el('div', { className: 'project-card-progress' }, [
      el('div', { className: 'progress-header-row' }, [
        el('span', {}, ['Progress']),
        el('span', { className: 'font-glow', style: { color: 'var(--accent-secondary)', fontWeight: 'bold' } }, [`${progress}%`])
      ]),
      el('div', { className: 'progress-bar-bg' }, [
        el('div', { className: 'progress-bar-fill', style: { width: `${progress}%` } })
      ])
    ]),

    // Technology badging
    el('div', { className: 'project-card-tech' }, 
      p.techStack.map(t => el('span', { className: 'tech-badge' }, [t.trim()]))
    ),

    // Target Date
    el('div', { className: deadlineClass }, [
      el('svg', { viewBox: '0 0 24 24', width: '12', height: '12', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
        el('circle', { cx: '12', cy: '12', r: '10' }),
        el('polyline', { points: '12 6 12 12 16 14' })
      ]),
      deadlineLabel
    ]),

    // Actions Footer
    el('div', { className: 'project-card-footer' }, [
      
      // Control buttons (Edit / Delete)
      el('div', { className: 'card-actions-left' }, [
        el('button', {
          className: 'card-icon-btn',
          title: 'Edit Project Settings',
          onClick: () => openProjectModalForEdit(p)
        }, [
          el('svg', { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
            el('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
            el('path', { d: 'M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
          ])
        ]),
        el('button', {
          className: 'card-icon-btn delete-btn',
          title: 'Delete Project Permanently',
          onClick: () => triggerDeleteConfirmation(p.id, p.title)
        }, [
          el('svg', { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
            el('polyline', { points: '3 6 5 6 21 6' }),
            el('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
          ])
        ])
      ]),

      // Direct Link to milestones
      el('button', {
        className: 'card-text-btn',
        onClick: () => openMilestoneModal(p.id)
      }, [
        'Milestones & Notes',
        el('svg', { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          el('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
          el('polyline', { points: '12 5 19 12 12 19' })
        ])
      ])

    ])
  ]);
}

// Build a beautiful Showcase layout block for portfolio displays
function buildShowcaseCard(p) {
  // Highlights split values
  const highlights = p.highlights && p.highlights.length > 0
    ? p.highlights
    : ["Includes full system design features", "Responsive cross-browser layouts"];

  const techRow = el('div', { className: 'project-card-tech' }, 
    p.techStack.map(t => el('span', { className: 'tech-badge', style: { borderColor: 'rgba(139, 92, 246, 0.2)' } }, [t.trim()]))
  );

  const linksContainer = el('div', { className: 'showcase-links' });

  // GitHub Icon Button setup
  if (p.githubUrl) {
    linksContainer.appendChild(
      el('a', {
        href: p.githubUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'showcase-link-btn'
      }, [
        el('svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          el('path', { d: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22' })
        ]),
        'Repository'
      ])
    );
  }

  // Live deployment setup
  if (p.liveUrl) {
    linksContainer.appendChild(
      el('a', {
        href: p.liveUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'showcase-link-btn primary-link'
      }, [
        el('svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          el('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }),
          el('polyline', { points: '15 3 21 3 21 9' }),
          el('line', { x1: '10', y1: '14', x2: '21', y2: '3' })
        ]),
        'Live Preview'
      ])
    );
  }

  // Element layout
  return el('section', { className: 'showcase-card' }, [
    el('div', { className: 'showcase-title-row' }, [
      el('h3', { className: 'showcase-title font-glow' }, [p.title]),
      el('span', { className: 'status-badge completed' }, ['🏆 Showcase Ready'])
    ]),
    el('p', { className: 'showcase-desc' }, [p.description]),
    techRow,
    
    // Core Achievements/Highlights List
    el('div', { className: 'showcase-highlights-section' }, [
      el('span', { className: 'showcase-hl-title' }, ['Technical Deliverables']),
      el('ul', { className: 'showcase-hl-list' }, 
        highlights.map(hl => el('li', { className: 'showcase-hl-item' }, [
          el('span', { className: 'showcase-hl-dot' }, ['•']),
          hl.trim()
        ]))
      )
    ]),

    linksContainer
  ]);
}

// ==================== DASHBOARD GRID CONTROLLER ====================
function filterAndRenderProjects() {
  const container = document.getElementById('projects-grid-container');
  const emptyState = document.getElementById('dashboard-empty-state');
  if (!container) return;

  // Read active controls
  const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
  const statusVal = document.getElementById('filter-status').value;
  const sortVal = document.getElementById('sort-select').value;
  
  // Update sidebar tech binding cache in dropdown
  const techVal = document.getElementById('filter-tech').value;
  activeTechFilter = techVal;

  let filtered = projects.filter(p => {
    // 1. Search Query Match
    const matchesSearch = searchVal === '' || 
      p.title.toLowerCase().includes(searchVal) ||
      p.description.toLowerCase().includes(searchVal) ||
      p.techStack.some(t => t.toLowerCase().includes(searchVal)) ||
      (p.notes && p.notes.toLowerCase().includes(searchVal));

    // 2. Status Match
    const matchesStatus = statusVal === 'ALL' || p.status === statusVal;

    // 3. Tech Stack Match
    const matchesTech = activeTechFilter === 'ALL' || p.techStack.some(t => t.trim() === activeTechFilter);

    return matchesSearch && matchesStatus && matchesTech;
  });

  // Apply Sorting Logic
  filtered.sort((a, b) => {
    if (sortVal === 'deadline-asc') {
      return new Date(a.deadline) - new Date(b.deadline);
    } else if (sortVal === 'deadline-desc') {
      return new Date(b.deadline) - new Date(a.deadline);
    } else if (sortVal === 'progress-desc') {
      return calculateProjectProgress(b) - calculateProjectProgress(a);
    } else if (sortVal === 'progress-asc') {
      return calculateProjectProgress(a) - calculateProjectProgress(b);
    } else if (sortVal === 'title-asc') {
      return a.title.localeCompare(b.title);
    } else if (sortVal === 'createdAt-desc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  // Re-draw grid completely via secure replaceChildren
  container.replaceChildren();

  if (filtered.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    
    filtered.forEach(p => {
      container.appendChild(buildProjectCard(p));
    });
  }

  // Render Dashboard Top Stats Strip
  renderDashboardStatsStrip(filtered);
}

// Render dynamic strip metrics inside dashboard view
function renderDashboardStatsStrip(currentSet) {
  const statsStrip = document.getElementById('dashboard-stats-strip');
  if (!statsStrip) return;

  const total = currentSet.length;
  const completed = currentSet.filter(p => p.status === 'Completed').length;
  const active = currentSet.filter(p => p.status === 'In Progress' || p.status === 'Testing').length;
  const planning = currentSet.filter(p => p.status === 'Planning').length;

  statsStrip.replaceChildren(
    el('div', { className: 'ds-card' }, [
      el('div', { className: 'ds-icon-box', style: { background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' } }, ['📁']),
      el('div', { className: 'ds-meta' }, [
        el('span', { className: 'ds-lbl' }, ['Filtered']),
        el('span', { className: 'ds-val' }, [total])
      ])
    ]),
    el('div', { className: 'ds-card' }, [
      el('div', { className: 'ds-icon-box', style: { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-progress-text)' } }, ['⚡']),
      el('div', { className: 'ds-meta' }, [
        el('span', { className: 'ds-lbl' }, ['Active Tasks']),
        el('span', { className: 'ds-val' }, [active])
      ])
    ]),
    el('div', { className: 'ds-card' }, [
      el('div', { className: 'ds-icon-box', style: { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-completed-text)' } }, ['🏆']),
      el('div', { className: 'ds-meta' }, [
        el('span', { className: 'ds-lbl' }, ['Ready Portfolio']),
        el('span', { className: 'ds-val' }, [completed])
      ])
    ])
  );
}

// Render showcase ready completed items
function renderShowcaseGrid() {
  const container = document.getElementById('showcase-grid-container');
  const emptyState = document.getElementById('showcase-empty-state');
  if (!container) return;

  const completed = projects.filter(p => p.status === 'Completed');
  container.replaceChildren();

  if (completed.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    
    completed.forEach(p => {
      container.appendChild(buildShowcaseCard(p));
    });
  }
}

// ==================== CUSTOM SVG MATHEMATICAL CHARTS ENGINE ====================
function renderAnalyticsCharts() {
  renderStatusDonutChart();
  renderMilestoneTrendsChart();
  renderAIInsights();
}

/**
 * Renders status donut chart dynamically using SVG elements and basic geometry equations.
 * Completely custom mathematical renderer.
 */
function renderStatusDonutChart() {
  const container = document.getElementById('status-donut-chart-container');
  const legend = document.getElementById('status-donut-legend');
  if (!container || !legend) return;

  container.replaceChildren();
  legend.replaceChildren();

  const statuses = ['Planning', 'In Progress', 'Testing', 'Completed'];
  const colors = ['#38bdf8', '#fbbf24', '#c084fc', '#34d399'];
  const counts = statuses.map(st => projects.filter(p => p.status === st).length);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    container.appendChild(el('div', { style: { fontSize: '0.8rem', color: 'var(--text-muted)' } }, ['No projects available to compile chart.']));
    return;
  }

  // Circle Dimensions
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~314.159
  
  // Construct the base SVG
  const svg = el('svg', {
    viewBox: '0 0 140 140',
    width: '180',
    height: '180',
    style: { transform: 'rotate(-90deg)', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.15))' }
  });

  let runningOffset = 0;

  statuses.forEach((status, idx) => {
    const count = counts[idx];
    const percentage = count / total;
    const strokeLength = percentage * circumference;
    const strokeOffset = circumference - runningOffset;
    
    if (count > 0) {
      // Draw Arc Circle Segment
      const arc = el('circle', {
        cx: '70',
        cy: '70',
        r: radius.toString(),
        fill: 'transparent',
        stroke: colors[idx],
        'stroke-width': strokeWidth.toString(),
        'stroke-dasharray': `${strokeLength} ${circumference}`,
        'stroke-dashoffset': strokeOffset.toString(),
        style: { transition: 'stroke-dashoffset 0.6s ease' }
      });
      svg.appendChild(arc);
      runningOffset += strokeLength;
    }

    // Build Legend Row securely
    legend.appendChild(
      el('div', { className: 'legend-item' }, [
        el('span', { className: 'legend-dot', style: { background: colors[idx] } }),
        el('span', { style: { fontWeight: '600', color: 'var(--text-primary)' } }, [`${count}`]),
        el('span', {}, [status])
      ])
    );
  });

  // Dynamic Inner Total Display
  const textGroup = el('g', { style: { transform: 'rotate(90deg) translate(0px, -140px)', transformOrigin: 'center' } }, [
    el('text', {
      x: '70',
      y: '68',
      'text-anchor': 'middle',
      fill: 'var(--text-primary)',
      style: { fontFamily: 'var(--font-logo)', fontWeight: '700', fontSize: '1.4rem' }
    }, [total]),
    el('text', {
      x: '70',
      y: '85',
      'text-anchor': 'middle',
      fill: 'var(--text-muted)',
      style: { fontWeight: '600', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase' }
    }, ['Projects'])
  ]);
  
  svg.appendChild(textGroup);
  container.appendChild(svg);
}

/**
 * milestone progress trend SVG Bar chart visualizer.
 * Renders horizontal structured bar arrays calculated dynamically.
 */
function renderMilestoneTrendsChart() {
  const container = document.getElementById('milestones-timeline-chart-container');
  if (!container) return;

  container.replaceChildren();
  if (projects.length === 0) {
    container.appendChild(el('div', { style: { fontSize: '0.8rem', color: 'var(--text-muted)' } }, ['Create a project with milestones to evaluate trends.']));
    return;
  }

  // Draw Horizontal Bar Chart for top 5 projects
  const chartHeight = 220;
  const chartWidth = 400;
  const svg = el('svg', {
    viewBox: `0 0 ${chartWidth} ${chartHeight}`,
    width: '100%',
    height: '220px'
  });

  const displayList = projects.slice(0, 5); // limit top 5 items
  const rowHeight = Math.floor(chartHeight / 5);
  
  displayList.forEach((p, idx) => {
    const progress = calculateProjectProgress(p);
    const barWidth = Math.floor((progress / 100) * 220); // max width 220px
    const yPos = idx * rowHeight + 15;

    // Project Name Label (Truncated securely via SVG parameters)
    const labelText = p.title.length > 20 ? p.title.substring(0, 18) + '..' : p.title;

    // Elements
    const label = el('text', {
      x: '10',
      y: (yPos + 18).toString(),
      fill: 'var(--text-secondary)',
      style: { fontFamily: 'var(--font-logo)', fontSize: '0.78rem', fontWeight: '500' }
    }, [labelText]);

    // Bar Background
    const bgBar = el('rect', {
      x: '140',
      y: yPos.toString(),
      width: '220',
      height: '16',
      rx: '4',
      fill: 'rgba(255,255,255,0.03)',
      stroke: 'var(--border-color)',
      'stroke-width': '1'
    });

    // Bar Fill
    const fillBar = el('rect', {
      x: '140',
      y: yPos.toString(),
      width: barWidth.toString(),
      height: '16',
      rx: '4',
      fill: 'url(#accent-gradient-svg)',
      style: { transition: 'width 0.8s ease' }
    });

    // Percentage Label
    const pctLabel = el('text', {
      x: '370',
      y: (yPos + 14).toString(),
      fill: 'var(--text-primary)',
      style: { fontFamily: 'var(--font-logo)', fontSize: '0.78rem', fontWeight: '700' }
    }, [`${progress}%`]);

    svg.appendChild(label);
    svg.appendChild(bgBar);
    svg.appendChild(fillBar);
    svg.appendChild(pctLabel);
  });

  // Append Gradients definitions in SVG
  const defs = el('defs', {}, [
    el('linearGradient', { id: 'accent-gradient-svg', x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, [
      el('stop', { offset: '0%', 'stop-color': '#3b82f6' }),
      el('stop', { offset: '100%', 'stop-color': '#8b5cf6' })
    ])
  ]);
  svg.insertBefore(defs, svg.firstChild);

  container.appendChild(svg);
}

// Generate smart AI-style insights based on portfolio data
function renderAIInsights() {
  const panel = document.getElementById('analytics-insights-panel');
  if (!panel) return;

  panel.replaceChildren();

  const total = projects.length;
  const completed = projects.filter(p => p.status === 'Completed').length;
  const progress = projects.filter(p => p.status === 'In Progress').length;
  const testing = projects.filter(p => p.status === 'Testing').length;
  const planning = projects.filter(p => p.status === 'Planning').length;

  const insightsList = [];

  if (total === 0) {
    insightsList.push("Welcome! Create your first project to compile development performance insights.");
  } else {
    // Completion rate assessment
    const rate = Math.round((completed / total) * 100);
    if (rate > 70) {
      insightsList.push(`Excellent completion rate of ${rate}%! You are highly effective at wrapping up deliverables.`);
    } else if (rate < 30 && total >= 3) {
      insightsList.push(`You currently have a high ratio of open deliverables (${rate}% completed). Consider wrapping up projects in Testing before creating new ones.`);
    }

    // Testing bottlenecks
    if (testing > 1) {
      insightsList.push(`You have ${testing} projects stuck in testing. Focus on finalizing test parameters and validation checks to clear backlog.`);
    }

    // High multitasking
    if (progress >= 3) {
      insightsList.push(`Working on ${progress} active items simultaneously can cause mental drag. Consider dividing tasks into bite-sized milestones.`);
    }

    // Overall positive baseline
    if (insightsList.length === 0) {
      insightsList.push("Your portfolio is well balanced. Keep ticking milestones regularly to maintain momentum.");
    }
  }

  // Secure compile layout
  panel.appendChild(el('h3', { className: 'pane-section-title font-glow', style: { marginBottom: '1rem', color: 'var(--accent-primary)' } }, [
    el('svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: { marginRight: '6px' } }, [
      el('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
      el('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
      el('line', { x1: '12', y1: '22.08', x2: '12', y2: '12' })
    ]),
    'ProjectForge Intelligence & Recommendations'
  ]));

  const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } });
  insightsList.forEach(ins => {
    list.appendChild(
      el('div', { className: 'insight-item' }, [
        el('span', { className: 'insight-bullet' }, ['💡']),
        el('span', {}, [ins])
      ])
    );
  });

  panel.appendChild(list);
}

// ==================== DYNAMIC VIEW NAV TAB ROUTER ====================
function switchTab(targetTab) {
  // Toggle Navigation Tabs active classes
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.getAttribute('data-tab') === targetTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show/Hide Panel Containers
  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === `tab-pane-${targetTab}`) {
      pane.classList.remove('hidden');
    } else {
      pane.classList.add('hidden');
    }
  });

  // Recompile state elements relative to active view
  if (targetTab === 'dashboard') {
    filterAndRenderProjects();
  } else if (targetTab === 'analytics') {
    renderAnalyticsCharts();
  } else if (targetTab === 'showcase') {
    renderShowcaseGrid();
  }
}

// ==================== CUSTOM DIALOG MODALS IMPLEMENTATION ====================

// --- Modal 1: Project Add / Edit ---
const projectModal = document.getElementById('project-form-modal');

function openProjectModalForAdd() {
  document.getElementById('modal-title-project').textContent = 'Add New Project';
  document.getElementById('project-form-id').value = '';
  document.getElementById('project-form').reset();
  
  // Default Target Deadline (e.g. 7 days from now)
  const defaultDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
  document.getElementById('p-deadline').value = defaultDate;

  projectModal.classList.remove('hidden');
}

function openProjectModalForEdit(project) {
  document.getElementById('modal-title-project').textContent = 'Edit Project Details';
  document.getElementById('project-form-id').value = project.id;
  document.getElementById('p-title').value = project.title.replace(/&mdash;/g, '—');
  document.getElementById('p-desc').value = project.description;
  document.getElementById('p-status').value = project.status;
  document.getElementById('p-deadline').value = project.deadline;
  document.getElementById('p-tech').value = project.techStack.join(', ');
  document.getElementById('p-github').value = project.githubUrl || '';
  document.getElementById('p-live').value = project.liveUrl || '';
  document.getElementById('p-highlights').value = project.highlights ? project.highlights.join(', ') : '';
  document.getElementById('p-notes').value = project.notes || '';

  projectModal.classList.remove('hidden');
}

function closeProjectModal() {
  projectModal.classList.add('hidden');
}

function handleProjectFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('project-form-id').value.trim();
  const title = document.getElementById('p-title').value.trim();
  const description = document.getElementById('p-desc').value.trim();
  const status = document.getElementById('p-status').value;
  const deadline = document.getElementById('p-deadline').value;
  const techRaw = document.getElementById('p-tech').value.trim();
  const github = document.getElementById('p-github').value.trim();
  const live = document.getElementById('p-live').value.trim();
  const highlightsRaw = document.getElementById('p-highlights').value.trim();
  const notes = document.getElementById('p-notes').value.trim();

  // Basic Validation
  if (!title || !description || !deadline || !techRaw) {
    showToast("Please fill in all required fields (*) completely.", "error");
    return;
  }

  // Parse list nodes safely
  const techStack = techRaw.split(',').map(t => t.trim()).filter(t => t !== '');
  const highlights = highlightsRaw ? highlightsRaw.split(',').map(h => h.trim()).filter(h => h !== '') : [];

  // Sanitize links to start with protocols
  const sanitizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const githubUrl = sanitizeUrl(github);
  const liveUrl = sanitizeUrl(live);

  if (id === '') {
    // CREATE ACTION
    const newProj = {
      id: `p-${Date.now()}`,
      title,
      description,
      status,
      deadline,
      techStack,
      githubUrl,
      liveUrl,
      highlights,
      notes,
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [{ status, timestamp: new Date().toISOString() }]
    };
    projects.push(newProj);
    logActivity(`Created project: ${title}`, 'created');
    showToast(`Successfully created ${title}!`);
  } else {
    // UPDATE ACTION
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const original = projects[idx];
      const prevStatus = original.status;

      // Track status changes history
      let updatedHistory = [...(original.statusHistory || [])];
      if (prevStatus !== status) {
        updatedHistory.push({ status, timestamp: new Date().toISOString() });
        logActivity(`Project '${title}' status updated to: ${status}`, status === 'Completed' ? 'completed' : 'info');
      }

      projects[idx] = {
        ...original,
        title,
        description,
        status,
        deadline,
        techStack,
        githubUrl,
        liveUrl,
        highlights,
        notes,
        updatedAt: new Date().toISOString(),
        statusHistory: updatedHistory
      };
      
      logActivity(`Updated details for: ${title}`);
      showToast(`Updated ${title} successfully.`);
    }
  }

  // Synchronize layouts
  saveData();
  closeProjectModal();
  updateSidebarStats();
  renderTechFrequency();
  renderDeadlineAlerts();
  filterAndRenderProjects();
}

// --- Modal 2: Milestone checklist & Notes Details Pane ---
const milestonesModal = document.getElementById('milestones-modal');

function openMilestoneModal(projectId) {
  activeProjectIdForMilestones = projectId;
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('milestones-project-subtitle').textContent = project.title.replace(/&mdash;/g, '—');
  
  // Documentation display in Left Pane
  const notesDisplay = document.getElementById('milestone-modal-notes-display');
  notesDisplay.textContent = project.notes || ''; // safe escaping

  // Showcase Highlights render
  const hlsBox = document.getElementById('milestone-modal-highlights-box');
  hlsBox.replaceChildren();
  if (project.highlights && project.highlights.length > 0) {
    hlsBox.appendChild(el('h4', { className: 'pane-section-title', style: { marginTop: '1rem' } }, ['Core Highlights']));
    hlsBox.appendChild(
      el('ul', { style: { paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' } }, 
        project.highlights.map(hl => el('li', {}, [hl]))
      )
    );
  }

  // Load milestone checklist list in Right Pane
  renderMilestonesChecklist(project);

  milestonesModal.classList.remove('hidden');
}

function closeMilestonesModal() {
  milestonesModal.classList.add('hidden');
  activeProjectIdForMilestones = null;
}

function renderMilestonesChecklist(project) {
  const container = document.getElementById('milestones-checklist-container');
  const progressBar = document.getElementById('milestone-modal-progress-bar');
  const progressPct = document.getElementById('milestone-modal-progress-pct');
  const manualSliderContainer = document.getElementById('manual-progress-slider-container');
  
  if (!container || !progressBar || !progressPct) return;

  container.replaceChildren();

  const progress = calculateProjectProgress(project);
  progressBar.style.width = `${progress}%`;
  progressPct.textContent = `${progress}%`;

  if (!project.milestones || project.milestones.length === 0) {
    // Show manual progress slider if no milestones exist
    manualSliderContainer.classList.remove('hidden');
    const slider = document.getElementById('manual-progress-slider');
    slider.value = project.manualProgress !== undefined ? project.manualProgress : 0;
    
    // Register slider listener
    slider.oninput = (e) => {
      const val = parseInt(e.target.value);
      project.manualProgress = val;
      progressBar.style.width = `${val}%`;
      progressPct.textContent = `${val}%`;
      
      // Update sidebar state & grids instantly
      saveData();
      updateSidebarStats();
      filterAndRenderProjects();
    };
  } else {
    // Hide manual slider when milestones are loaded
    manualSliderContainer.classList.add('hidden');
    
    project.milestones.forEach(m => {
      const itemClass = m.completed ? 'milestone-item checked-item' : 'milestone-item';
      
      const item = el('div', { className: itemClass }, [
        el('div', { className: 'milestone-item-left' }, [
          el('input', {
            type: 'checkbox',
            className: 'milestone-checkbox',
            checked: m.completed,
            onChange: () => handleMilestoneToggle(project.id, m.id)
          }),
          el('span', { className: 'milestone-title-text' }, [m.title])
        ]),
        
        el('button', {
          className: 'milestone-btn-del',
          title: 'Delete Milestone',
          onClick: () => handleMilestoneDelete(project.id, m.id)
        }, [
          el('svg', { viewBox: '0 0 24 24', width: '12', height: '12', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
            el('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
            el('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
          ])
        ])
      ]);

      container.appendChild(item);
    });
  }
}

function handleMilestoneToggle(projectId, milestoneId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return;

  milestone.completed = !milestone.completed;
  
  // Log milestone details
  if (milestone.completed) {
    logActivity(`Milestone completed on '${project.title}': ${milestone.title}`, 'milestone');
    showToast(`Completed: ${milestone.title}`);
  } else {
    logActivity(`Milestone unchecked on '${project.title}': ${milestone.title}`, 'info');
  }

  // Save changes
  saveData();
  renderMilestonesChecklist(project);
  updateSidebarStats();
  filterAndRenderProjects();
}

function handleMilestoneAdd(e) {
  e.preventDefault();
  const input = document.getElementById('milestone-input');
  const title = input.value.trim();
  if (!title || !activeProjectIdForMilestones) return;

  const project = projects.find(p => p.id === activeProjectIdForMilestones);
  if (!project) return;

  const newMilestone = {
    id: `m-${Date.now()}`,
    title,
    completed: false,
    createdAt: new Date().toISOString()
  };

  if (!project.milestones) project.milestones = [];
  project.milestones.push(newMilestone);

  logActivity(`Added milestone on '${project.title}': ${title}`, 'milestone');
  showToast(`Added: ${title}`);

  input.value = '';
  saveData();
  renderMilestonesChecklist(project);
  updateSidebarStats();
  filterAndRenderProjects();
}

function handleMilestoneDelete(projectId, milestoneId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const mIdx = project.milestones.findIndex(m => m.id === milestoneId);
  if (mIdx === -1) return;

  const deletedTitle = project.milestones[mIdx].title;
  project.milestones.splice(mIdx, 1);

  logActivity(`Deleted milestone on '${project.title}': ${deletedTitle}`);
  showToast(`Removed: ${deletedTitle}`);

  saveData();
  renderMilestonesChecklist(project);
  updateSidebarStats();
  filterAndRenderProjects();
}

// --- Modal 3: Secure Delete confirmation ---
const deleteModal = document.getElementById('delete-confirm-modal');

function triggerDeleteConfirmation(projectId, projectTitle) {
  projectToDeleteId = projectId;
  
  const label = document.getElementById('delete-project-name');
  if (label) {
    label.replaceChildren(document.createTextNode(projectTitle.replace(/&mdash;/g, '—')));
  }
  
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  projectToDeleteId = null;
}

function handleConfirmDelete() {
  if (!projectToDeleteId) return;

  const idx = projects.findIndex(p => p.id === projectToDeleteId);
  if (idx !== -1) {
    const deletedTitle = projects[idx].title.replace(/&mdash;/g, '—');
    projects.splice(idx, 1);
    
    logActivity(`Permanently deleted project: ${deletedTitle}`, 'delete');
    showToast(`Deleted ${deletedTitle} portfolio.`, 'success');
  }

  saveData();
  closeDeleteModal();
  updateSidebarStats();
  renderTechFrequency();
  renderDeadlineAlerts();
  filterAndRenderProjects();
}

// ==================== DATA EXPORT & IMPORT BACKUP CONTROLLER ====================
function exportPortfolioData() {
  try {
    const dataStr = JSON.stringify({
      projects,
      activityStream,
      app: 'ProjectForge',
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dlAnchor = el('a', {
      href: url,
      download: `projectforge-backup-${new Date().toISOString().split('T')[0]}.json`
    });

    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    
    setTimeout(() => {
      document.body.removeChild(dlAnchor);
      URL.revokeObjectURL(url);
    }, 100);

    logActivity("Exported portfolio backup successfully.");
    showToast("JSON backup downloaded successfully!");
  } catch (error) {
    console.error("Backup failed:", error);
    showToast("Failed to compile file download.", "error");
  }
}

function handleImportTrigger() {
  const fileInput = document.getElementById('file-import');
  if (fileInput) fileInput.click();
}

function handleImportFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      
      // Structure Validation
      if (!imported.projects || !Array.isArray(imported.projects)) {
        showToast("Invalid JSON schema: 'projects' array missing.", "error");
        return;
      }

      // Merge structural entities
      const importedProjects = imported.projects;
      
      // Validate structure matches specifications
      const valid = importedProjects.every(p => p.title && p.description && p.deadline && p.status);
      if (!valid) {
        showToast("Import cancelled. Some projects missing required fields.", "error");
        return;
      }

      // Merge and prevent exact duplicate ids
      importedProjects.forEach(ip => {
        const duplicateIdx = projects.findIndex(p => p.id === ip.id);
        if (duplicateIdx !== -1) {
          // Re-generate unique ID on clash
          ip.id = `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        projects.push(ip);
      });

      // Handle activity merging
      if (imported.activityStream && Array.isArray(imported.activityStream)) {
        activityStream = [...imported.activityStream, ...activityStream].slice(0, 20);
      }

      logActivity(`Imported ${importedProjects.length} projects from backup file.`, 'created');
      showToast(`Merged ${importedProjects.length} projects successfully!`);

      // Sync and redraw layouts
      saveData();
      updateSidebarStats();
      renderTechFrequency();
      renderDeadlineAlerts();
      filterAndRenderProjects();

    } catch (err) {
      console.error("Import parse failed:", err);
      showToast("Corrupt file upload. Failed to parse JSON database.", "error");
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // clear input cache
}

// ==================== LIGHT / DARK SYSTEM THEME ====================
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  syncThemeIcons();
  saveData();
  
  // Re-draw SVG analytics charts since label fonts rely on theme color
  if (document.getElementById('tab-pane-analytics').classList.contains('hidden') === false) {
    renderAnalyticsCharts();
  }
  
  showToast(`Switched theme to ${currentTheme} mode.`);
}

function syncThemeIcons() {
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');

  if (currentTheme === 'dark') {
    if (sunIcon) sunIcon.classList.add('hidden');
    if (moonIcon) moonIcon.classList.remove('hidden');
  } else {
    if (sunIcon) sunIcon.classList.remove('hidden');
    if (moonIcon) moonIcon.classList.add('hidden');
  }
}

// ==================== SYSTEM BOOTSTRAP INITIALIZATION ====================
function init() {
  // 1. Sync local memory structures
  loadData();

  // 2. Navigation Tab Handlers
  document.querySelectorAll('.nav-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // 3. Theme Toggle & Backup
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('btn-export').addEventListener('click', exportPortfolioData);
  document.getElementById('btn-import-trigger').addEventListener('click', handleImportTrigger);
  document.getElementById('file-import').addEventListener('change', handleImportFileChange);

  // 4. Grid controls (Filter / Search)
  document.getElementById('search-input').addEventListener('input', filterAndRenderProjects);
  document.getElementById('filter-status').addEventListener('change', filterAndRenderProjects);
  document.getElementById('filter-tech').addEventListener('change', filterAndRenderProjects);
  document.getElementById('sort-select').addEventListener('change', filterAndRenderProjects);

  // 5. Project Modals Event Listeners
  document.getElementById('btn-create-project').addEventListener('click', openProjectModalForAdd);
  document.getElementById('btn-empty-create-project').addEventListener('click', openProjectModalForAdd);
  document.getElementById('btn-close-project-modal').addEventListener('click', closeProjectModal);
  document.getElementById('btn-cancel-project-modal').addEventListener('click', closeProjectModal);
  document.getElementById('project-form').addEventListener('submit', handleProjectFormSubmit);

  // 6. Milestones Modals Event Listeners
  document.getElementById('btn-close-milestones-modal').addEventListener('click', closeMilestonesModal);
  document.getElementById('btn-close-milestones-modal-bottom').addEventListener('click', closeMilestonesModal);
  document.getElementById('milestone-add-form').addEventListener('submit', handleMilestoneAdd);

  // 7. Delete Modals Event Listeners
  document.getElementById('btn-close-delete-modal').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);

  // 8. Load Layout components
  updateSidebarStats();
  renderTechFrequency();
  renderDeadlineAlerts();
  renderActivityTimeline();
  filterAndRenderProjects();
  
  // Smooth initial entry animation trigger
  switchTab('dashboard');
}

// Kick off system operations on DOM Loaded or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
