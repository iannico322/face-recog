const video = document.getElementById("video");
const names = document.querySelector(".names")

const MODEL_URL = "/face-recog/models";
const LABELS = ["Nico", "Mark","Angel","Ryan"];
const INTERVAL_MS = 100;
let isStopped = false;
let detectedNames = new Set();

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
]).then(startWebcam)
  .catch((error) => {
    console.error("Error loading models:", error);
  });

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error("Error starting webcam:", error);
    });
}

async function getFaceDescriptor(img) {
  return faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
}

async function getLabeledFaceDescriptions() {
  return Promise.all(
    LABELS.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`./labels/${label}/${i}.jpg`);
        const detections = await getFaceDescriptor(img);
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const intervalId = setInterval(async () => {
    if (isStopped) {
      clearInterval(intervalId);
      return;
    }

    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const results = resizedDetections.map((d) => {
      return faceMatcher.findBestMatch(d.descriptor);
    });
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
      drawBox.draw(canvas);
      names.textContent = result.label=="Unknown"? "" : result.label
     
    });
    
    console.log(Array.from(detectedNames));
  }, INTERVAL_MS);
});

// Function to stop the face recognition
function stopRecognition() {

  
}
