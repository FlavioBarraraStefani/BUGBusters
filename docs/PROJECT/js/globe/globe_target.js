let allTargetEvents = [];
let maxKillsGlobal = 0;

// ==========================================
// 1. DATA PREPARATION
// ==========================================

function precomputeTargetData(rawData) {
  allTargetEvents = [];
  maxKillsGlobal = 0;

  CATEGORIES.target.forEach((cat, index) => {
    const rawEvents = rawData[cat] || [];

    rawEvents.forEach(d => {
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
        summary: d.summary || 'No description available.',
        id: `${cat}_${d.lat}_${d.long}_${d.year}`
      });
    });
  });
}

// ==========================================
// 2. VISUALIZATION LOGIC
// ==========================================
function globe_target() {

  // --- 1. Set Global Opacity for this View ---
  // Dim the ocean and countries as requested
  // --- 2. Tooltip Setup ---
  let tooltip = d3.select('#target-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('id', 'target-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', '#fff')
      .style('padding', '10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none') 
      .style('opacity', 0)
      .style('z-index', 100)
      .style('font-family', 'sans-serif')
      .style('font-size', `${labelFontSize}px`) 
      .style('max-width', '300px')
      .style('line-height', '1.4')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.5)');
  }

  // --- 3. Scales & Groups ---
  const safeMax = maxKillsGlobal || 100;
  // Increased range for "bigger" balls
  const radiusScale = d3.scaleSqrt().domain([0, safeMax]).range([6, 30]);

  let ballGroup = g.select('g.target-balls');
  if (ballGroup.empty()) {
    ballGroup = g.append('g').attr('class', 'target-balls');
  }

  // --- 4. Helper: Render Tooltip ---
// --- 4. Helper: Render Tooltip ---
// --- 4. Helper: Render Tooltip ---
  const renderTooltip = (event, d) => {
    const color = COLORS.targetColors[d.catIndex] || '#fff';
    
    const html = `
      <div style="border-left: 3px solid ${color}; padding-left: 8px;">
        <strong style="color:${color}; text-transform:uppercase; font-size:0.9em;">
          ${d.category}
        </strong>
        <div style="margin-top:4px; font-weight:bold;">
          ${d.victims} Victims (${d.year})
        </div>
        <div style="margin-top:6px; opacity:0.8; font-size:0.95em;">
          ${d.summary}
        </div>
      </div>
    `;

    // 1. Set HTML and opacity first to measure dimensions
    tooltip.html(html).style('opacity', 1);

    // 2. Measure dimensions
    const tooltipNode = tooltip.node();
    const tooltipWidth = tooltipNode.getBoundingClientRect().width;
    const pageWidth = window.innerWidth;
    const gap = 15; // Space between cursor and tooltip

    // 3. X-Axis Logic
    // Default: To the right of the cursor
    let leftPos = event.pageX + gap;
    
    // Check Right Overflow: If it goes off the right edge, try putting it on the left
    if (leftPos + tooltipWidth > pageWidth - 10) { 
        leftPos = event.pageX - tooltipWidth - gap;
    }

    // Check Left Overflow: If flipping to the left made it go off-screen (cursor too close to left edge),
    // force it to start at a safe left margin (e.g., 10px).
    if (leftPos < 10) {
        leftPos = 10;
    }

    // 4. Y-Axis Logic
    // Put it under the hovering position
    let topPos = event.pageY + gap;

    // 5. Apply positions
    tooltip
      .style('left', leftPos + 'px')
      .style('top', topPos + 'px');
  };

  // --- 5. Draw Function ---
  function drawBalls(currentYear, { transition = false } = {}) {
    
    const activeData = allTargetEvents.filter(d => d.year <= currentYear);

    const currentScale = projection.scale();
    const scaleFactor = currentScale / 250;

    const circles = ballGroup.selectAll('circle.target-circle')
      .data(activeData, d => d.id);

    circles.exit().remove();

    // ENTER
    const enter = circles.enter().append('circle')
      .attr('class', 'target-circle')
      .attr('fill', d => COLORS.targetColors[d.catIndex] || '#ccc')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('opacity', 1) // Full Opacity
      .attr('cursor', 'pointer');

    // UPDATE + ENTER
    const merged = enter.merge(circles);

    merged.each(function(d) {
      const el = d3.select(this);

      if (!isFront(d.long, d.lat)) {
        el.attr('display', 'none');
        return;
      }

      const p = projection([d.long, d.lat]);
      if (!p) return;

      const r = radiusScale(d.victims) * scaleFactor;

      el.attr('display', 'block')
        .attr('cx', p[0])
        .attr('cy', p[1]);

      if (transition) {
         el.transition().duration(playIntervalMs).attr('r', r);
      } else {
         el.attr('r', r);
      }
    });

    // --- Interaction Events ---
    merged
      .on('mousemove', function(event, d) {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        
        renderTooltip(event, d);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.5);

        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d) {
        stopAnimation(); 
        // Corrected ShowModal Call
        showModal('target', d.category); 
      });
  }

  // =============================
  // 6. GLOBAL FUNCTIONS OVERWRITE
  // =============================
  
  stepAnimation = (transition = true) => {
    const year = +slider.property('value');
    drawBalls(year, { transition : transition });
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    // 1. Redraw Countries
    g.selectAll('path.country').attr('d', path);

    // 2. Hide Tooltip
    if (tooltip) tooltip.style('opacity', 0);

    // 3. Redraw Bubbles
    const year = +slider.property('value');
    drawBalls(year, { transition: false });
  };

  rotateOnStart = true;
  playIntervalMs = 1000;
}