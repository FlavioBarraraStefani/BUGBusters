window.addEventListener('resize', () => { if (window._draw_main_right_lastCall) draw_main_right(...window._draw_main_right_lastCall); });

// Draw function for main page right canvas
function draw_main_right(data, categoryInfo, containerId) {
  const currentCat = categoryInfo?.current || null;
  window._draw_main_right_lastCall = [data, categoryInfo, containerId];


  
  if (currentCat) {
    // Draw subcategories grid for the selected category
    drawSubCategoriesOnCanvas(containerId, currentCat, (choice) => showModal(currentCat, choice));
  } else {
    // No category selected - draw placeholder
    drawTextOnCanvas(containerId, 'No category selected');
  }
}
