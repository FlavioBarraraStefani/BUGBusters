let allTargetEvents = [];
let maxKillsGlobal = 0;

// ==========================================
// 1. DATA PREPARATION
// ==========================================

function precomputeTargetData(rawData) {
  const K = 1; //max:50
  allTargetEvents = [];
  maxKillsGlobal = 0;

  CATEGORIES.target.forEach((cat, index) => {
    const rawEvents = rawData[cat] || [];
    
    // 1. Extract the FIRST K elements immediately (no sorting)
    const slicedEvents = rawEvents.slice(0, K);

    // 2. Process and flatten
    slicedEvents.forEach(d => {
      // Validate coordinates
      if (isNaN(d.lat) || isNaN(d.long)) return;

      const victims = (+d.victims) || 0;
      if (victims > maxKillsGlobal) maxKillsGlobal = victims;

      allTargetEvents.push({
        year: +d.year,
        lat: +d.lat,
        long: +d.long,
        victims: victims,
        category: cat,
        catIndex: index, 
        id: `${cat}_${d.lat}_${d.long}_${d.year}` 
      });
    });
  });
}

// ==========================================
// 2. VISUALIZATION LOGIC
// ==========================================
function globe_target() {
 
  let defs = g.select('defs.neon-defs');
  if (defs.empty()) {
    defs = g.append('defs').attr('class', 'neon-defs');
    
    // 1. Define Base Color Gradients
    CATEGORIES.target.forEach((cat, i) => {
      const color = COLORS.targetColors[i] || '#ffffff';
      const gradId = `neon-grad-${i}`;
      
      const grad = defs.append('radialGradient')
        .attr('id', gradId)
        .attr('cx', '50%').attr('cy', '50%').attr('r', '50%'); 

      // Core: Bright Color
      grad.append('stop').attr('offset', '0%')
        .attr('stop-color', d3.color(color).brighter(0.5)) 
        .attr('stop-opacity', 1);

      // Edge: Darker Color
      grad.append('stop').attr('offset', '100%')
        .attr('stop-color', d3.color(color).darker(1.5))
        .attr('stop-opacity', 1);
    });

    // 2. Define Generic Highlight Gradient
    const hGrad = defs.append('radialGradient')
      .attr('id', 'highlight-grad')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');

    hGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.9);
    hGrad.append('stop').attr('offset', '100%').attr('stop-color', '#fff').attr('stop-opacity', 0);
  }

  // --- SCALES ---
  const safeMax = maxKillsGlobal || 100;
  // NOTE: You might need to adjust this range if bubbles start too big/small
  const radiusScale = d3.scaleSqrt().domain([0, safeMax]).range([8, 40]); 

  let ballGroup = g.select('g.target-balls');
  if (ballGroup.empty()) {
    ballGroup = g.append('g').attr('class', 'target-balls');
  }

  // --- DRAW FUNCTION ---
  function drawBalls(currentYear, { transition = false } = {}) {
    
    const activeData = allTargetEvents.filter(d => d.year <= currentYear);

    // --- NEW: Calculate Scale Factor ---
    // 250 is the default D3 projection scale. 
    // This ensures bubbles grow when you zoom in (scale > 250)
    const currentScale = projection.scale();
    const scaleFactor = currentScale / 250; 

    const groups = ballGroup.selectAll('g.target-group')
      .data(activeData, d => d.id);

    groups.exit().remove();

    const enter = groups.enter().append('g')
      .attr('class', 'target-group')
      .style('pointer-events', 'none');

    // 1. Main Body
    enter.append('circle')
      .attr('class', 'body')
      .attr('fill', d => `url(#neon-grad-${d.catIndex})`)
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.3);

    // 2. Highlight
    enter.append('ellipse') 
      .attr('class', 'reflection')
      .attr('fill', 'url(#highlight-grad)')
      .style('mix-blend-mode', 'screen'); 

    const merged = enter.merge(groups);

    // Get center of globe for parallax calc
    const [cx, cy] = projection.translate(); 

    merged.each(function(d) {
      const gEl = d3.select(this);
      
      const isVisible = isFront(d.long, d.lat);
      if (!isVisible) {
        gEl.attr('display', 'none');
        return;
      }
      
      const p = projection([d.long, d.lat]);
      if (!p) return;
      
      gEl.attr('display', 'block')
        .attr('transform', `translate(${p[0]}, ${p[1]})`);

      // --- NEW: Apply Scale Factor to Radius ---
      const r = radiusScale(d.victims) * scaleFactor;

      // Reflection Calculations (using the Scaled R)
      const dx = (p[0] - cx) / cx; 
      const dy = (p[1] - cy) / cy; 
      
      const reflectX = (-r * 0.35) - (dx * r * 0.4);
      const reflectY = (-r * 0.35) - (dy * r * 0.4);

      const body = gEl.select('.body');
      const reflect = gEl.select('.reflection');

      if (transition) {
         if (Math.abs((parseFloat(body.attr('r'))||0) - r) > 0.5) {
            body.transition().duration(500).attr('r', r);
            reflect.transition().duration(500)
                   .attr('rx', r * 0.4).attr('ry', r * 0.3)
                   .attr('cx', reflectX).attr('cy', reflectY);
         }
      } else {
         body.attr('r', r);
         reflect
           .attr('rx', r * 0.4)
           .attr('ry', r * 0.3)
           .attr('cx', reflectX)
           .attr('cy', reflectY);
      }
    });
  }

  stepAnimation = () => {
    const year = +slider.property('value');
    drawBalls(year, { transition: true });
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    g.selectAll('path.country').attr('d', path);
    const year = +slider.property('value');
    // Ensure we redraw bubbles when the globe updates (zooms/rotates)
    drawBalls(year, { transition: false });
  };

  rotateOnStart = true;
  playIntervalMs = 1000;
}