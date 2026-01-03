// ===========================
// Category Selection Logic
// ===========================

let currentCategory = null;
let previousCategory = null;
let STACKED_LAYOUT_PREFERRED;

// Canvas dimensions - updated in real time by setCanvasSizes()
let LEFT_CHART_WIDTH ;
let LEFT_CHART_HEIGHT;
let RIGHT_CHART_WIDTH;
let RIGHT_CHART_HEIGHT;

// Previous dimensions for calculating zoom factor
let PREV_LEFT_CHART_WIDTH;
let PREV_LEFT_CHART_HEIGHT;


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
  const containerFluid = mainContent?.querySelector('.container-fluid');

  if (!navbar || !categoryHeader || !mainContent || !containerFluid) return;
  // Don't calculate if main content is hidden
  if (mainContent.style.display === 'none') return;

  const navbarHeight = navbar.offsetHeight;
  const categoryHeight = categoryHeader.offsetHeight;
  const footerHeight = (footer ? footer.offsetHeight : 0) + 10;
  const timelineHeight = timelineContainer ? timelineContainer.offsetHeight : 0;

  const availableHeight = window.innerHeight - navbarHeight - categoryHeight - footerHeight - timelineHeight;
  const availableWidth = containerFluid.clientWidth;

  const leftCol = document.getElementById('canvas-left');
  const rightCol = document.getElementById('canvas-right');
  const leftWrapper = leftCol?.querySelector('.canvas-wrapper');
  const rightWrapper = rightCol?.querySelector('.canvas-wrapper');

  if (!leftWrapper) return;

  const rightVisible = rightCol && rightCol.style.display !== 'none';

  // Store previous dimensions before updating
  PREV_LEFT_CHART_WIDTH = LEFT_CHART_WIDTH;
  PREV_LEFT_CHART_HEIGHT = LEFT_CHART_HEIGHT;

  if (!rightVisible) {
    // Only left canvas: fill 100% of available space
    leftWrapper.style.width = `${availableWidth}px`;
    leftWrapper.style.height = `${availableHeight}px`;
    leftCol.classList.remove('col-xl-6');
    leftCol.classList.add('col-xl-12');

    // Update global dimensions
    LEFT_CHART_WIDTH = availableWidth;
    LEFT_CHART_HEIGHT = availableHeight;
    RIGHT_CHART_WIDTH = 0;
    RIGHT_CHART_HEIGHT = 0;

    // Precompute STACKED_LAYOUT_PREFERRED for when both canvases will be visible
    // This is needed for legend orientation before the right canvas appears
    const stackedLeftW = availableWidth;
    const stackedLeftH = (availableHeight * 2) / 3;
    const stackedLeftMin = Math.min(stackedLeftW, stackedLeftH);

    const sideBySideLeftW = availableWidth / 2;
    const sideBySideLeftH = availableHeight;
    const sideBySideLeftMin = Math.min(sideBySideLeftW, sideBySideLeftH);

    STACKED_LAYOUT_PREFERRED = (stackedLeftMin >= sideBySideLeftMin);
  } else {
    // Both canvases present - calculate both layouts and choose the best one

    // Layout 1: Stacked (left on top, right on bottom)
    // Left height = 2/3 of available, Right height = 1/3 of available
    // Both span 100% width
    const stackedLeftW = availableWidth;
    const stackedLeftH = (availableHeight * 2) / 3;
    const stackedRightW = availableWidth;
    const stackedRightH = availableHeight / 3;
    const stackedLeftMin = Math.min(stackedLeftW, stackedLeftH);

    // Layout 2: Side by side
    // Each canvas gets 50% of width, 100% of height
    const sideBySideLeftW = availableWidth / 2;
    const sideBySideLeftH = availableHeight;
    const sideBySideRightW = availableWidth / 2;
    const sideBySideRightH = availableHeight;
    const sideBySideLeftMin = Math.min(sideBySideLeftW, sideBySideLeftH);

    STACKED_LAYOUT_PREFERRED = (stackedLeftMin >= sideBySideLeftMin);
    
    // Choose layout that maximizes min(width, height) of left canvas
    if (STACKED_LAYOUT_PREFERRED) {
      // Use stacked layout
      leftCol.classList.remove('col-xl-6');
      leftCol.classList.add('col-xl-12');
      rightCol.classList.remove('col-xl-6');
      rightCol.classList.add('col-xl-12');

      leftWrapper.style.width = `${stackedLeftW}px`;
      leftWrapper.style.height = `${stackedLeftH}px`;
      rightWrapper.style.width = `${stackedRightW}px`;
      rightWrapper.style.height = `${stackedRightH}px`;

      // Update global dimensions
      LEFT_CHART_WIDTH = stackedLeftW;
      LEFT_CHART_HEIGHT = stackedLeftH;
      RIGHT_CHART_WIDTH = stackedRightW;
      RIGHT_CHART_HEIGHT = stackedRightH;
    } else {
      // Use side by side layout
      leftCol.classList.remove('col-xl-12');
      leftCol.classList.add('col-xl-6');
      rightCol.classList.remove('col-xl-12');
      rightCol.classList.add('col-xl-6');

      leftWrapper.style.width = `${sideBySideLeftW}px`;
      leftWrapper.style.height = `${sideBySideLeftH}px`;
      rightWrapper.style.width = `${sideBySideRightW}px`;
      rightWrapper.style.height = `${sideBySideRightH}px`;

      // Update global dimensions
      LEFT_CHART_WIDTH = sideBySideLeftW;
      LEFT_CHART_HEIGHT = sideBySideLeftH;
      RIGHT_CHART_WIDTH = sideBySideRightW;
      RIGHT_CHART_HEIGHT = sideBySideRightH;
    }
  }

  // Rescale globe if dimensions changed and globe exists
  rescaleGlobe(); //left chart
  rescaleRightChart(); //right chart
}

/**
 * Rescale the globe projection to match new canvas dimensions
 */
function rescaleGlobe() {
  // Check if globe projection exists (defined in draw_main_left.js)
  if (typeof projection === 'undefined' || !projection) return;
  if (PREV_LEFT_CHART_WIDTH === 0 || PREV_LEFT_CHART_HEIGHT === 0) return;
  if (LEFT_CHART_WIDTH === PREV_LEFT_CHART_WIDTH && LEFT_CHART_HEIGHT === PREV_LEFT_CHART_HEIGHT) return;

  // Calculate the scale factor based on the min dimension change
  const prevMinDim = Math.min(PREV_LEFT_CHART_WIDTH, PREV_LEFT_CHART_HEIGHT);
  const newMinDim = Math.min(LEFT_CHART_WIDTH, LEFT_CHART_HEIGHT);
  const scaleFactor = newMinDim / prevMinDim;

  // Update projection scale
  const currentScale = projection.scale();
  const newScale = currentScale * scaleFactor;
  projection.scale(newScale);

  baseScale = computeBaseGlobeScale();

  // Update projection translate to center of new canvas
  projection.translate([LEFT_CHART_WIDTH / 2, LEFT_CHART_HEIGHT / 2]);

  // Update the SVG viewBox
  const container = d3.select('#canvas-left');
  const svg = container.select('.canvas-wrapper svg');
  if (!svg.empty()) {
    svg.attr('viewBox', `0 0 ${LEFT_CHART_WIDTH} ${LEFT_CHART_HEIGHT}`);
  }

  // Reuse the globe zoom instance if it exists (avoid duplicate implementations)
  if (window.globeZoom && !svg.empty()) {
    svg.call(window.globeZoom);
  }

  // Update ocean background circle
  if (typeof g !== 'undefined' && g) {
    const t = projection.translate();
    g.select('circle.ocean-bg')
      .attr('r', projection.scale())
      .attr('cx', t[0])
      .attr('cy', t[1]);

    // Update country paths
    if (typeof path !== 'undefined' && path) {
      g.selectAll('path').attr('d', path);
    }
  }
}

function rescaleRightChart() {
    // Update projection translate to center of new canvas
  // Update the SVG viewBox
  const container = d3.select('#canvas-right');
  const svg = container.select('.canvas-wrapper svg');
  if (!svg.empty()) {
    svg.attr('viewBox', `0 0 ${RIGHT_CHART_WIDTH} ${RIGHT_CHART_HEIGHT}`);
  }

  //change things in g_right accordingly
  //TODO: actually implement proper rescaling of elements
  if (!g_right) return;
  g_right.attr('transform', `translate(0, ${RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN})`);
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