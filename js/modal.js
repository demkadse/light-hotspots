function createEventCard(event){

const card = document.createElement("div");
card.className="event-card";

card.innerHTML=`

<img class="event-image" src="${event.image}">

<div class="event-info">

<h3>${event.title}</h3>

<p>${event.date}</p>

<p>${event.start_time}${event.end_time?` - ${event.end_time}`:''}</p>

<p>${event.host}</p>

</div>

`;

card.onclick = ()=>openModal(event);

return card;

}

function openModal(event){

const modal = document.getElementById("event-modal");
const content = document.getElementById("modal-content");

content.innerHTML=`

<img src="${event.image}" style="width:100%">

<h2>${event.title}</h2>

<p><b>Venue:</b> ${event.venue}</p>

<p><b>Host:</b> ${event.host}</p>

<p>${event.date} ${event.start_time}${event.end_time?` - ${event.end_time}`:''}</p>

<p>${event.description}</p>

`;

modal.classList.remove("hidden");

}

const closeButton = document.getElementById("modal-close");
const overlay = document.querySelector(".modal-overlay");

if(closeButton){
closeButton.onclick = ()=>{

document.getElementById("event-modal").classList.add("hidden");

};
}

if(overlay){
overlay.onclick = ()=>{

document.getElementById("event-modal").classList.add("hidden");

};
}