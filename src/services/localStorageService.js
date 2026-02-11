/**
 * LocalStorage Service for Form Data Persistence
 * Provides utilities to save, load, and clear form data across the application
 */

const FORM_KEYS = {
    LEADS: 'form_leads',
    NEW_CALL_TRACKER: 'form_newCallTracker',
    NEW_FOLLOW_UP: 'form_newFollowUp',
    CALL_TRACKER_FORM: 'form_callTrackerForm',
    OUTGOING_LEADS: 'outgoing_leads_table',
    OUTGOING_LEADS_COUNTER: 'outgoing_leads_counter'
}

/**
 * Save form data to localStorage
 * @param {string} formKey - The key to identify the form
 * @param {object} data - The form data to save
 */
export const saveFormData = (formKey, data) => {
    try {
        localStorage.setItem(formKey, JSON.stringify(data))
    } catch (error) {
        console.error('Error saving form data to localStorage:', error)
    }
}

/**
 * Load form data from localStorage
 * @param {string} formKey - The key to identify the form
 * @returns {object|null} - The saved form data or null if not found
 */
export const loadFormData = (formKey) => {
    try {
        const data = localStorage.getItem(formKey)
        return data ? JSON.parse(data) : null
    } catch (error) {
        console.error('Error loading form data from localStorage:', error)
        return null
    }
}

/**
 * Clear form data from localStorage
 * @param {string} formKey - The key to identify the form
 */
export const clearFormData = (formKey) => {
    try {
        localStorage.removeItem(formKey)
    } catch (error) {
        console.error('Error clearing form data from localStorage:', error)
    }
}

/**
 * Clear all form data from localStorage
 */
export const clearAllFormData = () => {
    try {
        Object.values(FORM_KEYS).forEach(key => {
            localStorage.removeItem(key)
        })
    } catch (error) {
        console.error('Error clearing all form data from localStorage:', error)
    }
}

export { FORM_KEYS }
