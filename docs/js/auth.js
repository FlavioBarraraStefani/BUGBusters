const API_URL = "https://api.github.com/repos/supernino02/BugBuster-project/contents";
const authStatusEl = document.getElementById("auth-status");
const tokenInputEl = document.getElementById("github-token");
const authSectionEl = document.getElementById("api-auth");

// -------------------------------
// Token Validation
// -------------------------------
async function validateToken(token) {
  token = token || tokenInputEl?.value.trim();
  if (!token) {
    showAuthSection();
    return false;
  }

  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `token ${token}` }
    });

    if (!res.ok) throw new Error("Invalid token or access denied");

    localStorage.setItem("github_token", token);
    document.body.classList.add("authenticated");
    hideAuthSection();

    // Scroll to first private section
    const firstPrivateSection = document.querySelector('.private-section');
    if (firstPrivateSection) {
      setTimeout(() => firstPrivateSection.scrollIntoView({ behavior: 'smooth' }), 300);
    }

    // Load charts automatically after token is validated
    await initChartsAfterAuth();

    return true;

  } catch (err) {
    localStorage.removeItem("github_token");
    document.body.classList.remove("authenticated");
    showAuthSection();
    if (authStatusEl) {
      authStatusEl.className = "alert alert-danger mb-3";
      authStatusEl.textContent = "Authentication failed: " + err.message;
    }
    return false;
  }
}

function showAuthSection() {
  if (authSectionEl) {
    authSectionEl.style.display = 'block';
    document.body.classList.remove('authenticated');
  }
}

function hideAuthSection() {
  if (authSectionEl) {
    authSectionEl.style.display = 'none';
    document.body.classList.add('authenticated');
  }
}

// -------------------------------
// Initial check for cached token
// -------------------------------
(async function () {
  const savedToken = localStorage.getItem("github_token");
  if (savedToken) {
    hideAuthSection();
    if (authStatusEl) authStatusEl.textContent = "Checking saved token...";
    const isValid = await validateToken(savedToken);
    if (!isValid) showAuthSection();
  } else {
    showAuthSection();
  }
})();

const loadChart = (function () {
  const BASE_URL = "https://api.github.com/repos/supernino02/BugBuster-project/contents";
  const cache = new Map();

  return async function (filePath, chartFunc, containerId) {
    const containerDiv = document.getElementById(containerId);
    if (!containerDiv) return;

    containerDiv.style.display = "none"; // hide until loaded
    const token = localStorage.getItem("github_token");

    try {
      if (!cache.has(filePath)) {
        const url = `${BASE_URL}/${filePath}`;
        const res = await fetch(url, { headers: token ? { Authorization: `token ${token}` } : {} });
        if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.statusText}`);
        const rawData = JSON.parse(atob((await res.json()).content.replace(/\n/g, '')));
        cache.set(filePath, rawData);
      }

      const rawData = cache.get(filePath);
      containerDiv.style.display = "block"; // show container
      chartFunc(rawData);

    } catch (err) {
      containerDiv.innerHTML = `<div class="alert alert-danger">Failed to load chart: ${err.message}</div>`;
      console.error(err);
    }
  };
})();


// -------------------------------
// Function to load all charts after authentication
// -------------------------------
async function initChartsAfterAuth() {
  const tasks = [
    // Section 1: Comparing Categories
    loadChart("comparing_categories/bar_chart.json", drawBarChart, "bar_chart_container"),
    loadChart("comparing_categories/full_stacked_chart.json", drawStackedBarChart, "stacked_bar_chart_container"),
    loadChart("comparing_categories/waffle_chart.json", drawWaffleChart, "waffle_chart_container"),
    loadChart("comparing_categories/heatmap_chart.json", drawHeatmapChart, "heatmap_chart_container"),
    loadChart("comparing_categories/multiple_bar_chart.json", drawMultipleBarChart, "multiple_bar_chart_container"),

    // Section 2: Visualizing Distributions
    loadChart("visualizing_distributions/mirror_chart.json", drawMirrorChart, "mirror_chart_container"),
    loadChart("visualizing_distributions/box_plot_chart.json", drawBoxPlotChart, "dist_boxplot_container"),
    loadChart("visualizing_distributions/ridgeline_plot_chart.json", drawRidgePlotChart, "dist_ridgeline_container"),

    // Section 3: Visualizing Distributions
    loadChart("timeline_visualization/connected_scatter_plot.json", drawConnectedScatter, "nyt_scatter_container"),

    // Section 4: Maps
    loadChart("maps/proportional_symbol_map.json", drawProportionalSymbolMap, "proportional_symbol_map_container"),
    loadChart("maps/hexgrid_map.json", drawHexgridMap, "hexgrid_map_container")

  ];

  // load in concurrent way
  await Promise.all(tasks);
}
