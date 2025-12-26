// ===========================
// Category Selection Logic
// ===========================

let currentCategory = null;

/**
 * Toggle category selection
 * @param {string} category - 'a', 'b', 'c', or null
 */
function selectCategory(category) {
  const buttons = document.querySelectorAll('.category-btn');
  
  // If clicking the same category, deselect it
  if (currentCategory === category) {
    currentCategory = null;
    buttons.forEach(btn => btn.classList.remove('active'));
    cat_none();
    return;
  }
  
  // Update selection
  currentCategory = category;
  
  // Update button states
  buttons.forEach(btn => {
    if (btn.dataset.category === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Call appropriate function
  switch (category) {
    case 'a':
      cat_a(currentCategory);
      break;
    case 'b':
      cat_b(currentCategory);
      break;
    case 'c':
      cat_c(currentCategory);
      break;
    default:
      cat_none(currentCategory);
  }
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
}

// ===========================
// Category Handler Functions
// ===========================

function drawTextOnCanvas(canvasId, text, onclick) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#212529';
  ctx.font = '24px "Fira Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  if (onclick) {
    canvas.style.cursor = 'pointer';
    canvas.onclick = onclick;
  } else {
    canvas.style.cursor = 'default';
    canvas.onclick = null;
  }
}

function drawSubCategoriesOnCanvas(canvasId, category, onclick) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;
  
  // Draw 4 sub-categories
  const subCats = [currentCategory+'-1', currentCategory+'-2', currentCategory+'-3', currentCategory+'-4'];
  const positions = [
    { x: halfWidth / 2, y: halfHeight / 2, w: halfWidth, h: halfHeight },
    { x: halfWidth + halfWidth / 2, y: halfHeight / 2, w: halfWidth, h: halfHeight },
    { x: halfWidth / 2, y: halfHeight + halfHeight / 2, w: halfWidth, h: halfHeight },
    { x: halfWidth + halfWidth / 2, y: halfHeight + halfHeight / 2, w: halfWidth, h: halfHeight }
  ];
  
  subCats.forEach((subCat, index) => {
    const pos = positions[index];
    
    // Draw background
    ctx.fillStyle = index % 2 === 0 ? '#f8f9fa' : '#e9ecef';
    ctx.fillRect(pos.x - pos.w / 2, pos.y - pos.h / 2, pos.w, pos.h);
    
    // Draw border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - pos.w / 2, pos.y - pos.h / 2, pos.w, pos.h);
    
    // Draw text
    ctx.fillStyle = '#212529';
    ctx.font = '16px "Fira Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subCat, pos.x, pos.y);
  });
  
  // Add click handler
  canvas.onclick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    let clickedSubCat = null;
    if (x < halfWidth && y < halfHeight) clickedSubCat = currentCategory+'-1';
    else if (x >= halfWidth && y < halfHeight) clickedSubCat = currentCategory+'-2';
    else if (x < halfWidth && y >= halfHeight) clickedSubCat = currentCategory+'-3';
    else if (x >= halfWidth && y >= halfHeight) clickedSubCat = currentCategory+'-4';
    
    if (clickedSubCat && onclick) onclick(clickedSubCat);
  };
  canvas.style.cursor = 'pointer';
}

window.addEventListener('load', () => cat_none(null));

function cat_none(prev_category) {
  console.log('Category: None selected', prev_category);
  drawTextOnCanvas('canvas-left', 'No category selected');
  drawTextOnCanvas('canvas-right', 'No category selected');
}

function cat_a(prev_category) {
  console.log('Category: A selected', prev_category);
  drawSubCategoriesOnCanvas('canvas-left', 'A', (subCat) => modal_cat_a(subCat));
  drawSubCategoriesOnCanvas('canvas-right', 'A', (subCat) => modal_cat_a(subCat));
}

function cat_b(prev_category) {
  console.log('Category: B selected', prev_category);
  drawSubCategoriesOnCanvas('canvas-left', 'B', (subCat) => modal_cat_b(subCat));
  drawSubCategoriesOnCanvas('canvas-right', 'B', (subCat) => modal_cat_b(subCat));
}

function cat_c(prev_category) {
  console.log('Category: C selected', prev_category);
  drawSubCategoriesOnCanvas('canvas-left', 'C', (subCat) => modal_cat_c(subCat));
  drawSubCategoriesOnCanvas('canvas-right', 'C', (subCat) => modal_cat_c(subCat));
}
