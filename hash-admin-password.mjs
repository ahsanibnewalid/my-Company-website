import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

if (!process.stdin.isTTY) {
  process.stderr.write("Run this command in an interactive terminal so the password is not exposed.\n");
  process.exit(1);
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

function hiddenPrompt(label) {
  return new Promise((resolve) => {
    let password = "";
    process.stdout.write(label);
    const handler = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.setRawMode(false);
        process.exit(130);
      }
      if (key?.name === "return") {
        process.stdin.off("keypress", handler);
        process.stdout.write("\n");
        resolve(password);
      } else if (key?.name === "backspace") {
        password = password.slice(0, -1);
      } else if (str.length === 1 && !key?.ctrl && !key?.meta) {
        password += str;
      }
    };
    process.stdin.on("keypress", handler);
  });
}

try {
  const first = await hiddenPrompt("Choose an administrator password (hidden): ");
  const second = await hiddenPrompt("Confirm password (hidden): ");
  if (first !== second || first.length < 14 || first.length > 512) {
    throw new Error("Passwords must match and contain 14–512 characters.");
  }
  const salt = randomBytes(24);
  const key = scryptSync(first, salt, 64);
  process.stdout.write("\nAdd these to your Render web service's private Environment settings:\n");
  process.stdout.write(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("base64url")}$${key.toString("base64url")}\n`);
  process.stdout.write(`SESSION_SECRET=${randomBytes(48).toString("base64url")}\n`);
  process.stdout.write("Never commit these values or paste them into a public chat.\n");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Could not generate hash."}\n`);
  process.exitCode = 1;
} finally {
  process.stdin.setRawMode(false);
  process.stdin.pause();
}
