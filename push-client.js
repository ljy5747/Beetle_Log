/* BeetleLog Web Push client foundation.
 * No automatic permission prompts. Call subscribe() only from a user click.
 * This module is NOT wired into index.html yet.
 */
window.BeetleLogPush = (() => {
  function supported() {
    return "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      window.isSecureContext;
  }

  async function registerWorker() {
    if (!supported()) throw new Error("이 환경에서는 웹 푸시를 지원하지 않습니다.");
    return navigator.serviceWorker.register("./push-sw.js", { scope: "./" });
  }

  function base64UrlToUint8Array(base64Url) {
    const padded = base64Url.padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  async function subscribe(vapidPublicKey) {
    if (!vapidPublicKey || typeof vapidPublicKey !== "string") {
      throw new Error("VAPID 공개키가 설정되지 않았습니다.");
    }
    if (!supported()) throw new Error("이 환경에서는 웹 푸시를 지원하지 않습니다.");
    // Invoked by a click handler so iOS receives the required user activation.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("알림 권한이 허용되지 않았습니다.");
    const registration = await registerWorker();
    const ready = await navigator.serviceWorker.ready;
    let subscription = await ready.pushManager.getSubscription();
    if (!subscription) {
      subscription = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
      });
    }
    // Caller must submit this object to an authenticated server endpoint.
    return subscription.toJSON();
  }

  async function unsubscribe() {
    if (!supported()) return false;
    const registration = await navigator.serviceWorker.getRegistration("./");
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    // Backend subscription removal must be done separately BEFORE calling this.
    return subscription.unsubscribe();
  }

  return { supported, registerWorker, subscribe, unsubscribe };
})();