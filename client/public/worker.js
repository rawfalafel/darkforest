self.importScripts('./mimc.js');

onmessage = function(event) {
  console.log('Worker: Message received from main script');
  console.log(event);
  console.log(mimcHash(42));
  console.log('Worker: Posting message back to main script');
  postMessage('1234');
}
