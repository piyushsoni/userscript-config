// settings-dialog.js
(function (global) {
  "use strict";

  // ========================
  // LocalStorage helper functions
  // ========================
  function getStoredValue(configId, fieldId) {
    const key = `settings_${configId}_${fieldId}`;
    return localStorage.getItem(key);
  }

  function saveStoredValue(configId, fieldId, value) {
    const key = `settings_${configId}_${fieldId}`;
    localStorage.setItem(key, value);
  }

  // ========================
  // Main API: createSettingsDialog(config)
  // ========================
  function createSettingsDialog(config) {
    // Create modal overlay
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    });

    // Create dialog container
    const dialog = document.createElement("div");
    Object.assign(dialog.style, {
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
      minWidth: "300px",
      maxWidth: "600px",
      padding: "20px",
      fontFamily: "sans-serif",
    });
    if (config.css && config.css.dialogClass) {
      dialog.className = config.css.dialogClass;
    }

    // Header
    const header = document.createElement("div");
    header.textContent = config.header || "Settings";
    header.style.fontSize = "1.5em";
    header.style.marginBottom = "10px";
    if (config.css && config.css.headerClass) {
      header.className = config.css.headerClass;
    }
    dialog.appendChild(header);

    // Body: Create a table layout for fields.
    const body = document.createElement("div");
    if (config.css && config.css.bodyClass) {
      body.className = config.css.bodyClass;
    }
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    // Map to store references to input elements by field ID.
    const inputElements = {};

    // Process each field.
    config.fields.forEach((field) => {
      const tr = document.createElement("tr");
      tr.style.padding = "5px";
      const tdLabel = document.createElement("td");
      tdLabel.style.padding = "5px";
      tdLabel.style.verticalAlign = "middle";
      tdLabel.textContent = field.label || "";
      const tdInput = document.createElement("td");
      tdInput.style.padding = "5px";

      let input;
      switch (field.type) {
        case "checkbox":
          input = document.createElement("input");
          input.type = "checkbox";
          break;
        case "text":
          input = document.createElement("input");
          input.type = "text";
          break;
        case "number":
          input = document.createElement("input");
          input.type = "number";
          break;
        case "select":
          input = document.createElement("select");
          if (field.options && Array.isArray(field.options)) {
            field.options.forEach((opt) => {
              const option = document.createElement("option");
              option.value = opt;
              option.textContent = opt;
              input.appendChild(option);
            });
          }
          break;
        case "radio":
          // For radio groups, create a container div for all radio buttons.
          input = document.createElement("div");
          if (field.options && Array.isArray(field.options)) {
            field.options.forEach((opt) => {
              const radioLabel = document.createElement("label");
              radioLabel.style.marginRight = "10px";
              const radio = document.createElement("input");
              radio.type = "radio";
              radio.name = field.id; // Group by field id.
              radio.value = opt;
              radioLabel.appendChild(radio);
              radioLabel.appendChild(document.createTextNode(opt));
              input.appendChild(radioLabel);
            });
          }
          break;
        default:
          console.warn("Unsupported field type:", field.type);
          return;
      }

      // Apply custom CSS class if provided.
      if (field.css) {
        input.className = field.css;
      }

      // Retrieve stored value from localStorage.
      let stored = getStoredValue(config.configId, field.id);
      let value = stored !== null ? stored : field.default;

      // Set the input's value according to its type.
      if (field.type === "checkbox") {
        input.checked = value === "true" || value === true;
      } else if (field.type === "radio") {
        const radios = input.querySelectorAll("input[type='radio']");
        radios.forEach((radio) => {
          if (radio.value == value) {
            radio.checked = true;
          }
        });
      } else if (field.type === "select") {
        input.value = value;
      } else {
        input.value = value !== undefined ? value : "";
      }

      // Store the element for dependency handling.
      inputElements[field.id] = input;

      // Add event listeners for dependency updates.
      if (
        field.type === "checkbox" ||
        field.type === "select" ||
        field.type === "radio" ||
        field.type === "number"
      ) {
        input.addEventListener("change", updateDependencies);
      } else {
        input.addEventListener("blur", updateDependencies);
      }

      tdInput.appendChild(input);
      tr.appendChild(tdLabel);
      tr.appendChild(tdInput);
      table.appendChild(tr);
    });
    body.appendChild(table);
    dialog.appendChild(body);

    // Footer with Save and Cancel buttons.
    const footer = document.createElement("div");
    footer.style.textAlign = "right";
    footer.style.marginTop = "10px";
    if (config.css && config.css.footerClass) {
      footer.className = config.css.footerClass;
    }
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    if (config.css && config.css.saveButtonClass) {
      saveBtn.className = config.css.saveButtonClass;
    }
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    if (config.css && config.css.cancelButtonClass) {
      cancelBtn.className = config.css.cancelButtonClass;
    }
    footer.appendChild(saveBtn);
    footer.appendChild(cancelBtn);
    dialog.appendChild(footer);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // ========================
    // Dependency Handling
    // ========================
    function updateDependencies() {
      config.fields.forEach((field) => {
        if (field.enabledIf) {
          const controllerId = Object.keys(field.enabledIf)[0];
          const requiredValue = field.enabledIf[controllerId];
          const controllerElem = inputElements[controllerId];
          if (!controllerElem) return;
          let currentValue;
          if (controllerElem.type === "checkbox") {
            currentValue = controllerElem.checked;
          } else if (controllerElem.type === "radio") {
            const radios = document.getElementsByName(controllerId);
            radios.forEach((radio) => {
              if (radio.checked) currentValue = radio.value;
            });
          } else {
            currentValue = controllerElem.value;
          }
          const targetElem = inputElements[field.id];
          if (targetElem) {
            targetElem.disabled =
              String(currentValue) !== String(requiredValue);
          }
        }
      });
    }
    // Initial dependency update.
    updateDependencies();

    // ========================
    // Save / Cancel Handlers
    // ========================
    saveBtn.addEventListener("click", () => {
      config.fields.forEach((field) => {
        const elem = inputElements[field.id];
        let value;
        if (field.type === "checkbox") {
          value = elem.checked;
        } else if (field.type === "radio") {
          const radios = document.getElementsByName(field.id);
          radios.forEach((radio) => {
            if (radio.checked) value = radio.value;
          });
        } else {
          value = elem.value;
        }
        saveStoredValue(config.configId, field.id, value);
      });
      document.body.removeChild(overlay);
    });

    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });

    // Close on Escape key.
    function escHandler(e) {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", escHandler);
      }
    }
    document.addEventListener("keydown", escHandler);
  }

  // Expose the API globally.
  global.createSettingsDialog = createSettingsDialog;
})(window);
