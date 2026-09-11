/**
 * Utilidades para manejar el almacenamiento de información del cliente en localStorage
 */

/**
 * Obtiene la clave de almacenamiento para un token público de cliente
 * @param {string} customerToken - Token público del cliente
 * @returns {string} Clave de almacenamiento
 */
export const getStorageKey = (customerToken) => `customer_info_${customerToken}`

/**
 * Guarda la información del cliente en localStorage
 * @param {string} customerToken - Token público del cliente
 * @param {object} data - Datos de la respuesta de la API
 */
export const saveCustomerInfoToStorage = (customerToken, data) => {
  try {
    const storageKey = getStorageKey(customerToken)
    const dataToStore = {
      data: data,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(storageKey, JSON.stringify(dataToStore))
    console.log('Datos guardados en localStorage para customer')
    return true
  } catch (error) {
    console.error('Error al guardar en localStorage:', error)
    return false
  }
}

/**
 * Obtiene la información del cliente desde localStorage
 * @param {string} customerToken - Token público del cliente
 * @returns {object|null} Datos almacenados o null si no existen
 */
export const getCustomerInfoFromStorage = (customerToken) => {
  try {
    const storageKey = getStorageKey(customerToken)
    const storedData = localStorage.getItem(storageKey)
    if (storedData) {
      return JSON.parse(storedData)
    }
    return null
  } catch (error) {
    console.error('Error al leer de localStorage:', error)
    return null
  }
}

/**
 * Obtiene solo los datos del cliente sin el timestamp
 * @param {string} customerToken - Token público del cliente
 * @returns {object|null} Datos del cliente o null si no existen
 */
export const getCustomerData = (customerToken) => {
  const stored = getCustomerInfoFromStorage(customerToken)
  return stored ? stored.data : null
}

/**
 * Elimina la información del cliente de localStorage
 * @param {string} customerToken - Token público del cliente
 */
export const removeCustomerInfoFromStorage = (customerToken) => {
  try {
    const storageKey = getStorageKey(customerToken)
    localStorage.removeItem(storageKey)
    console.log('Datos eliminados de localStorage para customer')
    return true
  } catch (error) {
    console.error('Error al eliminar de localStorage:', error)
    return false
  }
}

/**
 * Verifica si hay datos almacenados para un cliente
 * @param {string} customerToken - Token público del cliente
 * @returns {boolean} true si hay datos almacenados
 */
export const hasStoredCustomerInfo = (customerToken) => {
  const stored = getCustomerInfoFromStorage(customerToken)
  return stored !== null && stored.data !== undefined
}












