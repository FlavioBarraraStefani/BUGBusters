function globe_target() {

  // =============================
  // STEP ANIMATION (timeline)
  // =============================
  stepAnimation = () => {
    const year = +slider.property('value');

    console.log('target:updating globe for year', year);
    
  };

  // =============================
  // UPDATE GLOBE (CALLED ON FRAME)
  // =============================
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    // move countries and re-apply colors (no transition for smooth dragging)
    const year = +slider.property('value');

    g.selectAll('path.country')
      .attr('d', path)

    console.log('target:rotating globe for year', year);
  };

  // =============================
  // INITIAL RENDER
  // =============================
  rotateOnStart = true;
  playIntervalMs = 1000;
  stepAnimation();
}