/**
 * Settings UI Dialog Library
 * Dynamically creates a modal settings dialog based on JSON configuration
 * with LocalStorage persistence and validation support.
 */

class SettingsDialogGenerator {
    constructor() {
        this.currentDialog = null;
        this.currentConfig = null;
        this.validationState = new Map();
    }

    /**
     * Creates and displays a settings dialog
     * @param {Object} config - JSON configuration object
     * @param {Object} callbacks - Optional callback functions {onOpen, onClose, onSave, onChange}
     */
    createSettingsDialog(config, callbacks = {}) {
        // Store config and callbacks for later use
        this.currentConfig = config;
        this.currentCallbacks = callbacks;
        
        // Remove any existing dialog
        if (this.currentDialog) {
            this.currentDialog.remove();
        }

        // Create dialog structure
        this.currentDialog = this.createDialogStructure(config);

        // Add to DOM
        document.body.appendChild(this.currentDialog);
        
        // Populate with current values from LocalStorage
        this.populateValuesFromStorage(config);
        
        // Set up conditional logic
        this.setupConditionalLogic(config);
        
        // Set up keyboard event handlers
        this.setupKeyboardHandlers();
        
        // Execute onOpen callback
        if (callbacks.onOpen && typeof callbacks.onOpen === 'function') {
            callbacks.onOpen();
        }
        
        return this.currentDialog;
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
        
        // Create settings table
        const table = document.createElement('table');
        table.className = 'settings-table';
        
        // Create settings rows
        if (config.settings && Array.isArray(config.settings)) {
            config.settings.forEach(setting => {
                const row = this.createSettingRow(setting);
                table.appendChild(row);
            });
        }
        
        dialog.appendChild(table);
        
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
        inputCell.appendChild(inputElement);
        
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
                // Default to textbox
                const defaultInput = document.createElement('input');
                defaultInput.type = 'text';
                defaultInput.id = setting.id;
                defaultInput.className = inputClass;
                defaultInput.addEventListener('input', () => this.handleInputChange(setting));
                return defaultInput;
        }
    }

    /**
     * Populates input values from LocalStorage
     */
    populateValuesFromStorage(config) {
        if (!config.settings) return;
        
        config.settings.forEach(setting => {
            try {
                const storedValue = localStorage.getItem(setting.id);
                const value = storedValue !== null ? storedValue : setting.defaultValue;
                
                this.setInputValue(setting, value);
            } catch (error) {
                console.error(`Error reading from LocalStorage for ${setting.id}:`, error);
                this.setInputValue(setting, setting.defaultValue);
            }
        });
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
                if (textInput) textInput.value = value || '';
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
    setupConditionalLogic(config) {
        if (!config.settings) return;
        
        config.settings.forEach(setting => {
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
        
        const dependentSetting = this.currentConfig.settings.find(s => s.id === setting.enabledIf.otherElementId);
        if (!dependentSetting) return;
        
        const dependentValue = this.getInputValue(dependentSetting);
        const shouldEnable = dependentValue === setting.enabledIf.value;
        
        const inputElement = this.getInputElementById(setting.id);
        if (inputElement) {
            inputElement.disabled = !shouldEnable;
        }
    }

    /**
     * Gets the input element by ID (handles radio groups)
     */
    getInputElementById(id) {
        const element = document.getElementById(id);
        if (element) return element;
        
        // For radio groups, find the first radio button
        const radioInputs = document.querySelectorAll(`input[id^="${id}-"]`);
        return radioInputs.length > 0 ? radioInputs[0].parentElement : null;
    }

    /**
     * Sets up validation for input elements
     */
    setupValidation(config) {
        if (!config.settings) return;
        
        config.settings.forEach(setting => {
            if (setting.validationRegex && (setting.type === 'textbox' || setting.type === 'password')) {
                this.validationState.set(setting.id, true); // Start as valid
                this.validateInput(setting);
            } else {
                this.validationState.set(setting.id, true); // No validation needed
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
        const saveButton = this.currentDialog.querySelector('.save-button');
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
        this.currentConfig.settings.forEach(s => {
            if (s.enabledIf && s.enabledIf.otherElementId === setting.id) {
                this.updateConditionalState(s);
            }
        });
        
        // Execute onChange callback
        if (this.currentCallbacks.onChange && typeof this.currentCallbacks.onChange === 'function') {
            this.currentCallbacks.onChange(setting.id, this.getInputValue(setting));
        }
    }

    /**
     * Handles save button click
     */
    handleSave() {
        if (!this.currentConfig.settings) return;
        
        // Save all values to LocalStorage
        this.currentConfig.settings.forEach(setting => {
            try {
                const value = this.getInputValue(setting);
                localStorage.setItem(setting.id, value.toString());
            } catch (error) {
                console.error(`Error saving to LocalStorage for ${setting.id}:`, error);
            }
        });
        
        // Execute onSave callback
        if (this.currentCallbacks.onSave && typeof this.currentCallbacks.onSave === 'function') {
            this.currentCallbacks.onSave();
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
        if (this.currentCallbacks && this.currentCallbacks.onClose && typeof this.currentCallbacks.onClose === 'function') {
            this.currentCallbacks.onClose();
        }
        
        this.currentConfig = null;
        this.currentCallbacks = null;
        this.validationState.clear();
    }
}

// Create global instance
const settingsDialogGenerator = new SettingsDialogGenerator();

// Export the main function
function createSettingsDialog(config, callbacks = {}) {
    return settingsDialogGenerator.createSettingsDialog(config, callbacks);
}

// For module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSettingsDialog, SettingsDialogGenerator };
}

// For AMD environments
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return { createSettingsDialog, SettingsDialogGenerator };
    });
}