const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const asar = require("@electron/asar");

const root = path.resolve(__dirname, "..");
const releaseDir = path.join(root, "release");
const appName = "DiagramasUnifilares";
const packagedDir = path.join(releaseDir, `${appName}-win32-x64`);
const appAsar = path.join(packagedDir, "resources", "app.asar");

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
}

function assertFile(file, message) {
  if (!fs.existsSync(file)) throw new Error(message || `Arquivo não encontrado: ${file}`);
}

run("vite", ["build"]);
run("electron-packager", [
  ".",
  appName,
  "--platform=win32",
  "--arch=x64",
  "--out=release",
  "--overwrite",
  "--app-version=1.0.0",
  "--ignore=^/src($|/)",
  "--ignore=^/public($|/)",
  "--ignore=^/release($|/)",
  "--ignore=^/\.git($|/)",
]);

assertFile(appAsar, "O empacotamento não gerou resources/app.asar.");

const packagedPackage = JSON.parse(asar.extractFile(appAsar, "package.json").toString("utf8"));
if (packagedPackage.main !== "electron/main.cjs") {
  throw new Error(`Main inválido dentro do app.asar: ${packagedPackage.main || "(vazio)"}`);
}

asar.extractFile(appAsar, "electron/main.cjs");
asar.extractFile(appAsar, "dist/index.html");

console.log(`Pacote OK: ${path.relative(root, path.join(packagedDir, `${appName}.exe`))}`);