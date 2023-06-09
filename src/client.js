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
const recordingStateElement = document.getElementById('recording-state');
const accessToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjVFODQ4MjE0Qzc3MDczQUU1QzJCREU1Q0NENTQ0ODlEREYyQzRDODQiLCJ4NXQiOiJYb1NDRk1kd2M2NWNLOTVjelZSSW5kOHNUSVEiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOjQ4OWViMTc0LTc5YWEtNDY1Ni1iZjg4LTRiMDZhMDgyNjllMl8wMDAwMDAxOC1hMjJhLTExZDAtNjNiMi1hNDNhMGQwMDBjOTAiLCJzY3AiOjE3OTIsImNzaSI6IjE2ODM2NjU0ODEiLCJleHAiOjE2ODM3NTE4ODEsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6InZvaXAiLCJyZXNvdXJjZUlkIjoiNDg5ZWIxNzQtNzlhYS00NjU2LWJmODgtNGIwNmEwODI2OWUyIiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTY4MzY2NTQ4MX0.jSc8DmtwlgEXvWdlfPSaD0RxEprMLCW5xXgG4Mw4HD7gikDaOWd6O9V3pMMh7xBXEMwWx-WM5uLxe2-h8GDCh1Ap2q5Voa43rXqQlzBwWL1oWEKxNqp-m6ZuXjoXvMUGs5n7jLrZ_OAG8nUjNvH_9k9AGKHkdTutj5A4LUzH777Zfu8t4jR_mvec1RuSgUromHyLrIKdPAoxPgm0sDkGap9Cw16FpHiGvnqbkqtn3exzeg5xvkuZHUmlah6sW5BszDR99SxC3aT1jiBzNmIvlEQutJCeIcNeHYyGwiCU5DPeClUM0CTrsLBcZ9wiqm-siSgPM6F54Y74BPyEa3BbwA';
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
        console.log({call: call.state});
        console.log({call: call});
    });
    call.on('remoteAudioStreamsUpdated', async e => {
        console.log({e});
        const remoteAudioStream = e.added[0];
        const mediaStream = await remoteAudioStream.getMediaStream();
            // Create a new AudioContext
            const audioContext = new AudioContext({sampleRate: 16000});

            // create script processor node
            const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
            
            // create audio buffer
            const buffer = new ArrayBuffer(64000);
            const audioData = new Int16Array(buffer);
            
            // connect script processor node to audio context
            scriptNode.connect(audioContext.destination);
            
            // process audio data
            scriptNode.onaudioprocess = (event) => {
              const inputBuffer = event.inputBuffer.getChannelData(0);
              for (let i = 0; i < inputBuffer.length; i++) {
                audioData[i] = inputBuffer[i] * 32767;
              }
              if(socket.readyState === WebSocket.OPEN) {
                  socket.send(audioData.buffer);
              }
            };
            
            // start audio processing
            const mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
            mediaStreamSource.connect(scriptNode);

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
    }
