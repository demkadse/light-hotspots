export function validateEvent(event){

const required = [

"title",
"type",
"venue",
"host",
"date",
"start_time"

];

for(const field of required){

if(!event[field]){

throw new Error(`Missing field: ${field}`);

}

}

return true;

}