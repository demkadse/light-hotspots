const DATA_PATH = "events/data/";

let indexCache = null;
const eventCache = new Map();

async function getIndex(){

if(indexCache) return indexCache;

const res = await fetch(DATA_PATH + "index.json");

const data = await res.json();

indexCache = data.events;

return indexCache;

}

async function getEvent(file){

if(eventCache.has(file)){

return eventCache.get(file);

}

const res = await fetch(DATA_PATH + file);

const data = await res.json();

eventCache.set(file,data);

return data;

}