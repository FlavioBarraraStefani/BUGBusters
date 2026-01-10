window.addEventListener('resize', () => { if (window._draw_target_2_lastCall) draw_target_2(...window._draw_target_2_lastCall); });

function draw_target_2(data, choice, containerId) {
  window._draw_target_2_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const radius = Math.min(width, height) / 2.8; 

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  // Gruppo principale (Camera)
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;
  const duration = 750;

  // 2. DATA PREP
  const rawData = JSON.parse(JSON.stringify(data[choice]));
  const hierarchy = d3.hierarchy(rawData);

  // 3. TREE CONFIG
  const tree = d3.tree()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

  // 4. COLORS
  const colorMap = {};
  const CATEGORIES_LIST = ["military_police", "government", "business", "citizens", "transportations"];
  CATEGORIES_LIST.forEach((key, i) => {
      colorMap[key] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

  // 5. INITIAL COLLAPSE
  function collapse(d) {
      if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = null;
      }
  }

  hierarchy.children.forEach(d => {
      if (d.data.name !== choice) {
          collapse(d);
      }
  });

  const root = hierarchy;
  root.x0 = 0;
  root.y0 = 0;

  // Initial draw
  update(root);

  // ---------------------------------------------------------
  // CORE UPDATE FUNCTION
  // ---------------------------------------------------------
  function update(source) {
      
      const treeData = tree(root);
      const nodes = treeData.descendants();
      const links = treeData.links();

      // A. CAMERA PAN LOGIC
      const expandedCategory = root.children ? root.children.find(d => d.children) : null;
      
      let newTx = width / 2;
      let newTy = height / 2;

      if (expandedCategory) {
          const angle = expandedCategory.x - Math.PI / 2;
          const moveDistance = radius * 0.3;
          newTx = (width / 2) - (Math.cos(angle) * moveDistance);
          newTy = (height / 2) - (Math.sin(angle) * moveDistance);
      }

      g.transition().duration(duration)
       .attr("transform", `translate(${newTx},${newTy})`);


      // B. NODES
      const node = g.selectAll('g.node')
          .data(nodes, d => d.data.name);

      const nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', d => `rotate(${source.x0 * 180 / Math.PI - 90}) translate(${source.y0},0)`)
          .on('click', click);

      nodeEnter.append('circle')
          .attr('r', 1e-6)
          .style("fill", d => getNodeColor(d))
          .style("stroke", "#fff")
          .style("stroke-width", 1.5)
          .style("cursor", d => d._children || d.children ? "pointer" : "default")
          // Eventi Tooltip aggiornati
          .on("mouseover", (event, d) => showTooltip(event, d))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);

      // UPDATE
      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.transition().duration(duration)
          .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

      nodeUpdate.select('circle')
          .attr('r', d => d.depth === 0 ? 8 : (d.depth === 2 ? 4 : 6))
          .style("fill", d => getNodeColor(d));

      // EXIT
      const nodeExit = node.exit().transition().duration(duration)
          .attr('transform', d => `rotate(${source.x * 180 / Math.PI - 90}) translate(${source.y},0)`)
          .remove();

      nodeExit.select('circle').attr('r', 1e-6);

      // C. LINKS
      const link = g.selectAll('path.link')
          .data(links, d => d.target.data.name);

      const linkEnter = link.enter().insert('path', "g")
          .attr("class", "link")
          .attr("fill", "none")
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1.5)
          .attr('d', d => {
              const o = {x: source.x0, y: source.y0};
              return d3.linkRadial().angle(d => o.x).radius(d => o.y)({source: o, target: o});
          });

      const linkUpdate = linkEnter.merge(link);
      linkUpdate.transition().duration(duration)
          .attr('d', d3.linkRadial().angle(d => d.x).radius(d => d.y));

      link.exit().transition().duration(duration)
          .attr('d', d => {
              const o = {x: source.x, y: source.y};
              return d3.linkRadial().angle(d => o.x).radius(d => o.y)({source: o, target: o});
          })
          .remove();

      nodes.forEach(d => {
          d.x0 = d.x;
          d.y0 = d.y;
      });
  }

  // --- HELPERS ---

  function getLabelText(d) {
      if (d.depth === 0) return "ALL";
      const name = d.data.name.replace(/_/g, ' '); 
      return name.length > 20 ? name.substring(0, 18) + "..." : name;
  }

  function getNodeColor(d) {
      if (d.depth === 0) return "#555";
      if (d.depth === 2) return "#e67e22"; 
      const c = colorMap[d.data.name] || "#999";
      return d._children ? d3.rgb(c).darker(0.3) : c;
  }

  function click(event, d) {
      if (d.depth !== 1) return;
      hideTooltip();

      if (d.children) {
          d._children = d.children;
          d.children = null;
      } else {
          if (d.parent && d.parent.children) {
              d.parent.children.forEach(sibling => {
                  if (sibling !== d && sibling.children) {
                      sibling._children = sibling.children;
                      sibling.children = null;
                  }
              });
          }
          d.children = d._children;
          d._children = null;
      }
      update(root);
  }

  // ---------------------------------------------------------
  // TOOLTIP LOGIC (Aligned with draw_target_1)
  // ---------------------------------------------------------
  
  const tooltipGroup = svg.append("g")
      .attr("class", "tooltip-container")
      .style("display", "none")
      .style("pointer-events", "none");

  const tooltipRect = tooltipGroup.append("rect")
      .attr("fill", "rgba(255, 255, 255, 0.95)")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("filter", "drop-shadow(2px 2px 3px rgba(0,0,0,0.2))");

  const tooltipText = tooltipGroup.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("font-size", `${Math.max(8, FONT_SIZE - 2)}px`)
      .style("fill", "#333");

  function showTooltip(event, d) {
      tooltipGroup.style("display", null);
      tooltipText.text(""); // Clear previous content

      // Formatta il nome (rimuovi underscore, Capitalize)
      const title = d.data.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Line 1: Name
      tooltipText.append("tspan")
          .attr("x", 8)
          .attr("dy", "1.1em")
          .style("font-weight", "bold")
          .text(title);

      // Line 2: Context (Category/Subtype)
      let typeLabel = "";
      if (d.depth === 0) typeLabel = "Root";
      else if (d.depth === 1) typeLabel = "Category";
      else if (d.depth === 2) typeLabel = "Subtype";

      tooltipText.append("tspan")
          .attr("x", 8)
          .attr("dy", "1.1em")
          .style("font-style", "italic")
          .style("fill", "#666")
          .text(typeLabel);

      // Line 3: Value
      tooltipText.append("tspan")
          .attr("x", 8)
          .attr("dy", "1.1em")
          .text("Attacks: ");
      
      tooltipText.append("tspan")
          .style("font-weight", "bold")
          .text(d.data.value);

      // Resize Logic
      const bbox = tooltipText.node().getBBox();
      const bgWidth = bbox.width + 16;
      const bgHeight = bbox.height + 10;
      tooltipRect.attr("width", bgWidth).attr("height", bgHeight);

      moveTooltip(event);
  }

  function moveTooltip(event) {
      // Coordinate mouse relative all'SVG
      const [mx, my] = d3.pointer(event, svg.node());
      const offset = 10;
      
      // Dimensioni tooltip correnti
      const bgWidth = parseFloat(tooltipRect.attr("width"));
      const bgHeight = parseFloat(tooltipRect.attr("height"));

      let tx = mx + offset;
      let ty = my + offset;

      // Boundary Detection (Ribaltamento)
      // Check Right Edge
      if (tx + bgWidth > width) {
          tx = mx - bgWidth - offset;
      }

      // Check Bottom Edge
      if (ty + bgHeight > height) {
          ty = my - bgHeight - offset;
      }
      
      // Safety check (non andare in negativo)
      if (tx < 0) tx = offset;
      if (ty < 0) ty = offset;

      tooltipGroup.attr("transform", `translate(${tx}, ${ty})`);
  }

  function hideTooltip() { 
      tooltipGroup.style("display", "none"); 
  }
}