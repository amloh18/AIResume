// Service Worker for Push Notifications
// This file handles push notifications in the browser

self.addEventListener('push', function(event) {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification', body: event.data.text() };
    }
  }

  const options = {
    title: data.title || 'CVCircle Notification',
    body: data.message || data.body || 'You have a new notification',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: data.notificationId || 'notification',
    data: data,
    requireInteraction: data.priority === 'urgent',
    actions: data.actionType ? [
      {
        action: data.actionType,
        title: data.actionTitle || 'View Details',
      }
    ] : [],
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/dashboard';

  event.waitUntil(
    clients.openWindow(url)
  );
});

self.addEventListener('notificationclose', function(event) {
  // Handle notification close if needed
  console.log('Notification closed:', event.notification.tag);
});

