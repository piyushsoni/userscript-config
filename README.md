# UserScript Config : A Settings UI Dialog Library

This library provides a flexible and easy-to-use way to generate a modal settings dialog from a JSON configuration. It handles dynamic UI creation, LocalStorage persistence, input validation, and conditional display logic for settings and groups.

## Features

  * **Dynamic Dialog Generation:** Create a complete settings dialog purely from a JSON configuration object.
  * **LocalStorage Persistence:** Automatically saves and loads setting values to/from LocalStorage, namespaced by a unique `configId`.
  * **Input Validation:** Supports regular expression-based validation for text and password inputs, providing real-time feedback.
  * **Conditional Logic:**
      * **`enabledIf`**: Enable or disable settings based on the value of another setting.
      * **`collapsedIf`**: Automatically collapse or expand entire groups based on a setting's value.
  * **Setting Types:** Supports various input types including `textbox`, `password`, `checkbox`, `radio` buttons, and `dropdown` (select).
  * **Configurable Styling:** Apply custom CSS classes for the dialog, header, footer, save button, and cancel button.
  * **Grouping:** Organize settings into collapsible groups for better UI organization.
  * **Callbacks:** Integrate custom logic at various stages (dialog opened, closed, settings saved, setting changed, settings loaded).
  * **Accessibility:** Includes basic focus management and keyboard (Escape key) handling.
  * **Tooltips:** Add helpful tooltips to individual setting rows.

## Table of Contents

  * [Installation](https://www.google.com/search?q=%23installation)
  * [Usage](https://www.google.com/search?q=%23usage)
      * [1. Include the Library](https://www.google.com/search?q=%231-include-the-library)
      * [2. Define Your Configuration](https://www.google.com/search?q=%232-define-your-configuration)
      * [3. Initialize and Use](https://www.google.com/search?q=%233-initialize-and-use)
  * [Configuration Reference](https://www.google.com/search?q=%23configuration-reference)
      * [Main `config` Object](https://www.google.com/search?q=%23main-config-object)
      * [`settings` Array](https://www.google.com/search?q=%23settings-array)
      * [`groups` Array](https://www.google.com/search?q=%23groups-array)
  * [Callbacks](https://www.google.com/search?q=%23callbacks)
  * [Public Methods](https://www.google.com/search?q=%23public-methods)
  * [Styling](https://www.google.com/search?q=%23styling)
  * [Example](https://www.google.com/search?q=%23example)

## Installation

The library consists of two files:

1.  `userscript-config-style.css`: Contains the default CSS for the dialog.
2.  `userscript-config.js`: The core JavaScript library.

Simply include these files in your project. For a UserScript, you might use `@require` for the JS and `@resource` + `@grant GM_addStyle` for the CSS. It's preferable to also grant GM_setValue and GM_getValue functions (however, if you don't, the script uses localStorage for persistence).

### For UserScripts (Example)

```javascript
// ==UserScript==
// @name         My Settings Script
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A script with a configurable settings dialog.
// @author       Your Name
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @resource     DIALOG_CSS https://valid/URL/to/userscript-config-style.css
// @require      https://valid/URL/to/userscript-config.js
// ==/UserScript==

// Get CSS from resource and apply it
GM_addStyle(GM_getResourceText('DIALOG_CSS'));

// Your script logic here, then use UserScriptConfig
```

(Replace with the correct full URLs of both `userscript-config-style.css` and `userscript-config.js`)

## Usage

### 1\. Include the Library

Make sure `userscript-config.js` and `userscript-config-style.css` are loaded.

### 2\. Define Your Configuration

Create a JavaScript object that defines your dialog's structure and settings.

```javascript
const myConfig = {
    configId: 'myAwesomeScriptSettings', // Unique ID for localStorage
    headerText: 'My Script Settings',
    footerText: 'Version 1.0.0',
    dialogCSSClass: 'my-custom-dialog', // Optional: apply custom class to dialog container
    saveButtonText: 'Apply',
    cancelButtonText: 'Close',
    settings: [
        {
            id: 'enableFeatureA',
            labelText: 'Enable Feature A',
            type: 'checkbox',
            defaultValue: true,
            tooltip: 'Toggles the main feature on or off.'
        },
        {
            id: 'username',
            labelText: 'API Username',
            type: 'textbox',
            defaultValue: '',
            placeholder: 'Enter your API username',
            validationRegex: '^[a-zA-Z0-9_]{3,}$',
            errorMessage: 'Min 3 alphanumeric characters or underscore.',
            enabledIf: {
                otherElementId: 'enableFeatureA',
                value: true
            },
            groupId: 'apiSettings' // Assign to a group
        },
        {
            id: 'apiKey',
            labelText: 'API Key',
            type: 'password',
            defaultValue: '',
            placeholder: 'Paste your API key here',
            validationRegex: '^[A-F0-9]{32}$',
            errorMessage: 'Must be a 32-character hexadecimal string.',
            enabledIf: {
                otherElementId: 'enableFeatureA',
                value: true
            },
            groupId: 'apiSettings'
        },
        {
            id: 'notificationLevel',
            labelText: 'Notification Level',
            type: 'dropdown',
            defaultValue: 'medium',
            options: [
                { value: 'none', text: 'No Notifications' },
                { value: 'low', text: 'Low' },
                { value: 'medium', text: 'Medium' },
                { value: 'high', text: 'High (All Alerts)' }
            ],
            groupId: 'generalSettings'
        },
        {
            id: 'theme',
            labelText: 'Choose Theme',
            type: 'radio',
            defaultValue: 'dark',
            groupName: 'themeOptions', // Important for radio buttons
            options: [
                { value: 'light', text: 'Light Theme' },
                { value: 'dark', text: 'Dark Theme' },
                { value: 'system', text: 'System Default' }
            ],
            groupId: 'generalSettings'
        }
    ],
    groups: [
        {
            id: 'generalSettings',
            name: 'General Preferences',
            expanded: true // Default state: expanded
        },
        {
            id: 'apiSettings',
            name: 'API Configuration',
            expanded: false, // Default state: collapsed
            collapsedIf: {
                otherElementId: 'enableFeatureA',
                value: false // Collapse this group if 'enableFeatureA' is false
            }
        }
    ]
};

const myCallbacks = {
    onDialogOpened: () => console.log('Settings dialog opened!'),
    onDialogClosed: () => console.log('Settings dialog closed.'),
    onSettingsSaved: () => {
        console.log('Settings saved!');
        // Access updated values:
        console.log('All saved values:', settingsManager.getAllFieldValues());
        // You might want to re-apply settings to your script here
    },
    onSettingChanged: (id, newValue) => {
        console.log(`Setting '${id}' changed to:`, newValue);
        // Perform immediate action if needed
    },
    onSettingsLoaded: () => {
        console.log('Settings loaded from LocalStorage.');
        // Initial setup based on loaded settings
        const currentUsername = settingsManager.getFieldValue('username');
        console.log('Loaded Username:', currentUsername);
    }
};
```

### 3\. Initialize and Use

```javascript
// Create an instance of the settings manager
const settingsManager = new UserScriptConfig(myConfig, myCallbacks);

// Initialize the manager (reads from localStorage and sets defaults)
settingsManager.init();

// Later, when you want to open the dialog (e.g., on a button click)
function openMySettings() {
    settingsManager.openSettingsDialog();
}

// You can access settings values anytime
const isFeatureAEnabled = settingsManager.getFieldValue('enableFeatureA');
console.log('Is Feature A enabled?', isFeatureAEnabled);

// To get all values at once:
const allCurrentSettings = settingsManager.getAllFieldValues();
console.log('Current settings:', allCurrentSettings);
```

## Configuration Reference

### Main `config` Object

| Property            | Type     | Required | Description                                                              | Default                  |
| :------------------ | :------- | :------- | :----------------------------------------------------------------------- | :----------------------- |
| `configId`          | `string` | Yes      | A unique identifier for your script's settings. Used for namespacing LocalStorage keys (e.g., `myScript.settingId`). |                          |
| `headerText`        | `string` | No       | Text to display in the dialog's header.                                  |                          |
| `footerText`        | `string` | No       | Text to display in the dialog's footer.                                  |                          |
| `dialogCSSClass`    | `string` | No       | Custom CSS class for the main dialog container.                          | `usc-settings-dialog`        |
| `headerCSSClass`    | `string` | No       | Custom CSS class for the dialog header.                                  | `usc-dialog-header`          |
| `footerCSSClass`    | `string` | No       | Custom CSS class for the dialog footer.                                  | `usc-dialog-footer`          |
| `saveButtonText`    | `string` | No       | Text for the save button.                                                | `Save`                   |
| `saveButtonCSSClass`| `string` | No       | Custom CSS class for the save button.                                    | `usc-save-button`            |
| `cancelButtonText`  | `string` | No       | Text for the cancel button.                                              | `Cancel`                 |
| `cancelButtonCSSClass`| `string` | No       | Custom CSS class for the cancel button.                                  | `usc-cancel-button`          |
| `settings`          | `Array`  | Yes      | An array of setting objects. See [`settings` Array](https://www.google.com/search?q=%23settings-array).      |                          |
| `groups`            | `Array`  | No       | An array of group objects for organizing settings. See [`groups` Array](https://www.google.com/search?q=%23groups-array). |                          |

### `settings` Array

Each object in the `settings` array defines a single configurable option.

| Property           | Type                | Required | Description                                                                                                                                                                                                                                                                       | Default       |
| :----------------- | :------------------ | :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------ |
| `id`               | `string`            | Yes      | A unique identifier for the setting. Used for LocalStorage and accessing its value.                                                                                                                                                                                               |               |
| `labelText`        | `string`            | Yes      | The text displayed next to the input field in the dialog.                                                                                                                                                                                                                         |               |
| `type`             | `string`            | Yes      | The type of input element. Can be `textbox`, `password`, `checkbox`, `radio`, or `dropdown`.                                                                                                                                                                                    | `textbox`     |
| `defaultValue`     | `any`               | Yes      | The initial value for the setting if no value is found in LocalStorage. Must match the expected data type for the `type` (e.g., `boolean` for `checkbox`, `string` for others).                                                                                                   |               |
| `tooltip`          | `string`            | No       | Text to display as a tooltip when hovering over the setting row.                                                                                                                                                                                                                  |               |
| `inputCSSClass`    | `string`            | No       | Custom CSS class for the input element itself.                                                                                                                                                                                                                                    | `usc-setting-input` |
| `labelCSSClass`    | `string`            | No       | Custom CSS class for the label cell.                                                                                                                                                                                                                                              | `usc-setting-label` |
| `placeholder`      | `string`            | No       | Placeholder text for `textbox` and `password` types.                                                                                                                                                                                                                              |               |
| `validationRegex`  | `string`            | No       | A regular expression string used to validate `textbox` and `password` inputs. The input is valid if it matches the regex.                                                                                                                                                         |               |
| `errorMessage`     | `string`            | No       | The error message displayed below the input if `validationRegex` fails.                                                                                                                                                                                                           | `Invalid input` |
| `options`          | `Array<{value: string, text: string}>` | Conditionally Yes | **Required for `radio` and `dropdown` types.** An array of objects, each with a `value` (the actual value stored) and `text` (the display text).                                                                                                                |               |
| `groupName`        | `string`            | Conditionally Yes | **Required for `radio` types.** All radio buttons in a group must share the same `name` attribute. This property sets that `name`. If not provided, `setting.id` will be used as the `name`.                                                                            | `setting.id`  |
| `enabledIf`        | `Object`            | No       | An object defining conditional enablement: \<br/\>`{ otherElementId: string, value: any }`. \<br/\> The setting will only be enabled if the setting with `otherElementId` has the specified `value`. If disabled, it reverts to its `defaultValue`.                                     |               |
| `groupId`          | `string`            | No       | The `id` of a group (defined in the `groups` array) that this setting belongs to. Settings without a `groupId` are rendered outside of any group.                                                                                                                                  |               |

### `groups` Array

Each object in the `groups` array defines a collapsible section for settings.

| Property      | Type     | Required | Description                                                                                                                                                                                                                              | Default (`expanded`) |
| :------------ | :------- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------- |
| `id`          | `string` | Yes      | A unique identifier for the group. This `id` is referenced by `settings[].groupId`.                                                                                                                                                    |                      |
| `name`        | `string` | Yes      | The title displayed for the group header.                                                                                                                                                                                                |                      |
| `expanded`    | `boolean`| No       | The default expansion state of the group (`true` for expanded, `false` for collapsed) when the dialog opens, if no state is found in LocalStorage.                                                                                     | `true`               |
| `collapsedIf` | `Object` | No       | An object defining conditional collapsing: \<br/\>`{ otherElementId: string, value: any }`. \<br/\> The group will collapse if the setting with `otherElementId` has the specified `value`. It will expand otherwise. |                      |

## Callbacks

The `UserScriptConfig` constructor accepts an optional `callbacks` object with the following properties:

  * `onDialogOpened()`: Called immediately after the settings dialog is created and appended to the DOM.
  * `onDialogClosed()`: Called immediately after the settings dialog is removed from the DOM.
  * `onSettingsSaved()`: Called after the "Save" button is clicked and settings have been written to LocalStorage.
  * `onSettingChanged(id, newValue)`: Called whenever an input field's value changes (due to user interaction). `id` is the setting's ID, and `newValue` is its current value.
  * `onSettingsLoaded()`: Called after `init()` has read initial settings and group states from LocalStorage and populated the internal `values` and `groupStates` maps.

<!-- end list -->

```javascript
const myCallbacks = {
    onDialogOpened: () => {
        console.log('Dialog is now visible!');
    },
    onDialogClosed: () => {
        console.log('Dialog has been closed.');
    },
    onSettingsSaved: () => {
        console.log('Settings successfully saved to LocalStorage!');
        // Re-apply script logic based on new settings here
        // For example: myScript.applyNewSettings(settingsManager.getAllFieldValues());
    },
    onSettingChanged: (settingId, currentValue) => {
        console.log(`Setting '${settingId}' changed to:`, currentValue);
        // Live update UI elements based on this change
        if (settingId === 'enableFeatureA') {
            document.body.classList.toggle('feature-a-active', currentValue);
        }
    },
    onSettingsLoaded: () => {
        console.log('Initial settings loaded on startup.');
        // Perform actions based on settings available from init
        if (settingsManager.getFieldValue('darkMode')) {
            document.body.classList.add('dark-mode');
        }
    }
};

const settingsManager = new UserScriptConfig(myConfig, myCallbacks);
```

## Public Methods

  * `init()`: Initializes the settings manager. Reads values from LocalStorage and sets up default group states. **Must be called before `openSettingsDialog()` or accessing values.**
  * `openSettingsDialog()`: Creates, populates, and displays the modal settings dialog.
  * `closeDialog()`: Closes and removes the settings dialog from the DOM.
  * `setFieldValue(id, value)`: Updates a specific setting's value in the in-memory cache. Does not write to LocalStorage immediately.
  * `getFieldValue(id)`: Retrieves the current value of a specific setting from the in-memory cache.
  * `getAllFieldValues()`: Returns an object containing all setting IDs and their current values.
  * `readFromStore()`: Reads all settings and group states from LocalStorage and updates the in-memory cache.
  * `writeToStorage()`: Writes all current settings and group states from the in-memory cache to LocalStorage.
  * `resetToDefaults()`: Resets all settings (and group states) in the in-memory cache to their `defaultValue` as defined in the `config`. Does not write to LocalStorage immediately.
  * `isDialogOpen()`: Returns `true` if the settings dialog is currently open, `false` otherwise.
  * `isReady()`: Returns `true` if the settings manager has been initialized (`init()` called), `false` otherwise.

## Styling

The `userscript-config-style.css` file provides a comprehensive set of default styles for the dialog, its elements, inputs, and the new grouping feature. You can override these styles by providing your own CSS after importing the default, or by using the `*CSSClass` properties in your configuration.

Key CSS classes:

  * `.usc-usc-settings-dialog-overlay`: Full-screen background overlay.
  * `.usc-settings-dialog`: Main dialog container.
  * `.usc-dialog-header`: Header text.
  * `.usc-settings-table`: Table containing setting rows.
  * `.usc-setting-row`: Individual row for a setting.
  * `.usc-setting-label`: Cell containing the setting's label.
  * `.usc-setting-input-cell`: Cell containing the input element.
  * `.usc-setting-input`: General styling for all input types (textbox, password, checkbox, select).
  * `.usc-radio-group`, `.usc-radio-option`: Specific styles for radio button containers.
  * `.usc-invalid-input`: Applied to an input field when validation fails.
  * `.usc-validation-error`: Container for validation error messages.
  * `.usc-dialog-footer`: Dialog footer.
  * `.usc-save-button`, `.usc-cancel-button`: Styles for action buttons.
  * `.usc-settings-group`: Container for a collapsible group.
  * `.usc-settings-group-header`: Clickable header for a group.
  * `.usc-settings-group-toggle`: Span containing the toggle icon (up/down arrow).
  * `.usc-settings-group-content`: Collapsible content area of a group.
  * `.usc-settings-group-content.expanded`: Class added when the group content is expanded.
