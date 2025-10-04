let cameraIframe = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INJECT_CAMERA_IFRAME') {
    injectCameraIframe();
    sendResponse({ success: true });
  } else if (message.type === 'REMOVE_CAMERA_IFRAME') {
    removeCameraIframe();
    sendResponse({ success: true });
  }
  return true;
});

function injectCameraIframe() {
  if (cameraIframe) return;
  
  cameraIframe = document.createElement('iframe');
  cameraIframe.id = 'focus-guardian-camera';
  cameraIframe.src = chrome.runtime.getURL('iframe.html');
  
  cameraIframe.setAttribute('allow', 'camera *');
  
  cameraIframe.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 320px;
    height: 240px;
    border: 3px solid #667eea;
    border-radius: 8px;
    z-index: 999999;
    background: white;
  `;
  
  document.body.appendChild(cameraIframe);
  console.log('Camera iframe injected');
}

function removeCameraIframe() {
  if (cameraIframe) {
    cameraIframe.remove();
    cameraIframe = null;
    console.log('Camera iframe removed');
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== cameraIframe?.contentWindow) return;
  
  if (event.data.type === 'CAMERA_STARTED') {
    chrome.runtime.sendMessage({ type: 'CAMERA_STARTED' });
  } else if (event.data.type === 'CAMERA_ERROR') {
    chrome.runtime.sendMessage({ 
      type: 'CAMERA_ERROR', 
      error: event.data.error 
    });
  } else if (event.data.type === 'DISTRACTION_DETECTED') {
    chrome.runtime.sendMessage({ 
      type: 'DISTRACTION_DETECTED',
      objects: event.data.objects
    });
  }
});