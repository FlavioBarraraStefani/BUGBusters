function globe_group() {
  const groupData = window.group_cumulate_country;

  const MAX_CUMULATIVE = d3.max(
    Object.values(groupData),
    country =>
      d3.max(
        Object.values(country),
        yearMap => d3.max(Object.values(yearMap))
      )
  ) || 1;

  // value → interpolation factor
  const colorInterp = d3.scaleSqrt()
    .domain([0, MAX_CUMULATIVE])
    .range([0.1, 1])
    .clamp(true);

  // =============================
  // STEP ANIMATION (timeline)
  // =============================
  stepAnimation = () => {
    const year = +slider.property('value');

    g.selectAll('path.country')
      .attr('d', path)
      .each(function(d) {
        const countryName = d.properties.name;
        const entry = groupData[countryName];

        const sel = d3.select(this);

        // No data for this country
        if (!entry) {
          sel.on('click', null); // remove handler
          sel.transition().duration(playIntervalMs)
            .style('fill', COLORS.GLOBE.country.fill)
            .style('opacity', 1)
            .attr('data-group', null)
            .attr('data-count', 0);
          return;
        }

        let dominantGroup = null;
        let dominantCount = 0;

        Object.entries(entry).forEach(([group, years]) => {
          const validYears = Object.keys(years)
            .map(Number)
            .filter(y => y <= year);

          if (!validYears.length) return;

          const latestYear = d3.max(validYears);
          const val = years[latestYear];

          if (val > dominantCount) {
            dominantCount = val;
            dominantGroup = group;
          }
        });

        // Still nothing active yet
        if (!dominantGroup) {
          sel.on('click', null);
          sel.attr('cursor', 'default')
          sel.transition().duration(playIntervalMs)
            .style('fill', COLORS.GLOBE.country.fill)
            .attr('data-group', null)
            .attr('data-count', 0);
          return;
        }

        // --- COLOR INTERPOLATION ---
        const baseColor = COLORS.GLOBE.country.fill;
        const targetColor = COLORS.groupColors[CATEGORIES.group.indexOf(dominantGroup)];
        const t = colorInterp(dominantCount);

        // set click handler on selection, then animate visual change
        sel.on('click', () => { stopAnimation(); showModal("group", dominantGroup); })
          .attr('cursor', 'pointer')
          .transition().duration(playIntervalMs)
          .style('fill', d3.interpolateRgb(baseColor, targetColor)(t))
          .attr('data-group', dominantGroup)
          .attr('data-count', dominantCount);
      });
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
      .each(function(d) {
        const countryName = d.properties.name;
        const entry = groupData[countryName];
        const sel = d3.select(this);

        if (!entry) {
          sel.style('fill', COLORS.GLOBE.country.fill);
          return;
        }

        let dominantGroup = null;
        let dominantCount = 0;

        Object.entries(entry).forEach(([group, years]) => {
          const validYears = Object.keys(years)
            .map(Number)
            .filter(y => y <= year);

          if (!validYears.length) return;

          const latestYear = d3.max(validYears);
          const val = years[latestYear];

          if (val > dominantCount) {
            dominantCount = val;
            dominantGroup = group;
          }
        });

        if (!dominantGroup) {
          sel.style('fill', COLORS.GLOBE.country.fill);
          return;
        }

        const baseColor = COLORS.GLOBE.country.fill;
        const targetColor = COLORS.groupColors[CATEGORIES.group.indexOf(dominantGroup)];
        const t = colorInterp(dominantCount);
        sel.style('fill', d3.interpolateRgb(baseColor, targetColor)(t));
      });
  };

  // =============================
  // INITIAL RENDER
  // =============================
  rotateOnStart = true;
  playIntervalMs = 300;
  stepAnimation();
}




// =============================
// PRECOMPUTE CUMULATIVE DATA
// =============================
function computeGroupCumulativeCountry(data) {
  const result = {};

    // Aggregate per country / group / year
    Object.entries(data).forEach(([group, years]) => {
      Object.entries(years).forEach(([yearStr, yearData]) => {
        const year = +yearStr;

        yearData.countries.forEach(({ country, count }) => {
          if (!result[country]) result[country] = {};
          if (!result[country][group]) result[country][group] = {};

          result[country][group][year] =
            (result[country][group][year] || 0) + count;
        });
      });
    });

    // Convert yearly counts → cumulative timeline
    Object.values(result).forEach(groupMap => {
      Object.values(groupMap).forEach(yearMap => {
        let acc = 0;
        Object.keys(yearMap)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach(y => {
            acc += yearMap[y];
            yearMap[y] = acc;
          });
      });
    });

    window.group_cumulate_country = result;
}