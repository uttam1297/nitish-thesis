// Collects microphone PCM on the audio thread and hands it to the page in
// ~85 ms blocks. Buffering here (rather than posting every 128-frame render
// quantum) keeps the message rate low enough to stay off the main thread's
// critical path while recording.

const BLOCK_SIZE = 4096;

class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BLOCK_SIZE);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i += 1) {
      this.buffer[this.offset++] = channel[i];
      if (this.offset === BLOCK_SIZE) {
        const block = this.buffer;
        this.port.postMessage(block, [block.buffer]);
        this.buffer = new Float32Array(BLOCK_SIZE);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PcmRecorderProcessor);
