// Wrap all script code inside DOMContentLoaded to ensure HTML elements are loaded
document.addEventListener("DOMContentLoaded", function () {
  // --- GLOBAL STATE ---
  let editingVehicleId = null;
  let vehicleToDeleteId = null;
  let originalSubmitBtnText = "Register Vehicle";
  let currentAlerts = [];

  // --- MODAL ELEMENTS ---
  const customModal = document.getElementById("customModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const modalConfirmBtn = document.getElementById("modalConfirmBtn");

  // --- MODAL HELPERS ---
  function showCustomModal(
    title = "Alert",
    message = "An unexpected error occurred.",
    action = "alert"
  ) {
    if (
      !customModal ||
      !modalTitle ||
      !modalBody ||
      !modalClose ||
      !modalConfirmBtn
    ) {
      console.log(`Fallback Alert - Title: "${title}", Message: "${message}"`);
      return;
    }
    modalTitle.textContent = title;
    if (Array.isArray(message)) {
      modalBody.innerHTML = message
        .map((alert) => alert.content || "No alert content.")
        .join("<br/>");
    } else {
      modalBody.innerHTML = message;
    }
    customModal.style.display = "flex";
    customModal.classList.remove("hidden");
    if (action === "confirmDelete") {
      modalConfirmBtn.style.display = "inline-block";
      modalClose.textContent = "Cancel";
      modalConfirmBtn.onclick = performDeleteVehicle;
      modalClose.onclick = () => {
        customModal.style.display = "none";
        customModal.classList.add("hidden");
        vehicleToDeleteId = null;
      };
    } else {
      modalConfirmBtn.style.display = "none";
      modalClose.textContent = "OK";
      modalClose.onclick = () => {
        customModal.style.display = "none";
        customModal.classList.add("hidden");
        if (currentAlerts.length > 0) {
          currentAlerts = [];
        }
      };
    }
  }

  // --- HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return new Date(
      date.getTime() + date.getTimezoneOffset() * 60000
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case "Overdue":
      case "Low":
        return "bg-red-500 text-white";
      case "Due Soon":
      case "Half":
        return "bg-yellow-500 text-gray-800";
      case "Good":
      case "Full":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-300 text-gray-800";
    }
  };

  function toggleOtherCategory() {
    const categorySelect = document.getElementById("vehicleCategory");
    const otherCategoryGroup = document.getElementById("otherCategoryGroup");
    const otherCategoryInput = document.getElementById("otherCategory");
    if (!categorySelect || !otherCategoryGroup || !otherCategoryInput) return;
    if (categorySelect.value === "other") {
      otherCategoryGroup.style.display = "block";
      otherCategoryInput.required = true;
      otherCategoryGroup.style.animation = "fadeIn 0.3s ease";
    } else {
      otherCategoryGroup.style.display = "none";
      otherCategoryInput.required = false;
      otherCategoryInput.value = "";
    }
  }
  window.toggleOtherCategory = toggleOtherCategory;

  // --- TAB SWITCHING ---
  function showTab(tabName) {
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    const selectedTabContent = document.getElementById(tabName + "Tab");
    if (selectedTabContent) selectedTabContent.classList.add("active");
    let tabIndex = 0;
    if (tabName === "register") tabIndex = 0;
    else if (tabName === "vehicles") tabIndex = 1;
    else if (tabName === "messages") tabIndex = 2;
    const navTabs = document.querySelectorAll(".nav-tab");
    if (navTabs[tabIndex]) navTabs[tabIndex].classList.add("active");
    if (tabName === "vehicles") fetchAndDisplayVehicles();
    else if (tabName === "messages") displayMessages();
    if (tabName === "register" && !editingVehicleId) cancelEdit();
  }
  window.showTab = showTab;

  // --- VEHICLE FETCH & DISPLAY ---
  async function fetchAndDisplayVehicles() {
    const vehiclesList = document.getElementById("vehiclesList");
    if (!vehiclesList) return;
    try {
      vehiclesList.innerHTML = '<div class="no-data">Loading vehicles...</div>';
      const response = await fetch("/api/cars");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
      const data = await response.json();
      const vehicles = data.vehicles;
      currentAlerts = data.alerts;
      displayVehicles(vehicles);
      displayMessages();
    } catch (error) {
      showCustomModal(
        "Error Loading Data",
        `Failed to load vehicles or alerts: ${error.message}. Please try again.`
      );
      vehiclesList.innerHTML =
        '<div class="no-data">Error loading vehicles. Please try again.</div>';
    }
  }

  function displayVehicles(vehicles) {
    const vehiclesList = document.getElementById("vehiclesList");
    if (!vehiclesList) return;
    if (!vehicles || vehicles.length === 0) {
      vehiclesList.innerHTML =
        '<div class="no-data">No vehicles registered yet. Register your first vehicle using the form above!</div>';
      return;
    }
    vehiclesList.innerHTML = vehicles
      .map((vehicle) => {
        const registrationDate = vehicle.created_at
          ? new Date(vehicle.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "N/A";
        return `
          <div class="vehicle-card" data-vehicle-id="${vehicle.id}">
            <div class="vehicle-header">
              <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
              <div class="vehicle-category">${vehicle.category}</div>
            </div>
            <div class="vehicle-details">
              <div class="vehicle-detail">
                <div class="detail-label">VIN</div>
                <div class="detail-value">${vehicle.vin}</div>
              </div>
              <div class="vehicle-detail">
                <div class="detail-label">Plate Number</div>
                <div class="detail-value">${vehicle.plate_number || "N/A"}</div>
              </div>
              <div class="vehicle-detail">
                <div class="detail-label">Color</div>
                <div class="detail-value">${vehicle.color}</div>
              </div>
              <div class="vehicle-detail">
                <div class="detail-label">Registered On</div>
                <div class="detail-value">${registrationDate}</div>
              </div>
              <div class="vehicle-detail">
                <div class="detail-label">Fuel Level</div>
                <div class="detail-value">
                  <span class="px-2 py-1 rounded-full text-xs font-semibold ${getStatusColorClass(
                    vehicle.fuelLevel
                  )}">
                    ${vehicle.fuelLevel}
                  </span>
                </div>
              </div>
            </div>
            <div class="vehicle-actions">
              <button class="edit-btn" data-vehicle-id="${vehicle.id}">Edit</button>
              <button class="delete-btn" data-vehicle-id="${vehicle.id}">Delete</button>
              <a href="/vehicle_details/${vehicle.id}" class="view-details-btn">View Details</a>
            </div>
          </div>
        `;
      })
      .join("");
    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.stopPropagation();
        const vehicleId = e.target.dataset.vehicleId;
        try {
          const response = await fetch(`/api/vehicles/${vehicleId}/details`);
          if (!response.ok) throw new Error("Failed to fetch vehicle details.");
          const vehicleToEdit = await response.json();
          populateEditForm(vehicleToEdit);
        } catch (error) {
          showCustomModal("Error", "Could not load vehicle details for editing.");
        }
      });
    });
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const vehicleId = e.target.dataset.vehicleId;
        confirmDeleteVehicle(vehicleId);
      });
    });
    document.querySelectorAll(".vehicle-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (
          e.target.closest(".edit-btn") ||
          e.target.closest(".delete-btn") ||
          e.target.closest(".view-details-btn")
        ) {
          return;
        }
        const vehicleId = e.currentTarget.dataset.vehicleId;
        if (vehicleId) {
          window.location.href = `/vehicle_details/${vehicleId}`;
        }
      });
    });
  }

  function populateEditForm(vehicle) {
    editingVehicleId = vehicle.id;
    document.getElementById("vehicleModel").value = vehicle.model;
    document.getElementById("vehicleYear").value = vehicle.year;
    document.getElementById("vehicleMake").value = vehicle.make;
    document.getElementById("vehicleVIN").value = vehicle.vin;
    document.getElementById("vehicleColor").value = vehicle.color;
    document.getElementById("plateNumber").value = vehicle.plate_number || "";
    const categorySelect = document.getElementById("vehicleCategory");
    const otherCategoryInput = document.getElementById("otherCategory");
    const otherCategoryGroup = document.getElementById("otherCategoryGroup");
    if (
      Array.from(categorySelect.options).some(
        (opt) => opt.value === vehicle.category
      )
    ) {
      categorySelect.value = vehicle.category;
      if (otherCategoryGroup) otherCategoryGroup.style.display = "none";
      if (otherCategoryInput) otherCategoryInput.required = false;
    } else {
      if (categorySelect) categorySelect.value = "other";
      if (otherCategoryGroup) otherCategoryGroup.style.display = "block";
      if (otherCategoryInput) {
        otherCategoryInput.value = vehicle.category;
        otherCategoryInput.required = true;
      }
    }
    const submitBtn = document.querySelector("#vehicleForm .submit-btn");
    const cancelEditBtn = document.querySelector(
      "#vehicleForm .cancel-edit-btn"
    );
    if (submitBtn) {
      originalSubmitBtnText = submitBtn.textContent;
      submitBtn.textContent = "Update Vehicle";
    }
    if (cancelEditBtn) {
      cancelEditBtn.style.display = "inline-block";
    }
    showTab("register");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    editingVehicleId = null;
    document.getElementById("vehicleForm").reset();
    toggleOtherCategory();
    const submitBtn = document.querySelector("#vehicleForm .submit-btn");
    const cancelEditBtn = document.querySelector(
      "#vehicleForm .cancel-edit-btn"
    );
    if (submitBtn) submitBtn.textContent = originalSubmitBtnText;
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
  }

  function confirmDeleteVehicle(id) {
    vehicleToDeleteId = id;
    showCustomModal(
      "Confirm Deletion",
      "Are you sure you want to delete this vehicle entry? This action cannot be undone.",
      "confirmDelete"
    );
  }

  async function performDeleteVehicle() {
    if (!vehicleToDeleteId) {
      showCustomModal("Error", "No vehicle selected for deletion.");
      return;
    }
    customModal.style.display = "none";
    customModal.classList.add("hidden");
    try {
      const response = await fetch(`/api/vehicles/${vehicleToDeleteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Server error! status: ${response.status}, details: ${errorData.error}`
        );
      }
      const result = await response.json();
      showCustomModal(
        "Success",
        result.message || "Vehicle deleted successfully!"
      );
      fetchAndDisplayVehicles();
    } catch (error) {
      showCustomModal(
        "Deletion Error",
        `Failed to delete vehicle: ${error.message}`
      );
    } finally {
      vehicleToDeleteId = null;
    }
  }

  // --- MESSAGES TAB LOGIC ---
  function getMessageState() {
    return JSON.parse(
      localStorage.getItem("messageState") || '{"read":[],"deleted":[]}'
    );
  }
  function setMessageState(state) {
    localStorage.setItem("messageState", JSON.stringify(state));
  }
  let showUnread = true;

function displayMessages() {
  const messagesList = document.getElementById("messagesList");
  if (!messagesList) return;
  const state = getMessageState();
  const deletedIds = (state.deleted || []).map(String);
  const readIds = (state.read || []).map(String);

  const unreadMessages = currentAlerts.filter(
    (msg) => !readIds.includes(String(msg.id)) && !deletedIds.includes(String(msg.id))
  );
  const readMessages = currentAlerts.filter(
    (msg) => readIds.includes(String(msg.id)) && !deletedIds.includes(String(msg.id))
  );

  const unreadBadge = document.getElementById("unreadCountBadge");
  if (unreadBadge) unreadBadge.textContent = unreadMessages.length;
  let messagesToShow = showUnread ? unreadMessages : readMessages;
  if (messagesToShow.length === 0) {
    messagesList.innerHTML = `<div class="no-data">No ${
      showUnread ? "unread" : "read"
    } messages.</div>`;
    return;
  }
  messagesList.innerHTML = messagesToShow
    .map((alert) => {
      const title = alert.title || "Notification";
      const timestamp = alert.timestamp ? formatDate(alert.timestamp) : "N/A";
      const content = alert.content || "No details available.";
      let alertIcon = "";
      let alertColor = "";
      switch (alert.type) {
        case "fuel_low":
          alertIcon = "⛽";
          alertColor = "#f39c12";
          break;
        case "maintenance_overdue":
        case "no_maintenance_record":
          alertIcon = "🛠️";
          alertColor = "#e67e22";
          break;
        case "document_expiring_soon":
          alertIcon = "📄";
          alertColor = "#f1c40f";
          break;
        case "document_expired":
          alertIcon = "🔴";
          alertColor = "#e74c3c";
          break;
        default:
          alertIcon = "💬";
          alertColor = "#3498db";
      }
      return `
    <div class="message-card${
      showUnread ? " unread" : " read"
    }" style="border-left: 6px solid ${alertColor}; cursor:pointer;" data-message-id="${
        alert.id
      }">
      <div class="message-card-header">
        <span class="message-icon" style="background:${alertColor};">${alertIcon}</span>
        <span class="message-title">${title}</span>
        <span class="message-time">${timestamp}</span>
        <button class="delete-message-btn" data-message-id="${
          alert.id
        }">Delete</button>
      </div>
      <div class="message-card-content">${content}</div>
    </div>
  `;
    })
    .join("");
  messagesList.querySelectorAll(".message-card").forEach((card) => {
    card.addEventListener("click", function (e) {
      if (e.target.classList.contains("delete-message-btn")) return;
      const messageId = String(this.getAttribute("data-message-id"));
      const state = getMessageState();
      if (showUnread) {
        if (!state.read.map(String).includes(messageId)) state.read.push(messageId);
      } else {
        state.read = state.read.map(String).filter((id) => id !== messageId);
      }
      setMessageState(state);
      displayMessages();
    });
  });
  messagesList.querySelectorAll(".delete-message-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const messageId = String(this.getAttribute("data-message-id"));
      const state = getMessageState();
      if (!state.deleted.map(String).includes(messageId)) state.deleted.push(messageId);
      state.read = state.read.map(String).filter((id) => id !== messageId);
      setMessageState(state);
      displayMessages();
    });
  });
}

  // --- UNREAD/READ BUTTON EVENT LISTENERS ---
  const unreadBtn = document.getElementById("showUnreadBtn");
  const readBtn = document.getElementById("showReadBtn");
  if (unreadBtn && readBtn) {
    unreadBtn.addEventListener("click", function () {
      showUnread = true;
      unreadBtn.classList.add("active");
      readBtn.classList.remove("active");
      displayMessages();
    });
    readBtn.addEventListener("click", function () {
      showUnread = false;
      readBtn.classList.add("active");
      unreadBtn.classList.remove("active");
      displayMessages();
    });
  }

  // --- FORM HANDLING ---
  const vehicleForm = document.getElementById("vehicleForm");
  const submitBtn = vehicleForm
    ? vehicleForm.querySelector(".submit-btn")
    : null;
  let cancelEditBtn = document.querySelector("#vehicleForm .cancel-edit-btn");
  if (!cancelEditBtn) {
    cancelEditBtn = document.createElement("button");
    cancelEditBtn.type = "button";
    cancelEditBtn.textContent = "Cancel Edit";
    cancelEditBtn.className = "submit-btn secondary-btn cancel-edit-btn";
    cancelEditBtn.style.marginLeft = "10px";
    cancelEditBtn.style.display = "none";
    if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.insertBefore(cancelEditBtn, submitBtn.nextSibling);
    }
  }
  cancelEditBtn.onclick = cancelEdit;

  if (vehicleForm) {
    vehicleForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      let categoryValue = formData.get("vehicleCategory");
      if (categoryValue === "other") {
        const otherCategoryInput = document.getElementById("otherCategory");
        const otherCategory = otherCategoryInput
          ? otherCategoryInput.value.trim()
          : "";
        if (!otherCategory) {
          showCustomModal(
            "Validation Error",
            "Please specify the other vehicle category."
          );
          return;
        }
        categoryValue = otherCategory;
      }
      const data = {
        model: formData.get("vehicleModel"),
        year: parseInt(formData.get("vehicleYear")),
        make: formData.get("vehicleMake"),
        vin: formData.get("vehicleVIN"),
        color: formData.get("vehicleColor"),
        category: categoryValue,
        plate_number: formData.get("plateNumber"),
      };
      if (data.vin.length !== 17) {
        showCustomModal(
          "Validation Error",
          "VIN must be exactly 17 characters long."
        );
        return;
      }
      const currentYear = new Date().getFullYear();
      if (isNaN(data.year) || data.year < 1900 || data.year > currentYear + 5) {
        showCustomModal(
          "Validation Error",
          "Please enter a valid year (e.g., 1900-" + (currentYear + 5) + ")."
        );
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      if (cancelEditBtn) cancelEditBtn.disabled = true;
      try {
        let response;
        let result;
        if (editingVehicleId) {
          response = await fetch(`/api/vehicles/${editingVehicleId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          result = await response.json();
          if (response.ok) {
            showCustomModal(
              "Success",
              result.message || "Vehicle updated successfully!"
            );
            cancelEdit();
          } else {
            throw new Error(result.error || "Failed to update vehicle");
          }
        } else {
          response = await fetch("/api/register_vehicle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          result = await response.json();
          if (response.ok) {
            const successMessage = document.getElementById("successMessage");
            if (successMessage) successMessage.style.display = "block";
            this.reset();
            toggleOtherCategory();
            setTimeout(() => {
              if (successMessage) successMessage.style.display = "none";
            }, 5000);
          } else {
            throw new Error(result.error || "Registration failed");
          }
        }
        fetchAndDisplayVehicles();
      } catch (error) {
        showCustomModal(
          editingVehicleId ? "Update Error" : "Registration Error",
          "Error: " + error.message
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (cancelEditBtn) cancelEditBtn.disabled = false;
      }
    });
  }

  // --- VIN & FIELD FORMATTING ---
  const vehicleVINInput = document.getElementById("vehicleVIN");
  if (vehicleVINInput) {
    vehicleVINInput.addEventListener("input", function (e) {
      let value = e.target.value.toUpperCase();
      value = value.replace(/[^A-Z0-9]/g, "");
      e.target.value = value;
    });
  }
  ["vehicleMake", "vehicleModel"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", function (e) {
        e.target.value = e.target.value.replace(/\b\w/g, (l) =>
          l.toUpperCase()
        );
      });
    }
  });

  // --- INITIAL LOAD ---
  setTimeout(() => {
    fetchAndDisplayVehicles();
    showTab("register");
  }, 100);
});