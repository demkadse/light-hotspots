const EVENTS_PATH = "/events/data/";

async function loadIndex(){

const res = await fetch(`${EVENTS_PATH}index.json`);
const data = await res.json();

return data.events;

}

async function loadEvent(file){

try{

const res = await fetch(`${EVENTS_PATH}${file}`);

if(!res.ok){
console.warn("Eventdatei fehlt:",file);
return null;
}

return await res.json();

}catch(e){

console.warn("Fehler beim Laden:",file);

return null;

}

}