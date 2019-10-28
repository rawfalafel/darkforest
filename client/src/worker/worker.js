/* eslint-disable */
import {mimcHash} from "../utils/mimc";

export default () => {
  self.addEventListener("message", event => {
    if (!event) return;

    console.log('Worker: Message received from main');
    console.log(event)
    // const hash = mimcHash(42, 42);

    postMessage(1234);
    console.log('Worker: Message sent back to main');
  });
};
