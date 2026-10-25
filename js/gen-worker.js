/* Sunspots generator worker: runs SunGen.generate off the main thread.
   Request:  {id, n, seed}
   Response: {id, ok:true, puzzle:{n, sol, reg, colors}, ms}  or  {id, ok:false, error}
   Usage from the page:
     const w = new Worker('js/gen-worker.js');
     w.onmessage = e => { if (e.data.ok) use(e.data.puzzle) };
     w.postMessage({id: 1, n: 10, seed: 12345}); */
importScripts('generator.js');
self.onmessage = e => {
  const {id, n, seed} = e.data || {};
  try {
    const t0 = Date.now();
    const puzzle = self.SunGen.generate(n, seed);
    self.postMessage({id, ok: true, puzzle, ms: Date.now() - t0});
  } catch (err) {
    self.postMessage({id, ok: false, error: String(err && err.message || err)});
  }
};
