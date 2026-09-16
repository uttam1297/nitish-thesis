// Downloads the Whisper assets the interview serves from its own origin, and
// copies the matching ONNX Runtime WASM binaries out of node_modules.
//
// The files are ~85 MB in total and are deliberately NOT committed: they are
// fully reproducible from this script, which runs before `next build` (see the
// `prebuild` script) and on demand during development. The directory name
// carries a version suffix so a model change invalidates the immutable cache
// headers configured in next.config.ts.

import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MODEL_REPO = "Xenova/whisper-tiny.en";
const MODEL_REVISION = "main";
/** Keep in sync with SPEECH_MODEL_ID in src/features/voice/speech-config.ts. */
const MODEL_DIR = "whisper-tiny-en-v1";

// Only the q8 ("quantized") graphs are shipped. fp32/fp16/q4 variants would
// add ~250 MB to every deployment for a quality difference that is not
// perceptible on short interview answers.
const MODEL_FILES = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "added_tokens.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
];

// Two builds, one download per device: the asyncify build is required for the
// WebGPU execution provider, the plain build is smaller and enough for WASM.
const WASM_FILES = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
];

async function fileSize(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return null;
  }
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status} ${response.statusText}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, body);
  return body.length;
}

async function fetchModel() {
  const target = join(root, "public", "models", MODEL_DIR);
  let downloaded = 0;
  let total = 0;

  for (const file of MODEL_FILES) {
    const destination = join(target, file);
    const existing = await fileSize(destination);
    if (existing) {
      total += existing;
      continue;
    }
    const url = `https://huggingface.co/${MODEL_REPO}/resolve/${MODEL_REVISION}/${file}`;
    const size = await download(url, destination);
    downloaded += 1;
    total += size;
    process.stdout.write(`  ${file} (${(size / 1e6).toFixed(1)} MB)\n`);
  }

  return { downloaded, total };
}

async function copyWasm() {
  const source = join(root, "node_modules", "onnxruntime-web", "dist");
  const target = join(root, "public", "wasm");
  await mkdir(target, { recursive: true });

  let total = 0;
  for (const file of WASM_FILES) {
    const from = join(source, file);
    const to = join(target, file);
    const sourceSize = await fileSize(from);
    if (sourceSize === null) {
      throw new Error(
        `Missing ${file} in onnxruntime-web/dist — run npm install first.`
      );
    }
    if ((await fileSize(to)) !== sourceSize) {
      await cp(from, to);
    }
    total += sourceSize;
  }

  // A runtime upgrade renames these files (1.22 shipped ".jsep" where 1.31
  // ships ".asyncify"), so leftovers from an earlier install would otherwise
  // sit here and be served alongside the current ones — a mixed pair that
  // only fails once a participant's browser loads it.
  for (const name of await readdir(target)) {
    if (!WASM_FILES.includes(name)) await rm(join(target, name));
  }

  return total;
}

async function writeManifest(sizes) {
  // A record of exactly what this deployment serves, so a support question
  // about transcription quality can be traced back to a model revision.
  const manifest = {
    model: `${MODEL_REPO}@${MODEL_REVISION}`,
    runtime: `onnxruntime-web@${ortVersion}`,
    directory: MODEL_DIR,
    files: MODEL_FILES,
    bytes: sizes,
    generatedAt: new Date().toISOString(),
  };
  const path = join(root, "public", "models", MODEL_DIR, "manifest.json");
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

const { version: ortVersion } = JSON.parse(
  await readFile(
    join(root, "node_modules", "onnxruntime-web", "package.json"),
    "utf8"
  )
);

const model = await fetchModel();
const wasmBytes = await copyWasm();
await writeManifest({ model: model.total, wasm: wasmBytes });

process.stdout.write(
  `Speech assets ready: model ${(model.total / 1e6).toFixed(1)} MB` +
    ` (${model.downloaded} downloaded), wasm ${(wasmBytes / 1e6).toFixed(1)} MB\n`
);
