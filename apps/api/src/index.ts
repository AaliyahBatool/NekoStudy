import type { User } from "@nekostudy/shared";
import { env } from "./config/env.js";

console.log(`API configuration loaded. Port: ${env.PORT}`);

const user: User = {
  id: "1",
  name: "Test User",
  email: "test@example.com"
};

console.log("API is running!");
console.log(user);