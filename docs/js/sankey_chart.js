function drawSankeyChart(rawData) {
  (async function () {
    // === Setup ===
    const tooltip = d3.select("#sankey_chart_tooltip");
    const chartContainer = d3.select("#sankey_chart_svg");
    const legendContainer = d3.select("#sankey_chart_legend");
    
    chartContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    if (!rawData || rawData.length === 0) {
      chartContainer.append("div")
        .attr("class", "alert alert-warning")
        .text("No data available for Sankey diagram");
      return;
    }

    // === Data Processing ===
    // Transform data into nodes and links format
    // Flow: gname (group) → atk (attack type) → weap (weapon)
    
    const TOP_K = 5; // Number of top categories to show per layer

    // Column/key configuration: change these to reorder or rename input fields
    // layerKeys[0] -> first column (left), layerKeys[1] -> middle, layerKeys[2] -> right
    const COLS = {
      layerKeys: ['gp', 'trg', 'atk'],
      countKey: 'c'
    };
    
    // Count frequencies for each category
    const gnameCounts = new Map();
    const atkCounts = new Map();
    const weapCounts = new Map();
    
    rawData.forEach(d => {
      const cnt = +d[COLS.countKey] || 1;
      gnameCounts.set(d[COLS.layerKeys[0]], (gnameCounts.get(d[COLS.layerKeys[0]]) || 0) + cnt);
      atkCounts.set(d[COLS.layerKeys[1]], (atkCounts.get(d[COLS.layerKeys[1]]) || 0) + cnt);
      weapCounts.set(d[COLS.layerKeys[2]], (weapCounts.get(d[COLS.layerKeys[2]]) || 0) + cnt);
    });
    
    // Get top K categories for each layer
    const topGnames = new Set(
      Array.from(gnameCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_K)
        .map(d => d[0])
    );
    
    const topAtks = new Set(
      Array.from(atkCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_K)
        .map(d => d[0])
    );
    
    const topWeaps = new Set(
      Array.from(weapCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_K)
        .map(d => d[0])
    );
    
    const nodes = [];
    const nodeMap = new Map();
    const links = [];

    function getOrCreateNode(name, layer) {
      const key = `${layer}:${name}`;
      if (!nodeMap.has(key)) {
        const index = nodes.length;
        const node = { name, layer, index };
        nodes.push(node);
        nodeMap.set(key, index);
      }
      return nodeMap.get(key);
    }
    
    // Filter to only include data with top K gnames
    const filteredData = rawData.filter(d => topGnames.has(d[COLS.layerKeys[0]]));
    
    // Determine if a category should be grouped into "Others" (only for atk and weap)
    function shouldGroup(value, layer) {
      if (layer === 1) return !topAtks.has(value);
      if (layer === 2) return !topWeaps.has(value);
      return false;
    }

    // Create nodes and links from filtered data
    filteredData.forEach(d => {
      const gname = d[COLS.layerKeys[0]]; // No grouping for gname
      const atk = shouldGroup(d[COLS.layerKeys[1]], 1) ? "Others" : d[COLS.layerKeys[1]];
      const weap = shouldGroup(d[COLS.layerKeys[2]], 2) ? "Others" : d[COLS.layerKeys[2]];
      
      const gnameIdx = getOrCreateNode(gname, 0);
      const atkIdx = getOrCreateNode(atk, 1);
      const weapIdx = getOrCreateNode(weap, 2);
      const value = +d[COLS.countKey] || 1;

      // Link: gname → atk
      links.push({
        source: gnameIdx,
        target: atkIdx,
        value: value
      });

      // Link: atk → weap
      links.push({
        source: atkIdx,
        target: weapIdx,
        value: value
      });
    });

    // Aggregate duplicate links
    const linkMap = new Map();
    links.forEach(link => {
      const key = `${link.source}-${link.target}`;
      if (linkMap.has(key)) {
        linkMap.get(key).value += link.value;
      } else {
        linkMap.set(key, { ...link });
      }
    });
    const aggregatedLinks = Array.from(linkMap.values());

    // === Dimensions ===
    const containerWidth = chartContainer.node().getBoundingClientRect().width || 800;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = containerWidth;
    const height = Math.max(450, nodes.length * 15);

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    // === Sankey Layout ===
    const sankey = d3.sankey()
      .nodeId(d => d.index)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .nodeSort((a, b) => (b.value || 0) - (a.value || 0));

    // Assign node 'value' based on counts so we can sort categories by descending count
    nodes.forEach(n => {
      if (n.layer === 0) {
        n.value = gnameCounts.get(n.name) || 0;
      } else if (n.layer === 1) {
        if (n.name === "Others") {
          let others = 0;
          atkCounts.forEach((v, k) => { if (!topAtks.has(k)) others += v; });
          n.value = others;
        } else {
          n.value = atkCounts.get(n.name) || 0;
        }
      } else if (n.layer === 2) {
        if (n.name === "Others") {
          let others = 0;
          weapCounts.forEach((v, k) => { if (!topWeaps.has(k)) others += v; });
          n.value = others;
        } else {
          n.value = weapCounts.get(n.name) || 0;
        }
      }
    });

    const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
      nodes: nodes.map(d => ({ ...d })),
      links: aggregatedLinks.map(d => ({ ...d }))
    });

    // === Color Scale ===
    // Different colors for each layer
    const layerColors = [
      "#1f77b4", // Groups (layer 0) - blue
      "#ff7f0e", // Attack types (layer 1) - orange
      "#2ca02c"  // Weapons (layer 2) - green
    ];
    
    const othersColor = "#999999"; // Gray color for "Others" nodes

    function getNodeColor(node) {
      if (node.name === "Others") return othersColor;
      return layerColors[node.layer] || "#999";
    }

    // === Links ===
    const linkGroup = svg.append("g")
      .attr("class", "links")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.4);

    const link = linkGroup.selectAll("path")
      .data(sankeyLinks)
      .enter()
      .append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => getNodeColor(d.source))
      .attr("stroke-width", d => Math.max(1, d.width))
      .style("opacity", 0)
      .on("mouseenter", function(event, d) {
        d3.select(this)
          .style("opacity", 0.8)
          .attr("stroke-width", d => Math.max(2, d.width + 2));

        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip.html(`
          <div style="font-weight:600;margin-bottom:4px;">${d.source.name} → ${d.target.name}</div>
          <div>Flow: ${d3.format(",")(d.value)}</div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .style("opacity", 0.4)
          .attr("stroke-width", d => Math.max(1, d.width));
        
        tooltip.transition().duration(100).style("opacity", 0);
      });

    // Animate links
    await link.transition()
      .duration(800)
      .style("opacity", 0.4)
      .end();

    // === Nodes ===
    const nodeGroup = svg.append("g")
      .attr("class", "nodes");

    const node = nodeGroup.selectAll("g")
      .data(sankeyNodes)
      .enter()
      .append("g")
      .attr("class", "node");

    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => getNodeColor(d))
      .attr("opacity", 0.8)
      .on("mouseenter", function(event, d) {
        d3.select(this).attr("opacity", 1);

        // Highlight connected links
        link.style("opacity", l => 
          (l.source === d || l.target === d) ? 0.8 : 0.1
        );
        const inFlow = d3.sum(d.targetLinks || [], l => l.value);
        const outFlow = d3.sum(d.sourceLinks || [], l => l.value);
        const count = Math.max(inFlow, outFlow);

        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip.html(`
          <div style="font-weight:600;margin-bottom:4px;">${d.name}</div>
          <div>Count: ${d3.format(",")(count)}</div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function() {
        d3.select(this).attr("opacity", 0.8);
        link.style("opacity", 0.4);
        tooltip.transition().duration(100).style("opacity", 0);
      });

    // Node labels
    node.append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name)
      .style("font-size", "11px")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .each(function(d) {
        // Truncate long labels
        const self = d3.select(this);
        let text = d.name;
        const maxLength = 30;
        if (text.length > maxLength) {
          text = text.substring(0, maxLength - 3) + "...";
          self.text(text);
          self.append("title").text(d.name);
        }
      });

    // === Legend ===
    const legendData = [
      { label: "Groups", color: layerColors[0] },
      { label: "Targets", color: layerColors[1] },
      { label: "Attack Types", color: layerColors[2] }
    ];

    legendContainer
      .style("display", "flex")
      .style("justify-content", "center")
      .style("gap", "20px")
      .style("flex-wrap", "wrap")
      .style("margin-top", "20px");

    legendData.forEach(d => {
      const item = legendContainer.append("span")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("gap", "8px");

      item.append("span")
        .style("width", "20px")
        .style("height", "15px")
        .style("background", d.color)
        .style("border-radius", "2px");

      item.append("span")
        .style("font-size", "14px")
        .text(d.label);
    });

  })();
}