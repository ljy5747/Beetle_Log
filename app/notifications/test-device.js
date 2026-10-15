/* Browser notification smoke test and concise daily summary formatter. */
function beetleNotificationSummary(items) {
  const tasks = (Array.isArray(items) ? items : []).map(x => String(x || "").trim()).filter(Boolean);
  if (!tasks.length) return "예정된 할 일이 없습니다.";
  if (tasks.length > 3) return tasks.length + "건 해야 합니다.";
  return tasks.map(x => x + " 해야 합니다.").join("\n");
}
async function beetleTestDeviceNotification() {
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !window.isSecureContext) {
    throw new Error("이 브라우저는 알림을 지원하지 않아요.");
  }
  // iOS Safari: installed Home Screen web app is required for notification permission.
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !window.navigator.standalone && !window.matchMedia("(display-mode: standalone)").matches) {
    throw new Error("아이폰에서는 Safari 공유 → 홈 화면에 추가 후 BeetleLog 앱에서 실행해주세요.");
  }
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("기기의 알림 권한이 허용되지 않았어요.");
  const reg = await navigator.serviceWorker.register("./push-sw.js", {scope:"./"});
  await navigator.serviceWorker.ready;
  await reg.showNotification("BeetleLog 테스트 알림", {
    body: "알림 표시 테스트에 성공했습니다. 서버 푸시 발송은 아직 연결 전입니다.",
    icon:"./icons/app-icon-180.png",
    tag:"beetlelog-device-test",
    data:{url:"./index.html"}
  });
}
