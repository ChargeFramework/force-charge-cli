import fs from "fs-extra";
import path from "path";

export const topic = {
  name: "charge",
};

let dir = path.join(__dirname, "commands");
export const commands = fs
  .readdirSync(dir)
  .filter(f => path.extname(f) === ".js" && !f.endsWith(".test.js"))
  .map(f => require("./commands/" + f).default);
