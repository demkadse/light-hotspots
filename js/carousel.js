async function createCarousel(date){

const track = document.createElement("div");
track.className="carousel-track";

const index = await getIndex();

const target = formatDate(date).trim();

let foundEvents = false;

for(const entry of index){

const entryDate = normalizeDate(entry.date).trim();

if(entryDate === target){

foundEvents = true;

const event = await getEvent(entry.file);

const card = buildCard(event);

track.appendChild(card);

}

}

/* FALLBACK */

if(!foundEvents){

const emptyCard = buildEmptyCard();

track.appendChild(emptyCard);

}

return track;

}

function buildCard(event){

const card = document.createElement("div");
card.className="event-card";

const image = document.createElement("img");
image.className = "event-image";
image.src = event.image || "";
image.alt = event.title || "Eventbild";

const info = document.createElement("div");
info.className = "event-info";

const title = document.createElement("h3");
title.textContent = event.title || "Unbenannt";

const time = document.createElement("p");
time.textContent = event.start_time || event.time || "Keine Zeit";

const host = document.createElement("p");
host.textContent = event.host || event.created_by || "Unbekannt";

info.appendChild(title);
info.appendChild(time);
info.appendChild(host);

card.appendChild(image);
card.appendChild(info);

card.onclick = ()=> openModal(event);

return card;

}

function buildEmptyCard(){

const card = document.createElement("div");

card.className="event-card";

const info = document.createElement("div");
info.className = "event-info";
info.style.height = "100%";
info.style.display = "flex";
info.style.flexDirection = "column";
info.style.justifyContent = "center";
info.style.alignItems = "center";
info.style.textAlign = "center";

const title = document.createElement("h3");
title.textContent = "Keine Events eingetragen";

const text = document.createElement("p");
text.textContent = "Erstell DEINS über den Discord-Bot!";

info.appendChild(title);
info.appendChild(text);

const inviteUrl = window.SITE_CONFIG?.discordInviteUrl;

if (inviteUrl) {
const link = document.createElement("a");
link.href = inviteUrl;
link.target = "_blank";
link.rel = "noreferrer noopener";
link.textContent = "Discord Server";
info.appendChild(link);
}

card.appendChild(info);

return card;

}

function formatDate(date){

return date.getFullYear() + "-" +

String(date.getMonth()+1).padStart(2,"0") + "-" +

String(date.getDate()).padStart(2,"0");

}

function normalizeDate(d){

if(!d) return "";

d = d.trim();

if(d.includes(".")){
const [day, month, year] = d.split(".");
return `${year}-${month}-${day}`;
}

return d;

}
