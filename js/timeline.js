let currentSlide = 0;
let days = [];
let scrollLocked = false;

function generateTimelineDays(){

const today = new Date();

for(let i=0;i<14;i++){

const d = new Date(today);
d.setDate(today.getDate()+i);

days.push(d);

}

}

async function buildTimeline(){

generateTimelineDays();

const track = document.getElementById("timeline-track");

for(const day of days){

const slide = document.createElement("section");
slide.className="day-slide";

const header = document.createElement("div");
header.className="day-header";

header.innerHTML =
`<h2>${day.toLocaleDateString("de-DE",
{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</h2>`;

slide.appendChild(header);

const carousel = createCarousel(day);

slide.appendChild(carousel);

track.appendChild(slide);

}

}

function updateSlide(){

const track = document.getElementById("timeline-track");

track.style.transform = `translateY(-${currentSlide*100}vh)`;

}

function nextDay(){

if(currentSlide<days.length-1){

currentSlide++;
updateSlide();

}

}

function previousDay(){

if(currentSlide>0){

currentSlide--;
updateSlide();

}

}

document.addEventListener("wheel",e=>{

if(scrollLocked) return;

scrollLocked = true;

if(e.deltaY>0){
nextDay();
}else{
previousDay();
}

setTimeout(()=>{
scrollLocked=false;
},400);

});

buildTimeline();