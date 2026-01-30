console.log("[Atlas] Vite entry loaded");
document.documentElement.setAttribute("data-vite-entry", "1");
window.addEventListener("load", () => {
  const e = document.getElementById("log-output");
  e && (e.innerHTML = "<div style='color:#22c55e'>[Atlas] Vite entry loaded ✅</div>" + e.innerHTML);
});
