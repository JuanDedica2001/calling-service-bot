let sampleRate = 16000;
let bitsPerSample = 16;
let channelCount = 1;

// Request access to the microphone
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  let context = new AudioContext({ sampleRate });
  let source = context.createMediaStreamSource(stream);
  let processor = context.createScriptProcessor(4096, 1, 1);

  let samples = [];
  processor.onaudioprocess = event => {
    let input = event.inputBuffer.getChannelData(0);
    for (let i = 0; i < input.length; i++) {
      let sample = Math.round(input[i] * 0x7FFF);
      samples.push(sample);
    }
  };

  source.connect(processor);
  processor.connect(context.destination);


  // Connect to a WebSocket
  let socket = new WebSocket("wss://verbumapi.onemeta.ai:3001/ws/{your-verbum-token}");

  socket.binaryType = 'arraybuffer';

  socket.onopen = () => {
    // set language to spanish Argentina
    const data_to_send = `{
      "speechLanguage": "es-AR"
    }`;
    socket.send(data_to_send);
    // Start sending audio data to the server
    let chunkSize = sampleRate * channelCount * bitsPerSample / 8;
    let intervalId = setInterval(() => {
      if (samples.length >= chunkSize) {
        let chunk = samples.splice(0, chunkSize);

        // Encode chunk as a little-endian, 16-bit, signed integer array
        let buffer = new ArrayBuffer(chunk.length * 2);
        let view = new DataView(buffer);
        for (let i = 0; i < chunk.length; i++) {
          view.setInt16(i * 2, chunk[i], true /* little endian */);
        }

        // Send chunk to the WebSocket server
        socket.send(buffer);
      }
    }, 20);

    socket.onmessage = event => {
      // Get data after receiving from WebSocket
      console.log("Data after receiving: ", event.data);
      console.log(event.data);
    };

    // Stop sending audio data and close the WebSocket after 10 seconds
    setTimeout(() => {
      clearInterval(intervalId);
      socket.close();
      processor.disconnect();
      source.disconnect();
      context.close();
    }, 10000);
  };
});