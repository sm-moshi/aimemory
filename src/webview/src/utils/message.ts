// Create a safe postMessage function
export const postMessage = (message: any) => {
  if (window.vscodeApi) {
    window.vscodeApi.postMessage(message);
    console.log("Message sent:", message);
  } else {
    console.warn("VSCode API not available, can't send message:", message);
  }
};
