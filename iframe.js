let stream = null;
let model = null;
let detecting = false;

document.addEventListener('DOMContentLoaded', async () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const button = document.getElementById('startCamera');
  const status = document.getElementById('status');
  const detectionStatus = document.getElementById('detectionStatus');

  status.textContent = 'Loading AI model...';
  try {
    model = await cocoSsd.load();
    status.textContent = 'Model loaded - ready to start';
    console.log('COCO-SSD model loaded');
  } catch (error) {
    console.error('Model loading error:', error);
    status.textContent = 'Error loading AI model';
  }

  button.onclick = () => {
    if (stream) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  async function startCamera() {
    try {
      status.textContent = 'Requesting camera access...';
      
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: false, 
        video: { width: 640, height: 480 } 
      });
      
      video.srcObject = stream;
      video.style.display = 'block';
      button.textContent = 'Stop Camera';
      status.textContent = 'Camera active - detecting objects...';
      
      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.display = 'block';
      });
      
      window.parent.postMessage({ type: 'CAMERA_STARTED' }, '*');
      
      detecting = true;
      detectObjects();
      
      console.log('Camera started successfully');
    } catch (error) {
      console.error('Camera error:', error);
      status.textContent = `Error: ${error.message}`;
      
      window.parent.postMessage({ 
        type: 'CAMERA_ERROR', 
        error: error.message 
      }, '*');
    }
  }

  function stopCamera() {
    detecting = false;
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
      video.style.display = 'none';
      canvas.style.display = 'none';
      button.textContent = 'Start Camera';
      status.textContent = 'Camera inactive';
      detectionStatus.textContent = '';
      detectionStatus.className = '';
      console.log('Camera stopped');
    }
  }

  async function detectObjects() {
    if (!detecting || !model) return;

    try {
      const predictions = await model.detect(video);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const distractions = predictions.filter(pred => 
        ['cell phone', 'bottle', 'cup', 'book', 'laptop', 'remote', 'keyboard', 'mouse'].includes(pred.class)
      );
      
      predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const isDistraction = distractions.includes(prediction);
        
        ctx.strokeStyle = isDistraction ? '#ff5252' : '#4caf50';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        ctx.fillStyle = isDistraction ? '#ff5252' : '#4caf50';
        ctx.font = '14px Arial';
        ctx.fillText(
          `${prediction.class} ${Math.round(prediction.score * 100)}%`,
          x,
          y > 20 ? y - 5 : y + 15
        );
      });
      
      if (distractions.length > 0) {
        const objectNames = distractions.map(d => d.class).join(', ');
        detectionStatus.textContent = `⚠️ Distraction: ${objectNames}`;
        detectionStatus.className = 'warning';
        
        window.parent.postMessage({ 
          type: 'DISTRACTION_DETECTED',
          objects: distractions.map(d => d.class)
        }, '*');
      } else if (predictions.length > 0) {
        detectionStatus.textContent = '✓ No distractions detected';
        detectionStatus.className = 'clear';
      } else {
        detectionStatus.textContent = '';
        detectionStatus.className = '';
      }
      
      requestAnimationFrame(detectObjects);
    } catch (error) {
      console.error('Detection error:', error);
      detecting = false;
    }
  }
});