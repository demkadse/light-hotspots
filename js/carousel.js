async function createCarousel(date){

const track = document.createElement("div");
track.className="carousel-track";

const index = await getIndex();

const target = formatDate(date);

for(const entry of index){

if(entry.date === target){

const event = await getEvent(entry.file);

const card = buildCard(event);

track.appendChild(card);

}

}

return track;

}

function buildCard(event){

const card = document.createElement("div");
card.className="event-card";

card.innerHTML = `

<img class="event-image" src="${event.image}">

<div class="event-info">

<h3>${event.title}</h3>

<p>${event.start_time}${event.end_time ? " - "+event.end_time : ""}</p>

<p>${event.host}</p>

</div>

`;

card.onclick = ()=> openModal(event);

return card;

}

function formatDate(date){

return date.getFullYear() + "-" +

String(date.getMonth()+1).padStart(2,"0") + "-" +

String(date.getDate()).padStart(2,"0");

}