// Precompute per-group yearly counts into a compact structure for fast runtime use.
function precompute_group() {
  const data = window.globe_group_data || {};
  const groups = CATEGORIES.group;
  const minYear = 1969;

  // find max year present in data
  let dataMax = minYear;
  groups.forEach(g => {
    const gobj = data[g] || {};
    Object.keys(gobj).forEach(ky => {
      const y = +ky;
      if (!Number.isNaN(y) && y > dataMax) dataMax = y;
    });
  });

  // build years array
  const yearsArr = d3.range(minYear, dataMax + 1);

  const seriesByGroup = {};
  groups.forEach(gname => {
    const arr = yearsArr.map(y => {
      const v = data[gname] && data[gname][String(y)] ? +data[gname][String(y)].total_count : 0;
      return v;
    });
    seriesByGroup[gname] = arr;
  });

  window._precomputed_group = {
    minYear: minYear,
    maxYear: dataMax,
    years: yearsArr,
    seriesByGroup: seriesByGroup
  };
}


// Create and update a ridgeline plot for groups
function right_chart_group(svg) {
  const groups = CATEGORIES.group;
  const maxYear = +slider.property('value') || years[years.length - 1];
  const minYear = 1969;

  const pre = window._precomputed_group;

  // compute x scale (same as axis)
  const x = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([RIGHT_CHART_MARGIN, RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN]);

  // prepare series
  const groupSeries = groups.map((gname, gi) => {
    const len = Math.max(0, Math.min(pre.seriesByGroup[gname].length, maxYear - pre.minYear + 1));
    const counts = pre.seriesByGroup[gname].slice(0, len);
    const sum = counts.reduce((a,b)=>a+b,0) || 1;
    const pdf = counts.map(c => c / sum);
    const series = pdf.map((v,i) => ({ year: minYear + i, value: v }));
    return { name: gname, series, index: gi };
  });

  // container for groups (create if missing)
  let container = svg.select('.groups-container');
  if (container.empty()) {
    container = svg.append('g').attr('class','groups-container').attr('transform','translate(0,0)');
  }

  // layout params
  const gap = 10;
  const groupHeight = (RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN - gap * (groupSeries.length - 1)) / groupSeries.length;
  const axisY = RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN;

  // data join for individual group g elements
  const sel = container.selectAll('g.groups').data(groupSeries, d=>d.name);
  const enter = sel.enter().append('g')
  .attr('class','groups')
  .attr('transform', `translate(0, ${axisY})`);

  // append a horizontal line to each entering group
  enter.append('line')
    .attr('class','ridge-line')
    .attr('x1', d => x(minYear))
    .attr('x2', d => x(maxYear))
    .attr('y1', axisY)
    .attr('y2', axisY)
    .attr('stroke', (d,i) => (COLORS && COLORS.groupColors && COLORS.groupColors[i]) ? COLORS.groupColors[i] : 'steelblue')
    .attr('stroke-width', 3)
    .style('opacity', 0);

  // remove old
  sel.exit().transition().duration(200).style('opacity',0).remove();

  const groupsSel = enter.merge(sel);

  // animate lines into place
  const xStart = x(minYear);
  const xEnd = x(maxYear);
  groupsSel.each(function(d){
    const grp = d3.select(this);
    const i = d.index;
    const baseline = axisY - i * (groupHeight + gap);
    grp.select('.ridge-line')
      .transition().duration(playIntervalMs)
      .attr('x1', xStart)
      .attr('x2', xEnd)
      .attr('y1', baseline)
      .attr('y2', baseline)
      .style('opacity', 1);
  });

  // expose a small updater to allow stepAnimationRight to refresh axis and lines
  container._updateRidges = () => {
    groupsSel.each(function(d){
      const grp = d3.select(this);
      const i = d.index;
      const baseline = axisY - i * (groupHeight + gap);
      grp.select('.ridge-line')
        .transition().duration(playIntervalMs)
        .attr('y1', baseline)
        .attr('y2', baseline);
    });
  };

  // redefine stepAnimationRight to update axis and ridges
  stepAnimationRight = () => {
    xAxis._updateAxis();
    container._updateRidges();
  };

  // initial step
  stepAnimationRight();
}
