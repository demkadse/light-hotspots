const discordInviteUrl = window.SITE_CONFIG?.discordInviteUrl || "#";

const handbookDiscordCta = document.getElementById("handbook-discord-cta");
const handbookFooterDiscord = document.getElementById("handbook-footer-discord");
const tocToggle = document.getElementById("handbook-toc-toggle");
const toc = document.getElementById("handbook-toc");
const tocLinks = [...document.querySelectorAll(".handbook-toc-link")];
const sections = tocLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (handbookDiscordCta) {
  handbookDiscordCta.href = discordInviteUrl;
}

if (handbookFooterDiscord) {
  handbookFooterDiscord.href = discordInviteUrl;
}

function setActiveTocLink(id) {
  tocLinks.forEach(link => {
    const isActive = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

if (tocToggle && toc) {
  tocToggle.addEventListener("click", () => {
    const isOpen = toc.classList.toggle("open");
    tocToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

tocLinks.forEach(link => {
  link.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 980px)").matches && toc && tocToggle) {
      toc.classList.remove("open");
      tocToggle.setAttribute("aria-expanded", "false");
    }
  });
});

if (sections.length > 0) {
  const observer = new IntersectionObserver(entries => {
    const visibleEntries = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (visibleEntries.length === 0) {
      return;
    }

    setActiveTocLink(visibleEntries[0].target.id);
  }, {
    rootMargin: "-15% 0px -60% 0px",
    threshold: [0.15, 0.35, 0.6]
  });

  sections.forEach(section => observer.observe(section));
  setActiveTocLink(sections[0].id);
}
