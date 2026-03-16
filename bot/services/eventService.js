import { commitFile } from "./github.js";
import { CONFIG } from "../config/config.js";

export async function createEvent(event){

const date = event.date;

const [year,month] = date.split("-");

const fileName = `${event.id}.json`;

const path = `${CONFIG.EVENT_DATA_PATH}/${year}/${month}/${fileName}`;

const content = JSON.stringify(event,null,2);

await commitFile(

path,
content,
`Add event: ${event.title}`

);

}