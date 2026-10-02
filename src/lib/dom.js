// Page scroll lives inside the app-shell scroller (#ascend-scroll), not the
// window — the document itself never scrolls, so iOS standalone mode cannot
// misposition viewport-anchored UI. window.scrollTo stays as the fallback.
export const scrollPageTop = () => {
  const sc = document.getElementById("ascend-scroll");
  if (sc) sc.scrollTop = 0;
  else window.scrollTo?.(0, 0);
};
