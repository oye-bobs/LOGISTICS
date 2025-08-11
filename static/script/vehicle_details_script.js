document.addEventListener("DOMContentLoaded", function() {
    console.log("vehicle_details_script.js loaded.");

    // Get vehicle ID from URL
    const vehicleId = window.location.pathname.split('/').pop(); // Get ID from /vehicle_details/ID
    console.log("Vehicle ID:", vehicleId);

    // Get DOM elements
    const vehicleDetailsTitle = document.getElementById('vehicleDetailsTitle');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const vehicleDetailsContent = document.getElementById('vehicleDetailsContent');

    // Display elements (these will also become editable)
    const displayModel = document.getElementById('displayModel');
    const displayYear = document.getElementById('displayYear');
    const displayMake = document.getElementById('displayMake');
    const displayVIN = document.getElementById('displayVIN');
    const displayPlateNumber = document.getElementById('displayPlateNumber');
    const displayColor = document.getElementById('displayColor');
    const displayCategory = document.getElementById('displayCategory');
    const detailRegisteredOn = document.getElementById('detailRegisteredOn');
    const displayLastFueled = document.getElementById('displayLastFueled'); // This will still act as a display for the date input
    const detailLastMaintenance = document.getElementById('detailLastMaintenance');
    const mainVehicleImage = document.getElementById('mainVehicleImage'); // Main vehicle image element

    // New Fuel Level elements
    const displayFuelLevel = document.getElementById('displayFuelLevel');
    const fuelLevelBar = document.getElementById('fuelLevelBar');
    const fuelLevelFill = document.getElementById('fuelLevelFill');

    // Editable input elements (for date, and others will now be contenteditable spans)
    const editLastFueled = document.getElementById('editLastFueled');
    const editFuelLevel = document.getElementById('editFuelLevel'); // New select for fuel level

    // Main image upload elements
    const mainImageUpload = document.getElementById('mainImageUpload');
    const removeMainImageBtn = document.getElementById('removeMainImageBtn');
    let newMainImageBase64 = null; // Stores Base64 for new image to be uploaded
    let newMainImageMimeType = null; // Stores MIME type for new image

    // Action buttons for main vehicle details
    const editDetailsBtn = document.getElementById('editDetailsBtn');
    const updateDetailsBtn = document.getElementById('updateDetailsBtn');
    const cancelEditDetailsBtn = document.getElementById('cancelEditDetailsBtn');

    const maintenanceLogsList = document.getElementById('maintenanceLogsList');
    const documentsList = document.getElementById('documentsList');

    const addMaintenanceForm = document.getElementById('addMaintenanceForm');
    const logTypeInput = document.getElementById('logType');
    const logDateInput = document.getElementById('logDate');
    const logNotesInput = document.getElementById('logNotes');

    const addDocumentForm = document.getElementById('addDocumentForm');
    const documentNameInput = document.getElementById('documentName');
    const documentFileInput = document.getElementById('documentFile');
    const expiryDateInput = document.getElementById('expiryDate');

    // Custom Modal elements
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    if (!customModal || !modalTitle || !modalBody || !modalClose || !modalConfirmBtn) {
        console.error("Critical Error: One or more modal elements not found in vehicle_details.html. Modal functionality will be impaired.");
    } else {
        console.log("All modal elements found successfully in vehicle_details.html.");
    }

    let itemToDeleteId = null; // Used for both document and maintenance log deletion
    let itemToDeleteType = null; // 'document' or 'maintenance'
    let currentVehicleData = null; // Store current vehicle data for editing purposes

    // Helper function to show custom modal
    function showCustomModal(title, message, action = 'alert') {
        if (!customModal || !modalTitle || !modalBody || !modalClose || !modalConfirmBtn) {
            console.error("Attempted to show modal, but critical elements are missing. Falling back to console log.");
            console.log(`Fallback Alert - Title: "${title}", Message: "${message}"`);
            return;
        }
        modalTitle.textContent = title;
        modalBody.innerHTML = message; // Use innerHTML to support detailed error messages with line breaks etc.

        if (action === 'confirmDelete') {
            modalConfirmBtn.style.display = 'inline-block'; // Show confirm button
            modalClose.textContent = 'Cancel'; // Change default close button to 'Cancel'
            modalConfirmBtn.onclick = performDeleteItem; // Assign delete function to confirm button
            modalClose.onclick = () => { // Set cancel action
                customModal.style.display = 'none';
                customModal.classList.add('hidden');
                itemToDeleteId = null;
                itemToDeleteType = null;
                console.log('Delete confirmation cancelled.');
            };
        } else { // Default alert action
            modalConfirmBtn.style.display = 'none'; // Hide confirm button
            modalClose.textContent = 'OK'; // Default text for close button
            modalClose.onclick = () => { // Re-assign default close behavior
                customModal.style.display = 'none';
                customModal.classList.add('hidden');
                console.log('Alert modal closed.');
            };
        }
        customModal.style.display = 'flex';
        customModal.classList.remove('hidden');
        console.log(`Modal Shown - Title: "${title}", Message: "${message}", Action: "${action}"`);
    }

    // Helper function to format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date'; // Check for invalid date
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Helper to format date for input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
        if (!dateString || dateString === 'N/A') return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Function to update fuel level visual indicator
    function updateFuelLevelDisplay(level) {
        if (!displayFuelLevel || !fuelLevelBar || !fuelLevelFill) return;

        displayFuelLevel.textContent = level;
        fuelLevelBar.classList.remove('fuel-level-full', 'fuel-level-half', 'fuel-level-low');

        switch (level) {
            case 'Full':
                fuelLevelBar.classList.add('fuel-level-full');
                break;
            case 'Half':
                fuelLevelBar.classList.add('fuel-level-half');
                break;
            case 'Low':
                fuelLevelBar.classList.add('fuel-level-low');
                break;
            default:
                // Default styling if level is not recognized
                fuelLevelFill.style.width = '0%';
                fuelLevelFill.style.backgroundColor = '#e0e6ed';
                break;
        }
    }


    // Toggle edit mode for main vehicle details
    function toggleEditMode(enable) {
        const editableFields = [
            displayModel,
            displayYear,
            displayMake,
            displayVIN,
            displayColor,
            displayCategory,
            displayPlateNumber
        ];

        editableFields.forEach(field => {
            if (field) { // Ensure element exists
                field.contentEditable = enable;
                field.classList.toggle('editable-field', enable);
            }
        });

        // Handle Last Fueled date input visibility and readonly state
        if (displayLastFueled && editLastFueled) {
            displayLastFueled.style.display = enable ? 'none' : 'inline';
            editLastFueled.style.display = enable ? 'inline' : 'none';
            editLastFueled.readOnly = !enable; // Make it readOnly if not in edit mode
        }

        // Handle Fuel Level select visibility
        if (displayFuelLevel && editFuelLevel) {
            displayFuelLevel.style.display = enable ? 'none' : 'inline';
            fuelLevelBar.style.display = enable ? 'none' : 'flex'; // Hide bar when editing
            editFuelLevel.style.display = enable ? 'inline' : 'none';
        }

        if (editDetailsBtn) editDetailsBtn.style.display = enable ? 'none' : 'inline-block';
        if (updateDetailsBtn) updateDetailsBtn.style.display = enable ? 'inline-block' : 'none';
        if (cancelEditDetailsBtn) cancelEditDetailsBtn.style.display = enable ? 'inline-block' : 'none';

        // Also control visibility of image upload/remove buttons
        if (mainImageUpload && mainImageUpload.parentElement) {
             mainImageUpload.parentElement.style.display = enable ? 'flex' : 'none';
        }

        if (removeMainImageBtn) {
            // Show remove button only if an image currently exists AND we are in edit mode
            removeMainImageBtn.style.display = enable && currentVehicleData && currentVehicleData.main_image_base64 ? 'inline-block' : 'none';
        }

        if (enable && currentVehicleData) {
            // Populate editable spans with current data (redundant for contenteditable but harmless)
            if (displayModel) displayModel.textContent = currentVehicleData.model;
            if (displayYear) displayYear.textContent = currentVehicleData.year;
            if (displayMake) displayMake.textContent = currentVehicleData.make;
            if (displayVIN) displayVIN.textContent = currentVehicleData.vin;
            if (displayColor) displayColor.textContent = currentVehicleData.color;
            if (displayCategory) displayCategory.textContent = currentVehicleData.category;
            if (displayPlateNumber) displayPlateNumber.textContent = currentVehicleData.plate_number || '';

            // Populate editable date input
            if (editLastFueled) editLastFueled.value = formatDateForInput(currentVehicleData.last_fueled_date);
            // Populate editable fuel level select
            if (editFuelLevel) editFuelLevel.value = currentVehicleData.fuel_level;
        }
    }

    // Main function to fetch and display vehicle details
    async function fetchVehicleDetails() {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (vehicleDetailsContent) vehicleDetailsContent.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
        toggleEditMode(false); // Ensure display mode on load

        if (!vehicleId) {
            if (errorMessage) {
                errorMessage.textContent = "No vehicle ID provided in the URL.";
                errorMessage.style.display = 'block';
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            showCustomModal("Error", "No vehicle ID provided in the URL.");
            return;
        }

        try {
            const response = await fetch(`/api/vehicles/${vehicleId}/details`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const vehicle = await response.json();
            currentVehicleData = vehicle; // Store fetched data
            console.log("Fetched Vehicle Details:", vehicle);

            // Populate main vehicle info
            if (vehicleDetailsTitle) vehicleDetailsTitle.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

            // Populate display spans (which become editable)
            if (displayModel) displayModel.textContent = vehicle.model;
            if (displayYear) displayYear.textContent = vehicle.year;
            if (displayMake) displayMake.textContent = vehicle.make;
            if (displayVIN) displayVIN.textContent = vehicle.vin;
            if (displayPlateNumber) displayPlateNumber.textContent = vehicle.plate_number || '';
            if (displayColor) displayColor.textContent = vehicle.color;
            if (displayCategory) displayCategory.textContent = vehicle.category;

            if (detailRegisteredOn) detailRegisteredOn.textContent = formatDate(vehicle.created_at);

            // Populate Last Fueled for display and edit input
            if (displayLastFueled) displayLastFueled.textContent = vehicle.last_fueled_date ? formatDate(vehicle.last_fueled_date) : 'N/A';
            if (editLastFueled) editLastFueled.value = formatDateForInput(vehicle.last_fueled_date);

            // Populate Fuel Level and update indicator
            if (displayFuelLevel) displayFuelLevel.textContent = vehicle.fuel_level || 'N/A';
            if (editFuelLevel) editFuelLevel.value = vehicle.fuel_level || 'Full'; // Set default if empty
            updateFuelLevelDisplay(vehicle.fuel_level);


            // Display dynamic last maintenance
            if (detailLastMaintenance) detailLastMaintenance.textContent = vehicle.last_maintenance_display || 'N/A';


            // Display main vehicle image if available
            if (mainVehicleImage) {
                if (vehicle.main_image_base64 && vehicle.main_image_mime_type) {
                    mainVehicleImage.src = `data:${vehicle.main_image_mime_type};base64,${vehicle.main_image_base64}`;
                    // Only show remove button if in edit mode and image exists
                    if (editDetailsBtn.style.display === 'none' && removeMainImageBtn) { // If in "display" mode
                        removeMainImageBtn.style.display = 'none'; // Keep hidden in display mode
                    } else if (removeMainImageBtn) { // If in "edit" mode
                        removeMainImageBtn.style.display = 'inline-block';
                    }
                } else {
                    mainVehicleImage.src = "https://placehold.co/400x250/E0E6ED/7F8C8D?text=Vehicle+Image"; // Placeholder
                    if (removeMainImageBtn) removeMainImageBtn.style.display = 'none';
                }
            }


            // Display maintenance logs
            displayMaintenanceLogs(vehicle.maintenance_logs);

            // Display documents
            displayDocuments(vehicle.documents);

            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (vehicleDetailsContent) vehicleDetailsContent.style.display = 'block';

        } catch (error) {
            console.error("Error fetching vehicle details:", error);
            if (errorMessage) {
                errorMessage.textContent = `Failed to load vehicle details: ${error.message}.`;
                errorMessage.style.display = 'block';
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            showCustomModal("Error", `Failed to load vehicle details: ${error.message}. Please try again.`);
        }
    }

    // Function to display maintenance logs
    function displayMaintenanceLogs(logs) {
        if (!maintenanceLogsList) return; // Guard against null
        maintenanceLogsList.innerHTML = '';
        if (!logs || logs.length === 0) {
            maintenanceLogsList.innerHTML = '<p class="no-data">No maintenance logs yet.</p>';
            return;
        }

        logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <h4>${log.log_type}</h4>
                <p>Date: <span class="log-date">${formatDate(log.log_date)}</span></p>
                ${log.notes ? `<p>Notes: ${log.notes}</p>` : ''}
                <div class="item-actions">
                    <button class="delete-btn" data-id="${log.id}" data-type="maintenance">Delete</button>
                </div>
            `;
            maintenanceLogsList.appendChild(logItem);
        });
        attachDeleteListeners();
    }

    // Function to display documents
    function displayDocuments(documents) {
        if (!documentsList) return; // Guard against null
        documentsList.innerHTML = '';
        if (!documents || documents.length === 0) {
            documentsList.innerHTML = '<p class="no-data">No documents uploaded yet.</p>';
            return;
        }

        documents.forEach(doc => {
            const docItem = document.createElement('div');
            docItem.className = 'document-item';
            docItem.dataset.id = doc.id; // Store document ID on the item for easy access

            let filePreview = '';
            // Determine preview based on MIME type
            if (doc.file_mime_type && doc.file_content_base64) {
                const base64Prefix = `data:${doc.file_mime_type};base64,`;
                if (doc.file_mime_type.startsWith('image/')) {
                    filePreview = `<img src="${base64Prefix}${doc.file_content_base64}" class="document-thumbnail" alt="${doc.document_name} preview">`;
                } else if (doc.file_mime_type === 'application/pdf') {
                    filePreview = `<div class="pdf-preview"><svg class="pdf-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zM12 9V7h1.41L16 9.59V9h4v4h-2V9h-2V7h-2V5h-2v2h-2v2h2zM15 16h2v-2h-2v2z"/></svg><p>PDF Document</p></div>`;
                } else {
                    filePreview = `<div class="file-preview"><svg class="file-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 9H6v-2h5v2zm3-4H6v-2h8v2zm0-4H6V7h8v2z"/></svg><p>File (${doc.file_mime_type})</p></div>`;
                }
            } else {
                filePreview = `<p class="no-preview-text">No preview available</p>`;
            }

            docItem.innerHTML = `
                <h4 class="document-name-display">${doc.document_name}</h4>
                <input type="text" class="document-name-edit edit-input" value="${doc.document_name}" style="display: none;">
                <p>Uploaded: ${formatDate(doc.uploaded_at)}</p>
                <p>Expires: <span class="doc-expiry-display">${doc.expiry_date ? formatDate(doc.expiry_date) : 'N/A'}</span></p>
                <input type="date" class="doc-expiry-edit edit-input" value="${doc.expiry_date ? formatDateForInput(doc.expiry_date) : ''}" style="display: none;">
                <div class="doc-preview-wrapper">
                    ${filePreview}
                </div>
                <div class="item-actions">
                    ${doc.file_content_base64 && doc.file_mime_type ? `<button class="view-btn" data-base64="${doc.file_content_base64}" data-mimetype="${doc.file_mime_type}" data-name="${doc.document_name}">View</button>` : ''}
                    <button class="edit-document-btn" data-id="${doc.id}">Edit</button>
                    <button class="save-document-btn submit-btn" data-id="${doc.id}" style="display: none;">Save</button>
                    <button class="cancel-document-btn secondary-btn" data-id="${doc.id}" style="display: none;">Cancel</button>
                    <button class="delete-btn" data-id="${doc.id}" data-type="document">Delete</button>
                </div>
            `;
            documentsList.appendChild(docItem);
        });
        attachDeleteListeners();
        attachViewDocumentListeners();
        attachDocumentEditListeners(); // Attach new edit listeners
    }

    // Function to toggle edit mode for individual document items
    function toggleDocumentEditMode(documentItem, enable) {
        const docNameDisplay = documentItem.querySelector('.document-name-display');
        const docNameEdit = documentItem.querySelector('.document-name-edit');
        const expiryDisplay = documentItem.querySelector('.doc-expiry-display');
        const expiryEdit = documentItem.querySelector('.doc-expiry-edit');
        const editBtn = documentItem.querySelector('.edit-document-btn');
        const saveBtn = documentItem.querySelector('.save-document-btn');
        const cancelBtn = documentItem.querySelector('.cancel-document-btn');
        const viewBtn = documentItem.querySelector('.view-btn'); // Also toggle view button
        const deleteBtn = documentItem.querySelector('.delete-btn'); // Also toggle delete button

        if (docNameDisplay) docNameDisplay.style.display = enable ? 'none' : 'inline';
        if (docNameEdit) docNameEdit.style.display = enable ? 'inline' : 'none';
        if (expiryDisplay) expiryDisplay.style.display = enable ? 'none' : 'inline';
        if (expiryEdit) expiryEdit.style.display = enable ? 'inline' : 'none';

        if (editBtn) editBtn.style.display = enable ? 'none' : 'inline-block';
        if (saveBtn) saveBtn.style.display = enable ? 'inline-block' : 'none';
        if (cancelBtn) cancelBtn.style.display = enable ? 'inline-block' : 'none';
        if (viewBtn) viewBtn.style.display = enable ? 'none' : 'inline-block'; // Hide view during edit
        if (deleteBtn) deleteBtn.style.display = enable ? 'none' : 'inline-block'; // Hide delete during edit
    }

    // Attach edit, save, cancel listeners to dynamically created document buttons
    function attachDocumentEditListeners() {
        document.querySelectorAll('.edit-document-btn').forEach(button => {
            button.onclick = (e) => {
                const docItem = e.target.closest('.document-item');
                toggleDocumentEditMode(docItem, true);
            };
        });

        document.querySelectorAll('.save-document-btn').forEach(button => {
            button.onclick = async (e) => {
                const docItem = e.target.closest('.document-item');
                const docId = docItem.dataset.id;
                const newDocName = docItem.querySelector('.document-name-edit').value.trim();
                const newExpiryDate = docItem.querySelector('.doc-expiry-edit').value;

                if (!newDocName) {
                    showCustomModal("Validation Error", "Document name cannot be empty.");
                    return;
                }

                try {
                    const response = await fetch(`/api/documents/${docId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            documentName: newDocName,
                            expiryDate: newExpiryDate || null // Send null if empty
                        })
                    });
                    const result = await response.json();

                    if (response.ok) {
                        showCustomModal("Success", result.message || "Document updated successfully!");
                        fetchVehicleDetails(); // Re-fetch to update display
                    } else {
                        throw new Error(result.error || "Failed to update document.");
                    }
                } catch (error) {
                    console.error("Error updating document:", error);
                    showCustomModal("Update Error", `Failed to update document: ${error.message}`);
                }
            };
        });

        document.querySelectorAll('.cancel-document-btn').forEach(button => {
            button.onclick = (e) => {
                const docItem = e.target.closest('.document-item');
                // Revert changes by re-fetching or simply toggling display mode
                // Re-fetching is safer to ensure data consistency
                fetchVehicleDetails();
            };
        });
    }

    // Attach delete listeners to dynamically created buttons
    function attachDeleteListeners() {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.onclick = (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                itemToDeleteId = id;
                itemToDeleteType = type;
                showCustomModal("Confirm Deletion", `Are you sure you want to delete this ${type} record? This action cannot be undone.`, "confirmDelete");
            };
        });
    }

    // Attach view document listeners
    function attachViewDocumentListeners() {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.onclick = (e) => {
                const base64 = e.target.dataset.base64;
                const mimetype = e.target.dataset.mimetype;
                const docName = e.target.dataset.name;

                if (base64 && mimetype) {
                    const dataUrl = `data:${mimetype};base64,${base64}`;
                    const newWindow = window.open();
                    if (newWindow) { // Check if window was opened successfully
                        if (mimetype.startsWith('image/')) {
                            newWindow.document.write(`<img src="${dataUrl}" alt="${docName}" style="max-width: 100%; height: auto; display: block; margin: auto;">`);
                            newWindow.document.title = docName;
                        } else if (mimetype === 'application/pdf') {
                            newWindow.document.write(`
                                <!DOCTYPE html>
                                <html lang="en">
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>${docName} - PDF Viewer</title>
                                    <style>
                                        body { margin: 0; padding: 0; overflow: hidden; }
                                        iframe { width: 100vw; height: 100vh; border: none; }
                                    </style>
                                </head>
                                <body>
                                    <iframe src="${dataUrl}"></iframe>
                                </body>
                                </html>
                            `);
                            newWindow.document.title = docName;
                        } else {
                            // For other file types, offer download
                            const downloadLink = document.createElement('a');
                            downloadLink.href = dataUrl;
                            downloadLink.download = docName || `document.${mimetype.split('/')[1] || 'bin'}`;
                            newWindow.document.body.appendChild(downloadLink);
                            downloadLink.click();
                            newWindow.document.body.removeChild(downloadLink);
                            newWindow.close(); // Close the blank window if it's not needed
                            showCustomModal("Download Initiated", `Attempting to download ${docName || 'document'}.`);
                        }
                    } else {
                        showCustomModal("Error", "Could not open a new window to view document. Pop-ups might be blocked.");
                    }
                } else {
                    showCustomModal("Error", "Document content is not available for viewing.");
                }
            };
        });
    }

    // Function to perform delete operation (for both documents and maintenance logs)
    async function performDeleteItem() {
        if (!itemToDeleteId || !itemToDeleteType) {
            showCustomModal("Error", "No item selected for deletion.");
            return;
        }

        customModal.style.display = 'none';
        customModal.classList.add('hidden');

        let apiEndpoint = '';
        if (itemToDeleteType === 'document') {
            apiEndpoint = `/api/documents/${itemToDeleteId}`;
        } else if (itemToDeleteType === 'maintenance') {
            apiEndpoint = `/api/maintenance_logs/${itemToDeleteId}`;
        } else {
            console.error("Unknown item type for deletion:", itemToDeleteType);
            showCustomModal("Error", "Unknown item type for deletion.");
            return;
        }

        try {
            console.log(`Sending DELETE request to ${apiEndpoint}`);
            const response = await fetch(apiEndpoint, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to delete ${itemToDeleteType}`);
            }

            const result = await response.json();
            showCustomModal("Success", result.message || `${itemToDeleteType} deleted successfully!`);
            console.log(`${itemToDeleteType} deleted successfully:`, itemToDeleteId);
            fetchVehicleDetails(); // Refresh all details
        } catch (error) {
            console.error(`Error deleting ${itemToDeleteType}:`, error);
            showCustomModal("Deletion Error", `Failed to delete ${itemToDeleteType}: ${error.message}`);
        } finally {
            itemToDeleteId = null;
            itemToDeleteType = null;
        }
    }


    // Handle Add Maintenance Log form submission
    if (addMaintenanceForm) {
        addMaintenanceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const logType = logTypeInput.value.trim();
            const logDate = logDateInput.value;
            const logNotes = logNotesInput.value.trim();

            if (!logType || !logDate) {
                showCustomModal("Validation Error", "Maintenance type and date are required.");
                return;
            }

            const data = {
                logType: logType,
                logDate: logDate,
                notes: logNotes
            };

            try {
                const response = await fetch(`/api/vehicles/${vehicleId}/maintenance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (response.ok) {
                    showCustomModal("Success", "Maintenance log added successfully!");
                    addMaintenanceForm.reset();
                    fetchVehicleDetails(); // Refresh the details page
                } else {
                    throw new Error(result.error || "Failed to add maintenance log.");
                }
            } catch (error) {
                console.error("Error adding maintenance log:", error);
                showCustomModal("Error", `Failed to add maintenance log: ${error.message}`);
            }
        });
    } else {
        console.error("Error: addMaintenanceForm not found.");
    }

    // Handle Add Document form submission
    if (addDocumentForm) {
        addDocumentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const documentName = documentNameInput.value.trim();
            const file = documentFileInput.files[0];
            const expiryDate = expiryDateInput.value || null;

            if (!documentName || !file) {
                showCustomModal("Validation Error", "Document name and file are required.");
                return;
            }

            // Convert file to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Content = reader.result.split(',')[1]; // Get base64 string without prefix
                const mimeType = file.type;

                const data = {
                    documentName: documentName,
                    fileContentBase64: base64Content,
                    fileMimeType: mimeType,
                    expiryDate: expiryDate
                };

                try {
                    const response = await fetch(`/api/vehicles/${vehicleId}/documents`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();

                    if (response.ok) {
                        showCustomModal("Success", "Document uploaded successfully!");
                        addDocumentForm.reset();
                        fetchVehicleDetails(); // Refresh the details page
                    } else {
                        throw new Error(result.error || "Failed to upload document.");
                    }
                } catch (error) {
                    console.error("Error uploading document:", error);
                    showCustomModal("Error", `Failed to upload document: ${error.message}`);
                }
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                showCustomModal("File Error", "Failed to read the document file.");
            };
        });
    } else {
        console.error("Error: addDocumentForm not found.");
    }

    // --- Event Listeners for Vehicle Details Editing ---
    if (editDetailsBtn) {
        editDetailsBtn.addEventListener('click', () => toggleEditMode(true));
    }
    if (cancelEditDetailsBtn) {
        cancelEditDetailsBtn.addEventListener('click', () => {
            toggleEditMode(false);
            newMainImageBase64 = null; // Reset image upload state
            newMainImageMimeType = null;
            fetchVehicleDetails(); // Re-fetch to revert any unsaved changes
        });
    }
    if (updateDetailsBtn) {
        updateDetailsBtn.addEventListener('click', async () => {
            // Collect data from editable spans and inputs
            const updatedData = {
                model: displayModel.textContent.trim(),
                year: parseInt(displayYear.textContent.trim()),
                make: displayMake.textContent.trim(),
                vin: displayVIN.textContent.trim(),
                plate_number: displayPlateNumber.textContent.trim(),
                color: displayColor.textContent.trim(),
                category: displayCategory.textContent.trim(),
                lastFueledDate: editLastFueled.value || null, // Get value from the date input
                fuelLevel: editFuelLevel.value // Get value from the fuel level select
            };

            // Add image data if a new image was selected or if the current one was removed
            if (newMainImageBase64 !== null) { // Only include if it was set (new image or clear)
                updatedData.mainImageBase64 = newMainImageBase64;
                updatedData.mainImageMimeType = newMainImageMimeType;
            } else {
                // If newMainImageBase64 is still null, it means no new image was selected
                // and the remove button was not explicitly clicked. In this case,
                // we should NOT send the image fields in the PUT request payload
                // so the backend preserves the existing image data.
                // The backend handles 'empty string' as NULL, but 'undefined' or
                // 'missing key' means no change.
            }


            // Basic validation for VIN length
            if (updatedData.vin.length !== 17) {
                showCustomModal("Validation Error", "VIN must be exactly 17 characters long.");
                return;
            }
            if (isNaN(updatedData.year) || updatedData.year < 1900 || updatedData.year > new Date().getFullYear() + 5) {
                showCustomModal("Validation Error", "Please enter a valid year (e.g., 2023).");
                return;
            }


            try {
                const response = await fetch(`/api/vehicles/${vehicleId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                const result = await response.json();

                if (response.ok) {
                    showCustomModal("Success", result.message || "Vehicle details updated successfully!");
                    toggleEditMode(false); // Switch back to display mode
                    newMainImageBase64 = null; // Reset image upload state
                    newMainImageMimeType = null;
                    fetchVehicleDetails(); // Refresh to show updated data
                } else {
                    // Display full error details from backend if available
                    const detailedErrorMessage = result.details ? `Details: ${result.details}` : "";
                    throw new Error(`${result.error || "Failed to update vehicle details."} ${detailedErrorMessage}`);
                }
            } catch (error) {
                console.error("Error updating vehicle details:", error);
                showCustomModal("Update Error", `Failed to update vehicle details: ${error.message}`);
            }
        });
    }

    // Handle main image upload
    if (mainImageUpload) {
        mainImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    if (mainVehicleImage) mainVehicleImage.src = reader.result;
                    newMainImageBase64 = reader.result.split(',')[1];
                    newMainImageMimeType = file.type;
                    if (removeMainImageBtn) removeMainImageBtn.style.display = 'inline-block'; // Show remove button
                };
                reader.onerror = (error) => {
                    console.error("Error reading main image file:", error);
                    showCustomModal("Image Upload Error", "Failed to read the selected image file.");
                };
            }
        });
    }

    // Handle remove main image button
    if (removeMainImageBtn) {
        removeMainImageBtn.addEventListener('click', () => {
            if (mainVehicleImage) mainVehicleImage.src = "https://placehold.co/400x250/E0E6ED/7F8C8D?text=Vehicle+Image"; // Reset to placeholder
            newMainImageBase64 = ""; // Explicitly set to empty string to clear in DB
            newMainImageMimeType = ""; // Explicitly set to empty string to clear in DB
            if (removeMainImageBtn) removeMainImageBtn.style.display = 'none'; // Hide remove button
        });
    }


    // Initial fetch of vehicle details when the page loads
    fetchVehicleDetails();
});
