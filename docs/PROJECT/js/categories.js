// ===========================
// Category Selection Logic
// ===========================

let currentCategory = null;
let previousCategory = null;

// Category choices configuration
const CATEGORY_CHOICES = {
  group: ['ISIL', 'taliban', 'SL'],
  attack: ['explosion', 'armed_assault', 'assassination', 'hostage_taking', 'infrastructure_attack'],
  target: ['military_police', 'government', 'business', 'citizens', 'transportations']
};

/**
 * Toggle category selection
 * @param {string} category - 'group', 'attack', 'target', or null
 */
function selectCategory(category) {
  const buttons = document.querySelectorAll('.category-btn');
  
  // If clicking the same category, deselect it
  if (currentCategory === category) {
    previousCategory = currentCategory;
    currentCategory = null;
    buttons.forEach(btn => btn.classList.remove('active'));
    updateMainCanvases();
    return;
  }
  
  // Update selection
  previousCategory = currentCategory;
  currentCategory = category;
  
  // Update button states
  buttons.forEach(btn => {
    if (btn.dataset.category === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update main canvases
  updateMainCanvases();
}

/**
 * Update both main canvases with current/previous category info
 */
main_plots_data = null;
function updateMainCanvases(data) {
  const leftCol = document.getElementById('canvas-left');
  const rightCol = document.getElementById('canvas-right');

  if (!leftCol || !rightCol) return;

  // Show/hide right canvas based on category selection
  const showRight = !!currentCategory;

  if (showRight) {
    // Both canvases visible: side by side on large screens (col-xl-6 each)
    rightCol.style.display = '';
    leftCol.classList.remove('col-xl-12');
    leftCol.classList.add('col-xl-6');
  } else {
    // Only left canvas: full width (col-xl-12)
    rightCol.style.display = 'none';
    leftCol.classList.remove('col-xl-6');
    leftCol.classList.add('col-xl-12');
  }

  // Recalculate sizes after DOM changes
  requestAnimationFrame(() => {
    setCanvasSizes();
    const categoryInfo = {
      current: currentCategory,
      previous: previousCategory
    };

    // Draw canvases
    draw_main_left(categoryInfo, 'canvas-left');
    draw_main_right(categoryInfo, 'canvas-right');
  });
}

// -------------------------------
// Dynamic Canvas Sizing
// -------------------------------
function setCanvasSizes() {
  const navbar = document.querySelector('.navbar');
  const categoryHeader = document.querySelector('.category-header');
  const footer = document.querySelector('footer');
  const timelineContainer = document.getElementById('timeline-container');
  const mainContent = document.getElementById('main-content');

  if (!navbar || !categoryHeader || !mainContent) return;
  // Don't calculate if main content is hidden
  if (mainContent.style.display === 'none') return;

  const navbarHeight = navbar.offsetHeight;
  const categoryHeight = categoryHeader.offsetHeight;
  const footerHeight = footer ? footer.offsetHeight : 0;
  const timelineHeight = timelineContainer ? timelineContainer.offsetHeight : 0;
  const padding = 32; // Account for padding/margins

  const availableHeight = window.innerHeight - navbarHeight - categoryHeight - footerHeight - timelineHeight - padding;

  // Target the inner canvas-wrapper divs (not the column wrappers)
  const leftCol = document.getElementById('canvas-left');
  const rightCol = document.getElementById('canvas-right');
  const leftWrapper = leftCol?.querySelector('.canvas-wrapper');
  const rightWrapper = rightCol?.querySelector('.canvas-wrapper');

  if (!leftWrapper) return;

  const rightVisible = rightCol && rightCol.style.display !== 'none';
  const isLargeScreen = window.innerWidth >= 1200;

  // Apply height to the inner wrappers
  if (isLargeScreen) {
    // Side by side: full available height for both
    leftWrapper.style.height = `${availableHeight}px`;
    if (rightVisible && rightWrapper) {
      rightWrapper.style.height = `${availableHeight}px`;
    }
  } else {
    // Stacked on small screens
    const gap = 16; // Bootstrap g-3 gap
    if (rightVisible && rightWrapper) {
      // Two canvases stacked: split height
      const heightPerCanvas = Math.floor((availableHeight - gap) / 2);
      leftWrapper.style.height = `${heightPerCanvas}px`;
      rightWrapper.style.height = `${heightPerCanvas}px`;
    } else {
      // Single canvas: full height
      leftWrapper.style.height = `${availableHeight}px`;
    }
  }
}

/**
 * Show modal for a specific category and choice
 * @param {string} category - 'group', 'attack', or 'target'
 * @param {string} choice - The selected choice within the category
 */
function showModal(category, choice) {
  const modalIds = {
    group: 'modalGroup',
    attack: 'modalAttack',
    target: 'modalTarget'
  };
  
  const modalId = modalIds[category];
  if (!modalId) return;
  
  // Update modal title
  const modalLabel = document.getElementById(`${modalId}Label`);
  if (modalLabel) {
    const displayChoice = choice.replace(/_/g, ' ').toUpperCase();
    const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
    modalLabel.textContent = `${displayCategory}: ${displayChoice}`;
  }
  
  // Show the correct choice content, hide others
  const allChoiceContents = document.querySelectorAll(`#${modalId} .choice-content`);
  allChoiceContents.forEach(el => el.style.display = 'none');
  
  const activeContent = document.getElementById(`content_${category}_${choice}`);
  if (activeContent) {
    activeContent.style.display = 'block';
  }
  
  // Show modal
  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}
