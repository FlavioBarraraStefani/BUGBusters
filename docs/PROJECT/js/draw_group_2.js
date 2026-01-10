window.addEventListener('resize', () => { if (window._draw_group_2_lastCall) draw_group_2(...window._draw_group_2_lastCall); });

async function draw_group_2(data, choice, containerId) {
  window._draw_group_2_lastCall = [data, choice, containerId];

  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;

  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  //retry loading world topology if not present
  const world = window._countries;
  if (!world) {
    const retry = () => {
      if (window._countries) draw_group_2(data, choice, containerId);
      else setTimeout(retry, 50);
    };
    retry();
    return;
  }
  const countriesFeatures = topojson.feature(world, world.objects.countries).features;

  // 3. PREPARE DATA
  const groupInfo = data[choice];

  if (!groupInfo || !groupInfo.data) {
    svg.append("text").text("No Data").attr("x", width / 2).attr("y", height / 2);
    return;
  }

  const dataMap = new Map(groupInfo.data.map(d => [d.country, d.count]));

  // 4. FILTER FEATURES
  const relevantCountries = countriesFeatures.filter(d => dataMap.has(d.properties.name));
  const featuresToFit = relevantCountries.length > 0 ? relevantCountries : countriesFeatures;

  // 5. PROJECTION & PATH
  const topPadding = 30;

  const projection = d3.geoMercator()
    .fitExtent([[5, topPadding], [width - 5, height - 5]], { type: "FeatureCollection", features: featuresToFit });

  const pathGenerator = d3.geoPath().projection(projection);

  // 6. COLOR SCALE
  const groupIndex = CATEGORIES.group.indexOf(choice);
  const baseColor = COLORS.groupColors[groupIndex];


  const maxVal = d3.max(groupInfo.data, d => d.count) || 100;
  const colorScale = d3.scaleSequential(d3.interpolateRgb("white", baseColor))
    .domain([0, maxVal]);

  const g = svg.append('g');


  // 7. DRAW COUNTRIES
  g.selectAll("path")
    .data(featuresToFit)
    .enter().append("path")
    .attr("d", pathGenerator)
    .attr("fill", d => {
      const value = dataMap.get(d.properties.name);
      return value ? colorScale(value) : "#f0f0f0";
    })
    .attr("stroke", "#bbb")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#333").attr("stroke-width", 1).raise();
      const value = dataMap.get(d.properties.name) || 0;

      tooltipGroup.style("display", null);
      tooltipText.text(`${d.properties.name}: ${value}`);

      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
    })
    .on("mousemove", function (event) {
      const [x, y] = d3.pointer(event, svg.node());
      const xOffset = (x > width / 2) ? -100 : 10;
      tooltipGroup.attr("transform", `translate(${x + xOffset}, ${y - 20})`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "#bbb").attr("stroke-width", 0.5);
      tooltipGroup.style("display", "none");
    });

  // 8. ADD REGION LABEL (CENTERED)
  const titleGroup = svg.append("g")
    .attr("transform", `translate(${width / 2}, 20)`)
    .style("text-anchor", "middle");

  titleGroup.append("text")
    .text(groupInfo.region)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("stroke", "white")
    .style("stroke-width", "3px")
    .style("stroke-linejoin", "round")
    .style("fill", "white")
    .style("opacity", 0.8);

  titleGroup.append("text")
    .text(groupInfo.region)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", COLORS.textPrimary);

  // 9. TOOLTIP GROUP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");

  const tooltipRect = tooltipGroup.append("rect")
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#333")
    .attr("rx", 4);

  const tooltipText = tooltipGroup.append("text")
    .attr("x", 5)
    .attr("y", 12)
    .style("font-size", "10px")
    .style("font-weight", "bold");
}
