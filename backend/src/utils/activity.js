import { Activity } from "../model/activity.models.js";

/**
 * Fire-and-forget activity logger. Errors are printed to stderr but never
 * propagate to the caller so a logging failure never breaks the main request.
 */
export function logActivity(actor, action, project, resourceType = null, resourceId = null, metadata = null) {
  Activity.create({ actor, action, project, resourceType, resourceId, metadata }).catch((err) =>
    console.error("[activity]", err.message),
  );
}
