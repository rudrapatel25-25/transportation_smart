// TransitOps Smart Transport Operations Platform
// Core Application Logic & State Controller

document.addEventListener("DOMContentLoaded", () => {
  // --- Active Date Anchor ---
  const CURRENT_SYSTEM_DATE = new Date("2026-07-12T08:35:00");
  document.getElementById("current-time").textContent = formatSystemDateTime(CURRENT_SYSTEM_DATE);

  // --- State Initialization ---
  let vehicles = getStoredData("transitops_vehicles", INITIAL_VEHICLES);
  let drivers = getStoredData("transitops_drivers", INITIAL_DRIVERS);
  let trips = getStoredData("transitops_trips", INITIAL_TRIPS);
  let maintenanceLogs = getStoredData("transitops_maintenance", INITIAL_MAINTENANCE_LOGS);
  let expenses = getStoredData("transitops_expenses", INITIAL_EXPENSES);
  let currentRole = localStorage.getItem("transitops_role") || "fleet_manager";
  let activeTheme = localStorage.getItem("transitops_theme") || "dark";

  // Chart References (for cleaning up/destroying before recreate)
  let charts = {
    fuelEfficiency: null,
    fleetStatus: null,
    costBreakdown: null,
    roi: null
  };

  // Dashboard Filters
  let dashboardFilters = {
    type: "",
    status: "",
    region: ""
  };



  // --- Formatting Helpers ---
  function formatSystemDateTime(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  // --- Theme Toggle ---
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  themeToggleBtn.addEventListener("click", () => {
    const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(newTheme);
  });

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("transitops_theme", theme);
    activeTheme = theme;
    // Re-draw charts to match new theme colors if dashboard is active
    if (document.getElementById("view-dashboard").classList.contains("active")) {
      renderDashboardCharts();
    }
  }

  // --- Navigation & Routing ---
  function initNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = link.getAttribute("data-view");
        
        // Check RBAC permissions for routing
        if (!hasViewPermission(targetRole(), targetView)) {
          showToast("Access Denied", `Your role "${getRoleLabel(targetRole())}" does not have access to this page.`, "error");
          return;
        }

        window.location.hash = targetView;
        switchView(targetView);
      });
    });

    // Handle hash on page load
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash && hasViewPermission(currentRole, currentHash)) {
      switchView(currentHash);
    } else {
      switchView("dashboard");
    }
  }

  function switchView(viewId) {
    // Update Sidebar Selection
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
      if (link.getAttribute("data-view") === viewId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Update Header Text
    const viewTitle = document.getElementById("view-title");
    const viewSubtitle = document.getElementById("view-subtitle");
    
    const titles = {
      dashboard: { title: "Dashboard Overview", sub: "Real-time indicators and fleet operations analytics." },
      vehicles: { title: "Vehicle Registry", sub: "Manage core fleet assets and operational status." },
      drivers: { title: "Driver Profiles", sub: "Driver registry, licenses, and safety compliance records." },
      trips: { title: "Trip Dispatch Center", sub: "Create, validate, dispatch and archive cargo trips." },
      maintenance: { title: "Maintenance Log", sub: "Track vehicle servicing, oil changes, and garage logs." },
      expenses: { title: "Fuel & Expense Tracking", sub: "Log fuel consumption and fleet operation expenses." },
      reports: { title: "Reports & Analytics", sub: "Performance summaries, ROI calculations, and CSV reports." }
    };

    if (titles[viewId]) {
      viewTitle.textContent = titles[viewId].title;
      viewSubtitle.textContent = titles[viewId].sub;
    }

    // Toggle Section Display
    const sections = document.querySelectorAll(".view-section");
    sections.forEach(sec => {
      if (sec.id === `view-${viewId}`) {
        sec.classList.add("active");
      } else {
        sec.classList.remove("active");
      }
    });

    // Render active view data
    renderActiveView();
  }

  function renderActiveView() {
    const activeSection = document.querySelector(".view-section.active");
    if (!activeSection) return;

    const viewId = activeSection.id.replace("view-", "");
    
    // Refresh sidebar dynamic elements
    document.getElementById("sidebar-role-name").textContent = getRoleLabel(currentRole);

    if (viewId === "dashboard") {
      renderDashboard();
    } else if (viewId === "vehicles") {
      renderVehicles();
    } else if (viewId === "drivers") {
      renderDrivers();
    } else if (viewId === "trips") {
      renderTrips();
    } else if (viewId === "maintenance") {
      renderMaintenance();
    } else if (viewId === "expenses") {
      renderExpenses();
    } else if (viewId === "reports") {
      renderReports();
    }

    // Re-apply RBAC masks
    applyRBAC();
    lucide.createIcons();
  }

  // --- Role Switcher (RBAC) ---
  function targetRole() {
    return currentRole;
  }

  function getRoleLabel(role) {
    const labels = {
      fleet_manager: "Fleet Manager",
      driver: "Driver",
      safety_officer: "Safety Officer",
      financial_analyst: "Financial Analyst"
    };
    return labels[role] || "Fleet Manager";
  }

  function initRoleSwitcher() {
    const roleSelect = document.getElementById("role-select");
    if (!roleSelect) return;
    roleSelect.value = currentRole;
    
    roleSelect.addEventListener("change", (e) => {
      const newRole = e.target.value;
      currentRole = newRole;
      localStorage.setItem("transitops_role", newRole);
      
      showToast("Role Switched", `Now simulating: ${getRoleLabel(newRole)}`, "info");
      
      // If the user was in a view they no longer have permission for, route them back to dashboard
      const activeSection = document.querySelector(".view-section.active");
      const currentView = activeSection ? activeSection.id.replace("view-", "") : "dashboard";
      
      if (!hasViewPermission(newRole, currentView)) {
        window.location.hash = "dashboard";
        switchView("dashboard");
      } else {
        renderActiveView();
      }
    });
  }

  function hasViewPermission(role, view) {
    if (role === "fleet_manager") return true;
    
    const permissions = {
      driver: ["dashboard", "vehicles", "trips"],
      safety_officer: ["dashboard", "vehicles", "drivers"],
      financial_analyst: ["dashboard", "vehicles", "expenses", "reports"]
    };

    return permissions[role] ? permissions[role].includes(view) : false;
  }

  function applyRBAC() {
    const role = currentRole;
    
    // Disable or hide elements based on write capabilities
    const writeSelectors = {
      vehicle: document.querySelectorAll(".rbac-write-vehicle, .btn-icon.edit[data-entity='vehicle'], .btn-icon.delete[data-entity='vehicle']"),
      driver: document.querySelectorAll(".rbac-write-driver, .btn-icon.edit[data-entity='driver'], .btn-icon.delete[data-entity='driver']"),
      trip: document.querySelectorAll(".rbac-write-trip, .btn-icon.dispatch, .btn-icon.complete, .btn-icon.delete[data-entity='trip']"),
      maintenance: document.querySelectorAll(".rbac-write-maintenance, .btn-icon.complete-mnt"),
      expense: document.querySelectorAll(".rbac-write-expense")
    };

    // Reset visibility first
    Object.values(writeSelectors).forEach(list => {
      list.forEach(el => {
        if (el.tagName === "BUTTON") {
          el.disabled = false;
          el.style.opacity = "1";
          el.removeAttribute("title");
        } else {
          el.style.display = "";
        }
      });
    });

    if (role === "fleet_manager") return; // Full access

    if (role === "driver") {
      // Drivers cannot edit vehicles, drivers, maintenance, or expenses, and cannot dispatch new trips
      maskWriteActions(writeSelectors.vehicle, "Fleet Manager access required");
      maskWriteActions(writeSelectors.driver, "Safety Officer or Manager access required");
      maskWriteActions(writeSelectors.trip, "Dispatcher or Manager access required");
      maskWriteActions(writeSelectors.maintenance, "Manager access required");
      maskWriteActions(writeSelectors.expense, "Financial Analyst access required");
    } else if (role === "safety_officer") {
      // Safety officer can write drivers, but not vehicles, trips, maintenance, or expenses
      maskWriteActions(writeSelectors.vehicle, "Manager access required");
      maskWriteActions(writeSelectors.trip, "Manager access required");
      maskWriteActions(writeSelectors.maintenance, "Manager access required");
      maskWriteActions(writeSelectors.expense, "Financial Analyst access required");
    } else if (role === "financial_analyst") {
      // Financial analyst can write expenses, but not vehicles, drivers, trips, or maintenance
      maskWriteActions(writeSelectors.vehicle, "Manager access required");
      maskWriteActions(writeSelectors.driver, "Safety Officer access required");
      maskWriteActions(writeSelectors.trip, "Manager access required");
      maskWriteActions(writeSelectors.maintenance, "Manager access required");
    }
  }

  function maskWriteActions(elements, message) {
    elements.forEach(el => {
      if (el.tagName === "BUTTON" || el.classList.contains("btn-icon")) {
        el.disabled = true;
        el.style.opacity = "0.4";
        el.setAttribute("title", message);
      } else {
        el.style.display = "none";
      }
    });
  }

  // --- Reset System Data ---
  function initResetButton() {
    const resetBtn = document.getElementById("reset-system-btn");
    if (!resetBtn) return;
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all data to default mock records? This overrides current changes.")) {
        localStorage.removeItem("transitops_vehicles");
        localStorage.removeItem("transitops_drivers");
        localStorage.removeItem("transitops_trips");
        localStorage.removeItem("transitops_maintenance");
        localStorage.removeItem("transitops_expenses");
        
        vehicles = JSON.parse(JSON.stringify(INITIAL_VEHICLES));
        drivers = JSON.parse(JSON.stringify(INITIAL_DRIVERS));
        trips = JSON.parse(JSON.stringify(INITIAL_TRIPS));
        maintenanceLogs = JSON.parse(JSON.stringify(INITIAL_MAINTENANCE_LOGS));
        expenses = JSON.parse(JSON.stringify(INITIAL_EXPENSES));
        
        saveAllState();
        showToast("System Reset", "All data re-initialized to initial mock values.", "success");
        renderActiveView();
      }
    });
  }

  function saveAllState() {
    saveStoredData("transitops_vehicles", vehicles);
    saveStoredData("transitops_drivers", drivers);
    saveStoredData("transitops_trips", trips);
    saveStoredData("transitops_maintenance", maintenanceLogs);
    saveStoredData("transitops_expenses", expenses);
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(title, message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let iconName = "info";
    if (type === "success") iconName = "check-circle-2";
    if (type === "warning") iconName = "alert-triangle";
    if (type === "error") iconName = "x-circle";

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Setup close button click
    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 300);
    });

    // Auto-remove duration based on importance (12s for errors/warnings, 7.5s for success/info)
    const duration = (type === "error" || type === "warning") ? 12000 : 7500;
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  // --- MODALS BASE ---
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalCloseBtn = document.getElementById("modal-close-btn");

  function openModal(title, formHTML, setupCallback) {
    modalTitle.textContent = title;
    modalBody.innerHTML = formHTML;
    modalOverlay.classList.add("active");
    if (setupCallback) setupCallback(modalBody);
    lucide.createIcons();
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
    modalBody.innerHTML = "";
  }

  function setupGlobalModalEvents() {
    modalCloseBtn.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // --- VIEW: DASHBOARD CONTROLLER ---

  function renderDashboard() {
    // Calculators
    const activeVehicles = vehicles.filter(v => v.status === "On Trip").length;
    const availableVehicles = vehicles.filter(v => v.status === "Available").length;
    const maintenanceVehicles = vehicles.filter(v => v.status === "In Shop").length;
    const activeTripsCount = trips.filter(t => t.status === "Dispatched").length;
    const pendingTripsCount = trips.filter(t => t.status === "Draft").length;
    const driversOnDuty = drivers.filter(d => d.status === "On Trip").length;
    
    const nonRetiredVehicles = vehicles.filter(v => v.status !== "Retired").length;
    const utilizationRate = nonRetiredVehicles > 0 
      ? Math.round((activeVehicles / nonRetiredVehicles) * 100) 
      : 0;

    // Set KPIs
    document.getElementById("kpi-active-vehicles").textContent = activeVehicles;
    document.getElementById("kpi-available-vehicles").textContent = availableVehicles;
    document.getElementById("kpi-maintenance-vehicles").textContent = maintenanceVehicles;
    document.getElementById("kpi-active-trips").textContent = activeTripsCount;
    document.getElementById("kpi-pending-trips").textContent = pendingTripsCount;
    document.getElementById("kpi-drivers-on-duty").textContent = driversOnDuty;
    document.getElementById("kpi-utilization-rate").textContent = `${utilizationRate}%`;
    document.getElementById("kpi-utilization-bar").style.width = `${utilizationRate}%`;

    // Filter selectors
    const typeSelect = document.getElementById("filter-vehicle-type");
    const statusSelect = document.getElementById("filter-vehicle-status");
    const regionSelect = document.getElementById("filter-region");

    typeSelect.value = dashboardFilters.type;
    statusSelect.value = dashboardFilters.status;
    regionSelect.value = dashboardFilters.region;

    // Filter change listeners
    const triggerFilterUpdate = () => {
      dashboardFilters.type = typeSelect.value;
      dashboardFilters.status = statusSelect.value;
      dashboardFilters.region = regionSelect.value;
      renderDashboardCharts();
      renderDashboardVehicles();
    };

    typeSelect.replaceWith(typeSelect.cloneNode(true));
    statusSelect.replaceWith(statusSelect.cloneNode(true));
    regionSelect.replaceWith(regionSelect.cloneNode(true));

    document.getElementById("filter-vehicle-type").addEventListener("change", triggerFilterUpdate);
    document.getElementById("filter-vehicle-status").addEventListener("change", triggerFilterUpdate);
    document.getElementById("filter-region").addEventListener("change", triggerFilterUpdate);

    document.getElementById("clear-dashboard-filters").onclick = () => {
      dashboardFilters = { type: "", status: "", region: "" };
      document.getElementById("filter-vehicle-type").value = "";
      document.getElementById("filter-vehicle-status").value = "";
      document.getElementById("filter-region").value = "";
      renderDashboardCharts();
      renderDashboardVehicles();
    };

    // Render Charts & Dashboard table
    renderDashboardCharts();
    renderDashboardVehicles();

    // Bind Dashboard Quick Register Button
    const dashAddBtn = document.getElementById("dash-add-vehicle-btn");
    if (dashAddBtn) {
      dashAddBtn.onclick = () => openVehicleModal();
    }
  }

  function renderDashboardVehicles() {
    const tbody = document.getElementById("dash-vehicles-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filtered = getFilteredVehicles();

    filtered.forEach(v => {
      let statusClass = "badge-success";
      if (v.status === "On Trip") statusClass = "badge-info";
      if (v.status === "In Shop") statusClass = "badge-warning";
      if (v.status === "Retired") statusClass = "badge-danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${v.registrationNumber}</td>
        <td>${v.name}</td>
        <td>${v.type}</td>
        <td>${v.maxCapacity} kg</td>
        <td>${v.odometer.toLocaleString()} km</td>
        <td><span class="badge ${statusClass}">${v.status}</span></td>
        <td>
          <div class="action-buttons-cell">
            <button class="btn-icon edit rbac-write-vehicle" data-reg="${v.registrationNumber}" title="Edit details">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="btn-icon delete rbac-write-vehicle" data-reg="${v.registrationNumber}" title="Deregister/Delete" ${v.status === "On Trip" ? "disabled" : ""}>
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind edit/delete click handlers for the dashboard table
    tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const reg = btn.getAttribute("data-reg");
        const vehicle = vehicles.find(v => v.registrationNumber === reg);
        openVehicleModal(vehicle);
      });
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const reg = btn.getAttribute("data-reg");
        const vehicle = vehicles.find(v => v.registrationNumber === reg);
        if (vehicle.status === "On Trip") {
          showToast("Validation Error", "Cannot delete a vehicle while it is active on a trip.", "error");
          return;
        }
        if (confirm(`Are you sure you want to delete vehicle ${reg}?`)) {
          vehicles = vehicles.filter(v => v.registrationNumber !== reg);
          saveAllState();
          showToast("Success", `Vehicle ${reg} has been removed.`, "success");
          renderDashboard(); // refresh dashboard
        }
      });
    });
  }

  function getFilteredVehicles() {
    return vehicles.filter(v => {
      if (dashboardFilters.type && v.type !== dashboardFilters.type) return false;
      if (dashboardFilters.status && v.status !== dashboardFilters.status) return false;
      if (dashboardFilters.region && v.region !== dashboardFilters.region) return false;
      return true;
    });
  }

  function renderDashboardCharts() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textThemeColor = isDark ? "#E2E8F0" : "#1E293B";
    const gridThemeColor = isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.05)";

    const filtered = getFilteredVehicles();
    const filteredRegs = filtered.map(v => v.registrationNumber);

    // Destroy existing charts to recreate cleanly
    Object.keys(charts).forEach(key => {
      if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
      }
    });

    // --- Chart 1: Fuel Efficiency (Distance Run / Fuel Consumed) ---
    const efficiencyData = filtered.map(v => {
      const vTrips = trips.filter(t => t.vehicleRegNumber === v.registrationNumber && t.status === "Completed");
      const totalDistance = vTrips.reduce((sum, t) => sum + t.plannedDistance, 0);
      const totalFuel = expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type === "Fuel")
        .reduce((sum, e) => sum + (e.liters || 0), 0);

      const eff = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(1) : 0;
      return { reg: v.registrationNumber, eff: parseFloat(eff) };
    });

    const ctx1 = document.getElementById("fuel-efficiency-chart").getContext("2d");
    charts.fuelEfficiency = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: efficiencyData.map(d => d.reg),
        datasets: [{
          label: 'Efficiency (km/L)',
          data: efficiencyData.map(d => d.eff),
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderColor: '#6366F1',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textThemeColor } }
        },
        scales: {
          y: { 
            grid: { color: gridThemeColor },
            ticks: { color: textThemeColor },
            title: { display: true, text: 'km / Liter', color: textThemeColor }
          },
          x: { 
            grid: { display: false },
            ticks: { color: textThemeColor }
          }
        }
      }
    });

    // --- Chart 2: Fleet Status Distribution ---
    const statusCounts = { Available: 0, "On Trip": 0, "In Shop": 0, Retired: 0 };
    filtered.forEach(v => {
      if (statusCounts[v.status] !== undefined) {
        statusCounts[v.status]++;
      }
    });

    const ctx2 = document.getElementById("fleet-status-chart").getContext("2d");
    charts.fleetStatus = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)', // Available (Green)
            'rgba(99, 102, 241, 0.8)', // On Trip (Indigo)
            'rgba(245, 158, 11, 0.8)', // In Shop (Amber)
            'rgba(239, 68, 68, 0.8)'   // Retired (Rose)
          ],
          borderColor: isDark ? '#131A2E' : '#FFFFFF',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: textThemeColor }
          }
        }
      }
    });

    // --- Chart 3: Cost Breakdown (Fuel vs Maintenance vs Others) ---
    let costBreakdown = { Fuel: 0, Maintenance: 0, TollsAndOther: 0 };
    expenses.forEach(e => {
      if (filteredRegs.includes(e.vehicleRegNumber)) {
        if (e.type === "Fuel") costBreakdown.Fuel += e.amount;
        else if (e.type === "Maintenance") costBreakdown.Maintenance += e.amount;
        else costBreakdown.TollsAndOther += e.amount;
      }
    });

    // Include maintenance logs cost in total maintenance cost
    maintenanceLogs.forEach(log => {
      if (filteredRegs.includes(log.vehicleRegNumber)) {
        costBreakdown.Maintenance += log.cost;
      }
    });

    const ctx3 = document.getElementById("cost-breakdown-chart").getContext("2d");
    charts.costBreakdown = new Chart(ctx3, {
      type: 'pie',
      data: {
        labels: ['Fuel', 'Maintenance & Repairs', 'Tolls & Others'],
        datasets: [{
          data: [costBreakdown.Fuel, costBreakdown.Maintenance, costBreakdown.TollsAndOther],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',  // Fuel (Blue)
            'rgba(245, 158, 11, 0.8)',  // Maintenance (Amber)
            'rgba(139, 92, 246, 0.8)'   // Tolls (Purple)
          ],
          borderColor: isDark ? '#131A2E' : '#FFFFFF',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: textThemeColor }
          }
        }
      }
    });

    // --- Chart 4: Vehicle ROI ---
    // ROI = (Revenue - (Maint + Fuel)) / AcquisitionCost
    const roiData = filtered.map(v => {
      const vTrips = trips.filter(t => t.vehicleRegNumber === v.registrationNumber && t.status === "Completed");
      const revenue = vTrips.reduce((sum, t) => sum + t.revenue, 0);
      
      const fuelCost = expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type === "Fuel")
        .reduce((sum, e) => sum + e.amount, 0);

      const mntCost = expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type === "Maintenance")
        .reduce((sum, e) => sum + e.amount, 0) +
        maintenanceLogs
          .filter(log => log.vehicleRegNumber === v.registrationNumber)
          .reduce((sum, log) => sum + log.cost, 0);

      const opCost = fuelCost + mntCost;
      const profit = revenue - opCost;
      const roi = v.acquisitionCost > 0 ? ((profit / v.acquisitionCost) * 100).toFixed(1) : 0;

      return { reg: v.registrationNumber, roi: parseFloat(roi) };
    });

    const ctx4 = document.getElementById("roi-chart").getContext("2d");
    charts.roi = new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: roiData.map(d => d.reg),
        datasets: [{
          label: 'ROI (%)',
          data: roiData.map(d => d.roi),
          backgroundColor: 'rgba(20, 184, 166, 0.75)',
          borderColor: '#14B8A6',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textThemeColor } }
        },
        scales: {
          y: { 
            grid: { color: gridThemeColor },
            ticks: { color: textThemeColor },
            title: { display: true, text: 'Percentage (%)', color: textThemeColor }
          },
          x: { 
            grid: { display: false },
            ticks: { color: textThemeColor }
          }
        }
      }
    });
  }

  // --- VIEW: VEHICLES REGISTRY ---
  function renderVehicles() {
    const searchVal = document.getElementById("search-vehicle-input").value.toLowerCase();
    const tbody = document.getElementById("vehicles-table-body");
    tbody.innerHTML = "";

    const filtered = vehicles.filter(v => 
      v.registrationNumber.toLowerCase().includes(searchVal) ||
      v.name.toLowerCase().includes(searchVal) ||
      v.type.toLowerCase().includes(searchVal)
    );

    filtered.forEach(v => {
      let statusClass = "badge-success";
      if (v.status === "On Trip") statusClass = "badge-info";
      if (v.status === "In Shop") statusClass = "badge-warning";
      if (v.status === "Retired") statusClass = "badge-danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${v.registrationNumber}</td>
        <td>${v.name}</td>
        <td>${v.type}</td>
        <td>${v.region}</td>
        <td>${v.maxCapacity} kg</td>
        <td>${v.odometer.toLocaleString()} km</td>
        <td>${formatCurrency(v.acquisitionCost)}</td>
        <td><span class="badge ${statusClass}">${v.status}</span></td>
        <td>
          <div class="action-buttons-cell">
            <button class="btn-icon edit rbac-write-vehicle" data-reg="${v.registrationNumber}" title="Edit details">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="btn-icon delete rbac-write-vehicle" data-reg="${v.registrationNumber}" title="Deregister/Delete" ${v.status === "On Trip" ? "disabled" : ""}>
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Event listeners for action buttons
    tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const reg = btn.getAttribute("data-reg");
        const vehicle = vehicles.find(v => v.registrationNumber === reg);
        openVehicleModal(vehicle);
      });
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const reg = btn.getAttribute("data-reg");
        const vehicle = vehicles.find(v => v.registrationNumber === reg);
        if (vehicle.status === "On Trip") {
          showToast("Validation Error", "Cannot delete a vehicle while it is active on a trip.", "error");
          return;
        }
        if (confirm(`Are you sure you want to delete vehicle ${reg}?`)) {
          vehicles = vehicles.filter(v => v.registrationNumber !== reg);
          saveAllState();
          showToast("Success", `Vehicle ${reg} has been removed.`, "success");
          renderVehicles();
        }
      });
    });

    // Search events
    const searchInput = document.getElementById("search-vehicle-input");
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById("search-vehicle-input").addEventListener("input", renderVehicles);

    // Register Button
    const addBtn = document.getElementById("add-vehicle-btn");
    addBtn.onclick = () => openVehicleModal();
  }

  function openVehicleModal(vehicle = null) {
    const isEdit = !!vehicle;
    const title = isEdit ? "Modify Registered Vehicle" : "Register New Vehicle";
    const formHTML = `
      <form id="vehicle-form">
        <div class="form-group mb-3">
          <label for="form-vehicle-reg">Registration Number (Unique)</label>
          <input type="text" id="form-vehicle-reg" class="form-control" placeholder="e.g. MH-12-AB-1234" value="${isEdit ? vehicle.registrationNumber : ''}" ${isEdit ? 'disabled' : 'required'}>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-vehicle-name">Model Name</label>
            <input type="text" id="form-vehicle-name" class="form-control" placeholder="e.g. Tata Ace Gold" value="${isEdit ? vehicle.name : ''}" required>
          </div>
          <div class="form-group">
            <label for="form-vehicle-type">Vehicle Type</label>
            <select id="form-vehicle-type" class="form-control" required>
              <option value="Mini Truck" ${isEdit && vehicle.type === 'Mini Truck' ? 'selected' : ''}>Mini Truck</option>
              <option value="Pickup" ${isEdit && vehicle.type === 'Pickup' ? 'selected' : ''}>Pickup</option>
              <option value="Light Truck" ${isEdit && vehicle.type === 'Light Truck' ? 'selected' : ''}>Light Truck</option>
              <option value="Heavy Truck" ${isEdit && vehicle.type === 'Heavy Truck' ? 'selected' : ''}>Heavy Truck</option>
              <option value="Van" ${isEdit && vehicle.type === 'Van' ? 'selected' : ''}>Van</option>
            </select>
          </div>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-vehicle-capacity">Max Capacity (kg)</label>
            <input type="number" id="form-vehicle-capacity" class="form-control" placeholder="e.g. 800" min="1" value="${isEdit ? vehicle.maxCapacity : ''}" required>
          </div>
          <div class="form-group">
            <label for="form-vehicle-odometer">Current Odometer (km)</label>
            <input type="number" id="form-vehicle-odometer" class="form-control" placeholder="e.g. 15000" min="0" value="${isEdit ? vehicle.odometer : ''}" required>
          </div>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-vehicle-cost">Acquisition Cost (₹)</label>
            <input type="number" id="form-vehicle-cost" class="form-control" placeholder="e.g. 500000" min="0" value="${isEdit ? vehicle.acquisitionCost : ''}" required>
          </div>
          <div class="form-group">
            <label for="form-vehicle-region">Region</label>
            <select id="form-vehicle-region" class="form-control" required>
              <option value="West" ${isEdit && vehicle.region === 'West' ? 'selected' : ''}>West</option>
              <option value="South" ${isEdit && vehicle.region === 'South' ? 'selected' : ''}>South</option>
              <option value="North" ${isEdit && vehicle.region === 'North' ? 'selected' : ''}>North</option>
              <option value="East" ${isEdit && vehicle.region === 'East' ? 'selected' : ''}>East</option>
            </select>
          </div>
        </div>
        ${isEdit ? `
        <div class="form-group mb-3">
          <label for="form-vehicle-status">Status</label>
          <select id="form-vehicle-status" class="form-control">
            <option value="Available" ${vehicle.status === 'Available' ? 'selected' : ''}>Available</option>
            <option value="In Shop" ${vehicle.status === 'In Shop' ? 'selected' : ''}>In Shop</option>
            <option value="Retired" ${vehicle.status === 'Retired' ? 'selected' : ''}>Retired</option>
          </select>
        </div>
        ` : ''}
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="form-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Register'}</button>
        </div>
      </form>
    `;

    openModal(title, formHTML, (body) => {
      body.querySelector("#form-cancel-btn").onclick = closeModal;
      body.querySelector("#vehicle-form").onsubmit = (e) => {
        e.preventDefault();
        const regVal = body.querySelector("#form-vehicle-reg").value.trim();
        const nameVal = body.querySelector("#form-vehicle-name").value.trim();
        const typeVal = body.querySelector("#form-vehicle-type").value;
        const capacityVal = parseInt(body.querySelector("#form-vehicle-capacity").value);
        const odoVal = parseInt(body.querySelector("#form-vehicle-odometer").value);
        const costVal = parseInt(body.querySelector("#form-vehicle-cost").value);
        const regionVal = body.querySelector("#form-vehicle-region").value;

        if (!isEdit) {
          // Unique Check
          const exists = vehicles.some(v => v.registrationNumber.toLowerCase() === regVal.toLowerCase());
          if (exists) {
            showToast("Validation Warning", "A vehicle with this registration number already exists in the system.", "error");
            return;
          }
          vehicles.push({
            registrationNumber: regVal,
            name: nameVal,
            type: typeVal,
            maxCapacity: capacityVal,
            odometer: odoVal,
            acquisitionCost: costVal,
            status: "Available",
            region: regionVal
          });
          showToast("Registered", `Vehicle ${regVal} registered successfully.`, "success");
        } else {
          // Modify
          const idx = vehicles.findIndex(v => v.registrationNumber === vehicle.registrationNumber);
          const oldStatus = vehicle.status;
          const newStatus = body.querySelector("#form-vehicle-status").value;
          
          if (oldStatus === "On Trip" && newStatus !== "On Trip") {
            showToast("Validation Error", "Cannot change status of a vehicle actively on a trip.", "error");
            return;
          }

          vehicles[idx] = {
            ...vehicles[idx],
            name: nameVal,
            type: typeVal,
            maxCapacity: capacityVal,
            odometer: odoVal,
            acquisitionCost: costVal,
            status: newStatus,
            region: regionVal
          };
          showToast("Saved", `Vehicle details updated.`, "success");
        }

        saveAllState();
        closeModal();
        renderVehicles();
      };
    });
  }

  // --- VIEW: DRIVERS MANAGEMENT ---
  function renderDrivers() {
    const searchVal = document.getElementById("search-driver-input").value.toLowerCase();
    const tbody = document.getElementById("drivers-table-body");
    tbody.innerHTML = "";

    const filtered = drivers.filter(d => 
      d.name.toLowerCase().includes(searchVal) ||
      d.licenseNumber.toLowerCase().includes(searchVal)
    );

    filtered.forEach(d => {
      const expiry = new Date(d.licenseExpiryDate);
      const isExpired = expiry <= CURRENT_SYSTEM_DATE;

      let statusClass = "badge-success";
      if (d.status === "On Trip") statusClass = "badge-info";
      if (d.status === "Off Duty") statusClass = "badge-purple";
      if (d.status === "Suspended") statusClass = "badge-danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${d.name}</td>
        <td>${d.licenseNumber}</td>
        <td><span class="badge badge-info">${d.licenseCategory}</span></td>
        <td>
          <span class="${isExpired ? 'color-rose font-bold' : ''}">
            ${d.licenseExpiryDate} 
            ${isExpired ? '<i data-lucide="alert-triangle" class="text-sm color-rose" title="Expired License"></i>' : ''}
          </span>
        </td>
        <td>${d.contactNumber}</td>
        <td>
          <div class="safety-score-flex">
            <strong class="${d.safetyScore >= 85 ? 'color-green' : d.safetyScore >= 70 ? 'color-amber' : 'color-rose'}">${d.safetyScore}</strong>
            <span class="text-xs text-muted">/100</span>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${d.status}</span></td>
        <td>
          <div class="action-buttons-cell">
            <button class="btn-icon edit rbac-write-driver" data-name="${d.name}" title="Edit profile">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="btn-icon delete rbac-write-driver" data-name="${d.name}" title="Remove Driver" ${d.status === "On Trip" ? "disabled" : ""}>
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Event listeners
    tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name");
        const driver = drivers.find(d => d.name === name);
        openDriverModal(driver);
      });
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name");
        const driver = drivers.find(d => d.name === name);
        if (driver.status === "On Trip") {
          showToast("Validation Error", "Cannot remove driver actively on a trip.", "error");
          return;
        }
        if (confirm(`Are you sure you want to remove driver ${name}?`)) {
          drivers = drivers.filter(d => d.name !== name);
          saveAllState();
          showToast("Success", `Driver ${name} removed from registry.`, "success");
          renderDrivers();
        }
      });
    });

    // Search events
    const searchInput = document.getElementById("search-driver-input");
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById("search-driver-input").addEventListener("input", renderDrivers);

    // Add Driver
    const addBtn = document.getElementById("add-driver-btn");
    addBtn.onclick = () => openDriverModal();
  }

  function openDriverModal(driver = null) {
    const isEdit = !!driver;
    const title = isEdit ? "Modify Driver Profile" : "Register New Driver";
    const formHTML = `
      <form id="driver-form">
        <div class="form-group mb-3">
          <label for="form-driver-name">Driver Full Name</label>
          <input type="text" id="form-driver-name" class="form-control" placeholder="e.g. Alex" value="${isEdit ? driver.name : ''}" ${isEdit ? 'disabled' : 'required'}>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-driver-license">License Number</label>
            <input type="text" id="form-driver-license" class="form-control" placeholder="e.g. DL-2023..." value="${isEdit ? driver.licenseNumber : ''}" required>
          </div>
          <div class="form-group">
            <label for="form-driver-category">License Category</label>
            <select id="form-driver-category" class="form-control" required>
              <option value="LMV" ${isEdit && driver.licenseCategory === 'LMV' ? 'selected' : ''}>LMV (Light Motor)</option>
              <option value="HMV" ${isEdit && driver.licenseCategory === 'HMV' ? 'selected' : ''}>HMV (Heavy Motor)</option>
              <option value="Trans" ${isEdit && driver.licenseCategory === 'Trans' ? 'selected' : ''}>Trans (Transport)</option>
            </select>
          </div>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-driver-expiry">License Expiry Date</label>
            <input type="date" id="form-driver-expiry" class="form-control" value="${isEdit ? driver.licenseExpiryDate : ''}" required>
          </div>
          <div class="form-group">
            <label for="form-driver-contact">Contact Number</label>
            <input type="text" id="form-driver-contact" class="form-control" placeholder="e.g. +91 98765..." value="${isEdit ? driver.contactNumber : ''}" required>
          </div>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-driver-safety">Safety Compliance Score (0-100)</label>
            <input type="number" id="form-driver-safety" class="form-control" placeholder="e.g. 95" min="0" max="100" value="${isEdit ? driver.safetyScore : ''}" required>
          </div>
          ${isEdit ? `
          <div class="form-group">
            <label for="form-driver-status">Status</label>
            <select id="form-driver-status" class="form-control">
              <option value="Available" ${driver.status === 'Available' ? 'selected' : ''}>Available</option>
              <option value="Off Duty" ${driver.status === 'Off Duty' ? 'selected' : ''}>Off Duty</option>
              <option value="Suspended" ${driver.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="form-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Register'}</button>
        </div>
      </form>
    `;

    openModal(title, formHTML, (body) => {
      body.querySelector("#form-cancel-btn").onclick = closeModal;
      body.querySelector("#driver-form").onsubmit = (e) => {
        e.preventDefault();
        const nameVal = body.querySelector("#form-driver-name").value.trim();
        const licenseVal = body.querySelector("#form-driver-license").value.trim();
        const catVal = body.querySelector("#form-driver-category").value;
        const expiryVal = body.querySelector("#form-driver-expiry").value;
        const contactVal = body.querySelector("#form-driver-contact").value.trim();
        const safetyVal = parseInt(body.querySelector("#form-driver-safety").value);

        if (!isEdit) {
          // Unique Check
          const exists = drivers.some(d => d.name.toLowerCase() === nameVal.toLowerCase());
          if (exists) {
            showToast("Validation Error", "A driver profile with this name already exists.", "error");
            return;
          }
          drivers.push({
            name: nameVal,
            licenseNumber: licenseVal,
            licenseCategory: catVal,
            licenseExpiryDate: expiryVal,
            contactNumber: contactVal,
            safetyScore: safetyVal,
            status: "Available"
          });
          showToast("Added", `Driver profile for ${nameVal} has been logged.`, "success");
        } else {
          const idx = drivers.findIndex(d => d.name === driver.name);
          const oldStatus = driver.status;
          const newStatus = body.querySelector("#form-driver-status").value;

          if (oldStatus === "On Trip" && newStatus !== "On Trip") {
            showToast("Validation Error", "Cannot change status of a driver currently on a trip.", "error");
            return;
          }

          drivers[idx] = {
            ...drivers[idx],
            licenseNumber: licenseVal,
            licenseCategory: catVal,
            licenseExpiryDate: expiryVal,
            contactNumber: contactVal,
            safetyScore: safetyVal,
            status: newStatus
          };
          showToast("Saved", `Driver profile updated.`, "success");
        }

        saveAllState();
        closeModal();
        renderDrivers();
      };
    });
  }

  // --- VIEW: TRIP DISPATCH CENTER ---
  function renderTrips() {
    const searchVal = document.getElementById("search-trip-input").value.toLowerCase();
    
    // 1. Render Active Dispatches Grid
    const activeContainer = document.getElementById("active-trips-container");
    activeContainer.innerHTML = "";

    const activeTrips = trips.filter(t => t.status === "Dispatched" && (
      t.id.toLowerCase().includes(searchVal) ||
      t.source.toLowerCase().includes(searchVal) ||
      t.destination.toLowerCase().includes(searchVal) ||
      t.driverName.toLowerCase().includes(searchVal) ||
      t.vehicleRegNumber.toLowerCase().includes(searchVal)
    ));

    if (activeTrips.length === 0) {
      activeContainer.innerHTML = `<div class="text-secondary text-sm p-4 w-full">No active dispatched trips found.</div>`;
    } else {
      activeTrips.forEach(t => {
        const card = document.createElement("div");
        card.className = "active-trip-card";
        card.innerHTML = `
          <div class="active-trip-header">
            <span class="active-trip-id">${t.id}</span>
            <span class="badge badge-info">${t.status}</span>
          </div>
          <div class="active-trip-route">
            <div class="route-point">
              <span class="route-dot-marker"></span>
              <span>${t.source}</span>
            </div>
            <div class="route-arrow"></div>
            <div class="route-point">
              <span class="route-dot-marker dest"></span>
              <span>${t.destination}</span>
            </div>
          </div>
          <div class="active-trip-meta">
            <div class="meta-item">
              <span class="meta-label">Vehicle:</span>
              <span class="meta-value">${t.vehicleRegNumber}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Driver:</span>
              <span class="meta-value">${t.driverName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Cargo Weight:</span>
              <span class="meta-value">${t.cargoWeight} kg</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Planned Dist:</span>
              <span class="meta-value">${t.plannedDistance} km</span>
            </div>
          </div>
          <div class="active-trip-actions">
            <button class="btn-primary complete flex-grow" data-id="${t.id}">
              <i data-lucide="check-circle-2"></i> Complete Trip
            </button>
            <button class="btn-secondary-danger rbac-write-trip" data-id="${t.id}" title="Cancel dispatch">
              <i data-lucide="x"></i> Cancel
            </button>
          </div>
        `;
        activeContainer.appendChild(card);
      });
    }

    // Bind Active Card Buttons
    activeContainer.querySelectorAll(".btn-primary.complete").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        openCompleteTripModal(id);
      };
    });

    activeContainer.querySelectorAll(".btn-secondary-danger").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        triggerCancelTrip(id);
      };
    });

    // 2. Render Historical Archive Table
    const tbody = document.getElementById("trips-table-body");
    tbody.innerHTML = "";

    const nonActiveTrips = trips.filter(t => t.status !== "Dispatched" && (
      t.id.toLowerCase().includes(searchVal) ||
      t.source.toLowerCase().includes(searchVal) ||
      t.destination.toLowerCase().includes(searchVal) ||
      t.driverName.toLowerCase().includes(searchVal) ||
      t.vehicleRegNumber.toLowerCase().includes(searchVal)
    ));

    nonActiveTrips.forEach(t => {
      let statusClass = "badge-success";
      if (t.status === "Draft") statusClass = "badge-warning";
      if (t.status === "Cancelled") statusClass = "badge-danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${t.id}</td>
        <td>
          <div class="text-sm font-bold">${t.source}</div>
          <div class="text-xs text-muted">to ${t.destination}</div>
        </td>
        <td>${t.vehicleRegNumber}</td>
        <td>${t.driverName}</td>
        <td>${t.cargoWeight} kg</td>
        <td>${t.plannedDistance} km</td>
        <td>${formatCurrency(t.revenue)}</td>
        <td><span class="badge ${statusClass}">${t.status}</span></td>
        <td>
          ${t.status === "Completed" ? `
            <div class="text-xs">
              <div>Odo: <strong>${t.finalOdometer} km</strong></div>
              <div>Fuel: <strong>${t.fuelConsumed} L</strong></div>
            </div>
          ` : '<span class="text-muted">-</span>'}
        </td>
        <td>
          <div class="action-buttons-cell">
            ${t.status === "Draft" ? `
              <button class="btn-icon dispatch rbac-write-trip" data-id="${t.id}" title="Dispatch Trip">
                <i data-lucide="play"></i>
              </button>
            ` : ''}
            <button class="btn-icon delete rbac-write-trip" data-id="${t.id}" title="Delete Record">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind Archive Table Buttons
    tbody.querySelectorAll(".btn-icon.dispatch").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        triggerDispatchTrip(id);
      };
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        if (confirm(`Are you sure you want to delete trip ${id}?`)) {
          trips = trips.filter(t => t.id !== id);
          saveAllState();
          showToast("Success", `Trip ${id} record deleted.`, "success");
          renderTrips();
        }
      };
    });

    // Search events
    const searchInput = document.getElementById("search-trip-input");
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById("search-trip-input").addEventListener("input", renderTrips);

    // Create & Dispatch button
    const createBtn = document.getElementById("create-trip-btn");
    createBtn.onclick = () => openCreateTripModal();
  }

  function openCreateTripModal() {
    // Collect selectors
    const validVehicles = vehicles.filter(v => v.status === "Available");
    const validDrivers = drivers.filter(d => {
      if (d.status !== "Available") return false;
      const expiry = new Date(d.licenseExpiryDate);
      if (expiry <= CURRENT_SYSTEM_DATE) return false; // Expired
      return true;
    });

    let vehicleOptions = validVehicles.map(v => 
      `<option value="${v.registrationNumber}">${v.registrationNumber} - ${v.name} (Max: ${v.maxCapacity} kg)</option>`
    ).join("");

    let driverOptions = validDrivers.map(d => 
      `<option value="${d.name}">${d.name} - Category: ${d.licenseCategory} (Safety: ${d.safetyScore})</option>`
    ).join("");

    const formHTML = `
      <form id="trip-create-form">
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-trip-source">Source Location</label>
            <input type="text" id="form-trip-source" class="form-control" placeholder="e.g. Mumbai Warehouse" required>
          </div>
          <div class="form-group">
            <label for="form-trip-dest">Destination Location</label>
            <input type="text" id="form-trip-dest" class="form-control" placeholder="e.g. Pune Hub" required>
          </div>
        </div>
        
        <div class="form-group mb-3">
          <label for="form-trip-vehicle">Assign Vehicle (Available Only)</label>
          <select id="form-trip-vehicle" class="form-control" required>
            <option value="">Select vehicle...</option>
            ${vehicleOptions}
          </select>
          <p class="text-xs text-muted mt-1">Retired and In Shop vehicles are excluded automatically.</p>
        </div>

        <div class="form-group mb-3">
          <label for="form-trip-driver">Assign Driver (Available & Valid License)</label>
          <select id="form-trip-driver" class="form-control" required>
            <option value="">Select driver...</option>
            ${driverOptions}
          </select>
          <p class="text-xs text-muted mt-1">Drivers with expired licenses or Suspended status are excluded automatically.</p>
        </div>

        <div class="form-grid-3 mb-3" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
          <div class="form-group">
            <label for="form-trip-weight">Cargo Weight (kg)</label>
            <input type="number" id="form-trip-weight" class="form-control" min="1" placeholder="Weight" required>
          </div>
          <div class="form-group">
            <label for="form-trip-distance">Distance (km)</label>
            <input type="number" id="form-trip-distance" class="form-control" min="1" placeholder="Distance" required>
          </div>
          <div class="form-group">
            <label for="form-trip-revenue">Estimated Revenue (₹)</label>
            <input type="number" id="form-trip-revenue" class="form-control" min="0" placeholder="Revenue" required>
          </div>
        </div>

        <div class="form-group mb-3">
          <label for="form-trip-dispatch-immediately">Dispatch Options</label>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <input type="checkbox" id="form-trip-dispatch-immediately" checked>
            <label for="form-trip-dispatch-immediately" style="font-size:0.85rem; font-weight:normal; cursor:pointer;">Dispatch immediately (Set status to On Trip)</label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="form-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">Create Trip</button>
        </div>
      </form>
    `;

    openModal("Create & Dispatch Trip", formHTML, (body) => {
      body.querySelector("#form-cancel-btn").onclick = closeModal;
      body.querySelector("#trip-create-form").onsubmit = (e) => {
        e.preventDefault();
        
        const sourceVal = body.querySelector("#form-trip-source").value.trim();
        const destVal = body.querySelector("#form-trip-dest").value.trim();
        const vReg = body.querySelector("#form-trip-vehicle").value;
        const dName = body.querySelector("#form-trip-driver").value;
        const weightVal = parseInt(body.querySelector("#form-trip-weight").value);
        const distVal = parseInt(body.querySelector("#form-trip-distance").value);
        const revVal = parseInt(body.querySelector("#form-trip-revenue").value);
        const dispatchNow = body.querySelector("#form-trip-dispatch-immediately").checked;

        // Validations
        const vehicle = vehicles.find(v => v.registrationNumber === vReg);
        if (!vehicle) {
          showToast("Validation Error", "Invalid vehicle selected.", "error");
          return;
        }

        const driver = drivers.find(d => d.name === dName);
        if (!driver) {
          showToast("Validation Error", "Invalid driver selected.", "error");
          return;
        }

        // Cargo weight rule
        if (weightVal > vehicle.maxCapacity) {
          showToast("Business Rule Violated", `Cargo weight (${weightVal} kg) exceeds vehicle's maximum capacity (${vehicle.maxCapacity} kg).`, "error");
          return;
        }

        // Expiry date rule
        const expiry = new Date(driver.licenseExpiryDate);
        if (expiry <= CURRENT_SYSTEM_DATE) {
          showToast("Business Rule Violated", "Driver has an expired driving license and cannot be assigned.", "error");
          return;
        }

        // Already booked rule
        if (vehicle.status === "On Trip") {
          showToast("Business Rule Violated", "Vehicle is already assigned to an active trip.", "error");
          return;
        }
        if (driver.status === "On Trip") {
          showToast("Business Rule Violated", "Driver is already assigned to an active trip.", "error");
          return;
        }

        const newId = `TRIP-${1001 + trips.length}`;
        const newTrip = {
          id: newId,
          source: sourceVal,
          destination: destVal,
          vehicleRegNumber: vReg,
          driverName: dName,
          cargoWeight: weightVal,
          plannedDistance: distVal,
          status: dispatchNow ? "Dispatched" : "Draft",
          createdAt: CURRENT_SYSTEM_DATE.toISOString(),
          completedAt: null,
          revenue: revVal,
          fuelConsumed: null,
          finalOdometer: null
        };

        trips.push(newTrip);

        if (dispatchNow) {
          // Change status of driver & vehicle
          const vIdx = vehicles.findIndex(v => v.registrationNumber === vReg);
          vehicles[vIdx].status = "On Trip";

          const dIdx = drivers.findIndex(d => d.name === dName);
          drivers[dIdx].status = "On Trip";
          
          showToast("Dispatched", `Trip ${newId} has been created and dispatched. Vehicle/Driver marked On Trip.`, "success");
        } else {
          showToast("Draft Saved", `Trip ${newId} created as Draft.`, "success");
        }

        saveAllState();
        closeModal();
        renderTrips();
      };
    });
  }

  function triggerDispatchTrip(tripId) {
    const tripIdx = trips.findIndex(t => t.id === tripId);
    const trip = trips[tripIdx];

    // Check availability
    const vehicle = vehicles.find(v => v.registrationNumber === trip.vehicleRegNumber);
    const driver = drivers.find(d => d.name === trip.driverName);

    if (vehicle.status !== "Available") {
      showToast("Dispatch Failed", `Vehicle ${trip.vehicleRegNumber} is currently ${vehicle.status}.`, "error");
      return;
    }
    if (driver.status !== "Available") {
      showToast("Dispatch Failed", `Driver ${trip.driverName} is currently ${driver.status}.`, "error");
      return;
    }
    const expiry = new Date(driver.licenseExpiryDate);
    if (expiry <= CURRENT_SYSTEM_DATE) {
      showToast("Dispatch Failed", "Driver license has expired.", "error");
      return;
    }

    // Set statuses to On Trip
    trip.status = "Dispatched";
    vehicle.status = "On Trip";
    driver.status = "On Trip";

    saveAllState();
    showToast("Dispatched", `Trip ${tripId} is now dispatched!`, "success");
    renderTrips();
  }

  function triggerCancelTrip(tripId) {
    const tripIdx = trips.findIndex(t => t.id === tripId);
    const trip = trips[tripIdx];

    const vIdx = vehicles.findIndex(v => v.registrationNumber === trip.vehicleRegNumber);
    const dIdx = drivers.findIndex(d => d.name === trip.driverName);

    // Cancel trip restores vehicle and driver status back to Available
    if (vehicles[vIdx].status === "On Trip") {
      vehicles[vIdx].status = "Available";
    }
    if (drivers[dIdx].status === "On Trip") {
      drivers[dIdx].status = "Available";
    }
    trip.status = "Cancelled";

    saveAllState();
    showToast("Cancelled", `Trip ${tripId} cancelled. Vehicle & Driver status restored to Available.`, "warning");
    renderTrips();
  }

  function openCompleteTripModal(tripId) {
    const trip = trips.find(t => t.id === tripId);
    const vehicle = vehicles.find(v => v.registrationNumber === trip.vehicleRegNumber);

    const formHTML = `
      <form id="trip-complete-form">
        <div class="form-group mb-3">
          <label>Trip details</label>
          <div class="text-sm card-premium" style="padding:0.75rem;">
            <strong>${trip.id}</strong>: ${trip.source} to ${trip.destination} <br>
            Vehicle: ${trip.vehicleRegNumber} | Driver: ${trip.driverName} <br>
            Planned Distance: <strong>${trip.plannedDistance} km</strong>
          </div>
        </div>

        <div class="form-group mb-3">
          <label for="form-complete-odo">Ending Odometer (km)</label>
          <input type="number" id="form-complete-odo" class="form-control" min="${vehicle.odometer}" value="${vehicle.odometer + trip.plannedDistance}" required>
          <p class="text-xs text-muted mt-1">Must be equal or greater than starting odometer (${vehicle.odometer.toLocaleString()} km).</p>
        </div>

        <div class="form-group mb-3">
          <label for="form-complete-fuel">Fuel Consumed (Liters)</label>
          <input type="number" id="form-complete-fuel" class="form-control" min="1" placeholder="Liters of fuel consumed" required>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="form-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">Complete & Archive</button>
        </div>
      </form>
    `;

    openModal("Complete Cargo Trip", formHTML, (body) => {
      body.querySelector("#form-cancel-btn").onclick = closeModal;
      body.querySelector("#form-complete-fuel").focus();
      
      body.querySelector("#trip-complete-form").onsubmit = (e) => {
        e.preventDefault();
        const endingOdo = parseInt(body.querySelector("#form-complete-odo").value);
        const fuelLiters = parseInt(body.querySelector("#form-complete-fuel").value);

        if (endingOdo < vehicle.odometer) {
          showToast("Validation Error", "Ending odometer cannot be less than vehicle starting odometer.", "error");
          return;
        }

        // Apply state updates
        const tripIdx = trips.findIndex(t => t.id === tripId);
        trips[tripIdx].status = "Completed";
        trips[tripIdx].completedAt = CURRENT_SYSTEM_DATE.toISOString();
        trips[tripIdx].fuelConsumed = fuelLiters;
        trips[tripIdx].finalOdometer = endingOdo;

        // Vehicle Odometer & Status updates
        const vIdx = vehicles.findIndex(v => v.registrationNumber === trip.vehicleRegNumber);
        vehicles[vIdx].odometer = endingOdo;
        vehicles[vIdx].status = "Available";

        // Driver Status updates
        const dIdx = drivers.findIndex(d => d.name === trip.driverName);
        drivers[dIdx].status = "Available";

        // Automatically log Fuel Expense
        const fuelCostRate = 100; // Rs 100 per liter
        const costAmount = fuelLiters * fuelCostRate;
        const newExpenseId = `EXP-${3001 + expenses.length}`;

        expenses.push({
          id: newExpenseId,
          vehicleRegNumber: trip.vehicleRegNumber,
          type: "Fuel",
          amount: costAmount,
          liters: fuelLiters,
          date: CURRENT_SYSTEM_DATE.toISOString().split("T")[0],
          description: `Fuel refill of ${fuelLiters}L for completed Trip ${trip.id}`
        });

        saveAllState();
        closeModal();
        showToast("Trip Completed", `Trip ${tripId} is archived. Fuel log recorded for ₹${costAmount}.`, "success");
        renderTrips();
      };
    });
  }

  // --- VIEW: MAINTENANCE LOG ---
  function renderMaintenance() {
    const searchVal = document.getElementById("search-maintenance-input").value.toLowerCase();
    const tbody = document.getElementById("maintenance-table-body");
    tbody.innerHTML = "";

    const filtered = maintenanceLogs.filter(log => 
      log.vehicleRegNumber.toLowerCase().includes(searchVal) ||
      log.description.toLowerCase().includes(searchVal) ||
      log.id.toLowerCase().includes(searchVal)
    );

    filtered.forEach(log => {
      let statusClass = "badge-warning";
      if (log.status === "Completed") statusClass = "badge-success";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${log.id}</td>
        <td>${log.vehicleRegNumber}</td>
        <td>${log.description}</td>
        <td>${log.scheduledDate}</td>
        <td>${formatCurrency(log.cost)}</td>
        <td><span class="badge ${statusClass}">${log.status}</span></td>
        <td>${log.completedAt ? formatSystemDateTime(new Date(log.completedAt)) : '<span class="text-muted">Active Work</span>'}</td>
        <td>
          <div class="action-buttons-cell">
            ${log.status === "Active" ? `
              <button class="btn-icon complete complete-mnt" data-id="${log.id}" title="Complete maintenance">
                <i data-lucide="check-square"></i>
              </button>
            ` : ''}
            <button class="btn-icon delete rbac-write-maintenance" data-id="${log.id}" title="Delete Record">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Action clicks
    tbody.querySelectorAll(".btn-icon.complete-mnt").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        triggerCompleteMaintenance(id);
      };
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        if (confirm(`Delete maintenance record ${id}?`)) {
          const log = maintenanceLogs.find(l => l.id === id);
          maintenanceLogs = maintenanceLogs.filter(l => l.id !== id);
          
          // If active maintenance was deleted, restore vehicle to Available (safety backup)
          if (log.status === "Active") {
            const vIdx = vehicles.findIndex(v => v.registrationNumber === log.vehicleRegNumber);
            if (vIdx !== -1 && vehicles[vIdx].status === "In Shop") {
              vehicles[vIdx].status = "Available";
            }
          }
          saveAllState();
          showToast("Success", `Maintenance log ${id} deleted.`, "success");
          renderMaintenance();
        }
      };
    });

    // Search events
    const searchInput = document.getElementById("search-maintenance-input");
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById("search-maintenance-input").addEventListener("input", renderMaintenance);

    // Trigger button
    const mntBtn = document.getElementById("log-maintenance-btn");
    mntBtn.onclick = () => openMaintenanceModal();
  }

  function openMaintenanceModal() {
    const validVehicles = vehicles.filter(v => v.status === "Available" || v.status === "In Shop");
    const vehicleOptions = validVehicles.map(v => 
      `<option value="${v.registrationNumber}">${v.registrationNumber} - ${v.name} (Current: ${v.status})</option>`
    ).join("");

    const formHTML = `
      <form id="mnt-form">
        <div class="form-group mb-3">
          <label for="form-mnt-vehicle">Select Vehicle</label>
          <select id="form-mnt-vehicle" class="form-control" required>
            <option value="">Select vehicle...</option>
            ${vehicleOptions}
          </select>
        </div>
        <div class="form-group mb-3">
          <label for="form-mnt-desc">Maintenance Task / Description</label>
          <input type="text" id="form-mnt-desc" class="form-control" placeholder="e.g. Engine Oil Change & Tyre Rotation" required>
        </div>
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-mnt-date">Scheduled Date</label>
            <input type="date" id="form-mnt-date" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="form-mnt-cost">Estimated Service Cost (₹)</label>
            <input type="number" id="form-mnt-cost" class="form-control" min="0" placeholder="e.g. 5000" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="form-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">Log Maintenance</button>
        </div>
      </form>
    `;

    openModal("Log Vehicle Maintenance", formHTML, (body) => {
      body.querySelector("#form-cancel-btn").onclick = closeModal;
      // pre-fill date to system date
      body.querySelector("#form-mnt-date").value = CURRENT_SYSTEM_DATE.toISOString().split("T")[0];
      
      body.querySelector("#mnt-form").onsubmit = (e) => {
        e.preventDefault();
        const vReg = body.querySelector("#form-mnt-vehicle").value;
        const descVal = body.querySelector("#form-mnt-desc").value.trim();
        const dateVal = body.querySelector("#form-mnt-date").value;
        const costVal = parseInt(body.querySelector("#form-mnt-cost").value);

        // Validation - Business rule: Creating active maintenance sets vehicle to In Shop
        const vIdx = vehicles.findIndex(v => v.registrationNumber === vReg);
        if (vehicles[vIdx].status === "On Trip") {
          showToast("Business Rule Violated", "Cannot send a vehicle to maintenance while it is active on a trip.", "error");
          return;
        }

        const newId = `MNT-${2001 + maintenanceLogs.length}`;
        maintenanceLogs.push({
          id: newId,
          vehicleRegNumber: vReg,
          description: descVal,
          scheduledDate: dateVal,
          cost: costVal,
          status: "Active",
          createdAt: CURRENT_SYSTEM_DATE.toISOString(),
          completedAt: null
        });

        // Set status to In Shop
        vehicles[vIdx].status = "In Shop";

        saveAllState();
        closeModal();
        showToast("Maintenance Logged", `Vehicle ${vReg} sent to maintenance. Status marked In Shop.`, "success");
        renderMaintenance();
      };
    });
  }

  function triggerCompleteMaintenance(logId) {
    const idx = maintenanceLogs.findIndex(l => l.id === logId);
    const log = maintenanceLogs[idx];

    // Restore vehicle status to Available (unless retired)
    const vIdx = vehicles.findIndex(v => v.registrationNumber === log.vehicleRegNumber);
    if (vIdx !== -1) {
      if (vehicles[vIdx].status === "Retired") {
        showToast("Maintenance Completed", `Work finished, but vehicle ${log.vehicleRegNumber} remains Retired.`, "info");
      } else {
        vehicles[vIdx].status = "Available";
        showToast("Vehicle Restored", `Vehicle ${log.vehicleRegNumber} is now Available.`, "success");
      }
    }

    log.status = "Completed";
    log.completedAt = CURRENT_SYSTEM_DATE.toISOString();

    // Automatically push into expenses log
    const newExpId = `EXP-${3001 + expenses.length}`;
    expenses.push({
      id: newExpId,
      vehicleRegNumber: log.vehicleRegNumber,
      type: "Maintenance",
      amount: log.cost,
      liters: null,
      date: CURRENT_SYSTEM_DATE.toISOString().split("T")[0],
      description: `Completed Maintenance Job: ${log.description}`
    });

    saveAllState();
    renderMaintenance();
  }

  // --- VIEW: FUEL & EXPENSES ---
  function renderExpenses() {
    const searchVal = document.getElementById("search-expense-input").value.toLowerCase();
    const tbody = document.getElementById("expenses-table-body");
    tbody.innerHTML = "";

    const filtered = expenses.filter(e => 
      e.vehicleRegNumber.toLowerCase().includes(searchVal) ||
      e.type.toLowerCase().includes(searchVal) ||
      e.description.toLowerCase().includes(searchVal)
    );

    filtered.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${e.id}</td>
        <td>${e.vehicleRegNumber}</td>
        <td>
          <span class="badge ${e.type === 'Fuel' ? 'badge-info' : e.type === 'Maintenance' ? 'badge-warning' : 'badge-purple'}">
            ${e.type}
          </span>
        </td>
        <td><strong>${formatCurrency(e.amount)}</strong></td>
        <td>${e.liters ? `${e.liters} L` : '<span class="text-muted">-</span>'}</td>
        <td>${e.date}</td>
        <td>${e.description}</td>
        <td>
          <button class="btn-icon delete rbac-write-expense" data-id="${e.id}" title="Delete Expense">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        if (confirm(`Delete expense record ${id}?`)) {
          expenses = expenses.filter(e => e.id !== id);
          saveAllState();
          showToast("Deleted", "Expense record has been deleted.", "success");
          renderExpenses();
        }
      };
    });

    // Search events
    const searchInput = document.getElementById("search-expense-input");
    searchInput.replaceWith(searchInput.cloneNode(true));
    document.getElementById("search-expense-input").addEventListener("input", renderExpenses);

    // Action button bindings
    document.getElementById("log-fuel-btn").onclick = () => openExpenseModal(true);
    document.getElementById("log-other-expense-btn").onclick = () => openExpenseModal(false);
  }

  function openExpenseModal(isFuel = true) {
    const vehicleOptions = vehicles.map(v => 
      `<option value="${v.registrationNumber}">${v.registrationNumber} - ${v.name}</option>`
    ).join("");

    const formHTML = `
      <form id="expense-form">
        <div class="form-group mb-3">
          <label for="form-exp-vehicle">Select Vehicle</label>
          <select id="form-exp-vehicle" class="form-control" required>
            <option value="">Select vehicle...</option>
            ${vehicleOptions}
          </select>
        </div>
        ${!isFuel ? `
        <div class="form-group mb-3">
          <label for="form-exp-type">Expense Category</label>
          <select id="form-exp-type" class="form-control" required>
            <option value="Toll">Toll charges</option>
            <option value="Permit">Permits/Licensing</option>
            <option value="Maintenance">Maintenance (Ad-Hoc)</option>
            <option value="Other">Other Expenses</option>
          </select>
        </div>
        ` : ''}
        <div class="form-grid-2 mb-3">
          <div class="form-group">
            <label for="form-exp-amount">Total Amount (₹)</label>
            <input type="number" id="form-exp-amount" class="form-control" min="1" placeholder="₹ Amount" required>
          </div>
          ${isFuel ? `
          <div class="form-group">
            <label for="form-exp-liters">Fuel Volume (Liters)</label>
            <input type="number" id="form-exp-liters" class="form-control" min="1" placeholder="Liters Refilled" required>
          </div>
          ` : `
          <div class="form-group">
            <label for="form-exp-date">Expense Date</label>
            <input type="date" id="form-exp-date" class="form-control" required>
          </div>
          `}
        </div>
        <div class="form-group mb-3">
          <label for="form-exp-desc">Description</label>
          <input type="text" id="form-exp-desc" class="form-control" placeholder="Details..." required>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="form-cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">Record Expense</button>
        </div>
      </form>
    `;

    openModal(isFuel ? "Log Fuel Refill" : "Record Operations Expense", formHTML, (body) => {
      body.querySelector("#form-cancel-btn").onclick = closeModal;
      if (!isFuel) {
        body.querySelector("#form-exp-date").value = CURRENT_SYSTEM_DATE.toISOString().split("T")[0];
      }

      body.querySelector("#expense-form").onsubmit = (e) => {
        e.preventDefault();
        const vReg = body.querySelector("#form-exp-vehicle").value;
        const amountVal = parseInt(body.querySelector("#form-exp-amount").value);
        const descVal = body.querySelector("#form-exp-desc").value.trim();

        const typeVal = isFuel ? "Fuel" : body.querySelector("#form-exp-type").value;
        const litersVal = isFuel ? parseInt(body.querySelector("#form-exp-liters").value) : null;
        const dateVal = isFuel ? CURRENT_SYSTEM_DATE.toISOString().split("T")[0] : body.querySelector("#form-exp-date").value;

        const newId = `EXP-${3001 + expenses.length}`;
        expenses.push({
          id: newId,
          vehicleRegNumber: vReg,
          type: typeVal,
          amount: amountVal,
          liters: litersVal,
          date: dateVal,
          description: descVal
        });

        saveAllState();
        closeModal();
        showToast("Success", "Expense transaction registered.", "success");
        renderExpenses();
      };
    });
  }

  // --- VIEW: REPORTS & ANALYTICS ---
  function renderReports() {
    // Calculators
    const completedTrips = trips.filter(t => t.status === "Completed");
    
    // Core statistics
    const totalDistance = completedTrips.reduce((sum, t) => sum + t.plannedDistance, 0);
    const totalRevenue = completedTrips.reduce((sum, t) => sum + t.revenue, 0);
    
    const totalFuelCost = expenses.filter(e => e.type === "Fuel").reduce((sum, e) => sum + e.amount, 0);
    const totalMaintCost = expenses.filter(e => e.type === "Maintenance").reduce((sum, e) => sum + e.amount, 0) +
      maintenanceLogs.reduce((sum, l) => sum + l.cost, 0);
    const totalOtherCost = expenses.filter(e => e.type !== "Fuel" && e.type !== "Maintenance").reduce((sum, e) => sum + e.amount, 0);
    const totalOpCost = totalFuelCost + totalMaintCost + totalOtherCost;
    
    const profit = totalRevenue - totalOpCost;

    // Averages
    const totalLiters = expenses.filter(e => e.type === "Fuel").reduce((sum, e) => sum + (e.liters || 0), 0);
    const averageEfficiency = totalLiters > 0 ? (totalDistance / totalLiters).toFixed(2) : "0.0";
    
    const activeDrivers = drivers.filter(d => d.status !== "Suspended");
    const avgSafetyScore = activeDrivers.length > 0 
      ? Math.round(activeDrivers.reduce((sum, d) => sum + d.safetyScore, 0) / activeDrivers.length) 
      : 0;

    const activeMntCount = maintenanceLogs.filter(l => l.status === "Active").length;
    const avgTripDist = completedTrips.length > 0 ? Math.round(totalDistance / completedTrips.length) : 0;

    // Display
    document.getElementById("rep-total-distance").textContent = `${totalDistance.toLocaleString()} km`;
    document.getElementById("rep-total-cost").textContent = formatCurrency(totalOpCost);
    document.getElementById("rep-total-revenue").textContent = formatCurrency(totalRevenue);
    
    const profitEl = document.getElementById("rep-total-profit");
    profitEl.textContent = formatCurrency(profit);
    profitEl.className = profit >= 0 ? "color-green" : "color-rose";

    document.getElementById("rep-avg-efficiency").textContent = `${averageEfficiency} km/L`;
    document.getElementById("rep-avg-safety").textContent = `${avgSafetyScore} / 100`;
    document.getElementById("rep-active-maintenance").textContent = `${activeMntCount} vehicle${activeMntCount !== 1 ? 's' : ''}`;
    document.getElementById("rep-avg-trip-dist").textContent = `${avgTripDist} km`;

    // Operational Summary Table Body
    const summaryBody = document.getElementById("reports-summary-body");
    summaryBody.innerHTML = "";

    vehicles.forEach(v => {
      const vTrips = trips.filter(t => t.vehicleRegNumber === v.registrationNumber && t.status === "Completed");
      const dist = vTrips.reduce((sum, t) => sum + t.plannedDistance, 0);
      const rev = vTrips.reduce((sum, t) => sum + t.revenue, 0);

      const fCost = expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type === "Fuel")
        .reduce((sum, e) => sum + e.amount, 0);

      const mCost = expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type === "Maintenance")
        .reduce((sum, e) => sum + e.amount, 0) +
        maintenanceLogs
          .filter(l => l.vehicleRegNumber === v.registrationNumber)
          .reduce((sum, l) => sum + l.cost, 0);

      const expTotal = fCost + mCost + expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type !== "Fuel" && e.type !== "Maintenance")
        .reduce((sum, e) => sum + e.amount, 0);

      const fuelLit = expenses
        .filter(e => e.vehicleRegNumber === v.registrationNumber && e.type === "Fuel")
        .reduce((sum, e) => sum + (e.liters || 0), 0);

      const eff = fuelLit > 0 ? (dist / fuelLit).toFixed(1) : "-";
      const netProfit = rev - expTotal;
      const roi = v.acquisitionCost > 0 ? ((netProfit / v.acquisitionCost) * 100).toFixed(1) : "0.0";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-bold">${v.registrationNumber}</td>
        <td>${v.type}</td>
        <td>${dist.toLocaleString()} km</td>
        <td>${formatCurrency(fCost)}</td>
        <td>${formatCurrency(mCost)}</td>
        <td class="font-bold">${formatCurrency(expTotal)}</td>
        <td><strong>${eff}</strong> ${eff !== '-' ? 'km/L' : ''}</td>
        <td>${formatCurrency(rev)}</td>
        <td class="${netProfit >= 0 ? 'color-green' : 'color-rose'} font-bold">${formatCurrency(netProfit)}</td>
        <td>${formatCurrency(v.acquisitionCost)}</td>
        <td>
          <span class="badge ${parseFloat(roi) >= 0 ? 'badge-success' : 'badge-danger'}">
            ${roi}%
          </span>
        </td>
      `;
      summaryBody.appendChild(tr);
    });

    // CSV Export trigger
    document.getElementById("export-csv-btn").onclick = triggerCSVExport;
  }

  function triggerCSVExport() {
    let csvContent = "";

    // 1. VEHICLES SHEET
    csvContent += "=== VEHICLES MASTER REGISTRY ===\n";
    csvContent += "Registration Number,Model/Name,Type,Region,Max Load Capacity (kg),Current Odometer (km),Acquisition Cost (INR),Status\n";
    vehicles.forEach(v => {
      csvContent += `"${v.registrationNumber}","${v.name}","${v.type}","${v.region}",${v.maxCapacity},${v.odometer},${v.acquisitionCost},"${v.status}"\n`;
    });

    // 2. DRIVERS SHEET
    csvContent += "\n=== DRIVERS MASTER REGISTRY ===\n";
    csvContent += "Driver Name,License Number,License Category,Expiry Date,Contact Number,Safety Score,Status\n";
    drivers.forEach(d => {
      csvContent += `"${d.name}","${d.licenseNumber}","${d.licenseCategory}","${d.licenseExpiryDate}","${d.contactNumber}",${d.safetyScore},"${d.status}"\n`;
    });

    // 3. TRIPS SHEET
    csvContent += "\n=== TRIP DISPATCHES & ARCHIVE ===\n";
    csvContent += "Trip ID,Source,Destination,Vehicle Assigned,Driver Assigned,Cargo Weight (kg),Planned Distance (km),Revenue (INR),Status,Fuel Consumed (L),Final Odometer (km)\n";
    trips.forEach(t => {
      csvContent += `"${t.id}","${t.source}","${t.destination}","${t.vehicleRegNumber}","${t.driverName}",${t.cargoWeight},${t.plannedDistance},${t.revenue},"${t.status}",${t.fuelConsumed || '""'},${t.finalOdometer || '""'}\n`;
    });

    // 4. MAINTENANCE SHEET
    csvContent += "\n=== VEHICLE MAINTENANCE RECORDS ===\n";
    csvContent += "Maintenance ID,Vehicle Reg,Description,Scheduled Date,Estimated Cost (INR),Status,Completed Date\n";
    maintenanceLogs.forEach(l => {
      csvContent += `"${l.id}","${l.vehicleRegNumber}","${l.description}","${l.scheduledDate}",${l.cost},"${l.status}","${l.completedAt || ''}"\n`;
    });

    // 5. EXPENSES SHEET
    csvContent += "\n=== FLEET OPERATIONAL EXPENSES ===\n";
    csvContent += "Expense ID,Vehicle Reg,Category,Amount (INR),Fuel Volume (Liters),Date,Description\n";
    expenses.forEach(e => {
      csvContent += `"${e.id}","${e.vehicleRegNumber}","${e.type}",${e.amount},${e.liters || '""'},"${e.date}","${e.description}"\n`;
    });

    // Download Handler
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `TransitOps_FleetReport_2026-07-12.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV Exported", "Overall fleet report downloaded successfully.", "success");
  }

  // --- Auth Session Manager & Init Gate ---
  function checkSession() {
    // Bind signout immediately to ensure it always functions even if subsequent renders error out
    initSignoutButton();

    const isLoggedIn = localStorage.getItem("transitops_logged_in") === "true";
    const userEmail = localStorage.getItem("transitops_email");
    const userRole = localStorage.getItem("transitops_role");

    const loginContainer = document.getElementById("login-container");
    const appContainer = document.getElementById("app-container");

    if (isLoggedIn && userEmail && userRole) {
      // User is authenticated
      currentRole = userRole;
      loginContainer.style.display = "none";
      appContainer.style.display = "grid";

      // Update sidebar credentials display
      const emailEl = document.getElementById("sidebar-user-email");
      const roleEl = document.getElementById("sidebar-role-name");
      if (emailEl) emailEl.textContent = userEmail;
      if (roleEl) roleEl.textContent = getRoleLabel(userRole);

      // Header switcher toggle check bypassed since it is replaced by Sign Out button

      // Execute main app setups
      setTheme(activeTheme);
      initNavigation();
      initRoleSwitcher();
      initResetButton();
      applyRBAC();
      renderActiveView();
      setupGlobalModalEvents();
    } else {
      // User is not authenticated
      loginContainer.style.display = "block";
      appContainer.style.display = "none";
      initLoginForm();
    }
  }

  function initLoginForm() {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const errorPanel = document.getElementById("login-error");
    const errorText = document.getElementById("login-error-text");

    loginForm.onsubmit = (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      // Define credentials map (supports both with and without .com for robustness)
      const authMap = {
        "rudra123@gmail.com": { role: "fleet_manager", actualEmail: "rudra123@gmail.com" },
        "rudra123@gmail": { role: "fleet_manager", actualEmail: "rudra123@gmail.com" },
        
        "rohan123@gmail.com": { role: "driver", actualEmail: "rohan123@gmail.com" },
        "rohan123@gmail": { role: "driver", actualEmail: "rohan123@gmail.com" },
        
        "harnil123@gmail.com": { role: "safety_officer", actualEmail: "harnil123@gmail.com" },
        "harnil123@gmail": { role: "safety_officer", actualEmail: "harnil123@gmail.com" },
        
        "jatin123@gmail.com": { role: "financial_analyst", actualEmail: "jatin123@gmail.com" },
        "jatin123@gmail": { role: "financial_analyst", actualEmail: "jatin123@gmail.com" }
      };

      if (!authMap[email]) {
        // Unknown user
        errorText.textContent = "Unauthorized user email. Access Denied.";
        errorPanel.style.display = "flex";
        showToast("Access Denied", "No matching user profile found.", "error");
        return;
      }

      if (!password || password.trim().length === 0) {
        // Empty password
        errorText.textContent = "Password cannot be empty.";
        errorPanel.style.display = "flex";
        showToast("Access Denied", "Password is required.", "error");
        return;
      }

      // Successful Login (accepts any password for demo ease of use)
      const matched = authMap[email];
      localStorage.setItem("transitops_logged_in", "true");
      localStorage.setItem("transitops_email", matched.actualEmail);
      localStorage.setItem("transitops_role", matched.role);

      errorPanel.style.display = "none";
      showToast("Access Granted", `Welcome back! Logged in as ${getRoleLabel(matched.role)}`, "success");

      // Reload or run session check
      checkSession();
    };
  }

  function initSignoutButton() {
    const signoutBtn = document.getElementById("signout-btn");
    const headerSignoutBtn = document.getElementById("header-signout-btn");

    const handleSignout = (e) => {
      if (e) e.preventDefault();
      localStorage.removeItem("transitops_logged_in");
      localStorage.removeItem("transitops_email");
      localStorage.removeItem("transitops_role");
      window.location.reload();
    };

    if (signoutBtn) signoutBtn.onclick = handleSignout;
    if (headerSignoutBtn) headerSignoutBtn.onclick = handleSignout;
  }

  // --- Start Session Verification Gate ---
  checkSession();

});
