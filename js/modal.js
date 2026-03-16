const modal = document.getElementById("event-modal");
const modalContent = document.getElementById("modal-content");

function openModal(event){

modalContent.innerHTML = `

<img src="${event.image}" style="width:100%">

<h2>${event.title}</h2>

<p><b>Venue:</b> ${event.venue}</p>

<p><b>Host:</b> ${event.host}</p>

<p>${event.date} ${event.start_time}${event.end_time ? " - "+event.end_time : ""}</p>

<p>${event.description}</p>

`;

modal.classList.add("active");

}

function closeModal(){

modal.classList.remove("active");

}

document.getElementById("modal-close").onclick = closeModal;
document.querySelector(".modal-overlay").onclick = closeModal;