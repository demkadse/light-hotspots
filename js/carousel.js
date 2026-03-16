function createCarousel(date){

const container = document.createElement("div");
container.className="events-carousel";

const viewport = document.createElement("div");
viewport.className="carousel-viewport";

const track = document.createElement("div");
track.className="carousel-track";

viewport.appendChild(track);
container.appendChild(viewport);

loadEventsForDate(date,track);

return container;

}

async function loadEventsForDate(date,track){

const index = await loadIndex();

const target =
date.getFullYear() + "-" +
String(date.getMonth()+1).padStart(2,"0") + "-" +
String(date.getDate()).padStart(2,"0");

for(const entry of index){

if(entry.date === target){

const event = await loadEvent(entry.file);

if(event){

track.appendChild(createEventCard(event));

}

}

}

}