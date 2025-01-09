import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import "./VideoCall.css"; // Import the CSS for styling

const VideoCall = () => {
  const [inCall, setInCall] = useState(false);
  const [appId, setAppId] = useState(""); // Your Agora App ID
  const [channel, setChannel] = useState("hello"); // Default Channel Name
  const [token, setToken] = useState(null); // Token (optional)
  const [uid, setUid] = useState(null); // User ID (optional)

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteUsersRef = useRef([]);
  const remotePlayersRef = useRef({}); // To store remote player containers

  const localVideoRef = useRef(null); // Ref for local video element

  // Initialize Agora Client
  const initializeClient = () => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;
    setupEventListeners(client);
  };

  // Set up Agora Event Listeners
  const setupEventListeners = (client) => {
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);
  };

  // Handle when a remote user publishes a track
  const handleUserPublished = async (user, mediaType) => {
    await clientRef.current.subscribe(user, mediaType);
    console.log("Subscribed to user:", user.uid, "MediaType:", mediaType);

    if (mediaType === "video") {
      displayRemoteVideo(user);
    }

    if (mediaType === "audio") {
      user.audioTrack.play();
    }
  };

  // Handle when a remote user unpublishes a track
  const handleUserUnpublished = (user) => {
    const playerContainer = document.getElementById(user.uid);
    if (playerContainer) {
      playerContainer.remove();
    }
    // Remove from remoteUsersRef
    remoteUsersRef.current = remoteUsersRef.current.filter(
      (u) => u.uid !== user.uid
    );
  };

  // Handle when a remote user leaves the channel
  const handleUserLeft = (user) => {
    const playerContainer = document.getElementById(user.uid);
    if (playerContainer) {
      playerContainer.remove();
    }
    // Remove from remoteUsersRef
    remoteUsersRef.current = remoteUsersRef.current.filter(
      (u) => u.uid !== user.uid
    );
  };

  // Display Remote Video
  const displayRemoteVideo = (user) => {
    const remoteVideoTrack = user.videoTrack;
    const remotePlayerContainer = document.createElement("div");
    remotePlayerContainer.id = user.uid.toString();
    remotePlayerContainer.className = "remote-player";
    remotePlayerContainer.innerHTML = `<p class="remote-username">User ${user.uid}</p>`;
    document.getElementById("remote-container").appendChild(remotePlayerContainer);
    remoteVideoTrack.play(remotePlayerContainer);
    remoteUsersRef.current.push(user);
  };

  // Join the channel
  const joinVideo = async () => {
    if (!appId || !channel) {
      alert("Please enter both App ID and Channel Name.");
      return;
    }

    initializeClient();

    try {
      await clientRef.current.join(appId, channel, token, uid);
      console.log("Successfully joined the channel");

      // Ensure any existing tracks are closed before creating new ones
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      // List available cameras and select default
      const devices = await AgoraRTC.getCameras();
      let selectedCamera = devices.find(device => device.isDefault) || devices[0];

      if (!selectedCamera) {
        console.warn("No camera devices found. Proceeding without video.");
      }

      // Create and publish local tracks with selected camera
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      if (selectedCamera) {
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
          cameraId: selectedCamera.deviceId
        });
      }
      await clientRef.current.publish([
        localAudioTrackRef.current,
        localVideoTrackRef.current,
      ]);
      console.log("Published local audio and video tracks");

      // Display Local Video
      if (localVideoRef.current && localVideoTrackRef.current) {
        localVideoTrackRef.current.play(localVideoRef.current);
      }

      setInCall(true);
    } catch (error) {
      console.error("Failed to join the channel or publish tracks:", error);
    }
  };

  // Leave the channel and clean up
  const leaveVideo = async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.leave();
        console.log("Left the channel");
      }

      // Close and nullify local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      // Stop local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      // Remove all remote video containers
      remoteUsersRef.current.forEach((user) => {
        const remotePlayerContainer = document.getElementById(user.uid);
        if (remotePlayerContainer) {
          remotePlayerContainer.remove();
        }
      });
      remoteUsersRef.current = [];

      setInCall(false);
    } catch (error) {
      console.error("Failed to leave the channel:", error);
    }
  };

  return (
    <div className="video-call-container">
      {!inCall ? (
        <div className="form-container">
          <h2>Join a Video Call</h2>
          <div className="form-group">
            <label htmlFor="app-id">Agora App ID:</label>
            <input
              type="text"
              id="app-id"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Enter your Agora App ID"
            />
          </div>
          <div className="form-group">
            <label htmlFor="channel-name">Channel Name:</label>
            <input
              type="text"
              id="channel-name"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Enter Channel Name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="token">Token (Optional):</label>
            <input
              type="text"
              id="token"
              value={token || ""}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter Token if available"
            />
          </div>
          <button className="join-button" onClick={joinVideo}>
            Join Call
          </button>
        </div>
      ) : (
        <div className="call-container">
          <button className="leave-button" onClick={leaveVideo}>
            Leave Call
          </button>
          <div className="video-container" id="local-container">
            <div className="local-player">
              <video
                ref={localVideoRef}
                className="video"
                autoPlay
                muted
                playsInline
              />
              <p className="local-username">You</p>
            </div>
          </div>
          <div className="video-container" id="remote-container"></div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
// import AgoraRTC from "agora-rtc-sdk-ng";

// let rtc = {
//   localAudioTrack: null,
//   localVideoTrack: null,
//   client: null,
// };

// const options = {
//   appId: "aa57b40426c74add85bb5dcae4557ef6", // Your App ID
//   channel: "hello", // Channel name
//   token: null, // Temp token
//   uid: null, // User ID
// };

// // Initialize the AgoraRTC client
// export function initializeClient() {
//   if (!rtc.client) {
//     rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
//     setupEventListeners();
//     console.log("AgoraRTC client initialized");
//   }
// }

// // Handle remote user events
// function setupEventListeners() {
//   rtc.client.on("user-published", async (user, mediaType) => {
//     await rtc.client.subscribe(user, mediaType);
//     console.log("Subscribe success");

//     if (mediaType === "video") {
//       displayRemoteVideo(user);
//     }

//     if (mediaType === "audio") {
//       user.audioTrack.play();
//     }
//   });

//   rtc.client.on("user-unpublished", (user) => {
//     const remotePlayerContainer = document.getElementById(user.uid);
//     remotePlayerContainer && remotePlayerContainer.remove();
//   });
// }

// // Display remote video
// function displayRemoteVideo(user) {
//   const remoteVideoTrack = user.videoTrack;
//   const remotePlayerContainer = document.createElement("div");
//   remotePlayerContainer.id = user.uid.toString();
//   remotePlayerContainer.textContent = `Remote user ${user.uid}`;
//   remotePlayerContainer.style.width = "640px";
//   remotePlayerContainer.style.height = "480px";
//   document.body.append(remotePlayerContainer);
//   remoteVideoTrack.play(remotePlayerContainer);
// }

// // Join a channel and publish local media
// export async function joinVideo() {
//   initializeClient(); // Ensure the client is initialized

//   if (!rtc.client) {
//     console.error("RTC client is not initialized");
//     return;
//   }

//   await rtc.client.join(
//     options.appId,
//     options.channel,
//     options.token,
//     options.uid
//   );
//   await createAndPublishLocalTracks();
//   displayLocalVideo();
//   console.log("Publish success!");
// }

// // Publish local audio and video tracks
// async function createAndPublishLocalTracks() {
//   rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
//   rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
//   await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
// }

// // Display local video
// function displayLocalVideo() {
//   const localPlayerContainer = document.createElement("div");
//   localPlayerContainer.id = options.uid;
//   localPlayerContainer.textContent = `Local user ${options.uid}`;
//   localPlayerContainer.style.width = "640px";
//   localPlayerContainer.style.height = "480px";
//   document.body.append(localPlayerContainer);
//   rtc.localVideoTrack.play(localPlayerContainer);
// }

// // Leave the channel and clean up
// export async function leaveVideo() {
//   if (rtc.localAudioTrack) rtc.localAudioTrack.close();
//   if (rtc.localVideoTrack) rtc.localVideoTrack.close();

//   const localPlayerContainer = document.getElementById(options.uid);
//   if (localPlayerContainer) localPlayerContainer.remove();

//   rtc.client.remoteUsers.forEach((user) => {
//     const playerContainer = document.getElementById(user.uid);
//     if (playerContainer) playerContainer.remove();
//   });

//   if (rtc.client) await rtc.client.leave();
// }

// // Start the basic call
// export function startBasicCall() {
//   initializeClient();
// }