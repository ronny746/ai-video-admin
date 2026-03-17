const express = require("express");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// OUTPUT folder inside tts
const OUTPUT = path.join(__dirname, "tts", "output");
const MODELS = path.join(__dirname, "tts", "models");

// Helper to run shell commands
function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (e) {
    console.error("CMD ERROR:", e.message);
  }
}

// Unique ID generator for filenames
function uid() {
  return Date.now() + "_" + Math.floor(Math.random() * 1000);
}

// Ensure OUTPUT folder exists
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

// 🌟 1. SINGLE VOICE API
app.post("/tts-single", (req, res) => {
  const { text, model = "hi_IN-pratham-medium.onnx" } = req.body;
  const id = uid();
  const wav = path.join(OUTPUT, `${id}.wav`);
  const mp3 = path.join(OUTPUT, `${id}.mp3`);

  run(`echo "${text}" | piper -m ${MODELS}/${model} -f ${wav}`);
  run(`ffmpeg -y -i ${wav} -codec:a libmp3lame -qscale:a 2 ${mp3}`);

  res.json({ url: `/output/${id}.mp3` });
});

// 🌟 2. MULTI VOICE API
app.post("/tts-multi", (req, res) => {
  const { lines } = req.body;
  const id = uid();
  let files = [];

  lines.forEach((line, i) => {
    let model = "hi_IN-pratham-medium.onnx";
    if (line.speaker === "male") model = "hi_IN-rohan-medium.onnx";
    if (line.speaker === "female") model = "hi_IN-priyamvada-medium.onnx";

    const file = path.join(OUTPUT, `${id}_${i}.wav`);
    run(`echo "${line.text}" | piper -m ${MODELS}/${model} -f ${file}`);
    files.push(file);
  });

  const listFile = path.join(OUTPUT, `${id}_list.txt`);
  fs.writeFileSync(listFile, files.map(f => `file '${f}'`).join("\n"));

  const wavFinal = path.join(OUTPUT, `${id}.wav`);
  const mp3Final = path.join(OUTPUT, `${id}.mp3`);

  run(`ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${wavFinal}`);
  run(`ffmpeg -y -i ${wavFinal} -codec:a libmp3lame -qscale:a 2 ${mp3Final}`);

  res.json({ url: `/output/${id}.mp3` });
});

// 🌟 3. BACKGROUND MUSIC MIX
app.post("/tts-bg", (req, res) => {
  const { text, music = "bg.mp3" } = req.body;
  const id = uid();

  const voice = path.join(OUTPUT, `${id}_voice.wav`);
  const mixed = path.join(OUTPUT, `${id}_mix.wav`);
  const final = path.join(OUTPUT, `${id}.mp3`);

  run(`echo "${text}" | piper -m ${MODELS}/hi_IN-pratham-medium.onnx -f ${voice}`);
  run(`ffmpeg -y -i ${voice} -i ${OUTPUT}/${music} -filter_complex "[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2" ${mixed}`);
  run(`ffmpeg -y -i ${mixed} -codec:a libmp3lame -qscale:a 2 ${final}`);

  res.json({ url: `/output/${id}.mp3` });
});

// 🌟 4. PITCH FIX (ROHAN)
app.post("/tts-pitch", (req, res) => {
  const { text } = req.body;
  const id = uid();

  const raw = path.join(OUTPUT, `${id}_raw.wav`);
  const fixed = path.join(OUTPUT, `${id}_fixed.wav`);
  const final = path.join(OUTPUT, `${id}.mp3`);

  run(`echo "${text}" | piper -m ${MODELS}/hi_IN-rohan-medium.onnx -f ${raw}`);
  run(`ffmpeg -y -i ${raw} -filter:a "asetrate=44100*1.1,atempo=1.0" ${fixed}`);
  run(`ffmpeg -y -i ${fixed} -codec:a libmp3lame -qscale:a 2 ${final}`);

  res.json({ url: `/output/${id}.mp3` });
});

// 🌐 STATIC FILES
app.use("/output", express.static(OUTPUT));

// 🚀 START SERVER
app.listen(3000, () => {
  console.log("🚀 TTS API running on http://localhost:3000");
});