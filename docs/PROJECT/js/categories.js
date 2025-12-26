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
main_plots_data = null
function updateMainCanvases(data) {
  console.log("Updating main canvases with category:", currentCategory);
  // Use existing data if none provided
  if (!data) data = main_plots_data
  else main_plots_data = data

  const categoryInfo = {
    current: currentCategory,
    previous: previousCategory
  };  
  draw_main_left(data, categoryInfo, 'canvas-left');
  draw_main_right(data, categoryInfo, 'canvas-right');
}

// -------------------------------
// Dynamic Canvas Sizing
// -------------------------------
function setCanvasSizes() {
  const navbar = document.querySelector('.navbar');
  const categoryHeader = document.querySelector('.category-header');
  const footer = document.querySelector('footer');
  const mainContent = document.querySelector('#main-content');

  if (!navbar || !categoryHeader || !footer || !mainContent) return;

  const navbarHeight = navbar.offsetHeight;
  const categoryHeight = categoryHeader.offsetHeight;
  const footerHeight = footer.offsetHeight;
  const padding = 32; // 2rem in px

  const availableHeight = window.innerHeight - navbarHeight - categoryHeight - footerHeight - padding;

  const canvasWrappers = document.querySelectorAll('.canvas-wrapper');

  if (window.innerWidth >= 1200) {
    // Side by side on large screens
    canvasWrappers.forEach(wrapper => {
      wrapper.style.maxHeight = `${availableHeight}px`;
    });
  } else {
    // Stacked on smaller screens
    const gap = 16; // 1rem in px
    const heightPerCanvas = (availableHeight - gap) / 2;
    canvasWrappers.forEach(wrapper => {
      wrapper.style.maxHeight = `${heightPerCanvas}px`;
    });
  }
  updateMainCanvases();
}
window.addEventListener('resize', setCanvasSizes);
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


//TODO: remove this when draw_main_left and draw_main_right are finished
// ===========================
// Category Handler Functions
// ===========================

function drawTextOnCanvas(containerId, text, onclick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  const rect = container.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 300;
  
  const svg = d3.select(container).append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#212529')
    .attr('font-family', '"Fira Sans", sans-serif')
    .attr('font-size', '24px')
    .text(text);
  
  if (onclick) {
    container.style.cursor = 'pointer';
    container.onclick = onclick;
  } else {
    container.style.cursor = 'default';
    container.onclick = null;
  }
}

function drawSubCategoriesOnCanvas(containerId, category, onclick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  const rect = container.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 300;
  
  const choices = CATEGORY_CHOICES[category] || [];
  const numChoices = choices.length;
  
  if (numChoices === 0) return;
  
  // Calculate grid layout
  const cols = numChoices <= 3 ? numChoices : Math.ceil(numChoices / 2);
  const rows = numChoices <= 3 ? 1 : 2;
  
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  
  // Category colors
  const colors = {
    group: { bg1: '#e3f2fd', bg2: '#bbdefb', text: '#0d6efd' },
    attack: { bg1: '#e8f5e9', bg2: '#c8e6c9', text: '#198754' },
    target: { bg1: '#ffebee', bg2: '#ffcdd2', text: '#dc3545' }
  };
  const colorSet = colors[category] || { bg1: '#f8f9fa', bg2: '#e9ecef', text: '#212529' };
  
  const svg = d3.select(container).append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  choices.forEach((choice, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth;
    const y = row * cellHeight;
    
    const g = svg.append('g')
      .attr('class', 'choice-cell')
      .style('cursor', 'pointer')
      .on('click', () => { if (onclick) onclick(choice); });
    
    // Draw background
    g.append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('fill', index % 2 === 0 ? colorSet.bg1 : colorSet.bg2)
      .attr('stroke', '#dee2e6')
      .attr('stroke-width', 1);
    
    // Draw text
    const displayText = choice.replace(/_/g, ' ').toUpperCase();
    g.append('text')
      .attr('x', x + cellWidth / 2)
      .attr('y', y + cellHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', colorSet.text)
      .attr('font-family', '"Fira Sans", sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(displayText);
  });
  
  container.style.cursor = 'pointer';
}