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


function toggleButtons(isDisabled) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        btn.disabled = isDisabled;
        if (isDisabled) btn.classList.add('disabled');
        else            btn.classList.remove('disabled');
    });
}

/**
 * Toggle category selection
 * @param {string} category - 'group', 'attack', 'target', or null
 */
function selectCategory(category) {
  const buttons = document.querySelectorAll('.category-btn');

  //cooldown to avoid problems with rapid clicking
  toggleButtons(true);
  setTimeout(() => {toggleButtons(false);}, transitionDurationMs * 2);
  
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
  const leftWrapper = leftCol?.querySelector('.canvas-wrapper');

  if (!leftCol || !rightCol || !leftWrapper) return;

  // Determine if right canvas should be visible (in-view)
  const showRight = !!currentCategory;

  if (showRight) {
    // SHOWING right canvas: 
    // 1. First add the class (this changes what setCanvasSizes will compute)
    document.body.classList.add('right-canvas-active');
    // 2. Force browser to recognize current dimensions before we change them
  } else {
    // HIDING right canvas:
    // 1. Remove active class - right canvas slides out via CSS transition
    document.body.classList.remove('right-canvas-active');
    // 2. Force reflow before setting new sizes
  }
  leftWrapper.offsetHeight;
    // 3. Set sizes - left canvas will transition to full size
  setCanvasSizes();

  // Draw canvases after transitions complete
  requestAnimationFrame(() => {
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
  const timelineContainer = document.getElementById('timeline-container');
  const footer = document.querySelector('footer');
  const mainContent = document.getElementById('main-content');
  const canvasRow = mainContent?.querySelector('.canvas-row');
  const containerFluid = mainContent?.querySelector('.container-fluid');

  if (!navbar || !mainContent || !containerFluid) return;
  // Don't calculate if main content is hidden
  if (mainContent.style.display === 'none') return;

  // Get heights of fixed elements
  const navbarHeight = navbar.offsetHeight;
  const categoryHeight = categoryHeader ? categoryHeader.offsetHeight : 0;
  const timelineHeight = timelineContainer ? timelineContainer.offsetHeight : 0;
  const footerHeight = footer ? footer.offsetHeight : 0;

  // Position category header directly below navbar
  if (categoryHeader) {
    categoryHeader.style.position = 'fixed';
    categoryHeader.style.top = `${navbarHeight}px`;
    categoryHeader.style.left = '0';
    categoryHeader.style.right = '0';
  }

  // Position footer at bottom
  if (footer) {
    footer.style.position = 'fixed';
    footer.style.bottom = '0';
    footer.style.left = '0';
    footer.style.right = '0';
  }

  // Position timeline directly above footer
  if (timelineContainer) {
    timelineContainer.style.position = 'fixed';
    timelineContainer.style.bottom = `${footerHeight}px`;
    timelineContainer.style.left = '0';
    timelineContainer.style.right = '0';
  }

  // Position and size main content between category header and timeline
  const mainContentTop = navbarHeight + categoryHeight;
  const mainContentBottom = footerHeight + timelineHeight;
  const availableHeight = window.innerHeight - mainContentTop - mainContentBottom;
  const availableWidth = window.innerWidth;

  mainContent.style.position = 'fixed';
  mainContent.style.top = `${mainContentTop}px`;
  mainContent.style.bottom = `${mainContentBottom}px`;
  mainContent.style.left = '0';
  mainContent.style.right = '0';
  mainContent.style.height = `${availableHeight}px`;
  mainContent.style.width = '100%';

  // Size canvas-row to fill main content
  if (canvasRow) {
    canvasRow.style.width = `${availableWidth}px`;
    canvasRow.style.height = `${availableHeight}px`;
  }

  const leftCol = document.getElementById('canvas-left');
  const rightCol = document.getElementById('canvas-right');
  const leftWrapper = leftCol?.querySelector('.canvas-wrapper');
  const rightWrapper = rightCol?.querySelector('.canvas-wrapper');

  if (!leftWrapper || !rightWrapper) return;

  const rightActive = document.body.classList.contains('right-canvas-active');

  // Store previous dimensions before updating
  PREV_LEFT_CHART_WIDTH = LEFT_CHART_WIDTH;
  PREV_LEFT_CHART_HEIGHT = LEFT_CHART_HEIGHT;

  // Always calculate both layouts to determine which is preferred
  // Layout 1: Stacked (left on top, right on bottom)
  const stackedLeftW = availableWidth;
  const stackedLeftH = (availableHeight * 2) / 3;
  const stackedRightW = availableWidth;
  const stackedRightH = availableHeight / 3;
  const stackedLeftMin = Math.min(stackedLeftW, stackedLeftH);

  // Layout 2: Side by side
  const sideBySideLeftW = availableWidth / 2;
  const sideBySideLeftH = availableHeight;
  const sideBySideRightW = availableWidth / 2;
  const sideBySideRightH = availableHeight;
  const sideBySideLeftMin = Math.min(sideBySideLeftW, sideBySideLeftH);

  STACKED_LAYOUT_PREFERRED = (stackedLeftMin >= sideBySideLeftMin);

  // Update layout classes based on stacked preference
  if (STACKED_LAYOUT_PREFERRED) {
    document.body.classList.add('stacked-layout');
    document.body.classList.remove('side-by-side-layout');
  } else {
    document.body.classList.add('side-by-side-layout');
    document.body.classList.remove('stacked-layout');
  }

  // Right canvas always has its target size (ready to slide in)
  if (STACKED_LAYOUT_PREFERRED) {
    rightWrapper.style.width = `${stackedRightW}px`;
    rightWrapper.style.height = `${stackedRightH}px`;
    RIGHT_CHART_WIDTH = stackedRightW;
    RIGHT_CHART_HEIGHT = stackedRightH;
  } else {
    rightWrapper.style.width = `${sideBySideRightW}px`;
    rightWrapper.style.height = `${sideBySideRightH}px`;
    RIGHT_CHART_WIDTH = sideBySideRightW;
    RIGHT_CHART_HEIGHT = sideBySideRightH;
  }

  // Left canvas size depends on whether right canvas is active
  if (!rightActive) {
    // Right canvas hidden: left takes full space
    leftWrapper.style.width = `${availableWidth}px`;
    leftWrapper.style.height = `${availableHeight}px`;
    LEFT_CHART_WIDTH = availableWidth;
    LEFT_CHART_HEIGHT = availableHeight;
  } else {
    // Right canvas visible: left resizes based on layout
    if (STACKED_LAYOUT_PREFERRED) {
      leftWrapper.style.width = `${stackedLeftW}px`;
      leftWrapper.style.height = `${stackedLeftH}px`;
      LEFT_CHART_WIDTH = stackedLeftW;
      LEFT_CHART_HEIGHT = stackedLeftH;
    } else {
      leftWrapper.style.width = `${sideBySideLeftW}px`;
      leftWrapper.style.height = `${sideBySideLeftH}px`;
      LEFT_CHART_WIDTH = sideBySideLeftW;
      LEFT_CHART_HEIGHT = sideBySideLeftH;
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

  // Store start and end values for animation
  const startScale = projection.scale();
  const endScale = startScale * scaleFactor;
  const startTranslate = projection.translate();
  const endTranslate = [LEFT_CHART_WIDTH / 2, LEFT_CHART_HEIGHT / 2];

  // Update the SVG viewBox immediately
  const container = d3.select('#canvas-left');
  const svg = container.select('.canvas-wrapper svg');
  svg.attr('viewBox', `0 0 ${LEFT_CHART_WIDTH} ${LEFT_CHART_HEIGHT}`);
  
  if (typeof g !== 'undefined' && g) {
    d3.transition()
      .duration(playIntervalMs)
      .ease(d3.easeCubicInOut)
      .tween('projection', function() {
        const scaleInterp = d3.interpolate(startScale, endScale);
        const translateInterp = d3.interpolate(startTranslate, endTranslate);
        
        return function(t) {
          // Update projection at each step
          projection.scale(scaleInterp(t));
          projection.translate(translateInterp(t));
          
          // Redraw ocean circle
          const currentT = projection.translate();
          g.select('circle.ocean-bg')
            .attr('r', projection.scale())
            .attr('cx', currentT[0])
            .attr('cy', currentT[1]);
          
          // Redraw all paths with updated projection
          g.selectAll('path').attr('d', path);
        };
      })
      .on('end', function() {
        // Ensure final values are set
        projection.scale(endScale);
        projection.translate(endTranslate);
        baseScale = computeBaseGlobeScale();
      });
  } else {
    // No g element, just update projection directly
    projection.scale(endScale);
    projection.translate(endTranslate);
    baseScale = computeBaseGlobeScale();
  }
}

function rescaleRightChart() {
  console.log('Rescaling right chart DISABLED');
  return;
  if (RIGHT_CHART_WIDTH === 0 || RIGHT_CHART_HEIGHT === 0) return;
  // Update the SVG viewBox
  const container = d3.select('#canvas-right');
  const svg = container.select('.canvas-wrapper svg');
  // update viewBox
  svg.attr('viewBox', `0 0 ${RIGHT_CHART_WIDTH} ${RIGHT_CHART_HEIGHT}`);

  // update group container transform if needed (reset to origin)
  // update axis and ridgelines (stepAnimationRight handles ridges)
  stepAnimationRight();
  //if (typeof stepAnimationRight === 'function') stepAnimationRight();
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