window.addEventListener('resize', () => { if (window._draw_main_left_lastCall) draw_main_left(...window._draw_main_left_lastCall); });

// Draw function for main page left canvas
function draw_main_left(data, categoryInfo, containerId) {
  const currentCat = categoryInfo?.current || null;
  window._draw_main_left_lastCall = [data, categoryInfo, containerId];

 
  if (currentCat) {
    // Draw subcategories grid for the selected category
    drawSubCategoriesOnCanvas(containerId, currentCat, (choice) => showModal(currentCat, choice));
  } else {
    // No category selected - draw placeholder
    drawTextOnCanvas(containerId, 'No category selected');
  }
}
