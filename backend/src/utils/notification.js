import { Notification } from "../model/notification.models.js";

export function sendNotification(recipient, sender, project, type, message) {
  if (String(recipient) === String(sender)) return;
  Notification.create({ recipient, sender, project, type, message }).catch((err) =>
    console.error("[notification]", err.message),
  );
}
