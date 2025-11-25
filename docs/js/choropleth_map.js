
function drawChoroplethMap(rawData) {
    (async function () {
        // === 1. Selettori ===
        const containerId = "#choropleth_map_container";
        const svgId = "#choropleth_map_chart_svg";
        const legendId = "#choropleth_map_chart_legend";
        const tooltipId = "#choropleth_map_chart_tooltip";

        const chartContainer = d3.select(svgId);
        const legendContainer = d3.select(legendId);
        const tooltip = d3.select(tooltipId);
        const mainContainer = d3.select(containerId);

        // === FIX CRITICO POSIZIONAMENTO ===
        // Forza il contenitore ad essere il punto di riferimento per le coordinate del tooltip
        if (!mainContainer.empty()) {
            mainContainer.style("position", "relative");
        }

        // === 2. Pulizia ===
        chartContainer.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
        
        // Configurazione Stile Tooltip (Sovrascrive Bootstrap e CSS esterni)
        tooltip
            .style("display", "none")
            .style("opacity", 0) // Parte invisibile
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.95)")
            .style("border", "1px solid #333")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("pointer-events", "none") // FONDAMENTALE: evita il flickering
            .style("font-size", "12px")
            .style("z-index", "9999")
            .style("color", "#000")
            .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
            .style("min-width", "120px")
            .style("text-align", "center");

        // Controllo Dati
        if (!Array.isArray(rawData) || !rawData.length) {
            chartContainer.html("<div class='text-center text-muted py-5'>Nessun dato disponibile.</div>");
            return;
        }

        // === 3. Configurazione Dimensioni ===
        const node = chartContainer.node();
        const containerWidth = node ? node.getBoundingClientRect().width : 800;
        const width = containerWidth > 0 ? containerWidth : 800; 
        const height = 500; 

        // === 4. Elaborazione Dati ===
        const dataMap = new Map();
        
        const normalize = (str) => {
            if (!str) return "";
            return str.toLowerCase()
                .trim()
                .replace(/[^a-z0-9]/g, "")
                .replace("governorate", "")
                .replace("province", "")
                .replace(/^al/, "")
                .replace("al", "");
        };

        rawData.forEach(d => {
            if (d.provstate) {
                const key = normalize(d.provstate);
                const val = +d.nkill_sum || 0; 
                dataMap.set(key, val);
            }
        });

        // === 5. Scala Colori ===
        const domains = [100, 500, 1000, 5000, 10000];
        const colors = ["#fee2e2", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];
        const colorScale = d3.scaleThreshold().domain(domains).range(colors);

        // === 6. Caricamento Mappa ===
        let geoData;
        try {
            const loadedData = await d3.json("assets/iraq.json");
            if (loadedData.objects) {
                const objectKey = Object.keys(loadedData.objects)[0]; 
                geoData = topojson.feature(loadedData, loadedData.objects[objectKey]);
            } else {
                geoData = loadedData;
            }
        } catch (err) {
            console.error("Errore caricamento mappa:", err);
            chartContainer.html(`<div class='text-danger text-center py-5'>Errore caricamento mappa.</div>`);
            return;
        }

        // === 7. Creazione SVG ===
        const svg = chartContainer.append("svg")
            .attr("viewBox", [0, 0, width, height])
            .style("width", "100%")
            .style("height", "auto")
            .style("background-color", "#f8f9fa")
            .style("border-radius", "0.5rem");

        const projection = d3.geoMercator().fitExtent([[20, 20], [width - 20, height - 20]], geoData);
        const geoPath = d3.geoPath().projection(projection);

        // Layer
        const g_map = svg.append("g").attr("id", "layer-map");
        const g_text = svg.append("g").attr("id", "layer-text"); // Testo sopra la mappa

        // Ombra
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "drop-shadow");
        filter.append("feDropShadow").attr("dx", "0.5").attr("dy", "1").attr("stdDeviation", "1").attr("flood-opacity", "0.3");

        // === 8. Disegno Regioni ===
        g_map.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", geoPath)
            .attr("class", "region")
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5)
            .attr("filter", "url(#drop-shadow)")
            .attr("fill", d => {
                const mapName = d.properties.NAME_1 || d.properties.name || ""; 
                const cleanName = normalize(mapName);
                let val = dataMap.get(cleanName);
                
                if (val === undefined) {
                    for (let [k, v] of dataMap) {
                        if (cleanName.includes(k) || k.includes(cleanName)) {
                            val = v; break;
                        }
                    }
                }
                d.properties.finalVal = val || 0;
                d.properties.displayName = mapName;
                return (val && val > 0) ? colorScale(val) : "#ffffff";
            })
            .style("cursor", "pointer")
            .style("transition", "fill 0.2s") // Transizione solo CSS
            
            // === INTERAZIONI ===
            .on("mouseover", function(event, d) {
                // Evidenzia regione
                d3.select(this)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1.5)
                    .raise();

                // Mostra Tooltip con !important per sovrascrivere Bootstrap
                const valFmt = d3.format(",")(d.properties.finalVal);
                
                tooltip
                    .style("display", "block")
                    .style("opacity", 1, "important") // Forza opacità
                    .html(`
                        <div class="fw-bold border-bottom pb-1 mb-1" style="font-size:13px; font-weight:bold;">${d.properties.displayName}</div>
                        <div style="font-size:12px">Morti: <span style="color:#dc3545; font-weight:bold;">${valFmt}</span></div>
                    `);
            })
            .on("mousemove", function(event) {
                // Calcola posizione relativa al contenitore (ora che è relative funziona sicuro)
                const [x, y] = d3.pointer(event, mainContainer.node());
                
                tooltip
                    .style("left", (x + 15) + "px")
                    .style("top", (y + 15) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke", "#999")
                    .attr("stroke-width", 0.5);
                
                tooltip.style("display", "none").style("opacity", 0);
            });

        // === 9. Testi Regioni ===
        g_text.selectAll("text")
            .data(geoData.features)
            .enter()
            .append("text")
            .attr("transform", d => `translate(${geoPath.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .style("font-family", "sans-serif")
            .style("font-size", "10px")
            .style("fill", "#333")
            .style("pointer-events", "none") // Importante
            .style("text-shadow", "0px 0px 3px rgba(255,255,255,0.8)")
            .style("font-weight", "600")
            .text(d => {
                if (geoPath.area(d) < 300) return "";
                let n = d.properties.NAME_1 || d.properties.name || "";
                return n.replace("Governorate", "").replace("Province", "").trim();
            });

        // === 10. Legenda ===
        renderDiscretizedLegend(legendContainer, domains, colors);

    })();
}

/*function renderDiscreteLegend(container, domains, colors) {
    container.html("");
    const wrapper = container.append("div")
        .attr("class", "d-flex flex-wrap justify-content-center align-items-center gap-3 py-2")
        .style("font-family", "sans-serif")
        .style("font-size", "12px")
        .style("color", "#6c757d");

    const items = [];
    items.push({ color: colors[0], label: `1 - ${d3.format(",")(domains[0])}` });
    for (let i = 0; i < domains.length - 1; i++) {
        items.push({ color: colors[i+1], label: `${d3.format(",")(domains[i])} - ${d3.format(",")(domains[i+1])}` });
    }
    items.push({ color: colors[colors.length - 1], label: `> ${d3.format(",")(domains[domains.length - 1])}` });

    items.forEach(item => {
        const entry = wrapper.append("div").style("display", "flex").style("align-items", "center").style("margin-right", "10px");
        entry.append("span").style("display", "inline-block").style("width", "12px").style("height", "12px")
            .style("background-color", item.color).style("border", "1px solid #ccc").style("border-radius", "2px").style("margin-right", "6px");
        entry.append("span").text(item.label);
    });
}*/



/**
 * Disegna una legenda a barra continua discretizzata (senza percentuali)
 */
function renderDiscretizedLegend(container, domains, colors) {
    container.html(""); // Pulizia

    // Configurazione dimensioni
    const width = 320;
    const height = 45;
    const margin = { top: 10, right: 15, bottom: 20, left: 15 };

    // Crea SVG
    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("font-family", "sans-serif")
        .style("display", "block")
        .style("margin", "0 auto")
        .style("overflow", "visible");

    // Calcola larghezza blocchi
    const barWidth = width - margin.left - margin.right;
    const blockWidth = barWidth / colors.length;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 1. Disegna i blocchi colore
    g.selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * blockWidth)
        .attr("y", 0)
        .attr("width", blockWidth)
        .attr("height", 10) // Altezza barra
        .attr("fill", d => d)
        .attr("stroke", "none");

    // 2. Bordo esterno (opzionale, per rifinitura)
    g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", barWidth)
        .attr("height", 10)
        .attr("fill", "none")
        .attr("stroke", "#e5e7eb")
        .attr("rx", 2); // Angoli arrotondati

    // 3. Etichette (Valori Numerici)
    const labelsGroup = g.append("g")
        .style("font-size", "10px")
        .style("fill", "#6c757d")
        .style("font-weight", "500")
        .style("text-anchor", "middle"); // Centra il testo rispetto alla coordinata x

    // Etichetta iniziale "0"
    labelsGroup.append("text")
        .attr("x", 0)
        .attr("y", 22) // Posizione Y sotto la barra
        .text("0");

    // Etichette per le soglie (domains)
    domains.forEach((val, i) => {
        // Posiziona l'etichetta alla fine del blocco di colore corrispondente
        // Es: domains[0] è 100, che corrisponde alla fine del primo colore
        const xPosition = (i + 1) * blockWidth;
        
        labelsGroup.append("text")
            .attr("x", xPosition)
            .attr("y", 22)
            .text(val >= 1000 ? d3.format(".2s")(val) : val); // Formatta (es. 1000 -> 1.0k) se necessario
    });
    
    // Linee separatori bianche (opzionale, per staccare i colori)
    g.selectAll("line.separator")
        .data(domains)
        .enter()
        .append("line")
        .attr("class", "separator")
        .attr("x1", (d, i) => (i + 1) * blockWidth)
        .attr("x2", (d, i) => (i + 1) * blockWidth)
        .attr("y1", 0)
        .attr("y2", 10)
        .attr("stroke", "rgba(255,255,255,0.5)")
        .attr("stroke-width", 1);
}
