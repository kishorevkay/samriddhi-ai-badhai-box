// "Mobile view" for reviewers (Gaurav): one link, two views.
// ?device=mobile renders the site inside a phone-sized frame; ?frame=1 is the page running inside that frame.
(function(){
  var p = new URLSearchParams(location.search);
  if (p.get("frame") === "1") { window.__IN_FRAME = true; return; }
  if (p.get("screens") === "1") return; // static screens page for Figma: no toggle
  var narrow = matchMedia("(max-width: 640px), (pointer: coarse)").matches;
  if (p.get("device") === "mobile" && narrow) { location.replace(location.pathname); return; } // already on a phone
  if (p.get("device") === "mobile") {
    window.__DEVICE_WRAP = true;
    document.documentElement.classList.add("device-mode");
    document.body.innerHTML =
      '<div class="device-wrap">' +
        '<a class="view-toggle" href="' + location.pathname + '">🖥 Desktop view</a>' +
        '<div class="phone"><iframe title="Mobile view of the site" src="?frame=1"></iframe></div>' +
        '<p class="device-note">390 × 844 · iPhone 14-size preview</p>' +
      '</div>';
    return;
  }
  if (narrow) return; // real phones see the phone layout already; no toggle
  var a = document.createElement("a");
  a.className = "view-toggle"; a.href = "?device=mobile"; a.textContent = "📱 Mobile view";
  document.body.appendChild(a);
})();
