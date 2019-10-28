/* eslint-disable */

export default () => {
  self.addEventListener("message", event => {
    if (!event) return;

    console.log('Worker: Message received from main');
    console.log(event)
    // const hash = window.mimc(42, 42);

    postMessage(1234);
    console.log('Worker: Message sent back to main');
  });
};
