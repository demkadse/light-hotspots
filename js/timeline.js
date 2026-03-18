let slideIndex = 0;
let days = [];
let touchStartY = null;

function buildDays() {
  days = [];
  const today = new Date();

  for (let index = 0; index < 14; index += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    days.push(day);
  }
}

function updateSlide() {
  const track = document.getElementById("timeline-track");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile) {
    track.style.transform = "";
    return;
  }

  track.style.transform = `translateY(-${slideIndex * (window.innerHeight - 92)}px)`;
}

function changeSlide(direction) {
  const nextIndex = Math.min(
    Math.max(slideIndex + direction, 0),
    Math.max(days.length - 1, 0)
  );

  if (nextIndex === slideIndex) {
    return;
  }

  slideIndex = nextIndex;
  updateSlide();
}

async function renderTimeline() {
  buildDays();

  const track = document.getElementById("timeline-track");
  track.replaceChildren();
  slideIndex = 0;

  for (const day of days) {
    const slide = document.createElement("section");
    slide.className = "day-slide";

    const header = document.createElement("div");
    header.className = "day-header";

    const title = document.createElement("h2");
    title.textContent = day.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    header.appendChild(title);
    slide.appendChild(header);
    slide.appendChild(await createCarousel(day));
    track.appendChild(slide);
  }

  updateSlide();
}

document.getElementById("nav-prev").addEventListener("click", () => changeSlide(-1));
document.getElementById("nav-next").addEventListener("click", () => changeSlide(1));

document.addEventListener("wheel", event => {
  if (window.matchMedia("(max-width: 768px)").matches) {
    return;
  }

  if (event.deltaY > 0) {
    changeSlide(1);
  } else if (event.deltaY < 0) {
    changeSlide(-1);
  }
}, { passive: true });

document.addEventListener("keydown", event => {
  if (event.key === "ArrowDown" || event.key === "PageDown") {
    changeSlide(1);
  }

  if (event.key === "ArrowUp" || event.key === "PageUp") {
    changeSlide(-1);
  }
});

document.addEventListener("touchstart", event => {
  touchStartY = event.touches[0]?.clientY ?? null;
}, { passive: true });

document.addEventListener("touchend", event => {
  if (touchStartY === null || window.matchMedia("(max-width: 768px)").matches) {
    touchStartY = null;
    return;
  }

  const endY = event.changedTouches[0]?.clientY ?? touchStartY;
  const deltaY = touchStartY - endY;

  if (Math.abs(deltaY) > 40) {
    changeSlide(deltaY > 0 ? 1 : -1);
  }

  touchStartY = null;
}, { passive: true });

window.addEventListener("resize", updateSlide);

void renderTimeline();
