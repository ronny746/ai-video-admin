const express = require("express");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const OUTPUT = path.join(__dirname, "output");
const MODELS = "/root/tts/models";

// helper
function run(cmd) {
  try {
    execSync(cmd);
  } catch (e) {
    console.error("CMD ERROR:", e.message);
  }
}

// ensure output folder
if (!fs.existsSync(OUTPUT)) {
  fs.mkdirSync(OUTPUT, { recursive: true });
}

//////////////////////////////////////////////////////////////////
// 🎧 1. SINGLE VOICE API
//////////////////////////////////////////////////////////////////
app.post("/tts-single", (req, res) => {
  const { text, model = "hi_IN-pratham-medium.onnx" } = req.body;

  const file = path.join(OUTPUT, "single.wav");

  run(`echo "${text}" | piper -m ${MODELS}/${model} -f ${file}`);

  res.json({ url: `/output/single.wav` });
});

//////////////////////////////////////////////////////////////////
// 🎭 2. MULTI VOICE API
//////////////////////////////////////////////////////////////////
app.post("/tts-multi", (req, res) => {
  const { lines } = req.body;

  let files = [];

  lines.forEach((line, i) => {
    let model = "hi_IN-pratham-medium.onnx";

    if (line.speaker === "male")
      model = "hi_IN-rohan-medium.onnx";
    if (line.speaker === "female")
      model = "hi_IN-priyamvada-medium.onnx";

    const file = path.join(OUTPUT, `${i}.wav`);

    run(`echo "${line.text}" | piper -m ${MODELS}/${model} -f ${file}`);

    files.push(file);
  });

  const listPath = path.join(OUTPUT, "list.txt");

  fs.writeFileSync(
    listPath,
    files.map(f => `file '${f}'`).join("\n")
  );

  const final = path.join(OUTPUT, "multi.wav");

  run(`ffmpeg -f concat -safe 0 -i ${listPath} -c copy ${final} -y`);

  res.json({ url: `/output/multi.wav` });
});

//////////////////////////////////////////////////////////////////
// 🎬 3. BACKGROUND MUSIC MIX
//////////////////////////////////////////////////////////////////
app.post("/tts-bg", (req, res) => {
  const { text, music = "bg.mp3" } = req.body;

  const voice = path.join(OUTPUT, "voice.wav");
  const final = path.join(OUTPUT, "bg_mix.wav");

  run(`echo "${text}" | piper -m ${MODELS}/hi_IN-pratham-medium.onnx -f ${voice}`);

  run(`ffmpeg -i ${voice} -i ${OUTPUT}/${music} -filter_complex "[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2" ${final} -y`);

  res.json({ url: `/output/bg_mix.wav` });
});

//////////////////////////////////////////////////////////////////
// 🔥 4. PITCH FIX (ROHAN VOICE IMPROVE)
//////////////////////////////////////////////////////////////////
app.post("/tts-pitch", (req, res) => {
  const { text } = req.body;

  const raw = path.join(OUTPUT, "raw.wav");
  const final = path.join(OUTPUT, "pitch.wav");

  run(`echo "${text}" | piper -m ${MODELS}/hi_IN-rohan-medium.onnx -f ${raw}`);

  run(`ffmpeg -i ${raw} -filter:a "asetrate=44100*1.1,atempo=1.0" ${final} -y`);

  res.json({ url: `/output/pitch.wav` });
});

//////////////////////////////////////////////////////////////////
// 🌐 STATIC FILE ACCESS
//////////////////////////////////////////////////////////////////
app.use("/output", express.static(OUTPUT));

//////////////////////////////////////////////////////////////////
// 🚀 START SERVER
//////////////////////////////////////////////////////////////////
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});