import { CallClient } from '@azure/communication-calling';
import { Features } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { AzureLogger } from '@azure/logger';

let call;
let callAgent;
let socket = new WebSocket("wss://verbumapi.onemeta.ai:3001/ws/c3b3bf994542f95cc4139dd0b67bb95c");
socket.binaryType = 'arraybuffer';
const meetingLinkInput = document.getElementById('teams-link-input');
const hangUpButton = document.getElementById('hang-up-button');
const teamsMeetingJoinButton = document.getElementById('join-meeting-button');
const callStateElement = document.getElementById('call-state');
const accessToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEwNiIsIng1dCI6Im9QMWFxQnlfR3hZU3pSaXhuQ25zdE5PU2p2cyIsInR5cCI6IkpXVCJ9.eyJza3lwZWlkIjoiYWNzOjQ4OWViMTc0LTc5YWEtNDY1Ni1iZjg4LTRiMDZhMDgyNjllMl8wMDAwMDAxOC1hNzYwLTAxMzQtMjhkZi00NDQ4MjIwMDJhZmMiLCJzY3AiOjE3OTIsImNzaSI6IjE2ODM3NTI5MDEiLCJleHAiOjE2ODM4MzkzMDEsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6InZvaXAiLCJyZXNvdXJjZUlkIjoiNDg5ZWIxNzQtNzlhYS00NjU2LWJmODgtNGIwNmEwODI2OWUyIiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTY4Mzc1MjkwMX0.iK8VpJIkqRbVRVxdWuhfQlrIWWc7ssjPKrGkb0nrkY5lWl55nYFZsR3SfvkdQNdjmUM82wstw6skUaEJBPvuuE1M8RnYXSseUSDyH4wp0a03uro9nvzAY0r_L_di1JbNNikOftEoqyDBsNBfZrmj3t7N1_YTwML_HUyBq0FH1A7eMLmYjQ7cUSEVktFVIWhwiknDFnzhVlTg3y_dqs07ABYVDIeE9_Olez8XFWjZMcnAj3OnWYuOkBfbyncV-hcbRrrAZauJ-9oj9_4RXCYFZhRA4bl9ULNCZ79S52EsTRLm2_NFyyhmv9aaPi292n4MG6zKJWtS5A7FXqvioZAFlw';
let samples = [];
const sampleRate = 16000;
const channelCount = 1;
const bitsPerSample = 16;
let intervalId;
async function init() {
    const callClient = new CallClient();
    const tokenCredential = new AzureCommunicationTokenCredential(accessToken);
    callAgent = await callClient.createCallAgent(tokenCredential, {displayName: 'Test user'});
    teamsMeetingJoinButton.disabled = false;
}




init();

AzureLogger.log = (...args) => {
    console.log(...args);
};

hangUpButton.addEventListener('click', async () => {
    // end the current call
    await call.hangUp();
  
    // toggle button states
    hangUpButton.disabled = true;
    teamsMeetingJoinButton.disabled = false;
    callStateElement.innerText = '-';
  });

teamsMeetingJoinButton.addEventListener('click', () => {    
    // join with meeting link
    call = callAgent.join({meetingLink: meetingLinkInput.value}, {});
    call.on('stateChanged', async () => {
        callStateElement.innerText = call.state;
        let chunkSize = sampleRate * channelCount * bitsPerSample / 8;
        if (call.state === 'Connected') {
        intervalId = setInterval(() => {
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
      }
    });
    call.on('remoteAudioStreamsUpdated', async e => {
        const remoteAudioStream = e.added[0];
        const mediaStream = await remoteAudioStream.getMediaStream();
            // Create a new AudioContext
            const audioContext = new AudioContext({sampleRate: 16000});

            // create script processor node
            const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
            
            // create audio buffer
            // const audioData = new Int16Array(buffer);
            
            // connect script processor node to audio context
            
            // process audio data
            scriptNode.onaudioprocess = (event) => {
              let input = event.inputBuffer.getChannelData(0);
              for (let i = 0; i < input.length; i++) {
                let sample = Math.round(input[i] * 0x7FFF);
                samples.push(sample);
              }
            };
            
            // start audio processing
            const mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
            mediaStreamSource.connect(scriptNode);
            scriptNode.connect(audioContext.destination);

    hangUpButton.disabled = false;
    teamsMeetingJoinButton.disabled = true;
});
});




  socket.onopen = () => {
    // set language to spanish Argentina
    const data_to_send = `{
      "speechLanguage": "es-MX"
    }`;
    socket.send(data_to_send);
    // Start sending audio data to the server

};
// Stop sending audio data and close the WebSocket after 10 seconds
socket.onmessage = event => {
  // Get data after receiving from WebSocket
  console.log("Data after receiving: ", event.data);
  console.log(event.data);
};
socket.onerror = error => {
    console.log(`[error] ${error.message}`);
    }
socket.onclose = () => {
    console.log(`[close] Connection closed`);
    clearInterval(intervalId);
    }
