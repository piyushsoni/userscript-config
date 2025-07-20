/**
 * Settings UI Dialog Library
 * Dynamically creates a modal settings dialog based on JSON configuration
 * with LocalStorage persistence and validation support.
 */

class UserScriptConfig {
    constructor() {
        this.currentDialog = null;
        this.config = null;
        this.callbacks = {};
        this.validationState = new Map();
        this.values = new Map();
        this.groupStates = new Map();
        this.isInitialized = false;
        this.configId = null;
        this.collapsedIcon = 'downward-arrow.svg';
        this.expandedIcon = 'upward-arrow.svg';
    }

    /**
     * Initializes the settings manager with configuration and callbacks
     * @param {string} configId - Unique identifier for this settings instance (used for localStorage namespacing)
     * @param {Object} config - JSON configuration object
     * @param {Object} callbacks - Optional callback functions {onOpen, onClose, onSave, onChange}
     */
    init(configId, config, callbacks = {}) {
        this.configId = configId;
        this.config = config;
        this.callbacks = callbacks;
        this.isInitialized = true;

        this.setupValidationState();
        this.setupGroupStates(); // Initialize group states

        // Read from localStorage and store into the object.
        this.readFromStore();

        return this;
    }

    /**
     * Generates the namespaced localStorage key
     * @param {string} settingId - The setting ID
     * @returns {string} Namespaced key
     */
    getStorageKey(settingId) {
        return `${this.configId}.${settingId}`;
    }

    /**
     * Reads values from localStorage and caches them into the
     * in memory config object
     */
    readFromStore() {
        if (!this.isInitialized || !this.config.settings) {
            console.warn('Settings not initialized. Call init() first.');
            return this;
        }

        this.config.settings.forEach(setting => {
            try {
                const storageKey = this.getStorageKey(setting.id);
                const storedValue = localStorage.getItem(storageKey);
                const value = storedValue !== null ? storedValue : setting.defaultValue;
                this.values.set(setting.id, value);
            } catch (error) {
                console.error(`Error reading from LocalStorage for ${setting.id}:`, error);
                this.values.set(setting.id, setting.defaultValue);
            }
        });

        // Read group states from localStorage
        if (this.config.groups && Array.isArray(this.config.groups)) {
            this.config.groups.forEach(group => {
                try {
                    const storageKey = this.getStorageKey(`groupState.${group.id}`);
                    const storedState = localStorage.getItem(storageKey);
                    // Default to group's 'expanded' property, otherwise true (expanded)
                    const defaultExpanded = (group.expanded === undefined || group.expanded === null) ? true : group.expanded;
                    const state = storedState !== null ? (storedState === 'true') : defaultExpanded;
                    this.groupStates.set(group.id, state);
                } catch (error) {
                    console.error(`Error reading group state from LocalStorage for ${group.id}:`, error);
                    this.groupStates.set(group.id, true); // Default to expanded on error
                }
            });
        }

        return this;
    }

    /**
     * Writes memory object values to localStorage
     */
    writeToStorage() {
        if (!this.isInitialized) {
            console.warn('Settings not initialized. Call init() first.');
            return this;
        }

        this.values.forEach((value, id) => {
            try {
                const storageKey = this.getStorageKey(id);
                localStorage.setItem(storageKey, value.toString());
            } catch (error) {
                console.error(`Error writing to LocalStorage for ${id}:`, error);
            }
        });

        // Write group states to localStorage
        this.groupStates.forEach((state, id) => {
            try {
                const storageKey = this.getStorageKey(`groupState.${id}`);
                localStorage.setItem(storageKey, state.toString());
            } catch (error) {
                console.error(`Error writing group state to LocalStorage for ${id}:`, error);
            }
        });

        return this;
    }

    /**
     * Resets all values in the Config object to their defaults
     */
    resetToDefaults() {
        if (!this.isInitialized || !this.config.settings) {
            console.warn('Settings not initialized. Call init() first.');
            return this;
        }

        this.config.settings.forEach(setting => {
            this.values.set(setting.id, setting.defaultValue);
        });

        // Reset group states to their default in config
        if (this.config.groups && Array.isArray(this.config.groups)) {
            this.config.groups.forEach(group => {
                const defaultExpanded = (group.expanded === undefined || group.expanded === null) ? true : group.expanded;
                this.groupStates.set(group.id, defaultExpanded);
            });
        }

        return this;
    }

    /**
     * Updates a specific setting value in the cache
     * @param {string} id - Setting ID
     * @param {any} value - New value
     */
    setFieldValue(id, value) {
        if (!this.isInitialized) {
            console.warn('Settings not initialized. Call init() first.');
            return this;
        }

        this.values.set(id, value);
        return this;
    }

    /**
     * Gets a field value by ID
     * @param {string} id - Setting ID
     * @returns {any} The field value
     */
    getFieldValue(id) {
        return this.values.get(id);
    }

    /**
     * Gets all field values as an object
     * @returns {Object} All field values
     */
    getAllFieldValues() {
        const values = {};
        this.values.forEach((value, id) => {
            values[id] = value;
        });
        return values;
    }

    /**
     * Creates and displays the settings dialog using field values
     */
    openSettingsDialog() {
        if (!this.isInitialized) {
            console.warn('Settings not initialized. Call init() first.');
            return null;
        }

        // Remove any existing dialog
        if (this.currentDialog) {
            this.currentDialog.remove();
        }

        // Create dialog structure
        this.currentDialog = this.createDialogStructure(this.config);

        // Add to DOM
        document.body.appendChild(this.currentDialog);

        // Populate with field values
        this.updateSettingsToDialog();

        // Set up conditional logic
        this.setupConditionalLogic();

        // Set up keyboard event handlers
        this.setupKeyboardHandlers();

        // Set up validation
        this.setupValidation();

        // Execute onOpen callback
        if (this.callbacks.onOpen && typeof this.callbacks.onOpen === 'function') {
            this.callbacks.onOpen();
        }

        return this.currentDialog;
    }

    /**
     * Updates field values from the dialog inputs (doesn't write to storage)
     */
    updateSettingsFromDialog() {
        if (!this.currentDialog || !this.config.settings) {
            console.warn('No dialog open or settings not initialized.');
            return this;
        }

        this.config.settings.forEach(setting => {
            const value = this.getInputValue(setting);
            this.values.set(setting.id, value);
        });

        return this;
    }

    /**
     * Updates dialog inputs from field values
     */
    updateSettingsToDialog() {
        if (!this.currentDialog || !this.config.settings) {
            console.warn('No dialog open or settings not initialized.');
            return this;
        }

        this.config.settings.forEach(setting => {
            const fieldValue = this.values.get(setting.id);
            if (fieldValue !== undefined) {
                this.setInputValue(setting, fieldValue);
            }
        });

        // Update group collapse/expand state in dialog
        this.groupStates.forEach((isExpanded, groupId) => {
            const groupContent = this.currentDialog.querySelector(`.settings-group[data-group-id="${groupId}"] .settings-group-content`);
            const groupToggleImg = this.currentDialog.querySelector(`.settings-group[data-group-id="${groupId}"] .settings-group-toggle img`);
            if (groupContent && groupToggleImg) {
                if (isExpanded) {
                    groupContent.classList.add('expanded');
                    groupToggleImg.src = this.expandedIcon; // Set to upwards arrows
                } else {
                    groupContent.classList.remove('expanded');
                    groupToggleImg.src = this.collapsedIcon; // Set to downwards arrows
                }
            }
        });

        return this;
    }

    /**
     * Creates the main dialog structure
     */
    createDialogStructure(config) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'settings-dialog-overlay';

        // Create main dialog container
        const dialog = document.createElement('div');
        dialog.className = config.dialogCSSClass || 'settings-dialog';

        // Create header if specified
        if (config.headerText) {
            const header = document.createElement('h2');
            header.className = config.headerCSSClass || 'dialog-header';
            header.textContent = config.headerText;
            dialog.appendChild(header);
        }

        // --- Grouping Logic ---
        const groupedSettings = new Map(); // Map groupId to an array of settings
        const groupOrder = []; // Stores the order of groups and ungrouped settings

        // Initialize groupOrder and groupedSettings
        if (config.settings && Array.isArray(config.settings)) {
            const processedGroupIds = new Set();
            config.settings.forEach(setting => {
                if (setting.groupId) {
                    if (!groupedSettings.has(setting.groupId)) {
                        groupedSettings.set(setting.groupId, []);
                        // Add group to order only on its first appearance
                        if (!processedGroupIds.has(setting.groupId)) {
                            groupOrder.push({ type: 'group', id: setting.groupId });
                            processedGroupIds.add(setting.groupId);
                        }
                    }
                    groupedSettings.get(setting.groupId).push(setting);
                } else {
                    groupOrder.push({ type: 'setting', setting: setting });
                }
            });
        }

        // Render settings based on groupOrder
        groupOrder.forEach(item => {
            if (item.type === 'setting') {
                // Render ungrouped setting directly
                const table = document.createElement('table');
                table.className = 'settings-table';
                const row = this.createSettingRow(item.setting);
                table.appendChild(row);
                dialog.appendChild(table);
            } else if (item.type === 'group') {
                // Render group section
                const groupId = item.id;
                const groupConfig = config.groups ? config.groups.find(g => g.id === groupId) : null;
                if (groupConfig) {
                    const groupSection = this.createGroupSection(groupConfig, groupedSettings.get(groupId));
                    dialog.appendChild(groupSection);
                } else {
                    // If group config is missing, just render settings without a group header
                    const table = document.createElement('table');
                    table.className = 'settings-table';
                    groupedSettings.get(groupId).forEach(setting => {
                        const row = this.createSettingRow(setting);
                        table.appendChild(row);
                    });
                    dialog.appendChild(table);
                }
            }
        });
        // --- End Grouping Logic ---

        // Create footer
        const footer = document.createElement('div');
        footer.className = config.footerCSSClass || 'dialog-footer';

        // Add footer text if specified
        if (config.footerText) {
            const footerText = document.createElement('span');
            footerText.textContent = config.footerText;
            footer.appendChild(footerText);
        }

        // Create buttons
        const saveButton = document.createElement('button');
        saveButton.className = config.saveButtonCSSClass || 'save-button';
        saveButton.textContent = config.saveButtonText || 'Save';
        saveButton.addEventListener('click', () => this.handleSave());

        const cancelButton = document.createElement('button');
        cancelButton.className = config.cancelButtonCSSClass || 'cancel-button';
        cancelButton.textContent = config.cancelButtonText || 'Cancel';
        cancelButton.addEventListener('click', () => this.handleCancel());

        footer.appendChild(saveButton);
        footer.appendChild(cancelButton);
        dialog.appendChild(footer);

        overlay.appendChild(dialog);

        // Close dialog when clicking overlay (not the dialog itself)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.handleCancel();
            }
        });

        return overlay;
    }

    /**
     * Creates a group section with a header and collapsible content.
     * @param {Object} groupConfig - The configuration for the group (id, name, expanded).
     * @param {Array} settingsInGroup - An array of setting objects belonging to this group.
     * @returns {HTMLElement} The group section element.
     */
    createGroupSection(groupConfig, settingsInGroup) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'settings-group';
        groupDiv.setAttribute('data-group-id', groupConfig.id);

        const headerDiv = document.createElement('div');
        headerDiv.className = 'settings-group-header';
        headerDiv.addEventListener('click', () => this.toggleGroup(groupConfig.id));

        const title = document.createElement('h3');
        title.textContent = groupConfig.name;
        headerDiv.appendChild(title);

        const toggleIconSpan = document.createElement('span');
        toggleIconSpan.className = 'settings-group-toggle';

        const toggleIconImg = document.createElement('img');
        toggleIconImg.alt = 'Toggle Group';
        // Initial icon will be set by updateSettingsToDialog based on groupStates
        toggleIconImg.src = this.collapsedIcon; // Default to collapsed state icon (downwards arrows)
        toggleIconSpan.appendChild(toggleIconImg);

        headerDiv.appendChild(toggleIconSpan);

        groupDiv.appendChild(headerDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'settings-group-content';

        const table = document.createElement('table');
        table.className = 'settings-table';

        settingsInGroup.forEach(setting => {
            const row = this.createSettingRow(setting);
            table.appendChild(row);
        });

        contentDiv.appendChild(table);
        groupDiv.appendChild(contentDiv);

        return groupDiv;
    }

    /**
     * Toggles the expanded/collapsed state of a group.
     * @param {string} groupId - The ID of the group to toggle.
     */
    toggleGroup(groupId) {
        const isExpanded = this.groupStates.get(groupId);
        const newExpandedState = !isExpanded;
        this.groupStates.set(groupId, newExpandedState);

        // Update localStorage immediately for group states
        try {
            const storageKey = this.getStorageKey(`groupState.${groupId}`);
            localStorage.setItem(storageKey, newExpandedState.toString());
        } catch (error) {
            console.error(`Error writing group state to LocalStorage for ${groupId}:`, error);
        }

        // Update the UI
        this.updateSettingsToDialog(); // Re-render group states
    }

    /**
     * Initializes the group states based on config defaults.
     */
    setupGroupStates() {
        if (this.config.groups && Array.isArray(this.config.groups)) {
            this.config.groups.forEach(group => {
                // Default to true (expanded) if 'expanded' property is not specified
                const defaultExpanded = (group.expanded === undefined || group.expanded === null) ? true : group.expanded;
                this.groupStates.set(group.id, defaultExpanded);
            });
        }
    }

    /**
     * Creates a single setting row
     */
    createSettingRow(setting) {
        const row = document.createElement('tr');
        row.className = 'setting-row';

        // Create label cell
        const labelCell = document.createElement('td');
        labelCell.className = setting.labelCSSClass || 'setting-label';
        const label = document.createElement('label');
        label.textContent = setting.labelText;
        label.setAttribute('for', setting.id);
        labelCell.appendChild(label);

        // Create input cell
        const inputCell = document.createElement('td');
        inputCell.className = 'setting-input-cell';

        // Create input element based on type
        const inputElement = this.createInputElement(setting);
        if (inputElement) { // Ensure inputElement is not null
            inputCell.appendChild(inputElement);
        }


        // Add error message container for validation
        if (setting.validationRegex) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.id = `${setting.id}-error`;
            errorDiv.style.display = 'none';
            errorDiv.textContent = setting.errorMessage || 'Invalid input';
            inputCell.appendChild(errorDiv);
        }

        row.appendChild(labelCell);
        row.appendChild(inputCell);

        return row;
    }

    /**
     * Creates the appropriate input element based on setting type
     */
    createInputElement(setting) {
        const type = setting.type || 'textbox';
        const inputClass = setting.inputCSSClass || 'setting-input';

        switch (type) {
            case 'textbox':
                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.id = setting.id;
                textInput.className = inputClass;
                if (setting.placeholder) {
                    textInput.placeholder = setting.placeholder;
                }
                textInput.addEventListener('input', () => this.handleInputChange(setting));
                return textInput;
            case 'password':
                const passwordInput = document.createElement('input');
                passwordInput.type = 'password';
                passwordInput.id = setting.id;
                passwordInput.className = inputClass;
                passwordInput.addEventListener('input', () => this.handleInputChange(setting));
                return passwordInput;
            case 'checkbox':
                const checkboxInput = document.createElement('input');
                checkboxInput.type = 'checkbox';
                checkboxInput.id = setting.id;
                checkboxInput.className = inputClass;
                checkboxInput.addEventListener('change', () => this.handleInputChange(setting));
                return checkboxInput;
            case 'radio':
                const radioContainer = document.createElement('div');
                radioContainer.className = 'radio-group';

                if (setting.options && Array.isArray(setting.options)) {
                    setting.options.forEach(option => {
                        const radioWrapper = document.createElement('div');
                        radioWrapper.className = 'radio-option';

                        const radioInput = document.createElement('input');
                        radioInput.type = 'radio';
                        radioInput.id = `${setting.id}-${option.value}`;
                        radioInput.name = setting.groupName || setting.id;
                        radioInput.value = option.value;
                        radioInput.className = inputClass;
                        radioInput.addEventListener('change', () => this.handleInputChange(setting));

                        const radioLabel = document.createElement('label');
                        radioLabel.setAttribute('for', `${setting.id}-${option.value}`);
                        radioLabel.textContent = option.text;

                        radioWrapper.appendChild(radioInput);
                        radioWrapper.appendChild(radioLabel);
                        radioContainer.appendChild(radioWrapper);
                    });
                }

                return radioContainer;
            case 'dropdown':
                const selectInput = document.createElement('select');
                selectInput.id = setting.id;
                selectInput.className = inputClass;
                selectInput.addEventListener('change', () => this.handleInputChange(setting));

                if (setting.options && Array.isArray(setting.options)) {
                    setting.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.text;
                        selectInput.appendChild(optionElement);
                    });
                }

                return selectInput;
            default:
                console.warn('Unrecognized type: ' + setting.type + ', cannot create input element');
                return null;
        }
    }

    /**
     * Sets the value of an input element
     */
    setInputValue(setting, value) {
        const type = setting.type || 'textbox';

        switch (type) {
            case 'textbox':
            case 'password':
                const textInput = document.getElementById(setting.id);
                if (textInput) {
                    textInput.value = value;
                }
                break;

            case 'checkbox':
                const checkboxInput = document.getElementById(setting.id);
                if (checkboxInput) checkboxInput.checked = value === 'true' || value === true;
                break;

            case 'radio':
                const radioInputs = document.querySelectorAll(`input[name="${setting.groupName || setting.id}"]`);
                radioInputs.forEach(radio => {
                    radio.checked = radio.value === value;
                });
                break;

            case 'dropdown':
                const selectInput = document.getElementById(setting.id);
                if (selectInput) selectInput.value = value || '';
                break;
        }
    }

    /**
     * Gets the current value of an input element
     */
    getInputValue(setting) {
        const type = setting.type || 'textbox';

        switch (type) {
            case 'textbox':
            case 'password':
                const textInput = document.getElementById(setting.id);
                return textInput ? textInput.value : '';

            case 'checkbox':
                const checkboxInput = document.getElementById(setting.id);
                return checkboxInput ? checkboxInput.checked : false;

            case 'radio':
                const radioInputs = document.querySelectorAll(`input[name="${setting.groupName || setting.id}"]`);
                for (const radio of radioInputs) {
                    if (radio.checked) return radio.value;
                }
                return '';

            case 'dropdown':
                const selectInput = document.getElementById(setting.id);
                return selectInput ? selectInput.value : '';

            default:
                return '';
        }
    }

    /**
     * Sets up keyboard event handlers
     */
    setupKeyboardHandlers() {
        this.keyboardHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.handleCancel();
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
    }

    /**
     * Sets up conditional logic for enabledIf
     */
    setupConditionalLogic() {
        if (!this.config.settings) return;

        this.config.settings.forEach(setting => {
            if (setting.enabledIf) {
                this.updateConditionalState(setting);
            }
        });
    }

    /**
     * Updates the enabled/disabled state based on conditional logic
     */
    updateConditionalState(setting) {
        if (!setting.enabledIf) return;

        const dependentSetting = this.config.settings.find(s => s.id === setting.enabledIf.otherElementId);
        if (!dependentSetting) return;

        const dependentValue = this.getInputValue(dependentSetting);
        const shouldEnable = dependentValue === setting.enabledIf.value;

        const inputElement = this.getInputElementById(setting.id);
        if (inputElement) {
            if (!shouldEnable) {
                // If disabling, reset to default value
                this.setInputValue(setting, setting.defaultValue);
            }
            inputElement.disabled = !shouldEnable;
        }
    }

    /**
     * Gets the input element by ID (handles radio groups)
     */
    getInputElementById(id) {
        const element = document.getElementById(id);
        if (element) return element;

        // For radio groups, find the first radio button's parent (the radio-group div)
        const radioInputs = document.querySelectorAll(`input[id^="${id}-"]`);
        if (radioInputs.length > 0) {
            // Return the container of the radio group
            return radioInputs[0].closest('.radio-group');
        }
        return null;
    }

    /**
     * Sets up validation state for all settings
     */
    setupValidationState() {
        if (!this.config.settings) return;

        this.config.settings.forEach(setting => {
            this.validationState.set(setting.id, true); // Start as valid
        });
    }

    /**
     * Sets up validation for input elements
     */
    setupValidation() {
        if (!this.config.settings) return;

        this.config.settings.forEach(setting => {
            if (setting.validationRegex && (setting.type === 'textbox' || setting.type === 'password')) {
                this.validateInput(setting);
            }
        });

        this.updateSaveButtonState();
    }

    /**
     * Validates an input element
     */
    validateInput(setting) {
        if (!setting.validationRegex) return true;

        const value = this.getInputValue(setting);
        const regex = new RegExp(setting.validationRegex);
        const isValid = regex.test(value);

        this.validationState.set(setting.id, isValid);

        const inputElement = document.getElementById(setting.id);
        const errorElement = document.getElementById(`${setting.id}-error`);

        if (inputElement) {
            if (isValid) {
                inputElement.classList.remove('invalid-input');
            } else {
                inputElement.classList.add('invalid-input');
            }
        }

        if (errorElement) {
            errorElement.style.display = isValid ? 'none' : 'block';
        }

        this.updateSaveButtonState();
        return isValid;
    }

    /**
     * Updates the save button enabled/disabled state
     */
    updateSaveButtonState() {
        const saveButton = this.currentDialog?.querySelector('.save-button');
        if (!saveButton) return;

        const allValid = Array.from(this.validationState.values()).every(valid => valid);
        saveButton.disabled = !allValid;
    }

    /**
     * Handles input change events
     */
    handleInputChange(setting) {
        // Validate input if needed
        if (setting.validationRegex && (setting.type === 'textbox' || setting.type === 'password')) {
            this.validateInput(setting);
        }

        // Update conditional logic for all settings
        this.config.settings.forEach(s => {
            if (s.enabledIf && s.enabledIf.otherElementId === setting.id) {
                this.updateConditionalState(s);
            }
        });

        // Execute onChange callback
        if (this.callbacks.onChange && typeof this.callbacks.onChange === 'function') {
            this.callbacks.onChange(setting.id, this.getInputValue(setting));
        }
    }

    /**
     * Handles save button click
     */
    handleSave() {
        // First update the in-memory config
        // object from the dialog, and then write
        // to the localStorage.
        this.updateSettingsFromDialog();
        this.writeToStorage();

        // Execute onSave callback
        if (this.callbacks.onSave && typeof this.callbacks.onSave === 'function') {
            this.callbacks.onSave();
        }

        this.closeDialog();
    }

    /**
     * Handles cancel button click
     */
    handleCancel() {
        this.closeDialog();
    }

    /**
     * Closes the dialog
     */
    closeDialog() {
        // Remove keyboard event handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }

        if (this.currentDialog) {
            this.currentDialog.remove();
            this.currentDialog = null;
        }

        // Execute onClose callback
        if (this.callbacks.onClose && typeof this.callbacks.onClose === 'function') {
            this.callbacks.onClose();
        }
    }

    /**
     * Checks if dialog is currently open
     */
    isDialogOpen() {
        return this.currentDialog !== null;
    }

    /**
     * Checks if the settings manager is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Create multiple instances for different settings dialogs
const settingsDialogInstances = new Map();

/**
 * Gets or creates a settings dialog instance for a specific configId
 * @param {string} configId - Unique identifier for the settings instance
 * @returns {UserScriptConfig} The settings dialog instance
 */
function getSettingsInstance(configId) {
    if (!settingsDialogInstances.has(configId)) {
        settingsDialogInstances.set(configId, new UserScriptConfig());
    }
    return settingsDialogInstances.get(configId);
}
