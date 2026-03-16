const EVENTS_PATH = "events/data/";

let eventIndex = null;
const eventCache = new Map();

async function loadIndex(){

if(eventIndex) return eventIndex;

try{

const res = await fetch(`${EVENTS_PATH}index.json`);

if(!res.ok){
console.error("index.json konnte nicht geladen werden");
return [];
}

const data = await res.json();

eventIndex = data.events;

return eventIndex;

}catch(e){

console.error("Fehler beim Laden der index.json",e);
return [];

}

}

async function loadEvent(file){

if(eventCache.has(file)){
return eventCache.get(file);
}

try{

const res = await fetch(`${EVENTS_PATH}${file}`);

if(!res.ok){
console.warn("Eventdatei fehlt:",file);
return null;
}

const data = await res.json();

eventCache.set(file,data);

return data;

}catch(e){

console.warn("Fehler beim Laden:",file);

return null;

}

}