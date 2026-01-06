let allTargetEvents = [];
let maxKillsGlobal = 0;

// ==========================================
// 1. DATA PREPARATION
// ==========================================

function precomputeTargetData(rawData) {
  const K = 10; // Limit per category
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
    
    // Define gradients based on CATEGORIES.target
    CATEGORIES.target.forEach((cat, i) => {
      const color = COLORS.targetColors[i] || '#ffffff'; // Fallback to white if color missing
      const gradId = `neon-grad-${i}`;
      
      const grad = defs.append('radialGradient')
        .attr('id', gradId)
        .attr('cx', '35%') // Offset center for 3D look
        .attr('cy', '35%')
        .attr('r', '60%');

      // Core (Hot/White)
      grad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#fff') 
        .attr('stop-opacity', 1);

      // Mid (True Color)
      grad.append('stop')
        .attr('offset', '40%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.9);

      // Edge (Fade)
      grad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0);
    });
  }
  // --- SCALES ---
  // Ensure we don't have a 0 domain
  const safeMax = maxKillsGlobal || 100;
  
  const radiusScale = d3.scaleSqrt()
    .domain([0, safeMax])
    .range([10, 50]); // Slightly larger for visibility

  // --- GROUP SELECTION ---
  let ballGroup = g.select('g.target-balls');
  if (ballGroup.empty()) {
    ballGroup = g.append('g').attr('class', 'target-balls');
  }

  // --- DRAW FUNCTION ---
  function drawBalls(currentYear, { transition = false } = {}) {
    
    const activeData = allTargetEvents.filter(d => d.year <= currentYear);

    const balls = ballGroup.selectAll('circle.target-ball')
      .data(activeData, d => d.id);

    // EXIT
    balls.exit().remove();

    // ENTER
    const enter = balls.enter().append('circle')
      .attr('class', 'target-ball')
      .attr('r', 0)
      .attr('fill', d => `url(#neon-grad-${d.catIndex})`)
      // Use 'normal' blend mode first to ensure visibility. 
      // 'screen' can be invisible if background is light.
      .style('mix-blend-mode', 'normal') 
      .style('pointer-events', 'none'); // Let clicks pass through to globe

    // MERGE
    const merged = enter.merge(balls);

    // UPDATE POSITION
    merged.each(function(d) {
      const el = d3.select(this);
      
      // Visibility Check
      const isVisible = isFront(d.long, d.lat);
      if (!isVisible) {
        el.attr('display', 'none');
        return;
      }
      
      const p = projection([d.long, d.lat]);
      if (!p) return;
      
      el.attr('display', 'block')
        .attr('cx', p[0])
        .attr('cy', p[1]);

      const targetR = radiusScale(d.victims);

      // Animation
      if (transition) {
          // Only animate if size changed significantly or just entered
          const currentR = parseFloat(el.attr('r')) || 0;
          if (Math.abs(currentR - targetR) > 0.5) {
             el.transition().duration(500).attr('r', targetR);
          }
      } else {
          el.attr('r', targetR);
      }
    });
  }

  // --- LOOPS ---
  stepAnimation = () => {
    const year = +slider.property('value');
    drawBalls(year, { transition: true });
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    g.selectAll('path.country').attr('d', path);
    
    const year = +slider.property('value');
    drawBalls(year, { transition: false });
  };

  // --- INIT ---
  rotateOnStart = true;
  playIntervalMs = 1000;
  
  // Trigger immediate draw
  stepAnimation();
}