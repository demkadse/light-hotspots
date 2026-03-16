let slideIndex = 0;
let days = [];

function buildDays(){

const today = new Date();

for(let i=0;i<14;i++){

const d = new Date(today);

d.setDate(today.getDate()+i);

days.push(d);

}

}

async function renderTimeline(){

buildDays();

const track = document.getElementById("timeline-track");

for(const day of days){

const slide = document.createElement("section");
slide.className="day-slide";

const header = document.createElement("div");
header.className="day-header";

header.innerHTML = `<h2>${day.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</h2>`;

slide.appendChild(header);

const carousel = await createCarousel(day);

slide.appendChild(carousel);

track.appendChild(slide);

}

}

function updateSlide(){

const track = document.getElementById("timeline-track");

track.style.transform = `translateY(-${slideIndex*100}vh)`;

}

document.addEventListener("wheel",(e)=>{

if(e.deltaY>0){

if(slideIndex<days.length-1){

slideIndex++;

updateSlide();

}

}else{

if(slideIndex>0){

slideIndex--;

updateSlide();

}

}

});

renderTimeline();