const { ACTIONS, RESOURCES } = require('./rbac');

/**
 * Permission Validator
 * Validiert Permission-Strings und Resource-Action-Kombinationen
 */

/**
 * Validiert ein Permission-String im Format "resource.action"
 * @param {string} permission - Permission-String (z.B. "patient.read")
 * @returns {Object} { valid: boolean, error?: string, resource?: string, action?: string }
 */
function validatePermissionString(permission) {
  if (!permission || typeof permission !== 'string') {
    return { valid: false, error: 'Permission muss ein String sein' };
  }

  // Prüfe Format: resource.action
  const parts = permission.split('.');
  if (parts.length !== 2) {
    return { 
      valid: false, 
      error: `Permission muss im Format "resource.action" sein, erhalten: "${permission}"` 
    };
  }

  const [resource, action] = parts;

  // Validiere Resource
  const validResources = Object.values(RESOURCES);
  if (!validResources.includes(resource)) {
    return { 
      valid: false, 
      error: `Ungültige Resource: "${resource}". Gültige Resources: ${validResources.join(', ')}`,
      resource,
      action
    };
  }

  // Validiere Action
  const validActions = Object.values(ACTIONS);
  if (!validActions.includes(action) && action !== '*') {
    return { 
      valid: false, 
      error: `Ungültige Action: "${action}". Gültige Actions: ${validActions.join(', ')}`,
      resource,
      action
    };
  }

  return { 
    valid: true, 
    resource, 
    action 
  };
}

/**
 * Validiert mehrere Permission-Strings
 * @param {string[]} permissions - Array von Permission-Strings
 * @returns {Object} { valid: boolean, errors?: string[], validPermissions?: string[] }
 */
function validatePermissionStrings(permissions) {
  if (!Array.isArray(permissions)) {
    return { valid: false, errors: ['Permissions müssen ein Array sein'] };
  }

  const errors = [];
  const validPermissions = [];

  for (const permission of permissions) {
    const result = validatePermissionString(permission);
    if (!result.valid) {
      errors.push(result.error);
    } else {
      validPermissions.push(permission);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    validPermissions: validPermissions.length > 0 ? validPermissions : undefined
  };
}

/**
 * Validiert eine Resource-Action-Kombination
 * @param {string} resource - Resource-Name
 * @param {string} action - Action-Name
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateResourceAction(resource, action) {
  // Validiere Resource
  const validResources = Object.values(RESOURCES);
  if (!validResources.includes(resource)) {
    return { 
      valid: false, 
      error: `Ungültige Resource: "${resource}". Gültige Resources: ${validResources.join(', ')}` 
    };
  }

  // Validiere Action
  const validActions = Object.values(ACTIONS);
  if (!validActions.includes(action) && action !== '*') {
    return { 
      valid: false, 
      error: `Ungültige Action: "${action}". Gültige Actions: ${validActions.join(', ')}` 
    };
  }

  return { valid: true };
}

/**
 * Validiert Custom Permissions Objekt
 * @param {Object} customPermissions - Custom Permissions Array
 * @returns {Object} { valid: boolean, errors?: string[] }
 */
function validateCustomPermissions(customPermissions) {
  if (!Array.isArray(customPermissions)) {
    return { valid: false, errors: ['Custom Permissions müssen ein Array sein'] };
  }

  const errors = [];

  for (const cp of customPermissions) {
    // Prüfe erforderliche Felder
    if (!cp.resource || typeof cp.resource !== 'string') {
      errors.push('Custom Permission muss ein "resource" Feld (String) haben');
      continue;
    }

    if (!cp.actions || !Array.isArray(cp.actions)) {
      errors.push('Custom Permission muss ein "actions" Feld (Array) haben');
      continue;
    }

    // Validiere Resource
    const validResources = Object.values(RESOURCES);
    if (!validResources.includes(cp.resource)) {
      errors.push(`Ungültige Resource in Custom Permission: "${cp.resource}"`);
      continue;
    }

    // Validiere Actions
    const validActions = Object.values(ACTIONS);
    for (const action of cp.actions) {
      if (!validActions.includes(action) && action !== '*') {
        errors.push(`Ungültige Action in Custom Permission: "${action}"`);
      }
    }

    // Validiere resourceId (falls vorhanden)
    if (cp.resourceId !== undefined && cp.resourceId !== null) {
      // Prüfe ob resourceId ein gültiger ObjectId-String ist
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(cp.resourceId)) {
        errors.push(`Ungültige resourceId in Custom Permission: "${cp.resourceId}"`);
      }
    }

    // Validiere expiresAt (falls vorhanden)
    if (cp.expiresAt !== undefined && cp.expiresAt !== null) {
      const expiresAt = cp.expiresAt instanceof Date ? cp.expiresAt : new Date(cp.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        errors.push(`Ungültiges expiresAt in Custom Permission: "${cp.expiresAt}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validiert Role Permissions Objekt
 * @param {Object} rolePermissions - Role Permissions Objekt (Resource -> Actions[])
 * @returns {Object} { valid: boolean, errors?: string[] }
 */
function validateRolePermissions(rolePermissions) {
  if (!rolePermissions || typeof rolePermissions !== 'object') {
    return { valid: false, errors: ['Role Permissions müssen ein Objekt sein'] };
  }

  const errors = [];
  const validResources = Object.values(RESOURCES);
  const validActions = Object.values(ACTIONS);

  for (const [resource, actions] of Object.entries(rolePermissions)) {
    // Wildcard für alle Resources erlauben
    if (resource === '*') {
      if (!Array.isArray(actions)) {
        errors.push('Wildcard Resource "*" muss ein Array von Actions haben');
        continue;
      }
      // Validiere Actions
      for (const action of actions) {
        if (!validActions.includes(action) && action !== '*') {
          errors.push(`Ungültige Action in Wildcard Resource: "${action}"`);
        }
      }
      continue;
    }

    // Validiere Resource
    if (!validResources.includes(resource)) {
      errors.push(`Ungültige Resource in Role Permissions: "${resource}"`);
      continue;
    }

    // Validiere Actions
    if (!Array.isArray(actions)) {
      errors.push(`Actions für Resource "${resource}" müssen ein Array sein`);
      continue;
    }

    for (const action of actions) {
      if (!validActions.includes(action) && action !== '*') {
        errors.push(`Ungültige Action "${action}" für Resource "${resource}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Normalisiert Permission-String (Plural zu Singular)
 * @param {string} permission - Permission-String
 * @returns {string} Normalisierter Permission-String
 */
function normalizePermissionString(permission) {
  if (!permission || typeof permission !== 'string') {
    return permission;
  }

  const pluralToSingular = {
    'patients': 'patient',
    'appointments': 'appointment',
    'documents': 'document',
    'services': 'service',
    'locations': 'location',
    'users': 'user',
    'diagnoses': 'diagnosis',
    'prescriptions': 'prescription',
    'billings': 'billing',
    'roles': 'role',
    'templates': 'template',
    'staffs': 'staff',
    'settings': 'settings', // Bleibt Plural
    'reports': 'reports', // Bleibt Plural
    'bookings': 'appointment' // Wird zu appointment
  };

  const parts = permission.split('.');
  if (parts.length === 2) {
    const [resource, action] = parts;
    const normalizedResource = pluralToSingular[resource] || resource;
    return `${normalizedResource}.${action}`;
  }

  return permission;
}

/**
 * Normalisiert Array von Permission-Strings
 * @param {string[]} permissions - Array von Permission-Strings
 * @returns {string[]} Array von normalisierten Permission-Strings
 */
function normalizePermissionStrings(permissions) {
  if (!Array.isArray(permissions)) {
    return permissions;
  }

  return permissions.map(normalizePermissionString);
}

module.exports = {
  validatePermissionString,
  validatePermissionStrings,
  validateResourceAction,
  validateCustomPermissions,
  validateRolePermissions,
  normalizePermissionString,
  normalizePermissionStrings
};
