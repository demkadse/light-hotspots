import { Client, GatewayIntentBits } from "discord.js";
import { CONFIG } from "./config/config.js";
import { createEvent } from "./services/eventService.js";
import { validateEvent } from "./validators/eventValidator.js";

const client = new Client({

intents: [GatewayIntentBits.Guilds]

});

client.once("ready",()=>{

console.log(`Bot online: ${client.user.tag}`);

});

client.on("interactionCreate", async interaction=>{

if(!interaction.isChatInputCommand()) return;

if(interaction.commandName === "testevent"){

const event = {

id:"test-event",

title:"Test Event",

type:"open-rp",

venue:"Test Venue",

host:"Test Host",

date:"2026-03-20",

start_time:"20:00",

image:"https://placehold.co/600x400",

description:"Test Event",

links:[]

};

try{

validateEvent(event);

await createEvent(event);

await interaction.reply("Event erstellt und ins Repo committed.");

}catch(err){

await interaction.reply("Fehler: "+err.message);

}

}

});

client.login(CONFIG.DISCORD_TOKEN);