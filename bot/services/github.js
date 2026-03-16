import { Octokit } from "@octokit/rest";
import { CONFIG } from "../config/config.js";

const octokit = new Octokit({
auth: CONFIG.GITHUB_TOKEN
});

export async function commitFile(path,content,message){

const encodedContent = Buffer.from(content).toString("base64");

let sha = null;

try{

const existing = await octokit.repos.getContent({
owner: CONFIG.GITHUB_OWNER,
repo: CONFIG.GITHUB_REPO,
path
});

sha = existing.data.sha;

}catch(e){
}

await octokit.repos.createOrUpdateFileContents({

owner: CONFIG.GITHUB_OWNER,
repo: CONFIG.GITHUB_REPO,
path,
message,
content: encodedContent,
sha

});

}