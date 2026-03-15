let ease = 0.1;
let currentScroll = 0;
let targetScroll = window.pageYOffset;
let previousScroll = 0;
let isScrolling = false;

function limitScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
}

document.addEventListener("wheel", (e) => {
  targetScroll += e.deltaY;
  limitScroll();
  if (!isScrolling) {
    requestAnimationFrame(updateScroll);
    isScrolling = true;
  }
});

function updateScroll() {
  currentScroll += (targetScroll - currentScroll) * ease;
  if (Math.abs(currentScroll - previousScroll) > 0.5) {
    window.scrollTo(0, currentScroll);
    previousScroll = currentScroll;
    requestAnimationFrame(updateScroll);
  } else {
    isScrolling = false;
  }
}
