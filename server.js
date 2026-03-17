const express = require("express");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Paths
const OUTPUT = path.join(__dirname, "tts", "output");
const MODELS = path.join(__dirname, "tts", "models");

// Ensure output folder
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

// Helper functions
function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (e) {
    console.error("CMD ERROR:", e.message);
    throw e;
  }
}

function uid() {
  return Date.now() + "_" + Math.floor(Math.random() * 1000);
}

// Escape shell special chars
function escapeShell(text) {
  return text.replace(/(["$`\\])/g, "\\$1");
}

// 🌟 1. SINGLE VOICE
app.post("/tts-single", (req, res) => {
  const { text, model = "hi_IN-pratham-medium.onnx" } = req.body;
  const id = uid();
  const wav = path.join(OUTPUT, `${id}.wav`);
  const mp3 = path.join(OUTPUT, `${id}.mp3`);

  try {
    run(`echo "${escapeShell(text)}" | piper -m ${MODELS}/${model} -f ${wav}`);
    if (!fs.existsSync(wav)) throw new Error("WAV not generated");
    run(`ffmpeg -y -i ${wav} -codec:a libmp3lame -qscale:a 2 ${mp3}`);
    if (!fs.existsSync(mp3)) throw new Error("MP3 not generated");
    res.json({ url: `/output/${id}.mp3` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

// 🌟 2. MULTI VOICE
app.post("/tts-multi", (req, res) => {
  const { lines } = req.body;
  const id = uid();
  let files = [];

  try {
    lines.forEach((line, i) => {
      let model = "hi_IN-pratham-medium.onnx";
      if (line.speaker === "male") model = "hi_IN-rohan-medium.onnx";
      if (line.speaker === "female") model = "hi_IN-priyamvada-medium.onnx";

      const file = path.join(OUTPUT, `${id}_${i}.wav`);
      run(`echo "${escapeShell(line.text)}" | piper -m ${MODELS}/${model} -f ${file}`);
      if (!fs.existsSync(file)) throw new Error(`File ${file} not generated`);
      files.push(file);
    });

    const listFile = path.join(OUTPUT, `${id}_list.txt`);
    fs.writeFileSync(listFile, files.map(f => `file '${f}'`).join("\n"));

    const wavFinal = path.join(OUTPUT, `${id}.wav`);
    const mp3Final = path.join(OUTPUT, `${id}.mp3`);

    run(`ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${wavFinal}`);
    run(`ffmpeg -y -i ${wavFinal} -codec:a libmp3lame -qscale:a 2 ${mp3Final}`);

    if (!fs.existsSync(mp3Final)) throw new Error("Final MP3 not generated");
    res.json({ url: `/output/${id}.mp3` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Multi-voice TTS failed" });
  }
});

// 🌟 3. BACKGROUND MUSIC MIX
app.post("/tts-bg", (req, res) => {
  const { text, music = "bg.mp3" } = req.body;
  const id = uid();

  const voice = path.join(OUTPUT, `${id}_voice.wav`);
  const mixed = path.join(OUTPUT, `${id}_mix.wav`);
  const final = path.join(OUTPUT, `${id}.mp3`);

  try {
    run(`echo "${escapeShell(text)}" | piper -m ${MODELS}/hi_IN-pratham-medium.onnx -f ${voice}`);
    if (!fs.existsSync(voice)) throw new Error("Voice WAV not generated");

    run(`ffmpeg -y -i ${voice} -i ${OUTPUT}/${music} -filter_complex "[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2" ${mixed}`);
    if (!fs.existsSync(mixed)) throw new Error("Mixed WAV not generated");

    run(`ffmpeg -y -i ${mixed} -codec:a libmp3lame -qscale:a 2 ${final}`);
    if (!fs.existsSync(final)) throw new Error("Final MP3 not generated");

    res.json({ url: `/output/${id}.mp3` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TTS with background failed" });
  }
});

// 🌟 4. PITCH FIX (ROHAN)
app.post("/tts-pitch", (req, res) => {
  const { text } = req.body;
  const id = uid();

  const raw = path.join(OUTPUT, `${id}_raw.wav`);
  const fixed = path.join(OUTPUT, `${id}_fixed.wav`);
  const final = path.join(OUTPUT, `${id}.mp3`);

  try {
    run(`echo "${escapeShell(text)}" | piper -m ${MODELS}/hi_IN-rohan-medium.onnx -f ${raw}`);
    if (!fs.existsSync(raw)) throw new Error("Raw WAV not generated");

    run(`ffmpeg -y -i ${raw} -filter:a "asetrate=44100*1.1,atempo=1.0" ${fixed}`);
    if (!fs.existsSync(fixed)) throw new Error("Fixed WAV not generated");

    run(`ffmpeg -y -i ${fixed} -codec:a libmp3lame -qscale:a 2 ${final}`);
    if (!fs.existsSync(final)) throw new Error("Final MP3 not generated");

    res.json({ url: `/output/${id}.mp3` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pitch fix TTS failed" });
  }
});

// 🌐 STATIC FILES
app.use("/output", express.static(OUTPUT));

// 🚀 START SERVER
app.listen(3000, () => {
  console.log("🚀 TTS API running on http://localhost:3000");
});