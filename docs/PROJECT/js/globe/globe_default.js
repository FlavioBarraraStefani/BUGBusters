
function globe_default(svg) {
  // helper: compute circle attributes for a given year
  function circleAttrs(d, year) {
    const p = projection([+d.long, +d.lat]);
    const front = isFront(+d.long, +d.lat);
    const visible = d.year <= year && front;
    return {
      cx: p ? p[0] : null,
      cy: p ? p[1] : null,
      r: visible ? d._r : 0,
      opacity: visible ? 0.9 : 0,
      stroke: (d.year === year && front)
        ? COLORS.GLOBE.event.highlight
        : COLORS.GLOBE.event.default
    };

  }

  // small helper to apply computed attrs to a selection (optionally with transition)
  function applyAttrsTo(selection, year, { transition = false, duration = 0 } = {}) {
    selection.each(function(d) {
      const a = circleAttrs(d, year);
      const node = d3.select(this);
      // position updated instantly (keeps circles tracking projection changes)
      node.attr('cx', a.cx).attr('cy', a.cy);
      if (transition) {
        node
          .transition().duration(duration)
          .attr('r', a.r)
          .attr('opacity', a.opacity)
          .attr('stroke', a.stroke);
      } else {
        node
          .attr('r', a.r)
          .attr('opacity', a.opacity)
          .attr('stroke', a.stroke);
      }
    });
  }

  //----------//
  //INITIAL DRAW SETUP
  //----------//

  // Data points group
  let pointsGroup = g.select('g.data-points');
  if (pointsGroup.empty()) {
    pointsGroup = g.append('g').attr('class', 'data-points');
  }
  // Get current year from slider
  const currentYear = +slider.property('value');
  const data = (window.globe_default_data || []).map(d => ({
      lat: +d.lat,
      long: +d.long,
      year: +d.year,
      count: +d.count
    }));

 // Create/update/remove circles with explicit initial stroke
  let circles = pointsGroup.selectAll('circle.data-point')
    .data(data, d => `${d.lat}|${d.long}|${d.year}`)
    .join(
      enter => enter.append('circle')
        .attr('class', 'data-point')
        .attr('r', 0)
        .attr('opacity', 0)
        .attr('fill', 'none')
        .attr('stroke-width', 0.3)
        .attr('stroke', COLORS.GLOBE.event.default),
      update => update,
      exit => exit.remove()
    );

  // --- Radius scale ---
  const maxcount = d3.max(data, d => d.count) || 1;
  const rScale = d3.scaleSqrt().domain([0, maxcount]).range([2, 30]);

  // store radius
  circles.each(d => d._r = rScale(d.count));

  // initial visible state based on current slider value
  applyAttrsTo(circles, currentYear, 
    { transition: true, duration: playIntervalMs * 2 });

  //----------//
  //RUNTIME ANIMATION SETUP
  //----------//

  stepAnimation = () => {
    const year = +slider.property('value');
    // animate r/opacity/stroke while keeping positions in sync
    g.selectAll('circle.data-point').call(
      sel => applyAttrsTo(sel, year, { transition: true, duration: playIntervalMs }));
  }

  //WHAT TO DO ON EACH FRAME UPDATE
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    //move countries
    g.selectAll('path').attr('d', path);

    //move data points
    stepAnimation();
  };

  //DO NOT AUTOROTATE the globe
  rotateOnStart = false;
  playIntervalMs = 500;
}